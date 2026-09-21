'use strict';
/**
 * index.js — Express application entry point (cloud version)
 *
 * Performance optimisations applied:
 *   - Gzip/deflate compression via `compression` middleware (reduces payload by ~70-80%)
 *   - Long-lived cache headers for static assets (JS/CSS/images) — 1 year for versioned files
 *   - ETag support for conditional GETs (304 responses avoid re-downloading unchanged files)
 *   - Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
 *   - /ping keep-alive endpoint for UptimeRobot (prevents Render cold starts)
 */

const express      = require('express');
const path         = require('path');
const session      = require('express-session');
const compression  = require('compression');

const authRouter         = require('./auth');
const suitsRouter        = require('./suits');
const clientsRouter      = require('./clients');
const inventoryRouter    = require('./inventory');
const scheduleRouter     = require('./schedule');
const workshopRouter     = require('./workshop');
const shortcomingsRouter = require('./shortcomings');
const b2bRouter          = require('./b2b');
const requireUnlocked    = require('./middleware/requireUnlocked');
const { initDatabase }   = require('./db');

const app  = express();
const PORT = process.env.PORT || 3737;
const HOST = '0.0.0.0'; // Render requires 0.0.0.0

// ---------------------------------------------------------------------------
// Trust Render's reverse proxy so secure cookies work over HTTPS
// ---------------------------------------------------------------------------
app.set('trust proxy', 1);

// ---------------------------------------------------------------------------
// Gzip compression — reduces JS/CSS/JSON payloads by ~70-80%
// Applied BEFORE static middleware so all responses are compressed
// ---------------------------------------------------------------------------
app.use(compression({ level: 6, threshold: 1024 }));  // level 6 = best speed/size tradeoff

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ---------------------------------------------------------------------------
// Session middleware
// ---------------------------------------------------------------------------
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    // On Render (HTTPS), set secure: true. Locally (HTTP) it must be false.
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Health endpoint — hit this every 5 min with UptimeRobot to keep Render awake
// ---------------------------------------------------------------------------
app.get('/ping', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ---------------------------------------------------------------------------
// Static files
//
// We use ETag and Last-Modified for efficient caching (304 Not Modified).
// We DO NOT use maxAge: '1y' because native ES module imports (e.g. import './api.js')
// don't have cache-buster query strings, so aggressive caching breaks updates.
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag:         true,
  lastModified: true,
  maxAge:       0, // Force browser to re-verify ETag on every request
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', 'no-cache'); // Requires re-validation with server (ETag)
    }
  },
}));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/auth',         authRouter);
app.use('/api/suits',        requireUnlocked, suitsRouter);
app.use('/api/clients',      requireUnlocked, clientsRouter);
app.use('/api/projects',     requireUnlocked, clientsRouter);   // /api/projects/:id routes
app.use('/api/inventory',    requireUnlocked, inventoryRouter);
app.use('/api/schedule',     requireUnlocked, scheduleRouter);
app.use('/api/calendar',     requireUnlocked, scheduleRouter);   // /api/calendar/* sub-paths
app.use('/api/hierarchy',    requireUnlocked, workshopRouter);
app.use('/api/workshop',     requireUnlocked, workshopRouter);
app.use('/api/shortcomings', requireUnlocked, shortcomingsRouter);
app.use('/api/b2b',          requireUnlocked, b2bRouter);

// Catch unhandled /api/* routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Start — initialise DB first, then listen
// ---------------------------------------------------------------------------
initDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`\n  Krishna Suits Configurator`);
      console.log(`  ─────────────────────────────`);
      console.log(`  Running at  http://${HOST}:${PORT}`);
      console.log(`  Press Ctrl+C to stop.\n`);
    });
  })
  .catch(err => {
    console.error('[startup] Failed to connect to database:', err.message);
    process.exit(1);
  });
