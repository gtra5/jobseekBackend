/**
 * Express App Configuration
 * Main application file that configures middleware and routes
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const externalJobRoutes = require('./routes/externalJobRoutes');
const professionRoutes = require('./routes/professionRoutes');
const skillsRoutes = require('./routes/skillsRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Trust the first proxy hop (required on Render/Heroku/etc.)
// Must be set BEFORE express-rate-limit, which reads req.ip
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
// Cross-origin credentials (cookies) require:
//   - credentials: true on the server
//   - withCredentials: true on the client
//   - an explicit origin (not a wildcard) in the response
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,          // primary — must be set on Render
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ].filter(Boolean); // remove undefined/null if FRONTEND_URL is not set

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    }
  },
  credentials: true,   // required for cross-origin cookie transmission
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for httpOnly cookies
app.use(cookieParser());

// NoSQL injection protection
// Manual sanitization for Express 5.x compatibility
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = Array.isArray(obj) ? [] : {};
    // Object.keys() works regardless of prototype (including the
    // null-prototype objects Node's querystring parser returns for
    // req.query in Express 5), unlike obj.hasOwnProperty(key).
    for (const key of Object.keys(obj)) {
      // Replace MongoDB operators with safe characters
      const sanitizedKey = key.replace(/^\$/, '_');
      sanitized[sanitizedKey] = typeof obj[key] === 'object' ? sanitize(obj[key]) : obj[key];
    }
    return sanitized;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);

  // req.query is a getter-only property in Express 5 — assigning to it
  // (req.query = ...) throws. Sanitize in place instead of replacing it.
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitize(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, sanitizedQuery);
  }

  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 100, // generous in dev, unchanged in prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5, // Higher limit for development
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Stricter rate limiting for external job sourcing.
// Every request fans out to third-party APIs (Adzuna, Findwork, Remotive,
// Arbeitnow), so it's far more expensive than a normal DB lookup.
const externalJobsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 200 : 30,
  message: 'Too many external job requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/external-jobs', externalJobsLimiter);

// Looser rate limiting for chat and notifications.
// Now that messages are pushed over Socket.io rather than polled, this
// mainly needs headroom for normal page interaction — but it keeps these
// routes on their own budget so they can never starve, or be starved by,
// unrelated endpoints sharing the global limiter.
const realtimeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 500 : 300,
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/chat', realtimeLimiter);
app.use('/api/notifications', realtimeLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/external-jobs', externalJobRoutes);
app.use('/api/professions', professionRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Jobseek API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      jobs: '/api/jobs',
      applications: '/api/applications',
      notifications: '/api/notifications',
      externalJobs: '/api/external-jobs',
      assessments: '/api/assessments',
    },
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;