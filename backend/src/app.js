const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const { globalRateLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 + Error handlers (must be last) ──────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
