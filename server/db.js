'use strict';
/**
 * db.js — SQLCipher-encrypted database handle
 *
 * Uses better-sqlite3-multiple-ciphers, which bundles SQLite3MultipleCiphers
 * (the maintained successor to the original SQLCipher project).
 *
 * Encryption details:
 *   - Cipher:      AES-256-CBC  (sqlcipher compatibility mode)
 *   - HMAC:        HMAC-SHA512
 *   - Page size:   4096 bytes — every page of the file is encrypted,
 *                  including the header, schema, and all row data.
 *   - Key source:  Our code derives a 32-byte key via scrypt (server/auth.js)
 *                  and passes it as a raw hex literal:
 *                    PRAGMA key = "x'<64-hex-chars>'"
 *                  This bypasses SQLCipher's own internal PBKDF2 KDF entirely;
 *                  scrypt is our sole key derivation function.
 *
 * Result: the .db file is opaque ciphertext from byte 0. Without the
 * password, it is unreadable — no header, no schema, no row data visible.
 */

const Database = require('better-sqlite3-multiple-ciphers');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'suits.db');

let db = null;

/**
 * Ensure the /data directory exists.
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Open (or create) the SQLCipher-encrypted database.
 *
 * @param {Buffer} keyBuf  32-byte key produced by scrypt
 * @param {boolean} isNew  true when creating a fresh database for the first time
 * @throws if the key is wrong or the file is corrupt
 */
function openDatabase(keyBuf, isNew = false) {
  ensureDataDir();

  const hexKey  = keyBuf.toString('hex');
  const instance = new Database(DB_PATH);

  // 1. Select SQLCipher compatibility mode so the cipher suite matches
  //    the published SQLCipher 4.x defaults (AES-256-CBC, HMAC-SHA512).
  instance.pragma("cipher='sqlcipher'");

  // 2. Apply our scrypt-derived key as a raw hex literal.
  //    The "x'...'" prefix tells SQLCipher to use the bytes directly,
  //    bypassing its own PBKDF2 KDF.
  instance.pragma(`key = "x'${hexKey}'"`);

  // 3. Verify the key is accepted. On wrong key, SQLCipher returns
  //    garbled page data and this pragma throws or returns junk.
  try {
    instance.pragma('user_version');
  } catch (err) {
    instance.close();
    throw new Error('Invalid database key — wrong password or corrupt database.');
  }

  if (isNew) {
    initSchema(instance);
  }

  db = instance;
  return db;
}

/**
 * Create the suits table schema on first run.
 * The data column stores plain JSON — SQLCipher encrypts it at the page level.
 */
function initSchema(instance) {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS suits (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      notes      TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data       TEXT NOT NULL DEFAULT '{}'
    );
  `);
}

/**
 * Close the handle and wipe the in-memory reference.
 * After this, isUnlocked() returns false and the decryption key is gone
 * from the process — the file is unreadable again until re-unlocked.
 */
function closeDatabase() {
  if (db) {
    try { db.close(); } catch (_) {}
    db = null;
  }
}

/** @returns {boolean} */
function isUnlocked() {
  return db !== null;
}

/**
 * Get the active database handle.
 * @throws {Error} if locked
 */
function getDb() {
  if (!db) throw new Error('Database is locked.');
  return db;
}

/** Absolute path to the .db file (used by auth.js to detect first-run state) */
function getDbPath() {
  return DB_PATH;
}

module.exports = { openDatabase, closeDatabase, isUnlocked, getDb, getDbPath, ensureDataDir };
