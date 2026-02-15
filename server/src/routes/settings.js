const express = require('express');
const db = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - get school settings (public)
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    res.json(settings || { school_name: 'My School', school_motto: '', school_logo_url: '', primary_color: '#1a365d' });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings - update school settings (admin only)
router.put('/', authenticate, isAdmin, (req, res) => {
  try {
    const { school_name, school_logo_url, school_motto, primary_color } = req.body;

    db.prepare(`
      UPDATE school_settings SET
        school_name = COALESCE(?, school_name),
        school_logo_url = COALESCE(?, school_logo_url),
        school_motto = COALESCE(?, school_motto),
        primary_color = COALESCE(?, primary_color),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      school_name || null,
      school_logo_url !== undefined ? school_logo_url : null,
      school_motto !== undefined ? school_motto : null,
      primary_color || null
    );

    const settings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get();
    res.json(settings);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/sessions - get unique academic sessions from uploaded results
router.get('/sessions', (req, res) => {
  try {
    const sessions = db.prepare(
      'SELECT DISTINCT academic_session FROM results ORDER BY academic_session DESC'
    ).all();
    res.json(sessions.map(s => s.academic_session));
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
