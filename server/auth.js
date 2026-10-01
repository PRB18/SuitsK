'use strict';
/**
 * auth.js — Authentication router (/api/auth/*)
 *
 * Security model (cloud version):
 *   - Vault password is stored as a bcrypt hash in the VAULT_PASSWORD_HASH
 *     environment variable (set on Render — never in code or git).
 *   - On first run (no env var set): a setup flow lets the user set a password,
 *     which we hash and print to the console — you then paste it into Render's
 *     env vars and redeploy (one-time setup).
 *   - After correct password: req.session.unlocked = true
 *   - Session is stored server-side (express-session in-memory store)
 *   - All traffic is HTTPS on Render (TLS in transit)
 *   - SESSION_SECRET env var signs the session cookie (httpOnly, sameSite)
 *
 * Brute-force mitigation:
 *   - bcrypt cost factor 12 adds ~250ms per attempt
 *   - Additional FAIL_DELAY_MS on wrong password
 */

const express = require('express');
const bcrypt  = require('bcrypt');

const router = express.Router();

const FAIL_DELAY_MS  = 300;
const BCRYPT_ROUNDS  = 12;

// ---------------------------------------------------------------------------
// GET /api/auth/status
// ---------------------------------------------------------------------------
router.get('/status', (req, res) => {
  const hasPassword = !!process.env.VAULT_PASSWORD_HASH;
  res.json({
    firstRun: !hasPassword,
    unlocked: !!req.session?.unlocked,
  });
});

// ---------------------------------------------------------------------------
// IP-based Lockout (Mitigates brute-force if rate limiter is bypassed)
// ---------------------------------------------------------------------------
const failedAttempts = new Map();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

function checkLockout(ip) {
  const record = failedAttempts.get(ip);
  if (!record) return false;
  if (record.count >= MAX_FAILURES) {
    if (Date.now() - record.lastTime < LOCKOUT_MS) return true;
    failedAttempts.delete(ip); // lock expired
  }
  return false;
}

function recordFailure(ip) {
  const record = failedAttempts.get(ip) || { count: 0, lastTime: Date.now() };
  record.count++;
  record.lastTime = Date.now();
  failedAttempts.set(ip, record);
  if (record.count === MAX_FAILURES) {
    console.warn(`[auth] 🚨 IP ${ip} blocked for 30 minutes due to excessive failed logins.`);
  }
}

function clearFailures(ip) {
  failedAttempts.delete(ip);
}

// ---------------------------------------------------------------------------
// POST /api/auth/setup  { password: string }
// ---------------------------------------------------------------------------
router.post('/setup', async (req, res) => {
  if (process.env.VAULT_PASSWORD_HASH) {
    return res.status(409).json({ error: 'Password already set. Use /unlock instead.' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    console.log('\n  ╔══════════════════════════════════════════════════════╗');
    console.log('  ║  VAULT PASSWORD HASH — copy this to Render env vars ║');
    console.log('  ║  Variable name: VAULT_PASSWORD_HASH                 ║');
    console.log('  ╠══════════════════════════════════════════════════════╣');
    console.log(`  ║  ${hash}`);
    console.log('  ╚══════════════════════════════════════════════════════╝\n');

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.unlocked = true;
      res.json({
        ok: true,
        message: 'Password set for this session. Check server logs for the hash to save permanently.',
        // Security fix: the hash is NO LONGER returned in the response payload
      });
    });
  } catch (err) {
    console.error('[setup] Error:', err);
    res.status(500).json({ error: 'Setup failed: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/unlock  { password: string }
// ---------------------------------------------------------------------------
router.post('/unlock', async (req, res) => {
  const hash = process.env.VAULT_PASSWORD_HASH;

  if (!hash) {
    return res.status(400).json({ error: 'No password set yet. Use /setup first.' });
  }

  if (req.session?.unlocked) {
    return res.json({ ok: true, message: 'Already unlocked.' });
  }

  const clientIp = req.ip || req.connection.remoteAddress;
  if (checkLockout(clientIp)) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again in 30 minutes.' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }

  try {
    const correct = await bcrypt.compare(password, hash);

    if (!correct) {
      recordFailure(clientIp);
      await new Promise(resolve => setTimeout(resolve, FAIL_DELAY_MS));
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    clearFailures(clientIp);
    
    // Regenerate session ID on login to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error' });
      req.session.unlocked = true;
      res.json({ ok: true, message: 'Vault unlocked.' });
    });
  } catch (err) {
    console.error('[unlock] Error:', err);
    res.status(500).json({ error: 'Unlock failed: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/lock
// ---------------------------------------------------------------------------
router.post('/lock', (req, res) => {
  if (req.session) {
    req.session.unlocked = false;
  }
  res.json({ ok: true, message: 'Vault locked.' });
});

// ---------------------------------------------------------------------------
// POST /api/auth/backup  (no-op in cloud mode — data lives in Turso)
// ---------------------------------------------------------------------------
router.post('/backup', (req, res) => {
  res.json({ ok: true, message: 'Data is stored in Turso cloud — no local backup needed.' });
});

module.exports = router;
