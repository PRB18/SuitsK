'use strict';
/**
 * auth.js — Authentication router  (/api/auth/*)
 *
 * Security model:
 *   - Two independent scrypt derivations from the same password:
 *       1. verifierKey  = scrypt(password, verifierSalt, 32)
 *          → stored as hex in config.json to check password correctness
 *       2. dbKey        = scrypt(password, dbSalt, 32)
 *          → NEVER stored anywhere; passed directly to SQLCipher via
 *            PRAGMA key = "x'<hex>'" to unlock the encrypted database;
 *            gone from memory when the DB is locked.
 *   - The two salts are different random values, so dbKey is not
 *     derivable from verifierKey (or vice versa) without the password.
 *   - config.json stores: { verifierSalt, verifierHash, dbSalt }
 *     — no raw key is ever written to disk.
 *
 * Encryption:
 *   - SQLCipher encrypts every page of the .db file with AES-256-CBC.
 *   - No application-layer encryption needed — the whole file is
 *     ciphertext. The data column stores plain JSON inside SQLCipher.
 *
 * Brute-force mitigation:
 *   - scrypt (N=65536, r=8, p=1, maxmem=~134MB) adds ~100-200ms cost
 *   - Failed unlock adds FAIL_DELAY_MS additional artificial delay
 *
 * Edge-case:
 *   - config.json present but suits.db missing → 500 with clear message
 *     instructing the user to delete config.json and start over.
 */

const express  = require('express');
const crypto   = require('crypto');
const fs       = require('fs');

const { openDatabase, closeDatabase, isUnlocked, getDbPath } = require('./db');
const { CONFIG_PATH, ensureDataDir, createVaultBackup } = require('./storage');

const router = express.Router();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// scrypt parameters
// N=65536 (2^16) — strong KDF, ~100-200ms per derivation on modern hardware
// maxmem must be set explicitly: Node 24's default 32MB cap rejects N=65536 with r=8
const SCRYPT_N      = 65536;
const SCRYPT_R      = 8;
const SCRYPT_P      = 1;
const KEY_LEN       = 32;                              // 256-bit key
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;  // ~134MB — well within RAM

// Artificial delay appended to every failed unlock response
// (on top of the ~100-200ms scrypt cost already incurred)
const FAIL_DELAY_MS = 300;

// Resolve and migrate the local vault before any status or unlock request.
ensureDataDir();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a 32-byte key from a password + hex-encoded salt using scrypt.
 * @param {string} password
 * @param {string} saltHex
 * @returns {Buffer}
 */
function deriveKey(password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto.scryptSync(password, salt, KEY_LEN, {
    N:      SCRYPT_N,
    r:      SCRYPT_R,
    p:      SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
}

function configExists() {
  return fs.existsSync(CONFIG_PATH);
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

/**
 * Write config.json atomically: write to .tmp then rename.
 * @param {{ verifierSalt: string, verifierHash: string, dbSalt: string }} data
 */
function writeConfig(data) {
  ensureDataDir();
  const tmp = CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_PATH);
}

/**
 * Detect the "config exists but DB missing" crash-recovery state.
 * @returns {string|null} error message, or null if state is consistent
 */
function detectInconsistency() {
  const cfgExists = configExists();
  const dbExists  = fs.existsSync(getDbPath());

  if (cfgExists && !dbExists) {
    return (
      'Setup appears incomplete: config.json exists but suits.db is missing. ' +
      'This usually means a previous setup attempt crashed mid-way. ' +
      'To recover: delete the file at "' + CONFIG_PATH + '" and restart the app to begin setup again. ' +
      'Warning: if you had previously saved suits, they cannot be recovered from this state.'
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/auth/status
// ---------------------------------------------------------------------------
router.get('/status', (req, res) => {
  const inconsistency = detectInconsistency();
  if (inconsistency) {
    return res.status(500).json({ error: inconsistency, inconsistentState: true });
  }

  res.json({
    firstRun: !configExists(),
    unlocked: isUnlocked(),
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/setup  { password: string }
// ---------------------------------------------------------------------------
router.post('/setup', (req, res) => {
  if (configExists()) {
    return res.status(409).json({ error: 'Password already set. Use /unlock instead.' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  try {
    // Generate two independent random salts
    const verifierSalt = crypto.randomBytes(32).toString('hex');
    const dbSalt       = crypto.randomBytes(32).toString('hex');

    // Derive verifier (for future password checks) — stored in config.json
    const verifierKey  = deriveKey(password, verifierSalt);

    // Derive DB encryption key — NEVER stored anywhere
    const dbKey        = deriveKey(password, dbSalt);

    // Write config: only verifier hash and both salts, no raw key
    writeConfig({
      verifierSalt,
      verifierHash: verifierKey.toString('hex'),
      dbSalt,
    });

    // Create the SQLCipher-encrypted database and build schema
    openDatabase(dbKey, /* isNew= */ true);

    res.json({ ok: true, message: 'Password set and encrypted database created.' });
  } catch (err) {
    // Roll back partial config on failure
    try { if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH); } catch (_) {}
    console.error('[setup] Error:', err);
    res.status(500).json({ error: 'Setup failed: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/unlock  { password: string }
// ---------------------------------------------------------------------------
router.post('/unlock', async (req, res) => {
  if (!configExists()) {
    return res.status(400).json({ error: 'No password set yet. Use /setup first.' });
  }

  const inconsistency = detectInconsistency();
  if (inconsistency) {
    return res.status(500).json({ error: inconsistency, inconsistentState: true });
  }

  if (isUnlocked()) {
    return res.json({ ok: true, message: 'Already unlocked.' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const cfg = readConfig();

  // Step 1: Verify password via the stored verifier hash (timing-safe compare)
  const candidateVerifier = deriveKey(password, cfg.verifierSalt);
  const expectedVerifier  = Buffer.from(cfg.verifierHash, 'hex');
  const passwordCorrect   = crypto.timingSafeEqual(candidateVerifier, expectedVerifier);

  if (!passwordCorrect) {
    // Artificial delay to rate-limit brute-force attempts
    await new Promise(resolve => setTimeout(resolve, FAIL_DELAY_MS));
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  // Step 2: Derive the DB key (only reached with correct password) and unlock
  const dbKey = deriveKey(password, cfg.dbSalt);

  try {
    openDatabase(dbKey, /* isNew= */ false);
    res.json({ ok: true, message: 'Database unlocked.' });
  } catch (err) {
    console.error('[unlock] DB open failed:', err);
    res.status(500).json({ error: 'Failed to open database: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/lock
// ---------------------------------------------------------------------------
router.post('/lock', (req, res) => {
  closeDatabase();
  res.json({ ok: true, message: 'Database locked.' });
});

// ---------------------------------------------------------------------------
// POST /api/auth/backup
// ---------------------------------------------------------------------------
router.post('/backup', (req, res) => {
  if (!isUnlocked()) {
    return res.status(423).json({ error: 'Unlock the vault before creating a backup.' });
  }

  try {
    const backup = createVaultBackup();
    res.json({ ok: true, backupName: backup.backupName });
  } catch (err) {
    console.error('[backup] Error:', err);
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

module.exports = router;
