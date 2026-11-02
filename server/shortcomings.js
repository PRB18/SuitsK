'use strict';
/**
 * shortcomings.js — Issue log router (tailoring / managerial / client)
 * Routes: /api/shortcomings/*
 *
 * All routes protected by requireUnlocked middleware.
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');
const { validate }   = require('./middleware/validate');
const {
  idSchema,
  shortcomingSchema,
  shortcomingUpdateSchema,
  shortcomingResolveSchema,
} = require('./middleware/schemas');

const router = express.Router();

function isValidId(id) {
  return idSchema.safeParse(id).success;
}

const CATEGORIES  = ['tailoring', 'managerial', 'client'];
const SEVERITIES  = ['high', 'medium', 'low'];
const STATUSES    = ['open', 'in_progress', 'resolved'];

function now() { return new Date().toISOString(); }
function safe(str) { return typeof str === 'string' ? str.trim() : ''; }

// GET /api/shortcomings — list (filter by ?category= and/or ?status=)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    let sql  = `SELECT s.*, c.name as client_name, c.client_ref
                FROM shortcomings s
                LEFT JOIN clients c ON c.id = s.client_id
                WHERE 1=1`;
    const args = [];

    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      sql += ' AND s.category = ?'; args.push(req.query.category);
    }
    if (req.query.status && STATUSES.includes(req.query.status)) {
      sql += ' AND s.status = ?'; args.push(req.query.status);
    }

    sql += ' ORDER BY CASE s.severity WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, s.created_at DESC';
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) {
    console.error('[shortcomings] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shortcomings/stats — open/in_progress/resolved counts
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute('SELECT status, COUNT(*) as cnt FROM shortcomings GROUP BY status');
    const stats = { open: 0, in_progress: 0, resolved: 0 };
    for (const row of result.rows) stats[row.status] = Number(row.cnt);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/shortcomings — create issue
router.post('/', validate(shortcomingSchema), async (req, res) => {
  const { category, severity = 'medium', client_id = '', project_id = '', title, description = '' } = req.body;

  try {
    const db = getDb();
    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  `INSERT INTO shortcomings
               (id, category, severity, client_id, project_id, title, description, status, resolved_at, resolved_note, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'open', '', '', ?, ?)`,
      args: [id, category, severity, safe(client_id), safe(project_id), safe(title), safe(description), ts, ts],
    });

    res.status(201).json({ id, category, severity, client_id: safe(client_id), project_id: safe(project_id), title: safe(title), description: safe(description), status: 'open', resolved_at: '', resolved_note: '', created_at: ts, updated_at: ts });
  } catch (err) {
    console.error('[shortcomings] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/shortcomings/:id — update issue (except resolving — use /resolve)
router.put('/:id', validate(shortcomingUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM shortcomings WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Issue not found.' });
    const row = existing.rows[0];
    const { category, severity, client_id, project_id, title, description, status } = req.body;

    if (status === 'resolved')
      return res.status(400).json({ error: 'Use PUT /shortcomings/:id/resolve to resolve issues.' });

    const ts = now();
    await db.execute({
      sql:  `UPDATE shortcomings SET category=?, severity=?, client_id=?, project_id=?, title=?, description=?, status=?, updated_at=? WHERE id=?`,
      args: [
        category    !== undefined ? category            : row.category,
        severity    !== undefined ? severity            : row.severity,
        client_id   !== undefined ? safe(client_id)    : row.client_id,
        project_id  !== undefined ? safe(project_id)   : row.project_id,
        title       !== undefined ? safe(title)         : row.title,
        description !== undefined ? safe(description)   : row.description,
        status      !== undefined ? status              : row.status,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM shortcomings WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/shortcomings/:id/resolve — mark resolved with a mandatory resolution note
router.put('/:id/resolve', validate(shortcomingResolveSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { resolved_note } = req.body;

  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM shortcomings WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Issue not found.' });
    if (existing.rows[0].status === 'resolved')
      return res.status(400).json({ error: 'Issue is already resolved.' });

    const ts = now();
    await db.execute({
      sql:  `UPDATE shortcomings SET status='resolved', resolved_at=?, resolved_note=?, updated_at=? WHERE id=?`,
      args: [ts, safe(resolved_note), ts, req.params.id],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM shortcomings WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/shortcomings/:id
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'DELETE FROM shortcomings WHERE id=?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Issue not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
