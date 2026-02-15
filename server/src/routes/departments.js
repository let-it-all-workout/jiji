const express = require('express');
const db = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments - list all departments (any authenticated staff)
router.get('/', authenticate, (req, res) => {
  try {
    const departments = db.prepare('SELECT * FROM departments ORDER BY name').all();
    res.json(departments);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/departments - create a department (admin only)
router.post('/', authenticate, isAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const trimmed = name.trim();

    // Check for duplicate (case-insensitive)
    const existing = db.prepare('SELECT id FROM departments WHERE UPPER(name) = UPPER(?)').get(trimmed);
    if (existing) {
      return res.status(409).json({ error: 'Department already exists' });
    }

    const result = db.prepare('INSERT INTO departments (name) VALUES (?)').run(trimmed);
    res.status(201).json({ id: result.lastInsertRowid, name: trimmed });
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/departments/:id - rename a department (admin only)
router.put('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const { name } = req.body;
    const deptId = req.params.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const trimmed = name.trim();

    // Check for duplicate name (case-insensitive, exclude self)
    const duplicate = db.prepare('SELECT id FROM departments WHERE UPPER(name) = UPPER(?) AND id != ?').get(trimmed, deptId);
    if (duplicate) {
      return res.status(409).json({ error: 'Another department with this name already exists' });
    }

    const oldName = dept.name;

    // Update the department name
    db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(trimmed, deptId);

    // Cascade rename across all tables that reference department by name
    db.prepare('UPDATE users SET department = ? WHERE UPPER(department) = UPPER(?)').run(trimmed, oldName);
    db.prepare('UPDATE students SET department = ? WHERE UPPER(department) = UPPER(?)').run(trimmed, oldName);
    db.prepare('UPDATE courses SET department = ? WHERE UPPER(department) = UPPER(?)').run(trimmed, oldName);

    res.json({ id: parseInt(deptId), name: trimmed });
  } catch (err) {
    console.error('Update department error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/departments/:id - delete a department (admin only)
router.delete('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const deptId = req.params.id;
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(deptId);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department is in use
    const studentCount = db.prepare('SELECT COUNT(*) as c FROM students WHERE UPPER(department) = UPPER(?)').get(dept.name).c;
    const userCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE UPPER(department) = UPPER(?)').get(dept.name).c;
    const courseCount = db.prepare('SELECT COUNT(*) as c FROM courses WHERE UPPER(department) = UPPER(?)').get(dept.name).c;

    if (studentCount > 0 || userCount > 0 || courseCount > 0) {
      return res.status(400).json({
        error: `Cannot delete: department is used by ${studentCount} student(s), ${userCount} staff, and ${courseCount} course(s). Reassign them first.`,
      });
    }

    db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
