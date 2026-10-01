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
const MemoryStore  = require('memorystore')(session);
const rateLimit    = require('express-rate-limit');
const compression  = require('compression');
const timeout      = require('connect-timeout');
const cookieParser = require('cookie-parser');

const authRouter         = require('./auth');
const suitsRouter        = require('./suits');
const clientsRouter      = require('./clients');
const inventoryRouter    = require('./inventory');
const scheduleRouter     = require('./schedule');
const workshopRouter     = require('./workshop');
const shortcomingsRouter = require('./shortcomings');
const b2bRouter          = require('./b2b');
const fabricReceiptsRouter = require('./fabricReceipts');
const weeklyReportRouter  = require('./weeklyReport');
const requireUnlocked    = require('./middleware/requireUnlocked');
const { initDatabase }   = require('./db');

const app  = express();
const PORT = process.env.PORT || 3737;
const HOST = '0.0.0.0'; // Render requires 0.0.0.0

// ---------------------------------------------------------------------------
// Rate Limiting (Phase 1 Security Hardening)
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' }
});

app.use(cookieParser(process.env.SESSION_SECRET || 'dev-secret-change-in-production'));

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Limit each IP to 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

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
// Security headers (Phase 2 - Helmet & CSP)
// ---------------------------------------------------------------------------
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// ---------------------------------------------------------------------------
// Session middleware
// ---------------------------------------------------------------------------
app.use(session({
  name: 'ks_sid', // don't use default connect.sid
  secret:            process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave:            false,
  saveUninitialized: false,
  rolling:           true, // reset maxAge on every request
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    // On Render (HTTPS), set secure: true. Locally (HTTP) it must be false.
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ---------------------------------------------------------------------------
// Body parsing (Removed global parser — moved to individual routes for Phase 7 DoS Protection)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CSRF Protection (Phase 3)
// ---------------------------------------------------------------------------
const { doubleCsrf } = require("csrf-csrf");
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  getSessionIdentifier: (req) => req.session ? req.session.id : "missing-session",
  cookieName: "x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  },
  getTokenFromRequest: (req) => req.headers["x-csrf-token"],
});

// Endpoint for frontend to retrieve the token
app.get('/api/auth/csrf-token', (req, res) => {
  if (req.session && !req.session.csrfInit) {
    req.session.csrfInit = true;
  }
  res.json({ token: generateCsrfToken(req, res) });
});

// Apply CSRF protection to all other API routes
app.use('/api', doubleCsrfProtection);

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

// Global API timeout (30 seconds) — protect against slow-POST attacks
app.use('/api', timeout('30s'));

// Apply strict rate limiting and body limit (2kb) to auth routes
app.use('/api/auth', authLimiter, express.json({ limit: '2kb' }), express.urlencoded({ extended: false, limit: '2kb' }), authRouter);

// Apply general rate limiting to all other API routes
app.use('/api', apiLimiter);

// File-heavy or data-heavy routes (1MB limit)
app.use('/api/suits',        requireUnlocked, express.json({ limit: '1mb' }), express.urlencoded({ extended: false, limit: '1mb' }), suitsRouter);
app.use('/api',              requireUnlocked, express.json({ limit: '1mb' }), express.urlencoded({ extended: false, limit: '1mb' }), clientsRouter); // handles /clients and /projects

// Normal routes (50KB limit)
app.use('/api/inventory',    requireUnlocked, express.json({ limit: '50kb' }), express.urlencoded({ extended: false, limit: '50kb' }), inventoryRouter);
app.use('/api/shortcomings', requireUnlocked, express.json({ limit: '50kb' }), express.urlencoded({ extended: false, limit: '50kb' }), shortcomingsRouter);
app.use('/api/b2b',          requireUnlocked, express.json({ limit: '50kb' }), express.urlencoded({ extended: false, limit: '50kb' }), b2bRouter);
app.use('/api/fabric-receipts', requireUnlocked, express.json({ limit: '50kb' }), express.urlencoded({ extended: false, limit: '50kb' }), fabricReceiptsRouter);
app.use('/api',              requireUnlocked, express.json({ limit: '50kb' }), express.urlencoded({ extended: false, limit: '50kb' }), scheduleRouter);
app.use('/api',              requireUnlocked, express.json({ limit: '50kb' }), express.urlencoded({ extended: false, limit: '50kb' }), workshopRouter);

// Weekly report can take longer (60 seconds)
app.use('/api',              requireUnlocked, express.json({ limit: '5kb' }), express.urlencoded({ extended: false, limit: '5kb' }), (req, res, next) => {
  if (req.path.startsWith('/weekly-report')) req.clearTimeout(); // Let weekly report run longer (Render's native timeout is 100s)
  next();
}, weeklyReportRouter);

// Catch unhandled /api/* routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global Error Handler (prevents stack trace / internal msg leakage)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Security Environment Validator (Phase 8)
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'dev-secret-change-in-production')) {
  console.error('[startup] FATAL: Insecure SESSION_SECRET in production.');
  process.exit(1);
}
if (!process.env.VAULT_PASSWORD_HASH) {
  console.warn('[startup] WARNING: VAULT_PASSWORD_HASH is not set. The application may not unlock properly.');
}

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
