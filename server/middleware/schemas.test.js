'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const schemas = require('./schemas');

test('client measurement payload matches configurator requests', () => {
  assert.equal(schemas.clientMeasurementsSchema.safeParse({
    unit: 'in',
    values: { chest: 40 },
  }).success, true);
  assert.equal(schemas.clientMeasurementsSchema.safeParse({
    values: {},
  }).success, true);
});

test('client visit requests accept an optional order link', () => {
  const clientVisitSchema = schemas.clientVisitSchema;
  assert.equal(clientVisitSchema.safeParse({
    visit_date: '2026-11-02',
    purpose: 'Fitting',
    order_id: '00000000-0000-4000-8000-000000000001',
  }).success, true);
  assert.equal(clientVisitSchema.safeParse({
    visit_date: '2026-11-02',
    order_id: '',
  }).success, true);
  assert.equal(clientVisitSchema.safeParse({
    visit_date: '2026-11-02',
    order_id: 'not-an-order',
  }).success, false);
});

test('order requests match create and partial-update payloads', () => {
  assert.equal(schemas.orderSchema.safeParse({
    work_type: 'b2b',
    order_date: '2026-11-02',
    trial_date: '',
    delivery_date: '',
    total_amount: 0,
    advance_paid: 0,
    notes: '',
  }).success, true);
  assert.equal(schemas.orderSchema.safeParse({
    work_type: 'other',
    order_date: '2026-11-02',
  }).success, false);

  assert.equal(schemas.orderUpdateSchema.safeParse({ status: 'completed' }).success, true);
  assert.equal(schemas.orderUpdateSchema.safeParse({ work_type: 'b2c' }).success, true);
});

test('project requests accept object measurements and partial updates', () => {
  const objectPayload = schemas.projectUpdateSchema.safeParse({
    measurements: { chest: 40 },
  });
  assert.equal(objectPayload.success, true);
  assert.deepEqual(objectPayload.data.measurements, { chest: 40 });

  const jsonPayload = schemas.projectUpdateSchema.safeParse({
    measurements: '{"chest":40}',
  });
  assert.equal(jsonPayload.success, true);
  assert.deepEqual(jsonPayload.data.measurements, { chest: 40 });

  assert.equal(schemas.projectUpdateSchema.safeParse({
    measurements: 'not-json',
  }).success, false);
});

test('project requests accept the additional garment types', () => {
  for (const garment_type of ['Shirt', 'Kurta', 'Chinos', 'Suit', 'Pajama', 'Shacket', 'Alterations', 'Shirts/Kurta']) {
    assert.equal(schemas.projectSchema.safeParse({ garment_type }).success, true, garment_type);
  }
});

test('schedule requests accept create and partial update payloads', () => {
  assert.equal(schemas.scheduleEventSchema.safeParse({
    event_type: 'trial',
    title: 'Fitting',
    event_date: '2026-11-02',
    event_time: '',
    description: '',
    client_id: '',
    project_id: '',
    all_day: 1,
  }).success, true);

  assert.equal(schemas.scheduleEventUpdateSchema.safeParse({
    title: 'Moved fitting',
    event_date: '2026-11-03',
  }).success, true);
});

test('status and reorder updates accept the fields sent by their screens', () => {
  assert.equal(schemas.shortcomingUpdateSchema.safeParse({
    status: 'in_progress',
  }).success, true);
  assert.equal(schemas.hierarchySectionUpdateSchema.safeParse({
    sort_order: 0,
  }).success, true);
  assert.equal(schemas.inventoryUpdateSchema.safeParse({
    name: 'Wool',
  }).success, true);
});

test('B2B form payload validates, coerces quantity, and retains form fields', () => {
  const result = schemas.b2bEntrySchema.safeParse({
    entry_type: 'corporate_order',
    work_type: 'b2b',
    client_id: '',
    order_date: '2026-11-02',
    company_name: 'Company',
    client_code: 'CTB-1',
    style_product_name: 'Suit',
    fabric_code: 'F1',
    fabric_colour: 'Navy',
    inventory_id: '',
    brand_name: 'Brand',
    quantity: '2',
    transfer_to_workshop: '',
    delivered_date: '',
    status: 'pending',
    notes: '',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.quantity, 2);
  assert.equal(result.data.work_type, 'b2b');
  assert.equal(result.data.client_id, '');
  assert.equal(schemas.b2bEntrySchema.safeParse({
    entry_type: 'corporate_order',
    work_type: 'b2c',
    client_id: '00000000-0000-4000-8000-000000000001',
  }).success, true);
  assert.equal(schemas.b2bEntrySchema.safeParse({
    entry_type: 'corporate_order',
    work_type: 'other',
  }).success, false);
  for (const field of [
    'order_date',
    'client_code',
    'style_product_name',
    'fabric_code',
    'fabric_colour',
    'inventory_id',
    'brand_name',
    'transfer_to_workshop',
    'delivered_date',
  ]) {
    assert.ok(field in result.data, `expected B2B field ${field} to be retained`);
  }
  assert.equal(schemas.b2bEntryUpdateSchema.safeParse({ status: 'completed' }).success, true);
  assert.equal(schemas.b2bEntrySchema.safeParse({
    entry_type: 'corporate_order',
    quantity: 'not-a-number',
  }).success, false);
});

test('fabric receipt validation retains linked form fields', () => {
  const result = schemas.fabricReceiptSchema.safeParse({
    client_id: '00000000-0000-4000-8000-000000000001',
    order_id: '',
    client_code: 'CTB-1',
    client_name: 'Client',
    inventory_id: '',
    fabric_code: 'F1',
    fabric_color: 'Navy',
    accessories_desc: '',
    sample_notes: '',
    order_date: '',
    received_date: '',
  });

  assert.equal(result.success, true);
  for (const field of ['order_id', 'client_code', 'client_name', 'inventory_id']) {
    assert.ok(field in result.data, `expected fabric receipt field ${field} to be retained`);
  }
  assert.equal(schemas.fabricReceiptUpdateSchema.safeParse({
    received_date: '2026-11-02',
  }).success, true);
});

test('B2B router can load its exported validation schemas', () => {
  assert.doesNotThrow(() => require('../b2b'));
});
