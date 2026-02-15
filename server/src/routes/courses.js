const express = require('express');
const db = require('../config/db');
const { authenticate, isAdmin, isLecturer } = require('../middleware/auth');

const router = express.Router();

// GET /api/courses - list all courses
router.get('/', authenticate, isLecturer, (req, res) => {
  try {
    const { department, level, semester } = req.query;
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (department) {
      query += ' AND UPPER(department) = UPPER(?)';
      params.push(department);
    }
    if (level) {
      query += ' AND level = ?';
      params.push(parseInt(level));
    }
    if (semester) {
      query += ' AND semester = ?';
      params.push(parseInt(semester));
    }

    query += ' ORDER BY level, semester, course_code';
    const courses = db.prepare(query).all(...params);
    res.json(courses);
  } catch (err) {
    console.error('Get courses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/courses - create a course (admin only)
router.post('/', authenticate, isAdmin, (req, res) => {
  try {
    const { course_code, course_name, credit_units, department, level, semester } = req.body;

    if (!course_code || !course_name || !credit_units || !department || !level || !semester) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const units = parseInt(credit_units);
    if (isNaN(units) || units < 1 || units > 10) {
      return res.status(400).json({ error: 'Credit units must be between 1 and 10' });
    }

    if (![100, 200, 300, 400, 500].includes(parseInt(level))) {
      return res.status(400).json({ error: 'Level must be 100, 200, 300, 400, or 500' });
    }
    if (![1, 2].includes(parseInt(semester))) {
      return res.status(400).json({ error: 'Semester must be 1 or 2' });
    }

    const existing = db.prepare('SELECT id FROM courses WHERE UPPER(course_code) = UPPER(?)').get(course_code.trim());
    if (existing) {
      return res.status(409).json({ error: 'Course with this code already exists' });
    }

    const result = db.prepare(
      'INSERT INTO courses (course_code, course_name, credit_units, department, level, semester) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(course_code.trim().toUpperCase(), course_name.trim(), parseInt(credit_units), department.trim(), parseInt(level), parseInt(semester));

    res.status(201).json({
      id: result.lastInsertRowid,
      course_code, course_name, credit_units: parseInt(credit_units), department, level: parseInt(level), semester: parseInt(semester),
    });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/courses/:id - update a course (admin only)
router.put('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const { course_name, credit_units, department, level, semester } = req.body;
    const courseId = req.params.id;

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    db.prepare(`
      UPDATE courses SET
        course_name = COALESCE(?, course_name),
        credit_units = COALESCE(?, credit_units),
        department = COALESCE(?, department),
        level = COALESCE(?, level),
        semester = COALESCE(?, semester)
      WHERE id = ?
    `).run(
      course_name || null,
      credit_units ? parseInt(credit_units) : null,
      department || null,
      level ? parseInt(level) : null,
      semester ? parseInt(semester) : null,
      courseId
    );

    const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    res.json(updated);
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/courses/:id - delete a course (admin only)
router.delete('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const courseId = req.params.id;
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Delete disputes first (they reference results), then results, then course
    db.prepare('DELETE FROM disputes WHERE result_id IN (SELECT id FROM results WHERE course_id = ?)').run(courseId);
    db.prepare('DELETE FROM results WHERE course_id = ?').run(courseId);
    db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
