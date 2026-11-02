'use strict';
/**
 * inventory.js — Fabric and accessory stock management router
 * Routes: /api/inventory/*
 *
 * Handles:
 *   - CRUD for inventory items (fabric / accessory)
 *   - Stock transactions (add / deduct) with full audit trail
 *   - Edge cases: cannot deduct more than current qty, cannot deduct 0
 *
 * All routes protected by requireUnlocked middleware (mounted in index.js).
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');
const { validate }   = require('./middleware/validate');
const {
  idSchema,
  inventorySchema,
  inventoryUpdateSchema,
  inventoryTransactionSchema,
} = require('./middleware/schemas');

const router = express.Router();

function isValidId(id) {
  return idSchema.safeParse(id).success;
}

const ITEM_TYPES = ['fabric', 'accessory'];
const UNIT_MAP   = { fabric: 'm', accessory: 'pcs' };
const TRANS_TYPES = ['add', 'deduct'];

function now() { return new Date().toISOString(); }
function safe(str) { return typeof str === 'string' ? str.trim() : ''; }

// ────────────────────────────────────────────────────────────────────────────
// GET /api/inventory — list all items with current quantity and status
// ────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(
      'SELECT * FROM inventory ORDER BY item_type ASC, name ASC'
    );
    // Compute stock_status on the fly
    const rows = result.rows.map(item => ({
      ...item,
      stock_status: computeStockStatus(item),
    }));
    res.json(rows);
  } catch (err) {
    console.error('[inventory] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/inventory — create inventory item
// ────────────────────────────────────────────────────────────────────────────
router.post('/', validate(inventorySchema), async (req, res) => {
  const {
    item_type = 'fabric',
    name,
    article_number = '',
    color = '',
    supplier = '',
    order_date = '',
    received_date = '',
    quantity = 0,
    unit,
    low_stock_alert = 0,
    notes = '',
  } = req.body;

  // Unit defaults to type-appropriate value if not supplied
  const resolvedUnit = unit || UNIT_MAP[item_type];

  try {
    const db = getDb();
    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  `INSERT INTO inventory
               (id, item_type, name, article_number, color, supplier, order_date, received_date,
                quantity, unit, low_stock_alert, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, item_type, safe(name), safe(article_number), safe(color), safe(supplier),
        safe(order_date), safe(received_date), Number(quantity), resolvedUnit,
        Number(low_stock_alert), safe(notes), ts, ts,
      ],
    });

    const item = { id, item_type, name: safe(name), article_number: safe(article_number), color: safe(color), supplier: safe(supplier), order_date: safe(order_date), received_date: safe(received_date), quantity: Number(quantity), unit: resolvedUnit, low_stock_alert: Number(low_stock_alert), notes: safe(notes), created_at: ts, updated_at: ts };
    res.status(201).json({ ...item, stock_status: computeStockStatus(item) });
  } catch (err) {
    console.error('[inventory] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/inventory/:id — single item
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM inventory WHERE id=?', args: [req.params.id] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    const item = result.rows[0];
    res.json({ ...item, stock_status: computeStockStatus(item) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/inventory/:id — update metadata (NOT quantity — use transact for that)
// ────────────────────────────────────────────────────────────────────────────
router.put('/:id', validate(inventoryUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM inventory WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    const row = existing.rows[0];
    const { item_type, name, article_number, color, supplier, order_date, received_date, unit, low_stock_alert, notes } = req.body;
    const ts = now();

    await db.execute({
      sql:  `UPDATE inventory SET item_type=?, name=?, article_number=?, color=?, supplier=?,
             order_date=?, received_date=?, unit=?, low_stock_alert=?, notes=?, updated_at=? WHERE id=?`,
      args: [
        item_type       !== undefined ? item_type              : row.item_type,
        name            !== undefined ? safe(name)             : row.name,
        article_number  !== undefined ? safe(article_number)   : row.article_number,
        color           !== undefined ? safe(color)            : row.color,
        supplier        !== undefined ? safe(supplier)         : row.supplier,
        order_date      !== undefined ? safe(order_date)       : row.order_date,
        received_date   !== undefined ? safe(received_date)    : row.received_date,
        unit            !== undefined ? unit                   : row.unit,
        low_stock_alert !== undefined ? Number(low_stock_alert): row.low_stock_alert,
        notes           !== undefined ? safe(notes)            : row.notes,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM inventory WHERE id=?', args: [req.params.id] });
    const item = updated.rows[0];
    res.json({ ...item, stock_status: computeStockStatus(item) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/inventory/:id
// Blocks deletion if quantity > 0 unless force=true is sent in body.
// ────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM inventory WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    const row = existing.rows[0];

    if (row.quantity > 0 && !req.body?.force) {
      return res.status(409).json({
        error: `Cannot delete item with ${row.quantity}${row.unit} remaining stock. Send { force: true } to override.`,
        quantity: row.quantity,
        unit: row.unit,
      });
    }

    await db.execute({ sql: 'DELETE FROM inventory WHERE id=?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/inventory/:id/transact — add or deduct stock with edge-case guards
// Body: { type: 'add'|'deduct', quantity: number, note?: string,
//         project_id?: string, client_id?: string }
// ────────────────────────────────────────────────────────────────────────────
router.post('/:id/transact', validate(inventoryTransactionSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { type, quantity, note = '', project_id = '', client_id = '' } = req.body;
  const qty = Number(quantity);

  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM inventory WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });

    const row = existing.rows[0];

    if (type === 'deduct') {
      if (qty > row.quantity) {
        return res.status(400).json({
          error: `Cannot deduct ${qty}${row.unit} — only ${row.quantity}${row.unit} in stock.`,
          current_quantity: row.quantity,
          unit: row.unit,
        });
      }
    }

    const newQty = type === 'add'
      ? row.quantity + qty
      : row.quantity - qty;

    const ts   = now();
    const txId = uuidv4();

    // Update inventory quantity
    await db.execute({
      sql:  'UPDATE inventory SET quantity=?, updated_at=? WHERE id=?',
      args: [newQty, ts, req.params.id],
    });

    // Record transaction
    await db.execute({
      sql:  `INSERT INTO inventory_transactions
               (id, inventory_id, project_id, client_id, type, quantity, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [txId, req.params.id, safe(project_id), safe(client_id), type, qty, safe(note), ts],
    });

    res.json({
      ok: true,
      transaction_id: txId,
      type,
      quantity_changed: qty,
      new_quantity: newQty,
      unit: row.unit,
      stock_status: computeStockStatus({ ...row, quantity: newQty }),
    });
  } catch (err) {
    console.error('[inventory] POST /:id/transact error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/inventory/:id/transactions — full audit trail for one item
// ────────────────────────────────────────────────────────────────────────────
router.get('/:id/transactions', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const result = await db.execute({
      sql:  `SELECT t.*, c.name as client_name
             FROM inventory_transactions t
             LEFT JOIN clients c ON c.id = t.client_id
             WHERE t.inventory_id = ?
             ORDER BY t.created_at DESC`,
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper ───────────────────────────────────────────────────────────────────
function computeStockStatus(item) {
  if (item.quantity <= 0)                          return 'out_of_stock';
  if (item.low_stock_alert > 0 && item.quantity <= item.low_stock_alert) return 'low_stock';
  return 'in_stock';
}

module.exports = router;
