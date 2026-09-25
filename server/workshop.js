'use strict';
/**
 * workshop.js — Work Hierarchy and Workshop Kanban router
 * Routes: /api/hierarchy/* and /api/workshop/*
 *
 * Work Hierarchy: editable workshop sections (Cutting, Canvas, Stitching…)
 *   with named personnel per section.
 * Workshop: Kanban-style project tracking across all active orders.
 *
 * All routes protected by requireUnlocked middleware.
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');

const router = express.Router();

function now() { return new Date().toISOString(); }
function safe(str) { return typeof str === 'string' ? str.trim() : ''; }

// ────────────────────────────────────────────────────────────────────────────
// WORK HIERARCHY — /api/hierarchy/*
// ────────────────────────────────────────────────────────────────────────────

// GET /api/hierarchy — all sections with personnel (sorted by sort_order)
router.get('/hierarchy', async (req, res) => {
  try {
    const db     = getDb();
    const result = await db.execute('SELECT * FROM work_hierarchy ORDER BY sort_order ASC');
    res.json(result.rows.map(row => ({
      ...row,
      personnel: JSON.parse(row.personnel || '[]'),
    })));
  } catch (err) {
    console.error('[hierarchy] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hierarchy — add new section
router.post('/hierarchy', async (req, res) => {
  const { section_name, sort_order } = req.body;
  if (!section_name || safe(section_name).length === 0)
    return res.status(400).json({ error: 'section_name is required.' });

  try {
    const db = getDb();

    // Default sort_order = max existing + 1
    let order = sort_order;
    if (order === undefined || order === null) {
      const maxResult = await db.execute('SELECT MAX(sort_order) as mx FROM work_hierarchy');
      order = (Number(maxResult.rows[0]?.mx ?? -1)) + 1;
    }

    const id = uuidv4();
    const ts = now();
    await db.execute({
      sql:  `INSERT INTO work_hierarchy (id, section_name, sort_order, personnel, created_at, updated_at) VALUES (?, ?, ?, '[]', ?, ?)`,
      args: [id, safe(section_name), Number(order), ts, ts],
    });
    res.status(201).json({ id, section_name: safe(section_name), sort_order: Number(order), personnel: [], created_at: ts, updated_at: ts });
  } catch (err) {
    console.error('[hierarchy] POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hierarchy/:id — rename or reorder section
router.put('/hierarchy/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM work_hierarchy WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Section not found.' });
    const row = existing.rows[0];
    const { section_name, sort_order } = req.body;
    const ts = now();

    await db.execute({
      sql:  'UPDATE work_hierarchy SET section_name=?, sort_order=?, updated_at=? WHERE id=?',
      args: [
        section_name !== undefined ? safe(section_name) : row.section_name,
        sort_order   !== undefined ? Number(sort_order)  : row.sort_order,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM work_hierarchy WHERE id=?', args: [req.params.id] });
    const r = updated.rows[0];
    res.json({ ...r, personnel: JSON.parse(r.personnel || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hierarchy/:id/personnel — replace full personnel list
// Body: { personnel: ["Name 1", "Name 2"] }
router.put('/hierarchy/:id/personnel', async (req, res) => {
  const { personnel } = req.body;
  if (!Array.isArray(personnel))
    return res.status(400).json({ error: 'personnel must be an array of name strings.' });

  const cleanedPersonnel = personnel.map(n => safe(String(n))).filter(Boolean);

  try {
    const db = getDb();
    const ts = now();
    const result = await db.execute({
      sql:  'UPDATE work_hierarchy SET personnel=?, updated_at=? WHERE id=?',
      args: [JSON.stringify(cleanedPersonnel), ts, req.params.id],
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Section not found.' });
    res.json({ ok: true, personnel: cleanedPersonnel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hierarchy/:id
router.delete('/hierarchy/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'DELETE FROM work_hierarchy WHERE id=?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Section not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WORKSHOP KANBAN — /api/workshop/*
// ────────────────────────────────────────────────────────────────────────────

// GET /api/workshop/summary — counts + overdue for Status Quo / Workshop strip
router.get('/workshop/summary', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(`
      SELECT status, COUNT(*) as cnt FROM projects GROUP BY status
    `);

    const summary = {};
    for (const row of result.rows) summary[row.status] = Number(row.cnt);

    // Compute overdue: projects with delivery_date in the past and not delivered
    const today = new Date().toISOString().split('T')[0];
    const overdueResult = await db.execute({
      sql:  `SELECT COUNT(*) as cnt FROM projects p
             JOIN orders o ON o.id = p.order_id
             WHERE o.delivery_date != '' AND o.delivery_date < ? AND p.status != 'delivered'`,
      args: [today],
    });
    summary.overdue = Number(overdueResult.rows[0]?.cnt ?? 0);

    // Total active (not delivered)
    const activeResult = await db.execute(
      `SELECT COUNT(*) as cnt FROM projects WHERE status != 'delivered'`
    );
    summary.total_active = Number(activeResult.rows[0]?.cnt ?? 0);
    summary.ready = Number(summary.ready || 0);

    res.json(summary);
  } catch (err) {
    console.error('[workshop] summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workshop — all active projects with client + order info
router.get('/workshop', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(`
      SELECT
        p.id, p.order_id, p.client_id, p.garment_type, p.status,
        p.suit_config_id, p.created_at, p.updated_at,
        c.name        AS client_name,
        c.client_ref  AS client_ref,
        o.order_ref   AS order_ref,
        o.delivery_date AS delivery_date,
        o.trial_date  AS trial_date
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      JOIN orders  o ON o.id = p.order_id
      WHERE p.status != 'delivered'
      ORDER BY o.delivery_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[workshop] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
