'use strict';
/**
 * b2b.js — B2B entries router (corporate orders + vendor purchases)
 * Routes: /api/b2b/*
 *
 * All routes protected by requireUnlocked middleware.
 */

const express        = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('./db');
const { validate }   = require('./middleware/validate');
const { idSchema, b2bEntrySchema, b2bEntryUpdateSchema } = require('./middleware/schemas');
const { safeJsonParse } = require('./middleware/safeJson');

const router = express.Router();

function isValidId(id) {
  return idSchema.safeParse(id).success;
}

const ENTRY_TYPES = ['corporate_order', 'vendor_purchase'];
const STATUSES    = ['pending', 'in_progress', 'completed', 'cancelled'];
const WORK_TYPES  = ['b2b', 'b2c'];
const GARMENT_TYPES = ['Jacket', 'Sherwani', 'Sadri', 'Waistcoat', 'Jodhpuri', 'Shirts/Kurta', 'Pant', 'Safari jkt', 'Denim'];

function now() { return new Date().toISOString(); }
function safe(str) { return typeof str === 'string' ? str.trim() : ''; }

// GET /api/b2b — list all entries (filter by ?type=)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    let sql = `
      SELECT b.*, i.name as inventory_name, i.article_number as inventory_article,
             COALESCE(
               (SELECT c.name FROM clients c WHERE c.id = b.client_id),
               (SELECT c.name FROM clients c WHERE lower(trim(c.name)) = lower(trim(b.company_name)) ORDER BY c.created_at LIMIT 1),
               (SELECT c.name FROM clients c WHERE c.client_ref = b.client_code LIMIT 1)
             ) as linked_client_name,
             COALESCE(
               (SELECT c.client_ref FROM clients c WHERE c.id = b.client_id),
               (SELECT c.client_ref FROM clients c WHERE lower(trim(c.name)) = lower(trim(b.company_name)) ORDER BY c.created_at LIMIT 1),
               (SELECT c.client_ref FROM clients c WHERE c.client_ref = b.client_code LIMIT 1)
             ) as linked_client_ref,
             COALESCE(
               (SELECT c.id FROM clients c WHERE c.id = b.client_id),
               (SELECT c.id FROM clients c WHERE lower(trim(c.name)) = lower(trim(b.company_name)) ORDER BY c.created_at LIMIT 1),
               (SELECT c.id FROM clients c WHERE c.client_ref = b.client_code LIMIT 1)
             ) as linked_client_id
      FROM b2b_entries b
      LEFT JOIN inventory i ON b.inventory_id = i.id
      WHERE 1=1
    `;
    const args = [];

    if (req.query.type && ENTRY_TYPES.includes(req.query.type)) {
      sql += ' AND b.entry_type = ?'; args.push(req.query.type);
    }
    if (req.query.status && STATUSES.includes(req.query.status)) {
      sql += ' AND b.status = ?'; args.push(req.query.status);
    }
    if (req.query.work_type) {
      if (!WORK_TYPES.includes(req.query.work_type)) {
        return res.status(400).json({ error: 'Invalid work_type. Must be b2b or b2c.' });
      }
      sql += ' AND b.work_type = ?'; args.push(req.query.work_type);
    }

    sql += ' ORDER BY b.created_at DESC';
    const result = await db.execute({ sql, args });
    res.json(result.rows.map(row => ({
      ...row,
      company_name: row.linked_client_name || row.company_name,
      client_code: row.linked_client_ref || row.client_code,
      client_id: row.linked_client_id || row.client_id,
      garment_types: safeJsonParse(row.garment_types || '[]', []),
    })));
  } catch (err) {
    console.error('[b2b] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/b2b — create entry
router.post('/', validate(b2bEntrySchema), async (req, res) => {
  const {
    entry_type, order_date, work_type = 'b2c', client_id = '',
    // Corporate order fields
    company_name = '', contact_person = '', contact_phone = '', contact_email = '',
    quantity = 0, garment_types = [],
    // Vendor purchase fields
    vendor_name = '', items_ordered = '',
    // Common
    total_amount = 0, delivery_date = '', status = 'pending', notes = '',
    // New B2B specific fields
    client_code = '', style_product_name = '', brand_name = '',
    fabric_code = '', fabric_colour = '', inventory_id = '',
    transfer_to_workshop = '', delivered_date = ''
  } = req.body;

  try {
    const db = getDb();
    let resolvedClientId = safe(client_id);
    let linkedClient = null;
    if (resolvedClientId) {
      const linked = await db.execute({
        sql: 'SELECT id, name, client_ref FROM clients WHERE id = ?',
        args: [resolvedClientId],
      });
      linkedClient = linked.rows[0] || null;
      if (!linkedClient) return res.status(400).json({ error: 'Selected client was not found.' });
    } else if (safe(company_name)) {
      const linked = await db.execute({
        sql: 'SELECT id, name, client_ref FROM clients WHERE lower(trim(name)) = lower(trim(?)) LIMIT 1',
        args: [safe(company_name)],
      });
      linkedClient = linked.rows[0] || null;
      resolvedClientId = linkedClient?.id || '';
    }
    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  `INSERT INTO b2b_entries
               (id, entry_type, company_name, contact_person, contact_phone, contact_email,
                quantity, garment_types, vendor_name, items_ordered, total_amount,
                order_date, delivery_date, status, notes,
                client_code, style_product_name, brand_name, fabric_code, fabric_colour,
                inventory_id, transfer_to_workshop, delivered_date,
                work_type, client_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, entry_type, safe(company_name), safe(contact_person), safe(contact_phone), safe(contact_email),
        Number(quantity), JSON.stringify(garment_types), safe(vendor_name), safe(items_ordered),
        Number(total_amount), safe(order_date), safe(delivery_date), status, safe(notes),
        linkedClient?.client_ref || safe(client_code), safe(style_product_name), safe(brand_name), safe(fabric_code), safe(fabric_colour),
        safe(inventory_id), safe(transfer_to_workshop), safe(delivered_date),
        work_type, resolvedClientId, ts, ts,
      ],
    });

    res.status(201).json({ id, entry_type, work_type, client_id: resolvedClientId, company_name: linkedClient?.name || safe(company_name), contact_person: safe(contact_person), contact_phone: safe(contact_phone), contact_email: safe(contact_email), quantity: Number(quantity), garment_types, vendor_name: safe(vendor_name), items_ordered: safe(items_ordered), total_amount: Number(total_amount), order_date: safe(order_date), delivery_date: safe(delivery_date), status, notes: safe(notes), client_code: linkedClient?.client_ref || safe(client_code), style_product_name: safe(style_product_name), brand_name: safe(brand_name), fabric_code: safe(fabric_code), fabric_colour: safe(fabric_colour), inventory_id: safe(inventory_id), transfer_to_workshop: safe(transfer_to_workshop), delivered_date: safe(delivered_date), created_at: ts, updated_at: ts });
  } catch (err) {
    console.error('[b2b] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/b2b/:id
router.put('/:id', validate(b2bEntryUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM b2b_entries WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'B2B entry not found.' });
    const row = existing.rows[0];

    const { company_name, contact_person, contact_phone, contact_email, quantity, garment_types, vendor_name, items_ordered, total_amount, order_date, delivery_date, status, notes,
            client_code, style_product_name, brand_name, fabric_code, fabric_colour, inventory_id, transfer_to_workshop, delivered_date, work_type, client_id } = req.body;

    const resolvedGarmentTypes = garment_types !== undefined ? JSON.stringify(garment_types) : row.garment_types;
    const ts = now();
    let resolvedClientId = client_id !== undefined ? safe(client_id) : row.client_id;
    let linkedClient = null;
    if (resolvedClientId) {
      const linked = await db.execute({
        sql: 'SELECT id, name, client_ref FROM clients WHERE id = ?',
        args: [resolvedClientId],
      });
      linkedClient = linked.rows[0] || null;
      if (!linkedClient) return res.status(400).json({ error: 'Selected client was not found.' });
    } else if (company_name !== undefined && safe(company_name)) {
      const linked = await db.execute({
        sql: 'SELECT id, name, client_ref FROM clients WHERE lower(trim(name)) = lower(trim(?)) LIMIT 1',
        args: [safe(company_name)],
      });
      linkedClient = linked.rows[0] || null;
      resolvedClientId = linkedClient?.id || '';
    }

    await db.execute({
      sql:  `UPDATE b2b_entries SET company_name=?, contact_person=?, contact_phone=?, contact_email=?,
             quantity=?, garment_types=?, vendor_name=?, items_ordered=?, total_amount=?,
             order_date=?, delivery_date=?, status=?, notes=?,
             client_code=?, style_product_name=?, brand_name=?, fabric_code=?, fabric_colour=?,
             inventory_id=?, transfer_to_workshop=?, delivered_date=?, work_type=?, client_id=?,
             updated_at=? WHERE id=?`,
      args: [
        company_name   !== undefined ? safe(company_name)   : row.company_name,
        contact_person !== undefined ? safe(contact_person) : row.contact_person,
        contact_phone  !== undefined ? safe(contact_phone)  : row.contact_phone,
        contact_email  !== undefined ? safe(contact_email)  : row.contact_email,
        quantity       !== undefined ? Number(quantity)     : row.quantity,
        resolvedGarmentTypes,
        vendor_name    !== undefined ? safe(vendor_name)    : row.vendor_name,
        items_ordered  !== undefined ? safe(items_ordered)  : row.items_ordered,
        total_amount   !== undefined ? Number(total_amount) : row.total_amount,
        order_date     !== undefined ? safe(order_date)     : row.order_date,
        delivery_date  !== undefined ? safe(delivery_date)  : row.delivery_date,
        status         !== undefined ? status               : row.status,
        notes          !== undefined ? safe(notes)          : row.notes,
        linkedClient?.client_ref || (client_id !== undefined || company_name !== undefined ? safe(client_code || '') : row.client_code),
        style_product_name !== undefined ? safe(style_product_name) : row.style_product_name,
        brand_name     !== undefined ? safe(brand_name)     : row.brand_name,
        fabric_code    !== undefined ? safe(fabric_code)    : row.fabric_code,
        fabric_colour  !== undefined ? safe(fabric_colour)  : row.fabric_colour,
        inventory_id   !== undefined ? safe(inventory_id)   : row.inventory_id,
        transfer_to_workshop !== undefined ? safe(transfer_to_workshop) : row.transfer_to_workshop,
        delivered_date !== undefined ? safe(delivered_date) : row.delivered_date,
        work_type !== undefined ? work_type : row.work_type,
        resolvedClientId,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM b2b_entries WHERE id=?', args: [req.params.id] });
    const r = updated.rows[0];
    res.json({ ...r, garment_types: safeJsonParse(r.garment_types || '[]', []) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/b2b/:id
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getDb();
    const result = await db.execute({ sql: 'DELETE FROM b2b_entries WHERE id=?', args: [req.params.id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'B2B entry not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
