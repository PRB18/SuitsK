/**
 * inventoryScreen.js — Fabric & accessory stock management screen
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';
import { getIcon }   from '../icons.js';

export async function renderInventoryScreen(container) {
  container.innerHTML = `
    <div class="screen-wrapper inv-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="inv-back">← Back</button>
        <div class="screen-header-title">
          <h1 class="screen-title">Inventory</h1>
          <span class="badge" id="inv-count">—</span>
        </div>
        <div class="screen-header-actions">
          <button class="btn btn-primary" id="inv-new-btn">+ Add Item</button>
        </div>
      </header>

      <!-- Filter chips -->
      <div class="cdb-controls">
        <div class="filter-chips">
          <button class="chip chip--active" data-filter="all">All</button>
          <button class="chip" data-filter="fabric">Fabric</button>
          <button class="chip" data-filter="accessory">Accessories</button>
          <button class="chip" data-filter="low_stock">Low Stock</button>
          <button class="chip" data-filter="out_of_stock">Out of Stock</button>
        </div>
      </div>

      <!-- Table -->
      <div class="cdb-table-wrap">
        <table class="cdb-table inv-table">
          <thead>
            <tr>
              <th>Article #</th><th>Name</th><th>Type</th><th>Colour</th>
              <th>Supplier</th><th>Ordered</th><th>Received</th>
              <th>Stock</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="inv-tbody"><tr><td colspan="10" class="table-loading">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Item Modal -->
    <div class="modal-overlay" id="inv-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="inv-modal-title">Add Inventory Item</h2>
          <button class="btn-icon modal-close" id="inv-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-field form-field--full">
              <label>Item Type <span class="required">*</span></label>
              <div class="toggle-group">
                <button class="toggle-btn toggle-btn--active" id="inv-type-fabric" data-type="fabric">Fabric</button>
                <button class="toggle-btn" id="inv-type-accessory" data-type="accessory">Accessory</button>
              </div>
            </div>
            <div class="form-field">
              <label for="inv-f-name">Name <span class="required">*</span></label>
              <input type="text" id="inv-f-name" class="input" placeholder="e.g. Premium Wool Charcoal">
            </div>
            <div class="form-field">
              <label for="inv-f-article">Article Number</label>
              <input type="text" id="inv-f-article" class="input" placeholder="e.g. A402">
            </div>
            <div class="form-field">
              <label for="inv-f-color">Colour</label>
              <input type="text" id="inv-f-color" class="input" placeholder="e.g. Charcoal Grey">
            </div>
            <div class="form-field">
              <label for="inv-f-supplier">Supplier / From Where Ordered</label>
              <input type="text" id="inv-f-supplier" class="input" placeholder="e.g. Gul Ahmed Textile">
            </div>
            <div class="form-field">
              <label for="inv-f-order-date">Order Date</label>
              <input type="date" id="inv-f-order-date" class="input">
            </div>
            <div class="form-field">
              <label for="inv-f-received-date">Received Date</label>
              <input type="date" id="inv-f-received-date" class="input">
            </div>
            <div class="form-field">
              <label for="inv-f-qty">Initial Quantity <span class="required">*</span></label>
              <input type="number" id="inv-f-qty" class="input" min="0" step="0.1" placeholder="0">
            </div>
            <div class="form-field">
              <label for="inv-f-unit">Unit</label>
              <input type="text" id="inv-f-unit" class="input" placeholder="m (auto-set)" id="inv-f-unit">
            </div>
            <div class="form-field">
              <label for="inv-f-alert">Low Stock Alert at</label>
              <input type="number" id="inv-f-alert" class="input" min="0" step="0.1" placeholder="0">
            </div>
            <div class="form-field form-field--full">
              <label for="inv-f-notes">Notes</label>
              <textarea id="inv-f-notes" class="input textarea" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="inv-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="inv-modal-save">Add Item</button>
        </div>
      </div>
    </div>

    <!-- Deduct/Add Stock Modal -->
    <div class="modal-overlay" id="deduct-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title" id="deduct-modal-title">Deduct Stock</h2>
          <button class="btn-icon modal-close" id="deduct-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-subtitle" id="deduct-item-name"></p>
          <p class="modal-subtitle" id="deduct-current-stock"></p>
          <div class="form-field">
            <label for="deduct-qty">How much to deduct? <span class="required">*</span></label>
            <input type="number" id="deduct-qty" class="input" min="0.01" step="0.1" placeholder="0">
            <div class="field-error" id="deduct-qty-error" style="display:none;"></div>
          </div>
          <div class="form-field">
            <label for="deduct-note">Note (optional)</label>
            <input type="text" id="deduct-note" class="input" placeholder="e.g. Used for Mr. Ahmed – Jacket">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="deduct-cancel">Cancel</button>
          <button class="btn btn-danger" id="deduct-confirm">Deduct</button>
        </div>
      </div>
    </div>

    <!-- Transaction History Modal -->
    <div class="modal-overlay" id="tx-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel modal-panel--wide">
        <div class="modal-header">
          <h2 class="modal-title" id="tx-modal-title">Transaction History</h2>
          <button class="btn-icon modal-close" id="tx-modal-close">✕</button>
        </div>
        <div class="modal-body" id="tx-modal-body">Loading…</div>
      </div>
    </div>
  `;

  let allItems   = [];
  let activeFilter = 'all';
  let activeItemId = null;
  let itemType   = 'fabric';

  document.getElementById('inv-back').addEventListener('click', () => router.navigate('#congressional'));

  async function load() {
    try {
      allItems = await api.getInventory();
      renderTable();
    } catch (err) { showToast('Failed to load inventory: ' + err.message, 'error'); }
  }

  function renderTable() {
    const tbody = document.getElementById('inv-tbody');
    const count = document.getElementById('inv-count');
    const filtered = allItems.filter(i => {
      if (activeFilter === 'fabric')     return i.item_type === 'fabric';
      if (activeFilter === 'accessory')  return i.item_type === 'accessory';
      if (activeFilter === 'low_stock')  return i.stock_status === 'low_stock';
      if (activeFilter === 'out_of_stock') return i.stock_status === 'out_of_stock';
      return true;
    });
    count.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="table-empty">No items found.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(item => `
      <tr class="inv-row ${item.stock_status === 'out_of_stock' ? 'row-danger' : item.stock_status === 'low_stock' ? 'row-warn' : ''}">
        <td>${escHtml(item.article_number || '—')}</td>
        <td><strong>${escHtml(item.name)}</strong></td>
        <td><span class="badge ${item.item_type === 'fabric' ? 'badge--info' : 'badge--neutral'}">${item.item_type}</span></td>
        <td>${escHtml(item.color || '—')}</td>
        <td>${escHtml(item.supplier || '—')}</td>
        <td class="text-muted">${fmtDate(item.order_date)}</td>
        <td class="text-muted">${fmtDate(item.received_date)}</td>
        <td class="inv-qty"><strong>${item.quantity}${item.unit}</strong></td>
        <td>${stockBadge(item.stock_status)}</td>
        <td class="inv-actions">
          <button class="btn-link btn-xs" data-action="deduct" data-id="${item.id}">Use</button>
          <button class="btn-link btn-xs" data-action="history" data-id="${item.id}">History</button>
          <button class="btn-link btn-xs btn-link-danger" data-action="delete" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action]').forEach(btn => {
      const id = btn.dataset.id;
      const item = allItems.find(i => i.id === id);
      if (btn.dataset.action === 'deduct') btn.addEventListener('click', () => openDeductModal(item, 'deduct'));
      if (btn.dataset.action === 'history') btn.addEventListener('click', () => openTxModal(item));
      if (btn.dataset.action === 'delete') btn.addEventListener('click', () => deleteItem(item));
    });
  }

  // Filter chips
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      activeFilter = chip.dataset.filter;
      renderTable();
    });
  });

  // ── Add Item Modal ──────────────────────────────────────────────────────────
  document.getElementById('inv-new-btn').addEventListener('click', openAddModal);
  document.getElementById('inv-modal-close').addEventListener('click',  closeAddModal);
  document.getElementById('inv-modal-cancel').addEventListener('click', closeAddModal);

  function openAddModal() {
    document.getElementById('inv-modal-title').textContent = 'Add Inventory Item';
    ['inv-f-name','inv-f-article','inv-f-color','inv-f-supplier','inv-f-notes'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('inv-f-qty').value    = '';
    document.getElementById('inv-f-alert').value  = '';
    document.getElementById('inv-f-unit').value   = 'm';
    document.getElementById('inv-f-order-date').value    = '';
    document.getElementById('inv-f-received-date').value = '';
    setItemType('fabric');
    document.getElementById('inv-modal').style.display = 'flex';
  }
  function closeAddModal() { document.getElementById('inv-modal').style.display = 'none'; }

  function setItemType(type) {
    itemType = type;
    document.getElementById('inv-type-fabric').classList.toggle('toggle-btn--active', type === 'fabric');
    document.getElementById('inv-type-accessory').classList.toggle('toggle-btn--active', type === 'accessory');
    document.getElementById('inv-f-unit').value = type === 'fabric' ? 'm' : 'pcs';
  }
  document.getElementById('inv-type-fabric').addEventListener('click',    () => setItemType('fabric'));
  document.getElementById('inv-type-accessory').addEventListener('click', () => setItemType('accessory'));

  document.getElementById('inv-modal-save').addEventListener('click', async () => {
    const name     = document.getElementById('inv-f-name').value.trim();
    const quantity = parseFloat(document.getElementById('inv-f-qty').value);
    if (!name) { showToast('Item name is required.','error'); return; }
    if (isNaN(quantity) || quantity < 0) { showToast('Quantity must be ≥ 0.','error'); return; }
    const btn = document.getElementById('inv-modal-save');
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      const newItem = await api.createInventoryItem({
        item_type:       itemType,
        name,
        article_number:  document.getElementById('inv-f-article').value.trim(),
        color:           document.getElementById('inv-f-color').value.trim(),
        supplier:        document.getElementById('inv-f-supplier').value.trim(),
        order_date:      document.getElementById('inv-f-order-date').value,
        received_date:   document.getElementById('inv-f-received-date').value,
        quantity,
        unit:            document.getElementById('inv-f-unit').value.trim() || (itemType === 'fabric' ? 'm' : 'pcs'),
        low_stock_alert: parseFloat(document.getElementById('inv-f-alert').value) || 0,
        notes:           document.getElementById('inv-f-notes').value.trim(),
      });
      allItems.unshift(newItem);
      renderTable();
      closeAddModal();
      showToast('Item added!', 'success');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Add Item'; }
  });

  // ── Deduct Modal ───────────────────────────────────────────────────────────
  let activeDeductItem = null;
  function openDeductModal(item) {
    activeDeductItem = item;
    document.getElementById('deduct-modal-title').textContent = `Deduct — ${item.name}`;
    document.getElementById('deduct-item-name').textContent   = `Current stock: ${item.quantity} ${item.unit}`;
    document.getElementById('deduct-current-stock').textContent = `Low stock alert at: ${item.low_stock_alert} ${item.unit}`;
    document.getElementById('deduct-qty').value   = '';
    document.getElementById('deduct-note').value  = '';
    document.getElementById('deduct-qty-error').style.display = 'none';
    document.getElementById('deduct-modal').style.display = 'flex';
    document.getElementById('deduct-qty').focus();
  }
  document.getElementById('deduct-modal-close').addEventListener('click', () => { document.getElementById('deduct-modal').style.display = 'none'; });
  document.getElementById('deduct-cancel').addEventListener('click',       () => { document.getElementById('deduct-modal').style.display = 'none'; });

  // Real-time edge-case validation
  document.getElementById('deduct-qty').addEventListener('input', e => {
    const errEl = document.getElementById('deduct-qty-error');
    const v = parseFloat(e.target.value);
    if (!activeDeductItem) return;
    if (isNaN(v) || v <= 0) {
      errEl.textContent = 'Amount must be greater than 0.';
      errEl.style.display = 'block';
    } else if (v > activeDeductItem.quantity) {
      errEl.textContent = `Cannot deduct ${v}${activeDeductItem.unit} — only ${activeDeductItem.quantity}${activeDeductItem.unit} in stock.`;
      errEl.style.display = 'block';
    } else {
      errEl.style.display = 'none';
    }
  });

  document.getElementById('deduct-confirm').addEventListener('click', async () => {
    const qty  = parseFloat(document.getElementById('deduct-qty').value);
    const note = document.getElementById('deduct-note').value.trim();
    const errEl = document.getElementById('deduct-qty-error');

    if (!activeDeductItem) return;
    if (isNaN(qty) || qty <= 0) { errEl.textContent = 'Amount must be greater than 0.'; errEl.style.display='block'; return; }
    if (qty > activeDeductItem.quantity) {
      errEl.textContent = `Cannot deduct ${qty}${activeDeductItem.unit} — only ${activeDeductItem.quantity}${activeDeductItem.unit} in stock.`;
      errEl.style.display='block'; return;
    }

    const btn = document.getElementById('deduct-confirm');
    btn.disabled = true; btn.textContent = 'Deducting…';
    try {
      const result = await api.transactInventory(activeDeductItem.id, { type: 'deduct', quantity: qty, note });
      // Update the item in local list
      const idx = allItems.findIndex(i => i.id === activeDeductItem.id);
      if (idx !== -1) {
        allItems[idx].quantity    = result.new_quantity;
        allItems[idx].stock_status = result.stock_status;
      }
      document.getElementById('deduct-modal').style.display = 'none';
      showToast(`${qty}${activeDeductItem.unit} deducted. Remaining: ${result.new_quantity}${activeDeductItem.unit}`, 'success');
      renderTable();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally { btn.disabled = false; btn.textContent = 'Deduct'; }
  });

  // ── Transaction History Modal ──────────────────────────────────────────────
  document.getElementById('tx-modal-close').addEventListener('click', () => { document.getElementById('tx-modal').style.display = 'none'; });
  async function openTxModal(item) {
    document.getElementById('tx-modal-title').textContent = `History — ${item.name}`;
    const body = document.getElementById('tx-modal-body');
    body.innerHTML = 'Loading…';
    document.getElementById('tx-modal').style.display = 'flex';
    try {
      const txs = await api.getInventoryTransactions(item.id);
      if (txs.length === 0) { body.innerHTML = '<p class="text-muted">No transactions yet.</p>'; return; }
      body.innerHTML = `
        <table class="cdb-table tx-table">
          <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Note</th><th>Client</th></tr></thead>
          <tbody>
            ${txs.map(tx => `
              <tr class="${tx.type === 'deduct' ? 'row-danger-light' : 'row-success-light'}">
                <td class="text-muted">${fmtDateTime(tx.created_at)}</td>
                <td><span class="badge ${tx.type === 'deduct' ? 'badge--danger' : 'badge--success'}">${tx.type}</span></td>
                <td><strong>${tx.type === 'deduct' ? '-' : '+'}${tx.quantity}${item.unit}</strong></td>
                <td>${escHtml(tx.note || '—')}</td>
                <td>${escHtml(tx.client_name || '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) { body.innerHTML = `<p class="text-muted">Error: ${err.message}</p>`; }
  }

  // ── Delete item ────────────────────────────────────────────────────────────
  async function deleteItem(item) {
    if (item.quantity > 0) {
      if (!confirm(`"${item.name}" still has ${item.quantity}${item.unit} in stock. Delete anyway?`)) return;
      try { await api.deleteInventoryItem(item.id, true); }
      catch (err) { showToast('Delete failed: ' + err.message, 'error'); return; }
    } else {
      if (!confirm(`Delete "${item.name}"?`)) return;
      try { await api.deleteInventoryItem(item.id); }
      catch (err) { showToast('Delete failed: ' + err.message, 'error'); return; }
    }
    allItems = allItems.filter(i => i.id !== item.id);
    renderTable();
    showToast('Item deleted.', 'success');
  }

  await load();
}

function stockBadge(status) {
  const map = { in_stock: ['badge--success','In Stock'], low_stock: ['badge--warning','Low Stock'], out_of_stock: ['badge--danger','Out of Stock'] };
  const [cls, label] = map[status] || ['badge--neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}); } catch { return d; } }
function fmtDateTime(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('en-PK',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); } catch { return d; } }
function escHtml(str) { return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
