'use strict';
/**
 * index.js — Express application entry point
 *
 * Binds ONLY to 127.0.0.1 (localhost) — never reachable from the network.
 * Serves the static frontend from /public and mounts API routers.
 *
 * No CORS middleware — this is a same-origin app: Express serves both
 * the API and the static frontend from the same origin.
 */

const express = require('express');
const path    = require('path');

const authRouter          = require('./auth');
const suitsRouter         = require('./suits');
const requireUnlocked     = require('./middleware/requireUnlocked');

const app  = express();
const PORT = 3737;
const HOST = '127.0.0.1'; // NEVER 0.0.0.0

// ---------------------------------------------------------------------------
// Body parsing — hard limit to 1 mb
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Static files (the browser UI lives here)
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/auth',  authRouter);
app.use('/api/suits', requireUnlocked, suitsRouter);

// ---------------------------------------------------------------------------
// Explicit API 404 handler: catches ALL HTTP methods on unhandled /api/* routes
// Guarantees no unhandled API route can ever be swallowed into an HTML 200.
// ---------------------------------------------------------------------------
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ---------------------------------------------------------------------------
// SPA catch-all: serve index.html for client-side navigation (non-API GETs)
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, HOST, () => {
  console.log(`\n  Krishna Suits Configurator`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Running at  http://${HOST}:${PORT}`);
  console.log(`  Press Ctrl+C to stop.\n`);
});
