'use strict';
/**
 * db.js — Turso (cloud libSQL) database client
 *
 * Security model:
 *   - TLS-encrypted in transit (Turso enforces HTTPS/WSS)
 *   - Data encrypted at rest on Turso servers
 *   - App-layer lock: client only "active" after vault unlock (session)
 *   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are env vars, never in code
 *
 * Tables:
 *   suits                  — existing bespoke suit configurator records
 *   clients                — client master records (phone = unique enforcer)
 *   orders                 — one order groups multiple garments per client
 *   projects               — individual garment within an order
 *   inventory              — fabric and accessory stock records
 *   inventory_transactions — full audit trail of every stock add/deduct
 *   schedule_events        — trial, delivery, client visit calendar events
 *   work_hierarchy         — workshop sections with personnel lists
 *   shortcomings           — tailoring/managerial/client issue log
 *   b2b_entries            — corporate orders and vendor purchases
 *   calendar_tokens        — OAuth tokens for Google/Apple/Outlook calendar sync
 */

const { createClient } = require('@libsql/client');
const { v4: uuidv4 }   = require('uuid');

let client = null;

/**
 * Initialise the Turso client and ensure all tables exist.
 * Called once at startup; NOT gated by password —
 * schema is always created, data access is gated by requireUnlocked.
 */
async function initDatabase() {
  const url   = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error('TURSO_DATABASE_URL env var is not set.');

  client = createClient({ url, authToken: token });

  // ── Suits (style configs); client_id links a config to a client profile ─
  const schemaTasks = [client.execute(`
    CREATE TABLE IF NOT EXISTS suits (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      notes      TEXT NOT NULL DEFAULT '',
      client_id  TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data       TEXT NOT NULL DEFAULT '{}'
    )
  `),

  // ── Clients ──────────────────────────────────────────────────────────────
  // phone is the natural uniqueness enforcer (prevents duplicate client records).
  // client_ref is the human-readable ID auto-generated as CTB-YYYY-NNN.
  client.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id          TEXT PRIMARY KEY,
      client_ref  TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      phone       TEXT DEFAULT NULL,
      email       TEXT NOT NULL DEFAULT '',
      address     TEXT NOT NULL DEFAULT '',
      city        TEXT NOT NULL DEFAULT '',
      notes       TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `),

  client.execute(`
    CREATE TABLE IF NOT EXISTS client_measurements (
      id          TEXT PRIMARY KEY,
      client_id   TEXT NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
      unit        TEXT NOT NULL DEFAULT 'in',
      values_json TEXT NOT NULL DEFAULT '{}',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `),

  client.execute(`
    CREATE TABLE IF NOT EXISTS client_visits (
      id          TEXT PRIMARY KEY,
      client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      order_id    TEXT NOT NULL DEFAULT '',
      visit_date  TEXT NOT NULL,
      purpose     TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL
    )
  `),

  // ── Orders ───────────────────────────────────────────────────────────────
  // One active order per client at a time; multiple garments (projects) per order.
  // status: pending | in_progress | ready | completed | cancelled
  // order_ref auto-generated as ORD-YYYY-NNN
  client.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id            TEXT PRIMARY KEY,
      client_id     TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      order_ref     TEXT NOT NULL,
      order_date    TEXT NOT NULL,
      trial_date    TEXT NOT NULL DEFAULT '',
      delivery_date TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'pending',
      total_amount  REAL NOT NULL DEFAULT 0,
      advance_paid  REAL NOT NULL DEFAULT 0,
      notes         TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    )
  `),

  // ── Projects (garments within an order) ──────────────────────────────────
  // garment_type: Jacket | Sherwani | Sadri | Waistcoat | Jodhpuri |
  //               Shirt | Kurta | Pant | Chinos | Suit | Pajama | Safari jkt | Denim
  // status: pending | cutting | canvas | stitching | buttonholes |
  //         pressing | trial | ready | delivered
  // suit_config_id: FK → suits.id (links style configuration)
  // measurements: JSON blob of project-specific body measurements
  client.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id             TEXT PRIMARY KEY,
      order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      client_id      TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      garment_type   TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      suit_config_id TEXT NOT NULL DEFAULT '',
      measurements   TEXT NOT NULL DEFAULT '{}',
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    )
  `),

  // ── Inventory ─────────────────────────────────────────────────────────────
  // item_type: fabric | accessory
  // unit: m (metres for fabric) | pcs (pieces for accessories)
  // low_stock_alert: quantity threshold that triggers a "Low Stock" badge
  client.execute(`
    CREATE TABLE IF NOT EXISTS inventory (
      id              TEXT PRIMARY KEY,
      item_type       TEXT NOT NULL DEFAULT 'fabric',
      name            TEXT NOT NULL,
      article_number  TEXT NOT NULL DEFAULT '',
      color           TEXT NOT NULL DEFAULT '',
      supplier        TEXT NOT NULL DEFAULT '',
      order_date      TEXT NOT NULL DEFAULT '',
      received_date   TEXT NOT NULL DEFAULT '',
      quantity        REAL NOT NULL DEFAULT 0,
      unit            TEXT NOT NULL DEFAULT 'm',
      low_stock_alert REAL NOT NULL DEFAULT 0,
      notes           TEXT NOT NULL DEFAULT '',
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    )
  `),

  // ── Inventory Transactions ───────────────────────────────────────────────
  // Full audit trail. type: add | deduct
  // project_id and client_id are optional (may be manual deductions).
  client.execute(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id           TEXT PRIMARY KEY,
      inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      project_id   TEXT NOT NULL DEFAULT '',
      client_id    TEXT NOT NULL DEFAULT '',
      type         TEXT NOT NULL,
      quantity     REAL NOT NULL,
      note         TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL
    )
  `),

  // ── Schedule Events ───────────────────────────────────────────────────────
  // event_type: trial | delivery | client_visit | other
  // status: scheduled | completed | cancelled
  // cal_provider: google | apple | outlook (empty until synced)
  // cal_event_id: the external calendar's event ID for 2-way sync matching
  client.execute(`
    CREATE TABLE IF NOT EXISTS schedule_events (
      id           TEXT PRIMARY KEY,
      client_id    TEXT NOT NULL DEFAULT '',
      project_id   TEXT NOT NULL DEFAULT '',
      event_type   TEXT NOT NULL DEFAULT 'other',
      title        TEXT NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      event_date   TEXT NOT NULL,
      event_time   TEXT NOT NULL DEFAULT '',
      all_day      INTEGER NOT NULL DEFAULT 1,
      status       TEXT NOT NULL DEFAULT 'scheduled',
      cal_provider TEXT NOT NULL DEFAULT '',
      cal_event_id TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    )
  `),

  // ── Work Hierarchy ────────────────────────────────────────────────────────
  // sections in the physical workshop (e.g. Cutting, Canvas, Stitching …)
  // personnel: JSON array of name strings e.g. ["Rahim Shah", "Ali Hassan"]
  client.execute(`
    CREATE TABLE IF NOT EXISTS work_hierarchy (
      id           TEXT PRIMARY KEY,
      section_name TEXT NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      personnel    TEXT NOT NULL DEFAULT '[]',
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    )
  `),

  // ── Shortcomings (issue log) ──────────────────────────────────────────────
  // category: tailoring | managerial | client
  // severity: high | medium | low
  // status: open | in_progress | resolved
  client.execute(`
    CREATE TABLE IF NOT EXISTS shortcomings (
      id            TEXT PRIMARY KEY,
      category      TEXT NOT NULL,
      severity      TEXT NOT NULL DEFAULT 'medium',
      client_id     TEXT NOT NULL DEFAULT '',
      project_id    TEXT NOT NULL DEFAULT '',
      title         TEXT NOT NULL,
      description   TEXT NOT NULL DEFAULT '',
      status        TEXT NOT NULL DEFAULT 'open',
      resolved_at   TEXT NOT NULL DEFAULT '',
      resolved_note TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    )
  `),

  // ── B2B Entries ───────────────────────────────────────────────────────────
  // entry_type: corporate_order | vendor_purchase
  // garment_types: JSON array of garment type strings (for corporate orders)
  // status: pending | in_progress | completed | cancelled
  client.execute(`
    CREATE TABLE IF NOT EXISTS b2b_entries (
      id             TEXT PRIMARY KEY,
      entry_type     TEXT NOT NULL,
      company_name   TEXT NOT NULL DEFAULT '',
      contact_person TEXT NOT NULL DEFAULT '',
      contact_phone  TEXT NOT NULL DEFAULT '',
      contact_email  TEXT NOT NULL DEFAULT '',
      quantity       INTEGER NOT NULL DEFAULT 0,
      garment_types  TEXT NOT NULL DEFAULT '[]',
      vendor_name    TEXT NOT NULL DEFAULT '',
      items_ordered  TEXT NOT NULL DEFAULT '',
      total_amount   REAL NOT NULL DEFAULT 0,
      order_date     TEXT NOT NULL,
      delivery_date  TEXT NOT NULL DEFAULT '',
      status         TEXT NOT NULL DEFAULT 'pending',
      notes          TEXT NOT NULL DEFAULT '',
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    )
  `),

  // ── Fabric Receipts ────────────────────────────────────────────────────────
  client.execute(`
    CREATE TABLE IF NOT EXISTS fabric_receipts (
      id               TEXT PRIMARY KEY,
      client_id        TEXT NOT NULL DEFAULT '',
      order_id         TEXT NOT NULL DEFAULT '',
      client_code      TEXT NOT NULL DEFAULT '',
      client_name      TEXT NOT NULL DEFAULT '',
      inventory_id     TEXT NOT NULL DEFAULT '',
      fabric_code      TEXT NOT NULL DEFAULT '',
      accessories_desc TEXT NOT NULL DEFAULT '',
      sample_notes     TEXT NOT NULL DEFAULT '',
      order_date       TEXT NOT NULL DEFAULT '',
      received_date    TEXT NOT NULL DEFAULT '',
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    )
  `),

  ];

  // These tables are independent; run their DDL together to reduce cold-start latency.
  await Promise.all(schemaTasks);
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS clients_phone_unique ON clients(phone) WHERE phone IS NOT NULL AND phone != ''`);

  // ── Additive migrations for existing vaults ──────────────────────────────
  await ensureColumn(client, 'suits', 'client_id', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'client_code', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'style_product_name', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'brand_name', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'fabric_code', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'fabric_colour', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'inventory_id', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'transfer_to_workshop', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'b2b_entries', 'delivered_date', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'fabric_receipts', 'fabric_color', `TEXT NOT NULL DEFAULT ''`);
  await ensureColumn(client, 'client_visits', 'order_id', `TEXT NOT NULL DEFAULT ''`);
  await backfillClientMeasurements(client);

  // ── Calendar OAuth Tokens ─────────────────────────────────────────────────
  // One row per provider (google | apple | outlook).
  // tokens: JSON object { access_token, refresh_token, expiry_date, scope, … }
  await client.execute(`
    CREATE TABLE IF NOT EXISTS calendar_tokens (
      provider   TEXT PRIMARY KEY,
      tokens     TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // ── Seed default Work Hierarchy sections (once, only if table is empty) ──
  const hierarchyCheck = await client.execute(
    'SELECT COUNT(*) as cnt FROM work_hierarchy'
  );
  const existingCount = Number(hierarchyCheck.rows[0]?.cnt ?? 0);
  if (existingCount === 0) {
    const ts = new Date().toISOString();
    const defaultSections = [
      'Cutting', 'Canvas', 'Stitching',
      'Buttonholes', 'Pressing', 'Finishing', 'Delivery'
    ];
    for (let i = 0; i < defaultSections.length; i++) {
      await client.execute({
        sql: `INSERT INTO work_hierarchy
                (id, section_name, sort_order, personnel, created_at, updated_at)
              VALUES (?, ?, ?, '[]', ?, ?)`,
        args: [uuidv4(), defaultSections[i], i, ts, ts],
      });
    }
    console.log('[db] Seeded 7 default work hierarchy sections.');
  }

  console.log('[db] Connected to Turso — schema ready (12 tables).');
  return client;
}

async function ensureColumn(db, table, column, definition) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some(row => row.name === column);
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] Migrated ${table}: added column ${column}`);
  }
}

/** Every client must own a measurement profile row (source of truth for body data). */
async function backfillClientMeasurements(db) {
  const missing = await db.execute(`
    SELECT c.id FROM clients c
    LEFT JOIN client_measurements m ON m.client_id = c.id
    WHERE m.id IS NULL
  `);
  if (missing.rows.length === 0) return;
  const ts = new Date().toISOString();
  for (const row of missing.rows) {
    await db.execute({
      sql: `INSERT INTO client_measurements (id, client_id, unit, values_json, created_at, updated_at)
            VALUES (?, ?, 'in', '{}', ?, ?)`,
      args: [uuidv4(), row.id, ts, ts],
    });
  }
  console.log(`[db] Backfilled measurement profiles for ${missing.rows.length} client(s).`);
}

/**
 * Get the active Turso client.
 * @throws {Error} if initDatabase() has not been called yet
 */
function getDb() {
  if (!client) throw new Error('Database not initialised. Call initDatabase() first.');
  return client;
}

module.exports = { initDatabase, getDb };
