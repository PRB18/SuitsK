'use strict';
/**
 * suits.js — Suit CRUD router  (/api/suits/*)
 *
 * All routes require the database to be unlocked (enforced by
 * requireUnlocked middleware in index.js).
 *
 * Encryption: handled entirely by SQLCipher at the page level —
 * this layer stores and retrieves plain JSON in the data column.
 * No application-layer encrypt/decrypt calls here.
 *
 * PUT: full replace of the data column — no partial merge.
 * GET /api/suits: lightweight list only — no full data blob.
 * Duplicate: copies data blob as-is, new id/timestamps, "(copy)" suffix.
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
 * Only called on the list endpoint — never returns the full blob.
 */
function makeSummary(dataJson) {
  try {
    const d = JSON.parse(dataJson);

    // Count filled fields across all 6 categories for completeness gauge.
    // Total possible non-trivial fields: jacket(14) shirt(5) trouser(6) waistcoat(3) embroidery(4) = 32
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
      fieldCount:  filled,   // out of ~32 picklist/text fields
    };
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// GET /api/suits  — lightweight list (no data blob)
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const db   = getDb();
  const rows = db.prepare(
    'SELECT id, name, notes, updated_at, data FROM suits ORDER BY updated_at DESC'
  ).all();

  res.json(rows.map(r => ({
    id:        r.id,
    name:      r.name,
    notes:     r.notes,
    updatedAt: r.updated_at,
    summary:   makeSummary(r.data),
  })));
});

// ---------------------------------------------------------------------------
// GET /api/suits/:id  — full suit
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM suits WHERE id = ?').get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Suit not found.' });

  res.json({
    id:        row.id,
    name:      row.name,
    notes:     row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data:      JSON.parse(row.data),
  });
});

// ---------------------------------------------------------------------------
// POST /api/suits  — create
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const { name, notes = '', data = {} } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Suit name is required.' });
  }

  const db = getDb();
  const id = uuidv4();
  const ts = now();

  db.prepare(
    'INSERT INTO suits (id, name, notes, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name.trim(), notes, ts, ts, JSON.stringify(data));

  res.status(201).json({ id, name: name.trim(), notes, createdAt: ts, updatedAt: ts, data });
});

// ---------------------------------------------------------------------------
// PUT /api/suits/:id  — full replace (no partial merge server-side)
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM suits WHERE id = ?').get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Suit not found.' });

  const { name, notes, data } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Suit name cannot be empty.' });
  }

  const ts       = now();
  const newName  = name  !== undefined ? name.trim()          : row.name;
  const newNotes = notes !== undefined ? notes                 : row.notes;
  const newData  = data  !== undefined ? JSON.stringify(data)  : row.data;

  db.prepare(
    'UPDATE suits SET name = ?, notes = ?, data = ?, updated_at = ? WHERE id = ?'
  ).run(newName, newNotes, newData, ts, req.params.id);

  res.json({
    id:        req.params.id,
    name:      newName,
    notes:     newNotes,
    updatedAt: ts,
    data:      JSON.parse(newData),
  });
});

// ---------------------------------------------------------------------------
// POST /api/suits/:id/duplicate
// ---------------------------------------------------------------------------
router.post('/:id/duplicate', (req, res) => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM suits WHERE id = ?').get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Suit not found.' });

  const newId   = uuidv4();
  const ts      = now();
  const newName = (req.body.name && req.body.name.trim())
    ? req.body.name.trim()
    : row.name + ' (copy)';

  // data blob copied exactly as-is
  db.prepare(
    'INSERT INTO suits (id, name, notes, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(newId, newName, row.notes, ts, ts, row.data);

  res.status(201).json({
    id:        newId,
    name:      newName,
    notes:     row.notes,
    createdAt: ts,
    updatedAt: ts,
    data:      JSON.parse(row.data),
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/suits/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const db     = getDb();
  const result = db.prepare('DELETE FROM suits WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Suit not found.' });
  }
  res.json({ ok: true });
});

module.exports = router;
