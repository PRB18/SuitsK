'use strict';
/**
 * suits.js — Suit CRUD router (/api/suits/*)
 *
 * Async version using @libsql/client (Turso).
 * All routes are protected by requireUnlocked middleware (session-based).
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return new Date().toISOString();
}

/**
 * Extract a small display summary from the data JSON blob.
 */
function makeSummary(dataJson) {
  try {
    const d = JSON.parse(dataJson);
    let filled = 0;
    const cats = ['jacket', 'shirt', 'trouser', 'waistcoat', 'embroidery'];
    for (const cat of cats) {
      if (!d[cat] || typeof d[cat] !== 'object') continue;
      for (const val of Object.values(d[cat])) {
        if (val !== '' && val !== null && val !== undefined && val !== false) filled++;
      }
    }
    return {
      lapelStyle:  d.jacket?.lapelStyle  ?? null,
      collarStyle: d.shirt?.collarStyle  ?? null,
      fabricCode:  d.jacket?.fabricCode  ?? null,
      pipingColor: d.jacket?.pipingColor ?? null,
      fieldCount:  filled,
    };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// GET /api/suits — lightweight list
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const db     = getDb();
    const clientFilter = typeof req.query.client_id === 'string' ? req.query.client_id.trim() : '';
    const result = clientFilter
      ? await db.execute({
          sql: 'SELECT id, name, notes, client_id, updated_at, data FROM suits WHERE client_id = ? ORDER BY updated_at DESC',
          args: [clientFilter],
        })
      : await db.execute('SELECT id, name, notes, client_id, updated_at, data FROM suits ORDER BY updated_at DESC');
    res.json(result.rows.map(r => ({
      id:        r.id,
      name:      r.name,
      notes:     r.notes,
      clientId:  r.client_id || '',
      updatedAt: r.updated_at,
      summary:   makeSummary(r.data),
    })));
  } catch (err) {
    console.error('[suits] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/suits/:id — full suit
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const db     = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM suits WHERE id = ?', args: [req.params.id] });
    const row    = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Suit not found.' });

    res.json({
      id:        row.id,
      name:      row.name,
      notes:     row.notes,
      clientId:  row.client_id || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      data:      JSON.parse(row.data),
    });
  } catch (err) {
    console.error('[suits] GET /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/suits — create
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { name, notes = '', data = {}, client_id = '', clientId = '' } = req.body;
  const linkedClientId = String(client_id || clientId || '').trim();

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Suit name is required.' });
  }

  try {
    const db = getDb();
    if (linkedClientId) {
      const clientCheck = await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [linkedClientId] });
      if (clientCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Linked client not found.' });
      }
    }

    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  'INSERT INTO suits (id, name, notes, client_id, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, name.trim(), notes, linkedClientId, ts, ts, JSON.stringify(data)],
    });

    // Keep client measurement profile in sync with this style sheet.
    if (linkedClientId && data?.measurements) {
      await syncClientMeasurements(db, linkedClientId, data.measurements, ts);
    }

    res.status(201).json({ id, name: name.trim(), notes, clientId: linkedClientId, createdAt: ts, updatedAt: ts, data });
  } catch (err) {
    console.error('[suits] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/suits/:id — full replace
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const db     = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM suits WHERE id = ?', args: [req.params.id] });
    const row    = result.rows[0];

    if (!row) return res.status(404).json({ error: 'Suit not found.' });

    const { name, notes, data, client_id, clientId } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Suit name cannot be empty.' });
    }

    const ts       = now();
    const newName  = name  !== undefined ? name.trim()         : row.name;
    const newNotes = notes !== undefined ? notes               : row.notes;
    const newData  = data  !== undefined ? JSON.stringify(data) : row.data;
    const newClientId = (client_id !== undefined || clientId !== undefined)
      ? String(client_id || clientId || '').trim()
      : (row.client_id || '');

    if (newClientId) {
      const clientCheck = await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [newClientId] });
      if (clientCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Linked client not found.' });
      }
    }

    await db.execute({
      sql:  'UPDATE suits SET name = ?, notes = ?, client_id = ?, data = ?, updated_at = ? WHERE id = ?',
      args: [newName, newNotes, newClientId, newData, ts, req.params.id],
    });

    if (newClientId && data?.measurements) {
      await syncClientMeasurements(db, newClientId, data.measurements, ts);
    }

    res.json({ id: req.params.id, name: newName, notes: newNotes, clientId: newClientId, updatedAt: ts, data: JSON.parse(newData) });
  } catch (err) {
    console.error('[suits] PUT /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/suits/:id/duplicate
// ---------------------------------------------------------------------------
router.post('/:id/duplicate', async (req, res) => {
  try {
    const db     = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM suits WHERE id = ?', args: [req.params.id] });
    const row    = result.rows[0];

    if (!row) return res.status(404).json({ error: 'Suit not found.' });

    const newId   = uuidv4();
    const ts      = now();
    const newName = (req.body.name && req.body.name.trim())
      ? req.body.name.trim()
      : row.name + ' (copy)';
    const clientId = row.client_id || '';

    await db.execute({
      sql:  'INSERT INTO suits (id, name, notes, client_id, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [newId, newName, row.notes, clientId, ts, ts, row.data],
    });

    res.status(201).json({ id: newId, name: newName, notes: row.notes, clientId, createdAt: ts, updatedAt: ts, data: JSON.parse(row.data) });
  } catch (err) {
    console.error('[suits] POST /:id/duplicate error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Upsert client_measurements from a suit draft's measurements block. */
async function syncClientMeasurements(db, clientId, measurements, ts) {
  const unit = (measurements && measurements.unit) || 'in';
  const values = (measurements && typeof measurements.values === 'object' && measurements.values)
    ? measurements.values
    : {};
  const existing = await db.execute({
    sql: 'SELECT id FROM client_measurements WHERE client_id = ?',
    args: [clientId],
  });
  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO client_measurements (id, client_id, unit, values_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [uuidv4(), clientId, unit, JSON.stringify(values), ts, ts],
    });
  } else {
    await db.execute({
      sql: 'UPDATE client_measurements SET unit = ?, values_json = ?, updated_at = ? WHERE client_id = ?',
      args: [unit, JSON.stringify(values), ts, clientId],
    });
  }

  // Keep active workshop garments on the same body numbers.
  const projects = await db.execute({
    sql: `SELECT id, measurements FROM projects WHERE client_id = ? AND status != 'delivered'`,
    args: [clientId],
  });
  for (const row of projects.rows) {
    let current = {};
    try { current = JSON.parse(row.measurements || '{}'); } catch { current = {}; }
    await db.execute({
      sql: 'UPDATE projects SET measurements = ?, updated_at = ? WHERE id = ?',
      args: [JSON.stringify({ ...current, ...values }), ts, row.id],
    });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/suits/:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const db     = getDb();
    const result = await db.execute({ sql: 'DELETE FROM suits WHERE id = ?', args: [req.params.id] });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Suit not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[suits] DELETE /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
