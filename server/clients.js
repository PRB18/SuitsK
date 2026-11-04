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
const { validate }   = require('./middleware/validate');
const { 
  idSchema, clientSchema, clientMeasurementsSchema, 
  clientVisitSchema, orderSchema, orderUpdateSchema, projectSchema,
  projectUpdateSchema, projectStatusSchema
} = require('./middleware/schemas');
const { safeJsonParse } = require('./middleware/safeJson');

const router = express.Router();

function isValidId(id) {
  return idSchema.safeParse(id).success;
}

// ── Allowed garment types ────────────────────────────────────────────────────
const GARMENT_TYPES = [
  'Jacket', 'Sherwani', 'Sadri', 'Shacket', 'Waistcoat', 'Jodhpuri',
  'Shirts/Kurta', 'Shirt', 'Kurta', 'Pant', 'Chinos', 'Suit', 'Pajama', 'Alterations',
  'Safari jkt', 'Denim'
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

function displayPhone(phone) {
  return typeof phone === 'string' && phone.startsWith('__NO_PHONE__') ? '' : (phone || '');
}

async function supportsNullPhone(db) {
  const result = await db.execute('PRAGMA table_info(clients)');
  const phoneColumn = result.rows.find(column => column.name === 'phone');
  return phoneColumn ? Number(phoneColumn.notnull) === 0 : true;
}

// ────────────────────────────────────────────────────────────────────────────
// ACTIVE ORDERS ROUTE
// ────────────────────────────────────────────────────────────────────────────

// GET /api/active-orders — fetch all non-completed orders with details
router.get('/active-orders', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(`
      SELECT o.id, o.order_ref, o.status, o.order_date as date,
             o.trial_date, o.delivery_date, o.notes,
             c.name as customer, o.total_amount as amount,
             (SELECT COUNT(*) FROM projects WHERE order_id = o.id AND status != 'delivered') as qty,
             (SELECT fabric_code FROM fabric_receipts WHERE order_id = o.id OR (order_id = '' AND client_id = o.client_id) ORDER BY created_at DESC LIMIT 1) as fabric_code,
             (SELECT fabric_color FROM fabric_receipts WHERE order_id = o.id OR (order_id = '' AND client_id = o.client_id) ORDER BY created_at DESC LIMIT 1) as fabric_color,
             o.client_id
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE o.status NOT IN ('completed', 'cancelled', 'delivered')
        AND (SELECT COUNT(*) FROM projects WHERE order_id = o.id AND status != 'delivered') > 0
      ORDER BY o.order_date DESC
    `);

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const enhancedRows = result.rows.map(row => {
      let urgency = 'none';
      if (row.delivery_date) {
        if (today > row.delivery_date) {
          urgency = 'overdue';
        } else if (row.delivery_date <= nextWeek) {
          urgency = 'due_soon';
        } else {
          urgency = 'on_track';
        }
      }
      return { ...row, urgency };
    });

    res.json(enhancedRows);
  } catch (err) {
    console.error('[clients] GET /active-orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:clientId/active-projects
router.get('/clients/:clientId/active-projects', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: `
        SELECT p.id as project_id, p.garment_type, p.status, 
               o.order_ref, o.id as order_id, o.delivery_date
        FROM projects p
        JOIN orders o ON p.order_id = o.id
        WHERE p.client_id = ?
          AND p.status != 'delivered'
          AND o.status NOT IN ('completed', 'cancelled')
        ORDER BY o.created_at DESC, p.created_at ASC
      `,
      args: [req.params.clientId]
    });
    res.json(result.rows);
  } catch (err) {
    console.error('[clients] GET /active-projects error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// CLIENT ROUTES
// ────────────────────────────────────────────────────────────────────────────

// GET /api/clients — lightweight list for Client DB screen
router.get('/clients', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute(
            `SELECT c.id, c.client_ref, c.name,
              CASE WHEN c.phone LIKE '__NO_PHONE__%' THEN '' ELSE COALESCE(c.phone, '') END AS phone,
              c.email, c.city, c.created_at, c.updated_at,
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
router.post('/clients', validate(clientSchema), async (req, res) => {
  const { name, phone, email = '', address = '', city = '', notes = '' } = req.body;

  try {
    const db = getDb();

    // Uniqueness check — return the existing client's ref so frontend can link to it
    if (safe(phone)) {
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
    }

    const id         = uuidv4();
    const ts         = now();
    const client_ref = await generateClientRef(db);
    const normalizedPhone = safe(phone) || null;
    const storedPhone = normalizedPhone || (await supportsNullPhone(db) ? null : `__NO_PHONE__${id}`);

    await db.execute({
      sql:  `INSERT INTO clients (id, client_ref, name, phone, email, address, city, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, client_ref, safe(name), storedPhone, safe(email), safe(address), safe(city), safe(notes), ts, ts],
    });

    await db.execute({
      sql: `INSERT INTO client_measurements (id, client_id, unit, values_json, created_at, updated_at)
            VALUES (?, ?, 'in', '{}', ?, ?)`,
      args: [uuidv4(), id, ts, ts],
    });

    res.status(201).json({ id, client_ref, name: safe(name), phone: normalizedPhone || '', email: safe(email), address: safe(address), city: safe(city), notes: safe(notes), created_at: ts, updated_at: ts, measurement_linked: true });
  } catch (err) {
    console.error('[clients] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id — full profile: client + orders (with projects nested)
router.get('/clients/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const clientResult = await db.execute({
      sql:  'SELECT * FROM clients WHERE id = ?',
      args: [req.params.id],
    });
    if (clientResult.rows.length === 0)
      return res.status(404).json({ error: 'Client not found.' });

    const client = clientResult.rows[0];
    client.phone = displayPhone(client.phone);

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
        measurements: safeJsonParse(p.measurements || '{}', {}),
      }));
      orders.push({ ...order, projects });
    }

    const measurementResult = await db.execute({
      sql: 'SELECT id, unit, values_json, created_at, updated_at FROM client_measurements WHERE client_id = ?',
      args: [req.params.id],
    });
    const visitsResult = await db.execute({
      sql: `SELECT v.id, v.visit_date, v.purpose, v.order_id, v.created_at, o.order_ref
            FROM client_visits v
            LEFT JOIN orders o ON o.id = v.order_id
            WHERE v.client_id = ? ORDER BY v.visit_date DESC, v.created_at DESC`,
      args: [req.params.id],
    });
    const measurement = measurementResult.rows[0] || null;
    // Prefer parsed `values`; keep values_json for older UI paths.
    const measurementPayload = measurement
      ? {
          ...measurement,
          values: safeJsonParse(measurement.values_json || '{}', {}),
        }
      : null;

    // Linked style configs for this client (suits vault ↔ client).
    const suitsResult = await db.execute({
      sql: 'SELECT id, name, notes, updated_at FROM suits WHERE client_id = ? ORDER BY updated_at DESC',
      args: [req.params.id],
    });

    res.json({
      ...client,
      orders,
      visits: visitsResult.rows,
      measurement: measurementPayload,
      suits: suitsResult.rows,
    });
  } catch (err) {
    console.error('[clients] GET /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id/measurements — client-level measurement profile
router.get('/clients/:id/measurements', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM client_measurements WHERE client_id=?', args: [req.params.id] });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Measurement profile not found.' });
    const row = result.rows[0];
    res.json({ ...row, values: safeJsonParse(row.values_json || '{}', {}) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clients/:id/measurements — replace client-level measurement values
router.put('/clients/:id/measurements', validate(clientMeasurementsSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const ts = now();
    const values = req.body.values && typeof req.body.values === 'object' ? req.body.values : {};
    const unit = safe(req.body.unit) || 'in';
    const existing = await db.execute({ sql: 'SELECT id FROM client_measurements WHERE client_id=?', args: [req.params.id] });
    if (existing.rows.length === 0) {
      await db.execute({ sql: `INSERT INTO client_measurements (id, client_id, unit, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [uuidv4(), req.params.id, unit, JSON.stringify(values), ts, ts] });
    } else {
      await db.execute({ sql: 'UPDATE client_measurements SET unit=?, values_json=?, updated_at=? WHERE client_id=?', args: [unit, JSON.stringify(values), ts, req.params.id] });
    }
    await pushMeasurementsToActiveProjects(db, req.params.id, values, ts);
    res.json({ client_id: req.params.id, unit, values, updated_at: ts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** Merge client body measurements into every non-delivered garment for that client. */
async function pushMeasurementsToActiveProjects(db, clientId, values, ts) {
  if (!values || typeof values !== 'object') return;
  const projects = await db.execute({
    sql: `SELECT id, measurements FROM projects WHERE client_id = ? AND status != 'delivered'`,
    args: [clientId],
  });
  for (const row of projects.rows) {
    let current = {};
    current = safeJsonParse(row.measurements || '{}', {});
    const merged = { ...current, ...values };
    await db.execute({
      sql: 'UPDATE projects SET measurements = ?, updated_at = ? WHERE id = ?',
      args: [JSON.stringify(merged), ts, row.id],
    });
  }
}

// POST /api/clients/:id/visits — add a dated client visit
router.post('/clients/:id/visits', validate(clientVisitSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const visitDate = safe(req.body.visit_date);
  const orderId = safe(req.body.order_id);
  try {
    const db = getDb();
    const clientCheck = await db.execute({ sql: 'SELECT id FROM clients WHERE id=?', args: [req.params.id] });
    if (clientCheck.rows.length === 0) return res.status(404).json({ error: 'Client not found.' });
    if (orderId) {
      const orderCheck = await db.execute({
        sql: 'SELECT id FROM orders WHERE id = ? AND client_id = ?',
        args: [orderId, req.params.id],
      });
      if (orderCheck.rows.length === 0) return res.status(400).json({ error: 'Selected order does not belong to this client.' });
    }
    const row = { id: uuidv4(), client_id: req.params.id, order_id: orderId, visit_date: visitDate, purpose: safe(req.body.purpose), created_at: now() };
    await db.execute({ sql: 'INSERT INTO client_visits (id, client_id, order_id, visit_date, purpose, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [row.id, row.client_id, row.order_id, row.visit_date, row.purpose, row.created_at] });
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clients/:id — update client fields
router.put('/clients/:id', validate(clientSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
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

    const storedPhone = phone !== undefined
      ? (safe(phone) || (await supportsNullPhone(db) ? null : `__NO_PHONE__${req.params.id}`))
      : row.phone;
    await db.execute({
      sql:  `UPDATE clients SET name=?, phone=?, email=?, address=?, city=?, notes=?, updated_at=? WHERE id=?`,
      args: [
        name    !== undefined ? safe(name)    : row.name,
        storedPhone,
        email   !== undefined ? safe(email)   : row.email,
        address !== undefined ? safe(address) : row.address,
        city    !== undefined ? safe(city)    : row.city,
        notes   !== undefined ? safe(notes)   : row.notes,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [req.params.id] });
    const updatedClient = updated.rows[0];
    updatedClient.phone = displayPhone(updatedClient.phone);
    res.json(updatedClient);
  } catch (err) {
    console.error('[clients] PUT /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id — cascade deletes orders + projects
router.delete('/clients/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
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
router.get('/clients/:id/orders', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
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
router.post('/clients/:id/orders', validate(orderSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const { order_date, trial_date = '', delivery_date = '', total_amount = 0, advance_paid = 0, status, notes = '' } = req.body;

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
router.put('/clients/:id/orders/:orderId', validate(orderUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id) || !isValidId(req.params.orderId)) return res.status(404).json({ error: 'Not found' });
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
router.post('/clients/:id/orders/:orderId/projects', validate(projectSchema), async (req, res) => {
  if (!isValidId(req.params.id) || !isValidId(req.params.orderId)) return res.status(404).json({ error: 'Not found' });
  const { garment_type, measurements = {}, suit_config_id = '' } = req.body;

  try {
    const db = getDb();
    const orderCheck = await db.execute({ sql: 'SELECT id FROM orders WHERE id = ? AND client_id = ?', args: [req.params.orderId, req.params.id] });
    if (orderCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });

    // Seed garment measurements from the client's linked measurement profile when caller
    // did not supply any values — keeps body data connected across sections.
    let seeded = measurements && typeof measurements === 'object' ? measurements : {};
    if (!seeded || Object.keys(seeded).length === 0) {
      const meas = await db.execute({
        sql: 'SELECT values_json FROM client_measurements WHERE client_id = ?',
        args: [req.params.id],
      });
      if (meas.rows.length > 0) {
        seeded = safeJsonParse(meas.rows[0].values_json || '{}', {});
      }
    }

    const id = uuidv4();
    const ts = now();
    await db.execute({
      sql:  `INSERT INTO projects (id, order_id, client_id, garment_type, status, suit_config_id, measurements, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      args: [id, req.params.orderId, req.params.id, garment_type, safe(suit_config_id), JSON.stringify(seeded), ts, ts],
    });
    res.status(201).json({ id, order_id: req.params.orderId, client_id: req.params.id, garment_type, status: 'pending', suit_config_id: safe(suit_config_id), measurements: seeded, created_at: ts, updated_at: ts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// PROJECT ROUTES  /api/projects/:projectId  (also mounted in index.js)
// ────────────────────────────────────────────────────────────────────────────

// PUT /api/projects/:projectId — update project (status, measurements, suit_config_id)
router.put('/projects/:projectId', validate(projectUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.projectId)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [req.params.projectId] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    const row = existing.rows[0];
    const { status, measurements, suit_config_id } = req.body;

    if (status && !PROJECT_STAGES.includes(status))
      return res.status(400).json({ error: `Invalid status. Must be one of: ${PROJECT_STAGES.join(', ')}` });

    const ts = now();
    const nextMeasurements = measurements !== undefined ? JSON.stringify(measurements) : row.measurements;
    await db.execute({
      sql:  `UPDATE projects SET status=?, measurements=?, suit_config_id=?, updated_at=? WHERE id=?`,
      args: [
        status        !== undefined ? status                         : row.status,
        nextMeasurements,
        suit_config_id!== undefined ? safe(suit_config_id)           : row.suit_config_id,
        ts, req.params.projectId,
      ],
    });

    // Keep the client measurement profile connected when garment measurements change.
    if (measurements !== undefined && row.client_id) {
      const existingMeas = await db.execute({
        sql: 'SELECT id, values_json, unit FROM client_measurements WHERE client_id = ?',
        args: [row.client_id],
      });
      let merged = {};
      let unit = 'in';
      if (existingMeas.rows.length > 0) {
        merged = safeJsonParse(existingMeas.rows[0].values_json || '{}', {});
        unit = existingMeas.rows[0].unit || 'in';
      }
      merged = { ...merged, ...(measurements || {}) };
      if (existingMeas.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO client_measurements (id, client_id, unit, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [uuidv4(), row.client_id, unit, JSON.stringify(merged), ts, ts],
        });
      } else {
        await db.execute({
          sql: 'UPDATE client_measurements SET values_json=?, updated_at=? WHERE client_id=?',
          args: [JSON.stringify(merged), ts, row.client_id],
        });
      }
    }

    const updated = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [req.params.projectId] });
    const p = updated.rows[0];
    res.json({ ...p, measurements: safeJsonParse(p.measurements || '{}', {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/status — move to next stage (used by Workshop Kanban)
router.put('/projects/:projectId/status', validate(projectStatusSchema), async (req, res) => {
  if (!isValidId(req.params.projectId)) return res.status(404).json({ error: 'Not found' });
  const { status } = req.body;
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
  if (!isValidId(req.params.projectId)) return res.status(404).json({ error: 'Not found' });
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
