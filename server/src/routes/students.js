const express = require('express');
const db = require('../config/db');
const { authenticate, isAdmin, isHOD, isLecturer } = require('../middleware/auth');

const router = express.Router();

// GET /api/students/verify - Public endpoint for students to check if they're registered
router.get('/verify', (req, res) => {
  try {
    const { reg } = req.query;
    if (!reg) {
      return res.status(400).json({ error: 'Registration number is required' });
    }

    const student = db.prepare(
      'SELECT full_name, department, reg_number FROM students WHERE UPPER(reg_number) = UPPER(?)'
    ).get(reg.trim());

    if (student) {
      res.json({ found: true, full_name: student.full_name, department: student.department, reg_number: student.reg_number });
    } else {
      res.json({ found: false });
    }
  } catch (err) {
    console.error('Verify student error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/students - list students (any authenticated staff; HOD: own dept only)
router.get('/', authenticate, (req, res) => {
  // Any authenticated staff can view students (needed for result templates)
  if (!['admin', 'hod', 'registrar', 'lecturer'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  try {
    const { department, search } = req.query;
    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    // HOD can only see their own department's students (case-insensitive)
    // Registrar and admin can see all departments
    if (req.user.role === 'hod') {
      query += ' AND UPPER(department) = UPPER(?)';
      params.push(req.user.department);
    } else if (department) {
      query += ' AND UPPER(department) = UPPER(?)';
      params.push(department);
    }

    if (search) {
      query += ' AND (reg_number LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY reg_number';
    const students = db.prepare(query).all(...params);
    res.json(students);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/students - create a student (HOD: own dept, Admin: any)
router.post('/', authenticate, isHOD, (req, res) => {
  try {
    const { reg_number, full_name, department } = req.body;

    if (!reg_number || !full_name || !department) {
      return res.status(400).json({ error: 'reg_number, full_name, and department are required' });
    }

    // HOD can only add students to their department (case-insensitive); registrar/admin can add to any
    if (req.user.role === 'hod' && department.trim().toUpperCase() !== req.user.department.trim().toUpperCase()) {
      return res.status(403).json({ error: `You can only add students to the ${req.user.department} department` });
    }

    const existing = db.prepare('SELECT id FROM students WHERE UPPER(reg_number) = UPPER(?)').get(reg_number.trim());
    if (existing) {
      return res.status(409).json({ error: 'Student with this reg number already exists' });
    }

    const result = db.prepare(
      'INSERT INTO students (reg_number, full_name, department) VALUES (?, ?, ?)'
    ).run(reg_number.trim().toUpperCase(), full_name.trim(), department.trim());

    res.status(201).json({ id: result.lastInsertRowid, reg_number, full_name, department });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/students/bulk - bulk create students (HOD: own dept, Admin: any)
router.post('/bulk', authenticate, isHOD, (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'students array is required' });
    }

    const insertStmt = db.prepare(
      'INSERT OR IGNORE INTO students (reg_number, full_name, department) VALUES (?, ?, ?)'
    );

    const inserted = [];
    const errors = [];

    const insertMany = db.transaction((items) => {
      for (const s of items) {
        if (!s.reg_number || !s.full_name || !s.department) {
          errors.push({ ...s, error: 'Missing required fields' });
          continue;
        }

        // HOD can only add students to their department; registrar/admin can add to any
        if (req.user.role === 'hod' && s.department.trim().toUpperCase() !== req.user.department.trim().toUpperCase()) {
          errors.push({ ...s, error: `You can only add students to ${req.user.department}` });
          continue;
        }

        try {
          const result = insertStmt.run(s.reg_number.trim().toUpperCase(), s.full_name.trim(), s.department.trim());
          if (result.changes > 0) {
            inserted.push(s);
          } else {
            errors.push({ ...s, error: 'Already exists' });
          }
        } catch (e) {
          errors.push({ ...s, error: e.message });
        }
      }
    });

    insertMany(students);
    res.json({ message: `Inserted ${inserted.length} students`, inserted, errors });
  } catch (err) {
    console.error('Bulk create students error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/students/:id - update a student (HOD: own dept, Admin: any)
router.put('/:id', authenticate, isHOD, (req, res) => {
  try {
    const { full_name, department } = req.body;
    const studentId = req.params.id;

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // HOD can only edit students in their department; registrar/admin can edit any
    if (req.user.role === 'hod' && student.department.trim().toUpperCase() !== req.user.department.trim().toUpperCase()) {
      return res.status(403).json({ error: 'You can only edit students in your department' });
    }

    db.prepare('UPDATE students SET full_name = COALESCE(?, full_name), department = COALESCE(?, department) WHERE id = ?')
      .run(full_name || null, department || null, studentId);

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    res.json(updated);
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/students/:id - delete a student (admin only)
router.delete('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const studentId = req.params.id;
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete disputes first (they reference results), then results, then student
    db.prepare('DELETE FROM disputes WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM results WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM students WHERE id = ?').run(studentId);

    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
