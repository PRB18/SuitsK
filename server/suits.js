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
    const result = await db.execute('SELECT id, name, notes, updated_at, data FROM suits ORDER BY updated_at DESC');
    res.json(result.rows.map(r => ({
      id:        r.id,
      name:      r.name,
      notes:     r.notes,
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
  const { name, notes = '', data = {} } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Suit name is required.' });
  }

  try {
    const db = getDb();
    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  'INSERT INTO suits (id, name, notes, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name.trim(), notes, ts, ts, JSON.stringify(data)],
    });

    res.status(201).json({ id, name: name.trim(), notes, createdAt: ts, updatedAt: ts, data });
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

    const { name, notes, data } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Suit name cannot be empty.' });
    }

    const ts       = now();
    const newName  = name  !== undefined ? name.trim()         : row.name;
    const newNotes = notes !== undefined ? notes               : row.notes;
    const newData  = data  !== undefined ? JSON.stringify(data) : row.data;

    await db.execute({
      sql:  'UPDATE suits SET name = ?, notes = ?, data = ?, updated_at = ? WHERE id = ?',
      args: [newName, newNotes, newData, ts, req.params.id],
    });

    res.json({ id: req.params.id, name: newName, notes: newNotes, updatedAt: ts, data: JSON.parse(newData) });
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

    await db.execute({
      sql:  'INSERT INTO suits (id, name, notes, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)',
      args: [newId, newName, row.notes, ts, ts, row.data],
    });

    res.status(201).json({ id: newId, name: newName, notes: row.notes, createdAt: ts, updatedAt: ts, data: JSON.parse(row.data) });
  } catch (err) {
    console.error('[suits] POST /:id/duplicate error:', err);
    res.status(500).json({ error: err.message });
  }
});

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
