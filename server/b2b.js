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

const router = express.Router();

const ENTRY_TYPES = ['corporate_order', 'vendor_purchase'];
const STATUSES    = ['pending', 'in_progress', 'completed', 'cancelled'];
const GARMENT_TYPES = ['Jacket', 'Sherwani', 'Sadri', 'Waistcoat', 'Jodhpuri', 'Shirts/Kurta', 'Pant', 'Safari jkt', 'Denim'];

function now() { return new Date().toISOString(); }
function safe(str) { return typeof str === 'string' ? str.trim() : ''; }

// GET /api/b2b — list all entries (filter by ?type=)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    let sql = `
      SELECT b.*, i.name as inventory_name, i.article_number as inventory_article 
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

    sql += ' ORDER BY b.created_at DESC';
    const result = await db.execute({ sql, args });
    res.json(result.rows.map(row => ({
      ...row,
      garment_types: JSON.parse(row.garment_types || '[]'),
    })));
  } catch (err) {
    console.error('[b2b] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/b2b — create entry
router.post('/', async (req, res) => {
  const {
    entry_type, order_date,
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

  if (!entry_type || !ENTRY_TYPES.includes(entry_type))
    return res.status(400).json({ error: `entry_type must be one of: ${ENTRY_TYPES.join(', ')}` });
  if (!order_date)
    return res.status(400).json({ error: 'order_date is required.' });
  if (status && !STATUSES.includes(status))
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });

  // Validate garment_types array
  if (!Array.isArray(garment_types))
    return res.status(400).json({ error: 'garment_types must be an array.' });
  for (const g of garment_types) {
    if (!GARMENT_TYPES.includes(g))
      return res.status(400).json({ error: `Invalid garment type: "${g}". Must be one of: ${GARMENT_TYPES.join(', ')}` });
  }

  // Type-specific validation
  if (entry_type === 'corporate_order' && !company_name)
    return res.status(400).json({ error: 'company_name is required for corporate orders.' });
  if (entry_type === 'vendor_purchase' && !vendor_name)
    return res.status(400).json({ error: 'vendor_name is required for vendor purchases.' });

  try {
    const db = getDb();
    const id = uuidv4();
    const ts = now();

    await db.execute({
      sql:  `INSERT INTO b2b_entries
               (id, entry_type, company_name, contact_person, contact_phone, contact_email,
                quantity, garment_types, vendor_name, items_ordered, total_amount,
                order_date, delivery_date, status, notes,
                client_code, style_product_name, brand_name, fabric_code, fabric_colour,
                inventory_id, transfer_to_workshop, delivered_date,
                created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, entry_type, safe(company_name), safe(contact_person), safe(contact_phone), safe(contact_email),
        Number(quantity), JSON.stringify(garment_types), safe(vendor_name), safe(items_ordered),
        Number(total_amount), safe(order_date), safe(delivery_date), status, safe(notes),
        safe(client_code), safe(style_product_name), safe(brand_name), safe(fabric_code), safe(fabric_colour),
        safe(inventory_id), safe(transfer_to_workshop), safe(delivered_date),
        ts, ts,
      ],
    });

    res.status(201).json({ id, entry_type, company_name: safe(company_name), contact_person: safe(contact_person), contact_phone: safe(contact_phone), contact_email: safe(contact_email), quantity: Number(quantity), garment_types, vendor_name: safe(vendor_name), items_ordered: safe(items_ordered), total_amount: Number(total_amount), order_date: safe(order_date), delivery_date: safe(delivery_date), status, notes: safe(notes), client_code: safe(client_code), style_product_name: safe(style_product_name), brand_name: safe(brand_name), fabric_code: safe(fabric_code), fabric_colour: safe(fabric_colour), inventory_id: safe(inventory_id), transfer_to_workshop: safe(transfer_to_workshop), delivered_date: safe(delivered_date), created_at: ts, updated_at: ts });
  } catch (err) {
    console.error('[b2b] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/b2b/:id
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const existing = await db.execute({ sql: 'SELECT * FROM b2b_entries WHERE id=?', args: [req.params.id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'B2B entry not found.' });
    const row = existing.rows[0];

    const { company_name, contact_person, contact_phone, contact_email, quantity, garment_types, vendor_name, items_ordered, total_amount, order_date, delivery_date, status, notes,
            client_code, style_product_name, brand_name, fabric_code, fabric_colour, inventory_id, transfer_to_workshop, delivered_date } = req.body;

    if (status && !STATUSES.includes(status))
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });

    const resolvedGarmentTypes = garment_types !== undefined ? JSON.stringify(garment_types) : row.garment_types;
    const ts = now();

    await db.execute({
      sql:  `UPDATE b2b_entries SET company_name=?, contact_person=?, contact_phone=?, contact_email=?,
             quantity=?, garment_types=?, vendor_name=?, items_ordered=?, total_amount=?,
             order_date=?, delivery_date=?, status=?, notes=?,
             client_code=?, style_product_name=?, brand_name=?, fabric_code=?, fabric_colour=?,
             inventory_id=?, transfer_to_workshop=?, delivered_date=?,
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
        client_code    !== undefined ? safe(client_code)    : row.client_code,
        style_product_name !== undefined ? safe(style_product_name) : row.style_product_name,
        brand_name     !== undefined ? safe(brand_name)     : row.brand_name,
        fabric_code    !== undefined ? safe(fabric_code)    : row.fabric_code,
        fabric_colour  !== undefined ? safe(fabric_colour)  : row.fabric_colour,
        inventory_id   !== undefined ? safe(inventory_id)   : row.inventory_id,
        transfer_to_workshop !== undefined ? safe(transfer_to_workshop) : row.transfer_to_workshop,
        delivered_date !== undefined ? safe(delivered_date) : row.delivered_date,
        ts, req.params.id,
      ],
    });

    const updated = await db.execute({ sql: 'SELECT * FROM b2b_entries WHERE id=?', args: [req.params.id] });
    const r = updated.rows[0];
    res.json({ ...r, garment_types: JSON.parse(r.garment_types || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/b2b/:id
router.delete('/:id', async (req, res) => {
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
