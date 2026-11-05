'use strict';
/**
 * fabricReceipts.js — Fabric Raw Material Receipts router
 * Routes: /api/fabric-receipts/*
 *
 * All routes protected by requireUnlocked middleware.
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');
const { validate }   = require('./middleware/validate');
const {
  idSchema,
  fabricReceiptSchema,
  fabricReceiptUpdateSchema,
} = require('./middleware/schemas');

const router = express.Router();

function isValidId(id) {
  return idSchema.safeParse(id).success;
}

function now() { return new Date().toISOString(); }
function safe(str) { return typeof str === 'string' ? str.trim() : ''; }

// GET /api/fabric-receipts — list all receipts
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    let sql = `
      SELECT f.*, i.name as inventory_name, i.article_number as inventory_article,
             c.name as client_name_lookup, c.client_ref as client_ref_lookup
      FROM fabric_receipts f
      LEFT JOIN inventory i ON f.inventory_id = i.id
      LEFT JOIN clients c ON f.client_id = c.id
      WHERE 1=1
    `;
    const args = [];

    if (req.query.client_id) {
      sql += ' AND f.client_id = ?'; args.push(req.query.client_id);
    }
    if (req.query.from_date) {
      sql += ' AND f.order_date >= ?'; args.push(req.query.from_date);
    }

    sql += ' ORDER BY f.created_at DESC';
    const result = await db.execute({ sql, args });
    res.json(result.rows.map(row => ({
      ...row,
      client_code: row.client_ref_lookup || row.client_code,
      client_name: row.client_name_lookup || row.client_name,
    })));
  } catch (err) {
    console.error('[fabric-receipts] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fabric-receipts — create receipt
router.post('/', validate(fabricReceiptSchema), async (req, res) => {
  const {
    client_id = '', order_id = '', client_code = '', client_name = '',
    inventory_id = '', fabric_code = '', fabric_color = '', accessories_desc = '',
    sample_notes = '', order_date = '', received_date = ''
  } = req.body;

  try {
    const db = getDb();
    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  `INSERT INTO fabric_receipts
               (id, client_id, order_id, client_code, client_name,
                inventory_id, fabric_code, fabric_color, accessories_desc, sample_notes,
                order_date, received_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, safe(client_id), safe(order_id), safe(client_code), safe(client_name),
        safe(inventory_id), safe(fabric_code), safe(fabric_color), safe(accessories_desc), safe(sample_notes),
        safe(order_date), safe(received_date), ts, ts,
      ],
    });

    res.status(201).json({
      id, client_id: safe(client_id), order_id: safe(order_id), client_code: safe(client_code),
      client_name: safe(client_name), inventory_id: safe(inventory_id), fabric_code: safe(fabric_code),
      fabric_color: safe(fabric_color), accessories_desc: safe(accessories_desc), sample_notes: safe(sample_notes),
      order_date: safe(order_date), received_date: safe(received_date),
      created_at: ts, updated_at: ts
    });
  } catch (err) {
    console.error('[fabric-receipts] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/fabric-receipts/:id
router.put('/:id', validate(fabricReceiptUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM fabric_receipts WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Receipt not found.' });
    const row = existing.rows[0];

    const {
      client_id, order_id, client_code, client_name,
      inventory_id, fabric_code, fabric_color, accessories_desc,
      sample_notes, order_date, received_date
    } = req.body;

    const ts = now();

    await db.execute({
      sql:  `UPDATE fabric_receipts SET 
             client_id=?, order_id=?, client_code=?, client_name=?,
             inventory_id=?, fabric_code=?, fabric_color=?, accessories_desc=?, sample_notes=?,
             order_date=?, received_date=?, updated_at=? WHERE id=?`,
      args: [
        client_id !== undefined ? safe(client_id) : row.client_id,
        order_id !== undefined ? safe(order_id) : row.order_id,
        client_code !== undefined ? safe(client_code) : row.client_code,
        client_name !== undefined ? safe(client_name) : row.client_name,
        inventory_id !== undefined ? safe(inventory_id) : row.inventory_id,
        fabric_code !== undefined ? safe(fabric_code) : row.fabric_code,
        fabric_color !== undefined ? safe(fabric_color) : row.fabric_color,
        accessories_desc !== undefined ? safe(accessories_desc) : row.accessories_desc,
        sample_notes !== undefined ? safe(sample_notes) : row.sample_notes,
        order_date !== undefined ? safe(order_date) : row.order_date,
        received_date !== undefined ? safe(received_date) : row.received_date,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM fabric_receipts WHERE id=?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fabric-receipts/:id
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'DELETE FROM fabric_receipts WHERE id=?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Receipt not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
