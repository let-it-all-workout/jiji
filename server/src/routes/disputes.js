const express = require('express');
const db = require('../config/db');
const { authenticate, isAdmin, isLecturer } = require('../middleware/auth');

const router = express.Router();

// POST /api/disputes - Student submits a dispute (public)
router.post('/', (req, res) => {
  try {
    const { reg_number, result_id, message } = req.body;

    if (!reg_number || !result_id || !message) {
      return res.status(400).json({ error: 'reg_number, result_id, and message are required' });
    }

    if (typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ error: 'Dispute message must be at least 10 characters' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Dispute message must be under 2000 characters' });
    }

    const student = db.prepare('SELECT id FROM students WHERE UPPER(reg_number) = UPPER(?)').get(reg_number.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const result = db.prepare('SELECT * FROM results WHERE id = ?').get(result_id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Verify this result belongs to the student
    if (result.student_id !== student.id) {
      return res.status(403).json({ error: 'This result does not belong to this student' });
    }

    // Check if student already has a pending dispute for this result
    const existingDispute = db.prepare(
      'SELECT id FROM disputes WHERE student_id = ? AND result_id = ? AND status = ?'
    ).get(student.id, result_id, 'pending');

    if (existingDispute) {
      return res.status(409).json({ error: 'You already have a pending dispute for this result' });
    }

    const insertResult = db.prepare(
      'INSERT INTO disputes (student_id, result_id, message) VALUES (?, ?, ?)'
    ).run(student.id, result_id, message);

    res.status(201).json({
      id: insertResult.lastInsertRowid,
      message: 'Dispute submitted successfully. The admin will review it.',
    });
  } catch (err) {
    console.error('Create dispute error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/disputes - Get all disputes (admin/lecturer)
router.get('/', authenticate, isLecturer, (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT d.*,
             s.reg_number, s.full_name as student_name, s.department,
             r.score, r.grade, r.remark, r.academic_session,
             c.course_code, c.course_name, c.level, c.semester
      FROM disputes d
      JOIN students s ON d.student_id = s.id
      JOIN results r ON d.result_id = r.id
      JOIN courses c ON r.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    // Lecturers only see disputes for results they uploaded
    if (req.user.role === 'lecturer') {
      query += ' AND r.uploaded_by = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'hod') {
      // HODs see disputes for results they uploaded or from their department
      query += ' AND (r.uploaded_by = ? OR UPPER(s.department) = UPPER(?))';
      params.push(req.user.id, req.user.department);
    }

    query += ' ORDER BY d.created_at DESC';
    const disputes = db.prepare(query).all(...params);
    res.json(disputes);
  } catch (err) {
    console.error('Get disputes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/disputes/:id - Admin resolves/rejects a dispute
router.put('/:id', authenticate, isAdmin, (req, res) => {
  try {
    const { status, admin_response, new_score } = req.body;
    const disputeId = req.params.id;

    if (!status || !['resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "resolved" or "rejected"' });
    }

    const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(disputeId);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status !== 'pending') {
      return res.status(400).json({ error: `Dispute has already been ${dispute.status}` });
    }

    // If resolving with a new score, update the result
    if (status === 'resolved' && new_score !== undefined && new_score !== '') {
      const { getGrade, getRemark } = require('../utils/gpa');
      const score = parseFloat(new_score);
      if (isNaN(score) || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Invalid score (must be 0-100)' });
      }
      const grade = getGrade(score);
      const remark = getRemark(score);

      db.prepare(`
        UPDATE results SET score = ?, grade = ?, remark = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(score, grade, remark, dispute.result_id);
    }

    db.prepare(`
      UPDATE disputes SET status = ?, admin_response = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, admin_response || '', disputeId);

    res.json({ message: `Dispute ${status}` });
  } catch (err) {
    console.error('Resolve dispute error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
