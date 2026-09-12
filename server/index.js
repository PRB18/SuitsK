'use strict';
/**
 * index.js — Express application entry point (cloud version)
 *
 * Changes from the local version:
 *   - Binds to 0.0.0.0 (required for Render's reverse proxy)
 *   - Adds express-session (session-based vault unlock)
 *   - Adds /ping health endpoint (for UptimeRobot keep-alive)
 *   - Initialises Turso DB client on startup
 */

const express = require('express');
const path    = require('path');
const session = require('express-session');

const authRouter      = require('./auth');
const suitsRouter     = require('./suits');
const requireUnlocked = require('./middleware/requireUnlocked');
const { initDatabase } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3737;
const HOST = '0.0.0.0'; // Render requires 0.0.0.0

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
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/auth',  authRouter);
app.use('/api/suits', requireUnlocked, suitsRouter);

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
