'use strict';
/**
 * db.js — Turso (cloud libSQL) database client
 *
 * Replaces the local SQLCipher file with a cloud-hosted libSQL database.
 * Security model:
 *   - All traffic is TLS-encrypted in transit (Turso enforces HTTPS/WSS)
 *   - Data is encrypted at rest on Turso's servers
 *   - App-layer lock: the db client is only "active" after vault unlock
 *     (session tracks unlock state — see auth.js)
 *   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are env vars, never in code
 */

const { createClient } = require('@libsql/client');

let client = null;

/**
 * Initialise the Turso client and ensure the schema exists.
 * Called once at server startup (not gated by password — the schema
 * is always there; data access is gated by session in requireUnlocked).
 */
async function initDatabase() {
  const url   = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error('TURSO_DATABASE_URL env var is not set.');

  client = createClient({ url, authToken: token });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS suits (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      notes      TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data       TEXT NOT NULL DEFAULT '{}'
    )
  `);

  console.log('[db] Connected to Turso — schema ready.');
  return client;
}

/**
 * Get the active Turso client.
 * @throws if initDatabase() has not been called yet
 */
function getDb() {
  if (!client) throw new Error('Database not initialised.');
  return client;
}

module.exports = { initDatabase, getDb };
