const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'school-result-checker-secret-key-change-in-production';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// HOD, Registrar, or Admin can manage students
function isHOD(req, res, next) {
  if (!['admin', 'hod', 'registrar'].includes(req.user.role)) {
    return res.status(403).json({ error: 'HOD, registrar, or admin access required' });
  }
  next();
}

// Registrar or Admin (all-department student management)
function isRegistrar(req, res, next) {
  if (!['admin', 'registrar'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Registrar or admin access required' });
  }
  next();
}

// Lecturer, HOD, or Admin can upload results
function isLecturer(req, res, next) {
  if (!['admin', 'hod', 'lecturer'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

module.exports = { authenticate, isAdmin, isHOD, isRegistrar, isLecturer, JWT_SECRET };
