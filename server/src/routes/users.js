const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - list all lecturers (admin only)
router.get('/', authenticate, isAdmin, (req, res) => {
  try {
    const users = db.prepare(
      'SELECT id, full_name, email, role, department, created_at FROM users ORDER BY role, full_name'
    ).all();
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users - create a lecturer (admin only)
router.post('/', authenticate, isAdmin, (req, res) => {
  try {
    const { full_name, email, password, role, department } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE UPPER(email) = UPPER(?)').get(email.trim());
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const validRoles = ['admin', 'hod', 'registrar', 'lecturer'];
    const userRole = validRoles.includes(role) ? role : 'lecturer';

    // HOD must have a department
    if (userRole === 'hod' && !department) {
      return res.status(400).json({ error: 'Department is required for HOD role' });
    }
    const password_hash = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (full_name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)'
    ).run(full_name.trim(), email.trim().toLowerCase(), password_hash, userRole, department ? department.trim() : '');

    res.status(201).json({
      id: result.lastInsertRowid,
      full_name, email, role: userRole, department: department || '',
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:id - update a user (admin only)
router.put('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const { full_name, email, password, department } = req.body;
    const userId = req.params.id;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check email uniqueness if changing email
    if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const emailTaken = db.prepare('SELECT id FROM users WHERE UPPER(email) = UPPER(?) AND id != ?').get(email.trim(), userId);
      if (emailTaken) {
        return res.status(409).json({ error: 'Another user already has this email' });
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const password_hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId);
    }

    db.prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        department = COALESCE(?, department)
      WHERE id = ?
    `).run(full_name || null, email ? email.trim().toLowerCase() : null, department || null, userId);

    const updated = db.prepare('SELECT id, full_name, email, role, department FROM users WHERE id = ?').get(userId);
    res.json(updated);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id - delete a user (admin only)
router.delete('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself
    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has uploaded results
    const hasResults = db.prepare('SELECT COUNT(*) as count FROM results WHERE uploaded_by = ?').get(userId);
    if (hasResults.count > 0) {
      // Reassign results to admin instead of deleting
      const admin = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin');
      if (admin) {
        db.prepare('UPDATE results SET uploaded_by = ? WHERE uploaded_by = ?').run(admin.id, userId);
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
