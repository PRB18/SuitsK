'use strict';
/**
 * clients.js — Client, Order, and Project CRUD router
 * Routes: /api/clients/* and /api/projects/*
 *
 * Clients: full CRM for tailoring customers.
 * Orders:  one active order per client groups multiple garments.
 * Projects: individual garment within an order (jacket, pant, etc.)
 *
 * All routes protected by requireUnlocked middleware (mounted in index.js).
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');

const router = express.Router();

// ── Allowed garment types ────────────────────────────────────────────────────
const GARMENT_TYPES = [
  'Jacket', 'Sherwani', 'Sadri', 'Waistcoat', 'Jodhpuri',
  'Shirts/Kurta', 'Pant', 'Safari jkt', 'Denim'
];

// ── Project status stages (ordered) ─────────────────────────────────────────
const PROJECT_STAGES = [
  'pending', 'cutting', 'canvas', 'stitching',
  'buttonholes', 'pressing', 'trial', 'ready', 'delivered'
];

// ── Order status values ──────────────────────────────────────────────────────
const ORDER_STATUSES = ['pending', 'in_progress', 'ready', 'completed', 'cancelled'];

function now() { return new Date().toISOString(); }

// ── Auto-generate CTB-YYYY-NNN client ref ────────────────────────────────────
async function generateClientRef(db) {
  const year = new Date().getFullYear();
  const result = await db.execute({
    sql:  `SELECT COUNT(*) as cnt FROM clients WHERE client_ref LIKE ?`,
    args: [`CTB-${year}-%`],
  });
  const n = Number(result.rows[0]?.cnt ?? 0) + 1;
  return `CTB-${year}-${String(n).padStart(3, '0')}`;
}

// ── Auto-generate ORD-YYYY-NNN order ref ────────────────────────────────────
async function generateOrderRef(db) {
  const year = new Date().getFullYear();
  const result = await db.execute({
    sql:  `SELECT COUNT(*) as cnt FROM orders WHERE order_ref LIKE ?`,
    args: [`ORD-${year}-%`],
  });
  const n = Number(result.rows[0]?.cnt ?? 0) + 1;
  return `ORD-${year}-${String(n).padStart(3, '0')}`;
}

// ── Sanitise HTML in user-supplied strings ───────────────────────────────────
function safe(str) {
  return typeof str === 'string' ? str.trim() : '';
}

// ────────────────────────────────────────────────────────────────────────────
// CLIENT ROUTES
// ────────────────────────────────────────────────────────────────────────────

// GET /api/clients — lightweight list for Client DB screen
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(
      `SELECT c.id, c.client_ref, c.name, c.phone, c.email, c.city, c.updated_at,
              (SELECT o.status FROM orders o WHERE o.client_id = c.id
               ORDER BY o.created_at DESC LIMIT 1) AS latest_order_status,
              (SELECT o.id FROM orders o WHERE o.client_id = c.id
               ORDER BY o.created_at DESC LIMIT 1) AS latest_order_id
       FROM clients c ORDER BY c.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[clients] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients — create new client
router.post('/', async (req, res) => {
  const { name, phone, email = '', address = '', city = '', notes = '' } = req.body;

  if (!name || safe(name).length === 0)
    return res.status(400).json({ error: 'Client name is required.' });
  if (!phone || safe(phone).length === 0)
    return res.status(400).json({ error: 'Phone number is required.' });

  try {
    const db = getDb();

    // Uniqueness check — return the existing client's ref so frontend can link to it
    const existing = await db.execute({
      sql:  'SELECT id, client_ref, name FROM clients WHERE phone = ?',
      args: [safe(phone)],
    });
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `A client with this phone number already exists.`,
        existing: existing.rows[0],
      });
    }

    const id         = uuidv4();
    const ts         = now();
    const client_ref = await generateClientRef(db);

    await db.execute({
      sql:  `INSERT INTO clients (id, client_ref, name, phone, email, address, city, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, client_ref, safe(name), safe(phone), safe(email), safe(address), safe(city), safe(notes), ts, ts],
    });

    res.status(201).json({ id, client_ref, name: safe(name), phone: safe(phone), email: safe(email), address: safe(address), city: safe(city), notes: safe(notes), created_at: ts, updated_at: ts });
  } catch (err) {
    console.error('[clients] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id — full profile: client + orders (with projects nested)
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const clientResult = await db.execute({
      sql:  'SELECT * FROM clients WHERE id = ?',
      args: [req.params.id],
    });
    if (clientResult.rows.length === 0)
      return res.status(404).json({ error: 'Client not found.' });

    const client = clientResult.rows[0];

    // Fetch all orders for this client
    const ordersResult = await db.execute({
      sql:  'SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC',
      args: [req.params.id],
    });

    // For each order, fetch its projects
    const orders = [];
    for (const order of ordersResult.rows) {
      const projectsResult = await db.execute({
        sql:  'SELECT * FROM projects WHERE order_id = ? ORDER BY created_at ASC',
        args: [order.id],
      });
      const projects = projectsResult.rows.map(p => ({
        ...p,
        measurements: JSON.parse(p.measurements || '{}'),
      }));
      orders.push({ ...order, projects });
    }

    res.json({ ...client, orders });
  } catch (err) {
    console.error('[clients] GET /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id — update client fields
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.execute({
      sql: 'SELECT * FROM clients WHERE id = ?', args: [req.params.id],
    });
    if (existing.rows.length === 0)
      return res.status(404).json({ error: 'Client not found.' });

    const row = existing.rows[0];
    const { name, phone, email, address, city, notes } = req.body;
    const ts = now();

    // If phone is being changed, ensure it doesn't clash with another client
    if (phone && safe(phone) !== row.phone) {
      const clash = await db.execute({
        sql:  'SELECT id, client_ref FROM clients WHERE phone = ? AND id != ?',
        args: [safe(phone), req.params.id],
      });
      if (clash.rows.length > 0) {
        return res.status(409).json({
          error: 'Another client already uses this phone number.',
          existing: clash.rows[0],
        });
      }
    }

    await db.execute({
      sql:  `UPDATE clients SET name=?, phone=?, email=?, address=?, city=?, notes=?, updated_at=? WHERE id=?`,
      args: [
        name    !== undefined ? safe(name)    : row.name,
        phone   !== undefined ? safe(phone)   : row.phone,
        email   !== undefined ? safe(email)   : row.email,
        address !== undefined ? safe(address) : row.address,
        city    !== undefined ? safe(city)    : row.city,
        notes   !== undefined ? safe(notes)   : row.notes,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [req.params.id] });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('[clients] PUT /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id — cascade deletes orders + projects
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: 'DELETE FROM clients WHERE id = ?', args: [req.params.id],
    });
    if (result.rowsAffected === 0)
      return res.status(404).json({ error: 'Client not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[clients] DELETE /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// ORDER ROUTES  /api/clients/:id/orders
// ────────────────────────────────────────────────────────────────────────────

// GET /api/clients/:id/orders
router.get('/:id/orders', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql:  'SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC',
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/:id/orders — create order for a client
router.post('/:id/orders', async (req, res) => {
  const { order_date, trial_date = '', delivery_date = '', total_amount = 0, advance_paid = 0, notes = '' } = req.body;
  if (!order_date) return res.status(400).json({ error: 'order_date is required.' });

  try {
    const db = getDb();

    // Ensure client exists
    const clientCheck = await db.execute({ sql: 'SELECT id FROM clients WHERE id = ?', args: [req.params.id] });
    if (clientCheck.rows.length === 0) return res.status(404).json({ error: 'Client not found.' });

    const id        = uuidv4();
    const ts        = now();
    const order_ref = await generateOrderRef(db);

    await db.execute({
      sql:  `INSERT INTO orders (id, client_id, order_ref, order_date, trial_date, delivery_date, status, total_amount, advance_paid, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      args: [id, req.params.id, order_ref, order_date, trial_date, delivery_date, Number(total_amount), Number(advance_paid), safe(notes), ts, ts],
    });

    res.status(201).json({ id, client_id: req.params.id, order_ref, order_date, trial_date, delivery_date, status: 'pending', total_amount: Number(total_amount), advance_paid: Number(advance_paid), notes: safe(notes), created_at: ts, updated_at: ts, projects: [] });
  } catch (err) {
    console.error('[clients] POST /:id/orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id/orders/:orderId — update order
router.put('/:id/orders/:orderId', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ? AND client_id = ?', args: [req.params.orderId, req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    const row = existing.rows[0];
    const { order_date, trial_date, delivery_date, status, total_amount, advance_paid, notes } = req.body;

    if (status && !ORDER_STATUSES.includes(status))
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}` });

    const ts = now();
    await db.execute({
      sql:  `UPDATE orders SET order_date=?, trial_date=?, delivery_date=?, status=?, total_amount=?, advance_paid=?, notes=?, updated_at=? WHERE id=?`,
      args: [
        order_date    !== undefined ? order_date    : row.order_date,
        trial_date    !== undefined ? trial_date    : row.trial_date,
        delivery_date !== undefined ? delivery_date : row.delivery_date,
        status        !== undefined ? status        : row.status,
        total_amount  !== undefined ? Number(total_amount)  : row.total_amount,
        advance_paid  !== undefined ? Number(advance_paid)  : row.advance_paid,
        notes         !== undefined ? safe(notes)   : row.notes,
        ts, req.params.orderId,
      ],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [req.params.orderId] });
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/:id/orders/:orderId/projects — add a garment to an order
router.post('/:id/orders/:orderId/projects', async (req, res) => {
  const { garment_type, measurements = {}, suit_config_id = '' } = req.body;
  if (!garment_type) return res.status(400).json({ error: 'garment_type is required.' });
  if (!GARMENT_TYPES.includes(garment_type))
    return res.status(400).json({ error: `Invalid garment_type. Must be one of: ${GARMENT_TYPES.join(', ')}` });

  try {
    const db = getDb();
    const orderCheck = await db.execute({ sql: 'SELECT id FROM orders WHERE id = ? AND client_id = ?', args: [req.params.orderId, req.params.id] });
    if (orderCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const id = uuidv4();
    const ts = now();
    await db.execute({
      sql:  `INSERT INTO projects (id, order_id, client_id, garment_type, status, suit_config_id, measurements, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      args: [id, req.params.orderId, req.params.id, garment_type, safe(suit_config_id), JSON.stringify(measurements), ts, ts],
    });
    res.status(201).json({ id, order_id: req.params.orderId, client_id: req.params.id, garment_type, status: 'pending', suit_config_id: safe(suit_config_id), measurements, created_at: ts, updated_at: ts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PROJECT ROUTES  /api/projects/:projectId  (also mounted in index.js)
// ────────────────────────────────────────────────────────────────────────────

// PUT /api/projects/:projectId — update project (status, measurements, suit_config_id)
router.put('/projects/:projectId', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [req.params.projectId] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    const row = existing.rows[0];
    const { status, measurements, suit_config_id } = req.body;

    if (status && !PROJECT_STAGES.includes(status))
      return res.status(400).json({ error: `Invalid status. Must be one of: ${PROJECT_STAGES.join(', ')}` });

    const ts = now();
    await db.execute({
      sql:  `UPDATE projects SET status=?, measurements=?, suit_config_id=?, updated_at=? WHERE id=?`,
      args: [
        status        !== undefined ? status                         : row.status,
        measurements  !== undefined ? JSON.stringify(measurements)   : row.measurements,
        suit_config_id!== undefined ? safe(suit_config_id)           : row.suit_config_id,
        ts, req.params.projectId,
      ],
    });
    const updated = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [req.params.projectId] });
    const p = updated.rows[0];
    res.json({ ...p, measurements: JSON.parse(p.measurements || '{}') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/status — move to next stage (used by Workshop Kanban)
router.put('/projects/:projectId/status', async (req, res) => {
  const { status } = req.body;
  if (!status || !PROJECT_STAGES.includes(status))
    return res.status(400).json({ error: `Invalid status. Must be one of: ${PROJECT_STAGES.join(', ')}` });
  try {
    const db = getDb();
    const ts = now();
    const result = await db.execute({ sql: 'UPDATE projects SET status=?, updated_at=? WHERE id=?', args: [status, ts, req.params.projectId] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Project not found.' });

    // Check if all sibling projects in this order are delivered → return a flag so frontend can prompt
    const project = await db.execute({ sql: 'SELECT order_id FROM projects WHERE id=?', args: [req.params.projectId] });
    let allDelivered = false;
    if (status === 'delivered' && project.rows.length > 0) {
      const siblings = await db.execute({
        sql:  'SELECT status FROM projects WHERE order_id=?',
        args: [project.rows[0].order_id],
      });
      allDelivered = siblings.rows.every(s => s.status === 'delivered');
    }

    res.json({ ok: true, status, allDelivered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:projectId
router.delete('/projects/:projectId', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'DELETE FROM projects WHERE id=?', args: [req.params.projectId] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Project not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export GARMENT_TYPES and PROJECT_STAGES for reuse by workshop router
module.exports = router;
module.exports.GARMENT_TYPES  = GARMENT_TYPES;
module.exports.PROJECT_STAGES = PROJECT_STAGES;
