'use strict';

const { z } = require('zod');

// ── Shared ──────────────────────────────────────────────────────────────────
const idSchema = z.string().uuid("Invalid ID format");
const dateSchema = z.string().refine(v => !v || !isNaN(Date.parse(v)), { message: "Invalid date format" });

// ── Clients ─────────────────────────────────────────────────────────────────
const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().max(100).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const clientMeasurementsSchema = z.object({
  unit: z.enum(['in', 'cm']),
  values_json: z.string().refine(val => {
    try { JSON.parse(val); return true; } catch { return false; }
  }, { message: "Invalid JSON for measurements" })
});

const clientVisitSchema = z.object({
  visit_date: dateSchema,
  purpose: z.string().max(255).optional().nullable(),
});

// ── Orders ──────────────────────────────────────────────────────────────────
const orderSchema = z.object({
  order_date: dateSchema,
  trial_date: dateSchema.optional().nullable(),
  delivery_date: dateSchema.optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'ready', 'completed', 'cancelled']),
  total_amount: z.number().min(0).optional(),
  advance_paid: z.number().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const projectSchema = z.object({
  garment_type: z.enum([
    'Jacket', 'Sherwani', 'Sadri', 'Waistcoat', 'Jodhpuri',
    'Shirts/Kurta', 'Pant', 'Safari jkt', 'Denim'
  ]),
  status: z.enum([
    'pending', 'cutting', 'canvas', 'stitching',
    'buttonholes', 'pressing', 'trial', 'ready', 'delivered'
  ]).optional(),
  suit_config_id: z.string().optional().nullable(),
  measurements: z.string().refine(val => {
    try { JSON.parse(val); return true; } catch { return false; }
  }, { message: "Invalid JSON" }).optional(),
});

const projectStatusSchema = z.object({
  status: z.enum([
    'pending', 'cutting', 'canvas', 'stitching',
    'buttonholes', 'pressing', 'trial', 'ready', 'delivered'
  ])
});

// ── Suits (Configurator) ────────────────────────────────────────────────────
const suitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  notes: z.string().max(2000).optional().nullable(),
  client_id: z.string().optional().nullable(),
  data: z.record(z.any()).optional().nullable(),
});

const duplicateSuitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

// ── Inventory ───────────────────────────────────────────────────────────────
const inventorySchema = z.object({
  item_type: z.enum(['fabric', 'accessory']),
  name: z.string().min(1, "Name is required").max(100),
  article_number: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  supplier: z.string().max(100).optional().nullable(),
  order_date: dateSchema.optional().nullable(),
  received_date: dateSchema.optional().nullable(),
  quantity: z.number().min(0),
  unit: z.enum(['m', 'pcs']),
  low_stock_alert: z.number().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const inventoryTransactionSchema = z.object({
  type: z.enum(['add', 'deduct']),
  quantity: z.number().positive("Quantity must be positive"),
  note: z.string().max(255).optional().nullable(),
  project_id: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
});

// ── Schedule ────────────────────────────────────────────────────────────────
const scheduleEventSchema = z.object({
  client_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  event_type: z.enum(['trial', 'delivery', 'client_visit', 'other']),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  event_date: dateSchema,
  event_time: z.string().max(50).optional().nullable(),
  all_day: z.union([z.boolean(), z.number()]).transform(val => !!val),
  status: z.enum(['scheduled', 'completed', 'cancelled']),
});

// ── Workshop Hierarchy ──────────────────────────────────────────────────────
const hierarchySectionSchema = z.object({
  section_name: z.string().min(1).max(100),
  sort_order: z.number().int().optional(),
});

const hierarchyPersonnelSchema = z.object({
  personnel: z.array(z.string()).max(100),
});

// ── Shortcomings ────────────────────────────────────────────────────────────
const shortcomingSchema = z.object({
  category: z.enum(['tailoring', 'managerial', 'client']),
  severity: z.enum(['high', 'medium', 'low']),
  client_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
});

const shortcomingResolveSchema = z.object({
  resolved_note: z.string().max(2000).optional().nullable(),
});

// ── B2B ─────────────────────────────────────────────────────────────────────
const b2bEntrySchema = z.object({
  entry_type: z.enum(['corporate_order', 'vendor_purchase']),
  company_name: z.string().max(255).optional().nullable(),
  contact_person: z.string().max(100).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  contact_email: z.string().max(100).optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  garment_types: z.array(z.string()).optional().nullable(),
  vendor_name: z.string().max(255).optional().nullable(),
  items_ordered: z.string().max(2000).optional().nullable(),
  total_amount: z.number().min(0).optional(),
  advance_paid: z.number().min(0).optional(),
  delivery_date: dateSchema.optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

// ── Fabric Receipts ─────────────────────────────────────────────────────────
const fabricReceiptSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  fabric_code: z.string().max(100).optional().nullable(),
  fabric_color: z.string().max(100).optional().nullable(),
  accessories_desc: z.string().max(1000).optional().nullable(),
  order_date: dateSchema,
  received_date: dateSchema.optional().nullable(),
  sample_notes: z.string().max(2000).optional().nullable(),
});

module.exports = {
  idSchema,
  clientSchema,
  clientMeasurementsSchema,
  clientVisitSchema,
  orderSchema,
  projectSchema,
  projectStatusSchema,
  suitSchema,
  duplicateSuitSchema,
  inventorySchema,
  inventoryTransactionSchema,
  scheduleEventSchema,
  hierarchySectionSchema,
  hierarchyPersonnelSchema,
  shortcomingSchema,
  shortcomingResolveSchema,
  b2bEntrySchema,
  fabricReceiptSchema,
};
