'use strict';
/**
 * weeklyReport.js — Weekly Atelier Report generator
 * Route: GET /api/weekly-report?from=ISO_DATE&to=ISO_DATE
 *
 * Generates a branded .xlsx workbook with 11 sheets covering the past 7 days:
 *   1.  Summary
 *   2.  New Clients & Orders
 *   3.  Active Orders & Garments
 *   4.  Deliveries This Week
 *   5.  Issues (Shortcomings)
 *   6.  Fabric Receipts
 *   7.  Inventory
 *   8.  Schedule & Calendar
 *   9.  Workshop Kanban
 *   10. B2C Work in Progress
 *   11. Work Hierarchy
 *
 * Protected by requireUnlocked middleware (mounted in index.js).
 */

const express  = require('express');
const ExcelJS  = require('exceljs');
const path     = require('path');
const fs       = require('fs');
const os       = require('os');
const { getDb } = require('./db');

// macOS iCloud Drive path (works on any Mac with iCloud Drive enabled)
const ICLOUD_DIR = path.join(
  os.homedir(),
  'Library', 'Mobile Documents', 'com~apple~CloudDocs',
  'Congressional The Bespoke', 'Weekly Reports'
);

const router = express.Router();

// Brand colours (matching the app's design system)
const BRAND_DARK   = '2C1810';  // dark brown header
const BRAND_GOLD   = 'C9A84C';  // gold accent
const BRAND_LIGHT  = 'FAF7F2';  // cream row
const BRAND_WHITE  = 'FFFFFF';

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function isInWindow(dateStr, from, to) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10); // YYYY-MM-DD
  return d >= from && d <= to;
}

function applyHeaderRow(sheet, headers, colWidths = []) {
  const row = sheet.addRow(headers);
  row.eachCell((cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
    cell.font   = { bold: true, color: { argb: 'FF' + BRAND_GOLD }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF' + BRAND_GOLD } },
    };
  });
  row.height = 22;

  // Set column widths
  sheet.columns = headers.map((h, i) => ({
    key: String(i),
    width: colWidths[i] || Math.max(h.length + 4, 16),
  }));
}

function addDataRow(sheet, values, rowIndex) {
  const row = sheet.addRow(values);
  const bgColor = rowIndex % 2 === 0 ? BRAND_WHITE : BRAND_LIGHT;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
    cell.font = { size: 10 };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  row.height = 18;
}

function addEmptyNote(sheet, note) {
  const row = sheet.addRow([note]);
  row.getCell(1).font = { italic: true, color: { argb: 'FF999999' }, size: 10 };
}

function addTitleBlock(sheet, title, dateRange) {
  // Row 1 — company name
  const r1 = sheet.addRow(['Congressional The Bespoke — Weekly Atelier Report']);
  r1.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_DARK } };
  r1.height = 24;

  // Row 2 — date range
  const r2 = sheet.addRow([`Period: ${dateRange}`]);
  r2.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  r2.height = 16;

  // Row 3 — section name
  const r3 = sheet.addRow([title]);
  r3.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND_GOLD } };
  r3.height = 20;

  // Row 4 — blank spacer
  sheet.addRow([]);
}

// GET /api/weekly-report
router.get('/weekly-report', async (req, res) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (req.query.from && !dateRegex.test(req.query.from.slice(0, 10))) {
    return res.status(400).json({ error: "Invalid 'from' date format." });
  }
  if (req.query.to && !dateRegex.test(req.query.to.slice(0, 10))) {
    return res.status(400).json({ error: "Invalid 'to' date format." });
  }

  try {
    const db  = getDb();
    const now = new Date();

    // Determine date window
    const toDate   = req.query.to   ? req.query.to.slice(0, 10)   : now.toISOString().slice(0, 10);
    const fromDate = req.query.from ? req.query.from.slice(0, 10) : new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateRange = `${fmtDate(fromDate)} – ${fmtDate(toDate)}`;

    // ── Fetch all needed data in parallel ────────────────────────────────────
    const [
      clientsResult,
      ordersResult,
      projectsResult,
      shortcomingsResult,
      fabricResult,
      activeOrdersResult,
      inventoryResult,
      scheduleResult,
      workshopResult,
      b2bResult,
      hierarchyResult,
    ] = await Promise.all([
      db.execute(`SELECT * FROM clients ORDER BY created_at DESC`),
      db.execute(`SELECT o.*, c.name as client_name, c.client_ref FROM orders o JOIN clients c ON o.client_id = c.id ORDER BY o.order_date DESC`),
      db.execute(`SELECT p.*, o.order_ref, o.delivery_date, o.trial_date, c.name as client_name, c.client_ref FROM projects p JOIN orders o ON p.order_id = o.id JOIN clients c ON o.client_id = c.id ORDER BY p.created_at DESC`),
      db.execute(`SELECT s.*, c.name as client_name, c.client_ref FROM shortcomings s LEFT JOIN clients c ON c.id = s.client_id ORDER BY s.created_at DESC`),
      db.execute(`SELECT f.*, c.name as client_name FROM fabric_receipts f LEFT JOIN clients c ON f.client_id = c.id ORDER BY f.created_at DESC`),
      db.execute(`
        SELECT o.id, o.order_ref, o.status, o.order_date, o.trial_date, o.delivery_date, o.notes,
               c.name as client_name, c.client_ref,
               (SELECT COUNT(*) FROM projects WHERE order_id = o.id) as total_garments,
               (SELECT COUNT(*) FROM projects WHERE order_id = o.id AND status = 'delivered') as delivered_garments,
               (SELECT fabric_code FROM fabric_receipts WHERE order_id = o.id OR (order_id = '' AND client_id = o.client_id) ORDER BY created_at DESC LIMIT 1) as fabric_code,
               (SELECT fabric_color FROM fabric_receipts WHERE order_id = o.id OR (order_id = '' AND client_id = o.client_id) ORDER BY created_at DESC LIMIT 1) as fabric_color
        FROM orders o JOIN clients c ON o.client_id = c.id
        WHERE o.status NOT IN ('completed', 'cancelled')
        ORDER BY o.order_date DESC
      `),
      db.execute(`SELECT * FROM inventory ORDER BY name ASC`),
      db.execute(`SELECT e.*, c.name as client_name, c.client_ref FROM schedule_events e LEFT JOIN clients c ON c.id = e.client_id ORDER BY e.event_date DESC`),
      db.execute(`SELECT p.*, o.order_ref, o.delivery_date, o.trial_date, c.name as client_name, c.client_ref FROM projects p JOIN orders o ON p.order_id = o.id JOIN clients c ON o.client_id = c.id ORDER BY p.updated_at DESC`),
      db.execute(`SELECT * FROM b2b_entries ORDER BY created_at DESC`),
      db.execute(`SELECT * FROM work_hierarchy ORDER BY sort_order ASC`),
    ]);

    const allClients      = clientsResult.rows;
    const allOrders       = ordersResult.rows;
    const allProjects     = projectsResult.rows;
    const allShortcomings = shortcomingsResult.rows;
    const allFabric       = fabricResult.rows;
    const allActiveOrders = activeOrdersResult.rows;
    const allInventory    = inventoryResult.rows;
    const allSchedule     = scheduleResult.rows;
    const allWorkshop     = workshopResult.rows;
    const allB2B          = b2bResult.rows;
    const allHierarchy    = hierarchyResult.rows;

    // Filter by window
    const newClients      = allClients.filter(c => isInWindow(c.created_at, fromDate, toDate));
    const newOrders       = allOrders.filter(o => isInWindow(o.order_date || o.created_at, fromDate, toDate));
    const deliveredProj   = allProjects.filter(p => p.status === 'delivered' && isInWindow(p.updated_at || p.created_at, fromDate, toDate));
    const weekShortcomings= allShortcomings.filter(s => isInWindow(s.created_at, fromDate, toDate) || isInWindow(s.resolved_at, fromDate, toDate));
    const weekFabric      = allFabric.filter(f => isInWindow(f.received_date || f.created_at, fromDate, toDate));
    const weekSchedule    = allSchedule.filter(e => isInWindow(e.event_date || e.created_at, fromDate, toDate));

    // ── Build Excel workbook ─────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator  = 'Congressional The Bespoke';
    workbook.created  = new Date();
    workbook.modified = new Date();

    // ── SHEET 1: Summary ─────────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Summary', {
      tabColor: { argb: 'FF' + BRAND_GOLD },
    });
    summarySheet.columns = [{ width: 38 }, { width: 20 }];

    const sR1 = summarySheet.addRow(['Congressional The Bespoke']);
    sR1.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF' + BRAND_DARK } };
    sR1.height = 28;

    const sR2 = summarySheet.addRow(['Weekly Atelier Report']);
    sR2.getCell(1).font = { bold: true, size: 13, color: { argb: 'FF' + BRAND_GOLD } };
    sR2.height = 22;

    const sR3 = summarySheet.addRow([`Report Period: ${dateRange}`]);
    sR3.getCell(1).font = { italic: true, size: 11, color: { argb: 'FF555555' } };
    sR3.height = 18;

    const sR4 = summarySheet.addRow([`Generated on: ${fmtDate(now.toISOString())} at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`]);
    sR4.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF888888' } };
    sR4.height = 16;
    summarySheet.addRow([]);

    const summaryData = [
      ['📋 Category', '🔢 Count'],
      ['New Clients Added', newClients.length],
      ['New Orders Created', newOrders.length],
      ['Garments Currently Active', allActiveOrders.reduce((acc, o) => acc + (Number(o.total_garments) - Number(o.delivered_garments || 0)), 0)],
      ['Garments Delivered This Week', deliveredProj.length],
      ['Active Orders Total', allActiveOrders.length],
      ['Issues Logged This Week', weekShortcomings.filter(s => isInWindow(s.created_at, fromDate, toDate)).length],
      ['Issues Resolved This Week', weekShortcomings.filter(s => s.status === 'resolved' && isInWindow(s.resolved_at, fromDate, toDate)).length],
      ['Fabric Receipts Received', weekFabric.length],
    ];

    summaryData.forEach((row, i) => {
      const r = summarySheet.addRow(row);
      if (i === 0) {
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
          cell.font = { bold: true, color: { argb: 'FF' + BRAND_GOLD }, size: 11 };
        });
      } else {
        const bg = i % 2 === 1 ? BRAND_WHITE : BRAND_LIGHT;
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
          cell.font = { size: 11 };
        });
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND_DARK } };
      }
      r.height = 22;
    });

    // ── SHEET 2: New Clients & Orders ─────────────────────────────────────────
    const clientsSheet = workbook.addWorksheet('New Clients & Orders');
    addTitleBlock(clientsSheet, '🧑 New Clients This Week', dateRange);
    applyHeaderRow(clientsSheet,
      ['Client Ref', 'Client Name', 'Phone', 'Email', 'Date Added', 'Notes'],
      [14, 24, 16, 26, 14, 30]
    );
    if (newClients.length === 0) {
      addEmptyNote(clientsSheet, 'No new clients added this week.');
    } else {
      newClients.forEach((c, i) => addDataRow(clientsSheet,
        [c.client_ref || '', c.name || '', c.phone || '', c.email || '', fmtDate(c.created_at), c.notes || ''],
        i
      ));
    }

    clientsSheet.addRow([]);
    const ordHdrRow = clientsSheet.addRow(['📦 New Orders This Week']);
    ordHdrRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND_GOLD } };
    clientsSheet.addRow([]);
    applyHeaderRow(clientsSheet,
      ['Order Ref', 'Client Name', 'Client Ref', 'Order Date', 'Trial Date', 'Delivery Date', 'Status', 'Notes'],
      [14, 22, 13, 14, 14, 14, 12, 30]
    );
    if (newOrders.length === 0) {
      addEmptyNote(clientsSheet, 'No new orders created this week.');
    } else {
      newOrders.forEach((o, i) => addDataRow(clientsSheet,
        [o.order_ref || '', o.client_name || '', o.client_ref || '', fmtDate(o.order_date), fmtDate(o.trial_date), fmtDate(o.delivery_date), o.status || '', o.notes || ''],
        i
      ));
    }

    // ── SHEET 3: Active Orders & Garments ────────────────────────────────────
    const activeSheet = workbook.addWorksheet('Active Orders & Garments');
    addTitleBlock(activeSheet, '🚧 Active Orders Snapshot', dateRange);
    applyHeaderRow(activeSheet,
      ['Order Ref', 'Client Name', 'Client Ref', 'Status', 'Order Date', 'Trial Date', 'Delivery Date', 'Fabric Code', 'Fabric Color', 'Garments', 'Delivered'],
      [14, 22, 13, 12, 14, 14, 14, 14, 14, 10, 10]
    );
    if (allActiveOrders.length === 0) {
      addEmptyNote(activeSheet, 'No active orders found.');
    } else {
      allActiveOrders.forEach((o, i) => addDataRow(activeSheet,
        [
          o.order_ref || '', o.client_name || '', o.client_ref || '', o.status || '',
          fmtDate(o.order_date), fmtDate(o.trial_date), fmtDate(o.delivery_date),
          o.fabric_code || '', o.fabric_color || '',
          o.total_garments || 0, o.delivered_garments || 0,
        ],
        i
      ));
    }

    // Garments detail sub-section
    activeSheet.addRow([]);
    const gHdrRow = activeSheet.addRow(['🧵 Individual Garment Stages (All Active)']);
    gHdrRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND_GOLD } };
    activeSheet.addRow([]);
    applyHeaderRow(activeSheet,
      ['Order Ref', 'Client Name', 'Garment Type', 'Current Stage', 'Trial Date', 'Delivery Date', 'Notes'],
      [14, 22, 16, 14, 14, 14, 28]
    );
    const activeGarments = allProjects.filter(p => p.status !== 'delivered');
    if (activeGarments.length === 0) {
      addEmptyNote(activeSheet, 'No active garments found.');
    } else {
      activeGarments.forEach((p, i) => addDataRow(activeSheet,
        [p.order_ref || '', p.client_name || '', p.garment_type || '', p.status || '', fmtDate(p.trial_date), fmtDate(p.delivery_date), p.notes || ''],
        i
      ));
    }

    // ── SHEET 4: Deliveries This Week ────────────────────────────────────────
    const delivSheet = workbook.addWorksheet('Deliveries This Week');
    addTitleBlock(delivSheet, '✅ Garments Delivered This Week', dateRange);
    applyHeaderRow(delivSheet,
      ['Order Ref', 'Client Name', 'Client Ref', 'Garment Type', 'Delivery Date', 'Notes'],
      [14, 22, 13, 16, 14, 28]
    );
    if (deliveredProj.length === 0) {
      addEmptyNote(delivSheet, 'No garments were delivered this week.');
    } else {
      deliveredProj.forEach((p, i) => addDataRow(delivSheet,
        [p.order_ref || '', p.client_name || '', p.client_ref || '', p.garment_type || '', fmtDate(p.delivery_date || p.updated_at), p.notes || ''],
        i
      ));
    }

    // ── SHEET 5: Issues (Shortcomings) ───────────────────────────────────────
    const issuesSheet = workbook.addWorksheet('Issues');
    addTitleBlock(issuesSheet, '⚠️ Issues Logged / Resolved This Week', dateRange);
    applyHeaderRow(issuesSheet,
      ['Category', 'Severity', 'Status', 'Client', 'Description', 'Date Logged', 'Resolved Date', 'Resolution Note'],
      [13, 10, 12, 20, 36, 14, 14, 28]
    );
    if (weekShortcomings.length === 0) {
      addEmptyNote(issuesSheet, 'No issues logged or resolved this week.');
    } else {
      weekShortcomings.forEach((s, i) => {
        const row = issuesSheet.addRow([
          s.category || '', s.severity || '', s.status || '',
          s.client_name || 'General', s.description || '',
          fmtDate(s.created_at), fmtDate(s.resolved_at), s.resolved_note || '',
        ]);
        const bg = i % 2 === 0 ? BRAND_WHITE : BRAND_LIGHT;
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
        // Colour severity cell
        const sevCell = row.getCell(2);
        if (s.severity === 'high')   sevCell.font = { bold: true, color: { argb: 'FFCC3300' }, size: 10 };
        if (s.severity === 'medium') sevCell.font = { bold: true, color: { argb: 'FFB8860B' }, size: 10 };
        row.height = 18;
      });
    }

    // ── SHEET 6: Fabric Receipts ─────────────────────────────────────────────
    const fabricSheet = workbook.addWorksheet('Fabric Receipts');
    addTitleBlock(fabricSheet, '🧶 Fabric Received This Week', dateRange);
    applyHeaderRow(fabricSheet,
      ['Client Ref', 'Client Name', 'Fabric Code', 'Fabric Color', 'Accessories / Lining', 'Order Date', 'Received Date', 'Sample Notes'],
      [13, 22, 14, 14, 28, 14, 14, 24]
    );
    if (weekFabric.length === 0) {
      addEmptyNote(fabricSheet, 'No fabric received this week.');
    } else {
      weekFabric.forEach((f, i) => addDataRow(fabricSheet,
        [f.client_code || '', f.client_name || '', f.fabric_code || '', f.fabric_color || '', f.accessories_desc || '', fmtDate(f.order_date), fmtDate(f.received_date), f.sample_notes || ''],
        i
      ));
    }

    // ── SHEET 7: Inventory ────────────────────────────────────────────────────
    const invSheet = workbook.addWorksheet('Inventory');
    addTitleBlock(invSheet, '📦 Full Inventory Snapshot', dateRange);
    applyHeaderRow(invSheet,
      ['Article No.', 'Item Name', 'Category', 'Quantity', 'Unit', 'Reorder Level', 'Status', 'Notes'],
      [14, 26, 14, 10, 8, 14, 14, 28]
    );
    if (allInventory.length === 0) {
      addEmptyNote(invSheet, 'No inventory items found.');
    } else {
      allInventory.forEach((item, i) => {
        const row = addDataRow(invSheet,
          [item.article_number || '', item.name || '', item.category || '', item.quantity ?? '', item.unit || '', item.reorder_level ?? '', item.stock_status || '', item.notes || ''],
          i
        );
        // Colour-code the status cell (col 7)
        const statusCell = invSheet.lastRow.getCell(7);
        if (item.stock_status === 'out_of_stock') statusCell.font = { bold: true, color: { argb: 'FFCC3300' }, size: 10 };
        else if (item.stock_status === 'low_stock') statusCell.font = { bold: true, color: { argb: 'FFB8860B' }, size: 10 };
        else statusCell.font = { bold: true, color: { argb: 'FF2E7D32' }, size: 10 };
      });
    }

    // ── SHEET 8: Schedule & Calendar ─────────────────────────────────────────
    const schedSheet = workbook.addWorksheet('Schedule & Calendar');
    addTitleBlock(schedSheet, '📅 Schedule Events This Week', dateRange);
    applyHeaderRow(schedSheet,
      ['Event Type', 'Client', 'Client Ref', 'Event Date', 'Start Time', 'End Time', 'Status', 'Notes'],
      [14, 22, 13, 14, 12, 12, 12, 30]
    );
    if (weekSchedule.length === 0) {
      addEmptyNote(schedSheet, 'No schedule events this week.');
    } else {
      weekSchedule.forEach((e, i) => addDataRow(schedSheet,
        [
          (e.event_type || '').replace(/_/g, ' '),
          e.client_name || '—', e.client_ref || '—',
          fmtDate(e.event_date), e.start_time || '—', e.end_time || '—',
          (e.status || '').replace(/_/g, ' '), e.notes || '',
        ],
        i
      ));
    }
    // Also show upcoming (future) events for full picture
    const upcomingSchedule = allSchedule.filter(e => e.event_date > toDate && e.status === 'scheduled');
    schedSheet.addRow([]);
    const upHdr = schedSheet.addRow(['📆 Upcoming Events (After This Period)']);
    upHdr.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND_GOLD } };
    schedSheet.addRow([]);
    applyHeaderRow(schedSheet,
      ['Event Type', 'Client', 'Client Ref', 'Event Date', 'Start Time', 'End Time', 'Notes'],
      [14, 22, 13, 14, 12, 12, 30]
    );
    if (upcomingSchedule.length === 0) {
      addEmptyNote(schedSheet, 'No upcoming events scheduled.');
    } else {
      upcomingSchedule.forEach((e, i) => addDataRow(schedSheet,
        [
          (e.event_type || '').replace(/_/g, ' '),
          e.client_name || '—', e.client_ref || '—',
          fmtDate(e.event_date), e.start_time || '—', e.end_time || '—', e.notes || '',
        ],
        i
      ));
    }

    // ── SHEET 9: Workshop Kanban ──────────────────────────────────────────────
    const wsSheet = workbook.addWorksheet('Workshop Kanban');
    addTitleBlock(wsSheet, '🔧 Workshop Kanban — All Garments', dateRange);
    applyHeaderRow(wsSheet,
      ['Order Ref', 'Client', 'Client Ref', 'Garment Type', 'Stage / Status', 'Trial Date', 'Delivery Date', 'Overdue?', 'Notes'],
      [14, 22, 13, 18, 14, 14, 14, 10, 28]
    );
    if (allWorkshop.length === 0) {
      addEmptyNote(wsSheet, 'No garments in workshop.');
    } else {
      const today = now().slice(0, 10);
      allWorkshop.forEach((p, i) => {
        const isOverdue = p.delivery_date && p.delivery_date < today && p.status !== 'delivered';
        const row = wsSheet.addRow([
          p.order_ref || '', p.client_name || '', p.client_ref || '',
          p.garment_type || '', (p.status || '').replace(/_/g, ' '),
          fmtDate(p.trial_date), fmtDate(p.delivery_date),
          isOverdue ? 'YES' : 'No', p.notes || '',
        ]);
        const bg = i % 2 === 0 ? BRAND_WHITE : BRAND_LIGHT;
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
        const overdueCell = row.getCell(8);
        if (isOverdue) overdueCell.font = { bold: true, color: { argb: 'FFCC3300' }, size: 10 };
        row.height = 18;
      });
    }

    // ── SHEET 10: B2C Work in Progress ────────────────────────────────────────
    const b2cSheet = workbook.addWorksheet('B2C Work in Progress');
    addTitleBlock(b2cSheet, '📋 B2C — Vendor & Corporate Entries', dateRange);
    applyHeaderRow(b2cSheet,
      ['Entry Type', 'Party Name', 'Contact', 'Order Date', 'Delivery Date', 'Amount', 'Status', 'Notes'],
      [16, 24, 20, 14, 14, 14, 14, 28]
    );
    if (allB2B.length === 0) {
      addEmptyNote(b2cSheet, 'No B2C entries found.');
    } else {
      allB2B.forEach((e, i) => {
        const partyName = e.entry_type === 'vendor_purchase' ? (e.vendor_name || '') : (e.company_name || '');
        const contact   = e.entry_type === 'vendor_purchase' ? (e.vendor_contact || '') : (e.contact_person || '');
        addDataRow(b2cSheet,
          [
            (e.entry_type || '').replace(/_/g, ' '), partyName, contact,
            fmtDate(e.order_date), fmtDate(e.delivery_date),
            e.amount ? `${e.currency || 'PKR'} ${e.amount}` : '—',
            (e.status || '').replace(/_/g, ' '), e.notes || '',
          ],
          i
        );
      });
    }
    // Week-filtered sub-section
    const weekB2B = allB2B.filter(e => isInWindow(e.created_at || e.order_date, fromDate, toDate));
    b2cSheet.addRow([]);
    const b2cWkHdr = b2cSheet.addRow([`📌 New This Week (${weekB2B.length})`]);
    b2cWkHdr.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF' + BRAND_GOLD } };
    b2cSheet.addRow([]);
    applyHeaderRow(b2cSheet,
      ['Entry Type', 'Party Name', 'Order Date', 'Status'],
      [16, 24, 14, 14]
    );
    if (weekB2B.length === 0) {
      addEmptyNote(b2cSheet, 'No new B2C entries this week.');
    } else {
      weekB2B.forEach((e, i) => addDataRow(b2cSheet,
        [
          (e.entry_type || '').replace(/_/g, ' '),
          e.entry_type === 'vendor_purchase' ? (e.vendor_name || '') : (e.company_name || ''),
          fmtDate(e.order_date), (e.status || '').replace(/_/g, ' '),
        ],
        i
      ));
    }

    // ── SHEET 11: Work Hierarchy ──────────────────────────────────────────────
    const hierSheet = workbook.addWorksheet('Work Hierarchy');
    addTitleBlock(hierSheet, '🏗️ Work Hierarchy — Sections & Personnel', dateRange);
    applyHeaderRow(hierSheet,
      ['Sort Order', 'Section Name', 'Personnel'],
      [12, 28, 50]
    );
    if (allHierarchy.length === 0) {
      addEmptyNote(hierSheet, 'No work hierarchy sections defined.');
    } else {
      const { safeJsonParse: safeParse } = require('./middleware/safeJson');
      allHierarchy.forEach((sec, i) => {
        const personnel = safeParse(sec.personnel || '[]', []);
        const personnelStr = Array.isArray(personnel) ? personnel.join(', ') : String(personnel);
        addDataRow(hierSheet,
          [sec.sort_order ?? i, sec.section_name || '', personnelStr || '—'],
          i
        );
      });
    }

    // ── Save a copy to iCloud Drive (macOS) ──────────────────────────────────
    const safeDate = toDate.replace(/-/g, '');
    const filename  = `Weekly-Report_${safeDate}.xlsx`;
    let iCloudSaved = false;
    let iCloudPath  = '';
    try {
      fs.mkdirSync(ICLOUD_DIR, { recursive: true });
      iCloudPath = path.resolve(ICLOUD_DIR, filename);
      if (!iCloudPath.startsWith(ICLOUD_DIR)) {
        throw new Error('Path traversal detected');
      }
      await workbook.xlsx.writeFile(iCloudPath);
      iCloudSaved = true;
      console.log(`[weekly-report] Saved to iCloud Drive: ${iCloudPath}`);
    } catch (icloudErr) {
      // Non-fatal: iCloud Drive may not be available on this machine
      console.warn('[weekly-report] Could not save to iCloud Drive:', icloudErr.message);
    }

    // ── Stream the workbook to the browser ───────────────────────────────────
    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control',       'no-cache');
    res.setHeader('X-ICloud-Saved',      iCloudSaved ? 'true' : 'false');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[weekly-report] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/weekly-report/preview — returns JSON for the browser preview modal
router.get('/weekly-report/preview', async (req, res) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (req.query.from && !dateRegex.test(req.query.from.slice(0, 10))) {
    return res.status(400).json({ error: "Invalid 'from' date format." });
  }
  if (req.query.to && !dateRegex.test(req.query.to.slice(0, 10))) {
    return res.status(400).json({ error: "Invalid 'to' date format." });
  }

  try {
    const db  = getDb();
    const now = new Date();

    const toDate   = req.query.to   ? req.query.to.slice(0, 10)   : now.toISOString().slice(0, 10);
    const fromDate = req.query.from ? req.query.from.slice(0, 10) : new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [
      clientsResult,
      ordersResult,
      projectsResult,
      shortcomingsResult,
      fabricResult,
      activeOrdersResult,
      inventoryResult,
      scheduleResult,
      workshopResult,
      b2bResult,
      hierarchyResult,
    ] = await Promise.all([
      db.execute(`SELECT id, client_ref, name, phone, email, created_at, notes FROM clients ORDER BY created_at DESC`),
      db.execute(`SELECT o.id, o.order_ref, o.status, o.order_date, o.trial_date, o.delivery_date, o.notes, c.name as client_name, c.client_ref FROM orders o JOIN clients c ON o.client_id = c.id ORDER BY o.order_date DESC`),
      db.execute(`SELECT p.id, p.garment_type, p.status, p.updated_at, p.created_at, o.order_ref, o.delivery_date, o.trial_date, c.name as client_name, c.client_ref FROM projects p JOIN orders o ON p.order_id = o.id JOIN clients c ON o.client_id = c.id ORDER BY p.created_at DESC`),
      db.execute(`SELECT s.*, c.name as client_name FROM shortcomings s LEFT JOIN clients c ON c.id = s.client_id ORDER BY s.created_at DESC`),
      db.execute(`SELECT f.*, c.name as client_name FROM fabric_receipts f LEFT JOIN clients c ON f.client_id = c.id ORDER BY f.created_at DESC`),
      db.execute(`SELECT o.id, o.order_ref, o.status, o.order_date, o.trial_date, o.delivery_date, c.name as client_name, c.client_ref, (SELECT COUNT(*) FROM projects WHERE order_id = o.id) as total_garments, (SELECT fabric_code FROM fabric_receipts WHERE order_id = o.id OR (order_id = '' AND client_id = o.client_id) ORDER BY created_at DESC LIMIT 1) as fabric_code, (SELECT fabric_color FROM fabric_receipts WHERE order_id = o.id OR (order_id = '' AND client_id = o.client_id) ORDER BY created_at DESC LIMIT 1) as fabric_color FROM orders o JOIN clients c ON o.client_id = c.id WHERE o.status NOT IN ('completed', 'cancelled') ORDER BY o.order_date DESC`),
      db.execute(`SELECT * FROM inventory ORDER BY name ASC`),
      db.execute(`SELECT e.*, c.name as client_name, c.client_ref FROM schedule_events e LEFT JOIN clients c ON c.id = e.client_id ORDER BY e.event_date DESC`),
      db.execute(`SELECT p.*, o.order_ref, o.delivery_date, o.trial_date, c.name as client_name, c.client_ref FROM projects p JOIN orders o ON p.order_id = o.id JOIN clients c ON o.client_id = c.id ORDER BY p.updated_at DESC`),
      db.execute(`SELECT * FROM b2b_entries ORDER BY created_at DESC`),
      db.execute(`SELECT * FROM work_hierarchy ORDER BY sort_order ASC`),
    ]);

    const newClients       = clientsResult.rows.filter(c => isInWindow(c.created_at, fromDate, toDate));
    const newOrders        = ordersResult.rows.filter(o => isInWindow(o.order_date || o.created_at, fromDate, toDate));
    const activeOrders     = activeOrdersResult.rows;
    const allProjects      = projectsResult.rows;
    const deliveredProj    = allProjects.filter(p => p.status === 'delivered' && isInWindow(p.updated_at || p.created_at, fromDate, toDate));
    const weekShortcomings = shortcomingsResult.rows.filter(s => isInWindow(s.created_at, fromDate, toDate) || isInWindow(s.resolved_at, fromDate, toDate));
    const weekFabric       = fabricResult.rows.filter(f => isInWindow(f.received_date || f.created_at, fromDate, toDate));
    const allInventory     = inventoryResult.rows;
    const allSchedule      = scheduleResult.rows;
    const allWorkshop      = workshopResult.rows;
    const allB2B           = b2bResult.rows;
    const allHierarchy     = hierarchyResult.rows;
    const { safeJsonParse: safeParse } = require('./middleware/safeJson');

    const weekSchedule   = allSchedule.filter(e => isInWindow(e.event_date || e.created_at, fromDate, toDate));
    const upcomingEvents = allSchedule.filter(e => e.event_date > toDate && e.status === 'scheduled');
    const weekB2B        = allB2B.filter(e => isInWindow(e.created_at || e.order_date, fromDate, toDate));
    const today          = now.toISOString().slice(0, 10);

    res.json({
      dateRange: { from: fromDate, to: toDate },
      summary: {
        newClients:        newClients.length,
        newOrders:         newOrders.length,
        activeOrders:      activeOrders.length,
        deliveredGarments: deliveredProj.length,
        issuesLogged:      weekShortcomings.filter(s => isInWindow(s.created_at, fromDate, toDate)).length,
        issuesResolved:    weekShortcomings.filter(s => s.status === 'resolved' && isInWindow(s.resolved_at, fromDate, toDate)).length,
        fabricReceived:    weekFabric.length,
        inventoryItems:    allInventory.length,
        scheduleEvents:    weekSchedule.length,
      },
      newClients:     newClients.map(c => ({ ref: c.client_ref, name: c.name, phone: c.phone, email: c.email, added: fmtDate(c.created_at), notes: c.notes })),
      newOrders:      newOrders.map(o => ({ ref: o.order_ref, client: o.client_name, clientRef: o.client_ref, date: fmtDate(o.order_date), trial: fmtDate(o.trial_date), delivery: fmtDate(o.delivery_date), status: o.status, notes: o.notes })),
      activeOrders:   activeOrders.map(o => ({ ref: o.order_ref, client: o.client_name, clientRef: o.client_ref, status: o.status, date: fmtDate(o.order_date), trial: fmtDate(o.trial_date), delivery: fmtDate(o.delivery_date), fabricCode: o.fabric_code, fabricColor: o.fabric_color, garments: o.total_garments })),
      deliveries:     deliveredProj.map(p => ({ order: p.order_ref, client: p.client_name, clientRef: p.client_ref, type: p.garment_type, delivery: fmtDate(p.delivery_date || p.updated_at) })),
      issues:         weekShortcomings.map(s => ({ category: s.category, severity: s.severity, status: s.status, client: s.client_name || 'General', description: s.description, logged: fmtDate(s.created_at), resolved: fmtDate(s.resolved_at), note: s.resolved_note })),
      fabricReceipts: weekFabric.map(f => ({ clientRef: f.client_code, client: f.client_name, fabricCode: f.fabric_code, fabricColor: f.fabric_color, accessories: f.accessories_desc, orderDate: fmtDate(f.order_date), received: fmtDate(f.received_date), notes: f.sample_notes })),
      // New sections
      inventory:      allInventory.map(i => ({ article_number: i.article_number, name: i.name, category: i.category, quantity: i.quantity, unit: i.unit, reorder_level: i.reorder_level, stock_status: i.stock_status, notes: i.notes })),
      scheduleEvents: weekSchedule.map(e => ({ event_type: e.event_type, client_name: e.client_name, client_ref: e.client_ref, event_date: fmtDate(e.event_date), start_time: e.start_time, end_time: e.end_time, status: e.status, notes: e.notes })),
      upcomingEvents: upcomingEvents.map(e => ({ event_type: e.event_type, client_name: e.client_name, client_ref: e.client_ref, event_date: fmtDate(e.event_date), start_time: e.start_time, end_time: e.end_time, notes: e.notes })),
      workshopGarments: allWorkshop.map(p => ({ order_ref: p.order_ref, client_name: p.client_name, client_ref: p.client_ref, garment_type: p.garment_type, status: p.status, trial_date: fmtDate(p.trial_date), delivery_date: fmtDate(p.delivery_date), overdue: !!(p.delivery_date && p.delivery_date < today && p.status !== 'delivered') })),
      b2cEntries:     allB2B.map(e => ({ entry_type: e.entry_type, party_name: e.entry_type === 'vendor_purchase' ? e.vendor_name : e.company_name, contact: e.entry_type === 'vendor_purchase' ? e.vendor_contact : e.contact_person, order_date: fmtDate(e.order_date), delivery_date: fmtDate(e.delivery_date), amount: e.amount ? `${e.currency || 'PKR'} ${e.amount}` : null, status: e.status })),
      b2cWeek:        weekB2B.map(e => ({ entry_type: e.entry_type, party_name: e.entry_type === 'vendor_purchase' ? e.vendor_name : e.company_name, order_date: fmtDate(e.order_date), status: e.status })),
      workHierarchy:  allHierarchy.map(s => ({ sort_order: s.sort_order, section_name: s.section_name, personnel: safeParse(s.personnel || '[]', []) })),
    });
  } catch (err) {
    console.error('[weekly-report/preview] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
