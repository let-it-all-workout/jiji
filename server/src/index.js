const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc) in dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in dev; restrict in production via CORS_ORIGIN env
    }
  },
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiters
const resultLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limit for authenticated staff (they have their own access controls)
  skip: (req) => !!req.headers.authorization,
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 login attempts per 1 min
  message: { error: 'Too many login attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const disputeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 disputes per 5 min
  message: { error: 'Too many dispute submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // 15 verification checks per minute
  message: { error: 'Too many verification requests. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
const authRoutes = require('./routes/auth');
const resultRoutes = require('./routes/results');
const studentRoutes = require('./routes/students');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const disputeRoutes = require('./routes/disputes');
const settingsRoutes = require('./routes/settings');
const pdfRoutes = require('./routes/pdf');
const departmentRoutes = require('./routes/departments');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/results', resultLimiter, resultRoutes);
app.use('/api/students/verify', verifyLimiter);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/disputes', disputeLimiter, disputeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/pdf', resultLimiter, pdfRoutes);

// 404 handler for unknown API routes (must come before the SPA catchall)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static frontend in production
const clientPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
