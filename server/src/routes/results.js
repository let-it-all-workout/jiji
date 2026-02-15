const express = require('express');
const db = require('../config/db');
const { authenticate, isLecturer, isAdmin } = require('../middleware/auth');
const { getGrade, getRemark, calculateGPA, deduplicateByCourse } = require('../utils/gpa');

const router = express.Router();

// GET /api/results - Student result lookup (public)
router.get('/', (req, res) => {
  try {
    const { reg, session, level, semester } = req.query;

    if (!reg || !session || !level || !semester) {
      return res.status(400).json({ error: 'reg, session, level, and semester are required' });
    }

    // Find the student (case-insensitive)
    const student = db.prepare('SELECT * FROM students WHERE UPPER(reg_number) = UPPER(?)').get(reg.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found. Please check your registration number.' });
    }

    // Get results for specified session, level, and semester
    const results = db.prepare(`
      SELECT r.id, r.score, r.grade, r.remark, r.academic_session,
             c.course_code, c.course_name, c.credit_units, c.level, c.semester
      FROM results r
      JOIN courses c ON r.course_id = c.id
      WHERE r.student_id = ? AND r.academic_session = ? AND c.level = ? AND c.semester = ?
      ORDER BY c.course_code
    `).all(student.id, session, parseInt(level), parseInt(semester));

    // Calculate GPA for this semester
    const gpa = calculateGPA(results);

    // Calculate CGPA (all results for this student, deduplicated by course — latest result wins)
    const allResults = db.prepare(`
      SELECT r.id, r.score, r.course_id, c.credit_units
      FROM results r
      JOIN courses c ON r.course_id = c.id
      WHERE r.student_id = ?
      ORDER BY r.id ASC
    `).all(student.id);
    const dedupedResults = deduplicateByCourse(allResults);
    const cgpa = calculateGPA(dedupedResults);

    // Get total credit units for this semester
    const totalCredits = results.reduce((sum, r) => sum + r.credit_units, 0);

    res.json({
      student: {
        full_name: student.full_name,
        reg_number: student.reg_number,
        department: student.department,
      },
      query: {
        academic_session: session,
        level: parseInt(level),
        semester: parseInt(semester),
      },
      results,
      summary: {
        total_courses: results.length,
        total_credit_units: totalCredits,
        gpa,
        cgpa,
      },
    });
  } catch (err) {
    console.error('Result lookup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/results/upload - Lecturer uploads results (auth required)
router.post('/upload', authenticate, isLecturer, (req, res) => {
  try {
    const { course_id, academic_session, results: resultData } = req.body;

    if (!course_id || !academic_session || !resultData || !Array.isArray(resultData)) {
      return res.status(400).json({ error: 'course_id, academic_session, and results array are required' });
    }

    // Validate academic session format (e.g. 2024/2025)
    const sessionPattern = /^\d{4}\/\d{4}$/;
    if (!sessionPattern.test(academic_session.trim())) {
      return res.status(400).json({ error: 'Academic session must be in format YYYY/YYYY (e.g. 2024/2025)' });
    }

    if (resultData.length === 0) {
      return res.status(400).json({ error: 'Results array cannot be empty' });
    }

    // Verify course exists
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO results (student_id, course_id, academic_session, uploaded_by, score, grade, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, course_id, academic_session) DO UPDATE SET
        score = excluded.score,
        grade = excluded.grade,
        remark = excluded.remark,
        uploaded_by = excluded.uploaded_by,
        updated_at = CURRENT_TIMESTAMP
    `);

    const errors = [];
    const inserted = [];

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        if (!item.reg_number || item.score === undefined || item.score === null || item.score === '') {
          errors.push({ reg_number: item.reg_number || 'UNKNOWN', error: 'Missing reg_number or score' });
          continue;
        }

        const student = db.prepare('SELECT id FROM students WHERE UPPER(reg_number) = UPPER(?)').get(item.reg_number.trim());
        if (!student) {
          errors.push({ reg_number: item.reg_number, error: 'Student not found' });
          continue;
        }

        // Check if result already exists and is locked — only admin can overwrite
        const existing = db.prepare(
          'SELECT * FROM results WHERE student_id = ? AND course_id = ? AND academic_session = ?'
        ).get(student.id, course_id, academic_session);

        if (existing && existing.is_locked && req.user.role !== 'admin') {
          errors.push({ reg_number: item.reg_number, error: 'Result already uploaded and locked. Only admin can modify.' });
          continue;
        }

        const score = parseFloat(item.score);
        if (isNaN(score) || score < 0 || score > 100) {
          errors.push({ reg_number: item.reg_number, error: 'Invalid score (must be 0-100)' });
          continue;
        }

        const grade = getGrade(score);
        const remark = getRemark(score);

        insertStmt.run(student.id, course_id, academic_session, req.user.id, score, grade, remark);
        inserted.push({ reg_number: item.reg_number, score, grade, remark });
      }
    });

    insertMany(resultData);

    res.json({
      message: `Successfully uploaded ${inserted.length} results`,
      inserted,
      errors,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/results/:id - Admin edits a result
router.put('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const { score } = req.body;
    const resultId = req.params.id;

    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'Score is required' });
    }

    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      return res.status(400).json({ error: 'Invalid score (must be 0-100)' });
    }

    const existing = db.prepare('SELECT * FROM results WHERE id = ?').get(resultId);
    if (!existing) {
      return res.status(404).json({ error: 'Result not found' });
    }

    const grade = getGrade(numScore);
    const remark = getRemark(numScore);

    db.prepare(`
      UPDATE results SET score = ?, grade = ?, remark = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(numScore, grade, remark, resultId);

    res.json({ message: 'Result updated', score: numScore, grade, remark });
  } catch (err) {
    console.error('Edit result error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/results/uploaded - Get results uploaded by current lecturer
router.get('/uploaded', authenticate, isLecturer, (req, res) => {
  try {
    const { course_id, academic_session } = req.query;

    let query = `
      SELECT r.*, s.reg_number, s.full_name as student_name, c.course_code, c.course_name, c.credit_units
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'lecturer') {
      query += ' AND r.uploaded_by = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'hod') {
      // HODs see results they uploaded plus results in their department's courses
      query += ' AND (r.uploaded_by = ? OR UPPER(c.department) = UPPER(?))';
      params.push(req.user.id, req.user.department);
    }
    if (course_id) {
      query += ' AND r.course_id = ?';
      params.push(course_id);
    }
    if (academic_session) {
      query += ' AND r.academic_session = ?';
      params.push(academic_session);
    }

    query += ' ORDER BY c.course_code, s.reg_number';
    const results = db.prepare(query).all(...params);
    res.json(results);
  } catch (err) {
    console.error('Get uploaded results error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/results/all - Admin gets all results with filters
router.get('/all', authenticate, isAdmin, (req, res) => {
  try {
    const { reg_number, course_id, academic_session, level, semester } = req.query;

    let query = `
      SELECT r.*, s.reg_number, s.full_name as student_name, s.department,
             c.course_code, c.course_name, c.credit_units, c.level, c.semester,
             u.full_name as uploaded_by_name
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      JOIN users u ON r.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (reg_number) {
      query += ' AND s.reg_number LIKE ?';
      params.push(`%${reg_number}%`);
    }
    if (course_id) {
      query += ' AND r.course_id = ?';
      params.push(course_id);
    }
    if (academic_session) {
      query += ' AND r.academic_session = ?';
      params.push(academic_session);
    }
    if (level) {
      query += ' AND c.level = ?';
      params.push(parseInt(level));
    }
    if (semester) {
      query += ' AND c.semester = ?';
      params.push(parseInt(semester));
    }

    query += ' ORDER BY s.reg_number, c.course_code';
    const results = db.prepare(query).all(...params);
    res.json(results);
  } catch (err) {
    console.error('Get all results error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
