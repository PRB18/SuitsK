/**
 * b2bScreen.js — Shared B2B/B2C Work In Progress screen
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';

export async function renderB2bScreen(container, workType = 'b2c') {
  const sectionName = workType.toUpperCase();
  let entries = [];
  let inventoryItems = [];
  let clients = [];
  
  container.innerHTML = `
    <div class="screen-wrapper b2b-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="b2b-back">← Back</button>
        <div class="screen-header-title"><h1 class="screen-title">${sectionName} Work in Progress</h1></div>
        <div class="screen-header-actions">
          <input type="text" id="b2b-search" class="input" placeholder="Search ${sectionName}..." style="width: 250px; margin-right: 12px;">
          <button class="btn btn-primary" id="b2b-new-btn">+ Add Entry</button>
        </div>
      </header>

      <div class="cdb-table-wrap" style="flex: 1; overflow-y: auto;">
        <table class="cdb-table" id="b2b-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>B2B/B2C</th>
              <th>Client Name</th>
              <th>Client Code</th>
              <th>Style / Product</th>
              <th>Fabric Code + Colour</th>
              <th>Brand Name</th>
              <th>Qty</th>
              <th>Transfer to Workshop</th>
              <th>Delivered Date</th>
              <th>Status</th>
              <th style="width: 80px;">Actions</th>
            </tr>
          </thead>
          <tbody id="b2b-tbody">
            <tr><td colspan="13" style="text-align:center; padding: 20px;">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="b2b-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="b2b-modal-title">Add ${sectionName} Entry</h2>
          <button class="btn-icon modal-close" id="b2b-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-field">
              <label>Date</label>
              <input type="date" id="b2b-f-date" class="input">
            </div>
            <div class="form-field">
              <label for="b2b-f-work-type">Order Type</label>
              <select id="b2b-f-work-type" class="input">
                <option value="b2c">B2C</option>
                <option value="b2b">B2B</option>
              </select>
            </div>
            <div class="form-field">
              <label>Client Name</label>
              <input type="text" id="b2b-f-client-name" class="input" list="b2b-client-list" autocomplete="off">
              <datalist id="b2b-client-list"></datalist>
              <input type="hidden" id="b2b-f-client-id">
            </div>
            <div class="form-field">
              <label>Client Code</label>
              <input type="text" id="b2b-f-client-code" class="input" aria-describedby="b2b-code-hint">
              <small id="b2b-code-hint" class="text-muted">Select a client to link its code automatically.</small>
            </div>
            <div class="form-field">
              <label>Style / Product Name</label>
              <input type="text" id="b2b-f-style" class="input">
            </div>
            <div class="form-field form-field--full">
              <label>Fabric Code + Colour</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="b2b-f-fabric-code" class="input" placeholder="Code">
                <input type="text" id="b2b-f-fabric-colour" class="input" placeholder="Colour">
                <button class="btn btn-ghost" id="b2b-f-link-inv">🔗 Link Inventory</button>
                <input type="hidden" id="b2b-f-inventory-id">
              </div>
              <div id="b2b-inv-display" style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;"></div>
            </div>
            <div class="form-field">
              <label>Brand Name</label>
              <input type="text" id="b2b-f-brand" class="input">
            </div>
            <div class="form-field">
              <label>Qty</label>
              <input type="number" id="b2b-f-qty" class="input" min="1">
            </div>
            <div class="form-field">
              <label>Transfer to Workshop</label>
              <input type="date" id="b2b-f-workshop" class="input">
              <div style="font-size:0.8em; color:var(--text-secondary);">auto-fills when project created</div>
            </div>
            <div class="form-field">
              <label>Delivered Date</label>
              <input type="date" id="b2b-f-delivered" class="input">
            </div>
            <div class="form-field">
              <label>Status</label>
              <select id="b2b-f-status" class="input">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="form-field form-field--full">
              <label>Notes</label>
              <textarea id="b2b-f-notes" class="input textarea" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="b2b-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="b2b-modal-save">Save Entry</button>
        </div>
      </div>
    </div>
    
    <!-- Inventory Picker Modal -->
    <div class="modal-overlay" id="b2b-inv-modal" style="display:none; z-index: 9999;" role="dialog">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title">Select Fabric from Inventory</h2>
          <button class="btn-icon modal-close" id="b2b-inv-close">✕</button>
        </div>
        <div class="modal-body">
          <select id="b2b-inv-select" class="input" size="8" style="height: auto; max-height: 250px;">
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="b2b-inv-confirm">Select</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('b2b-back').addEventListener('click', () => router.backToHub());
  
  let currentEditId = null;

  async function load() {
    try {
      const [resB2B, resInv, resClients] = await Promise.all([
        api.getB2B({ work_type: workType }),
        api.getInventory(),
        api.getClients(),
      ]);
      entries = resB2B;
      inventoryItems = resInv.filter(i => i.type === 'fabric');
      clients = resClients;
      renderTable();
      populateInventoryPicker();
      populateClientPicker();
    } catch (err) {
      showToast('Error loading B2B: ' + err.message, 'error');
    }
  }

  function renderTable() {
    const tbody = document.getElementById('b2b-tbody');
    const search = document.getElementById('b2b-search').value.toLowerCase();
    
    const filtered = entries.filter(e => 
      (e.company_name || '').toLowerCase().includes(search) ||
      (e.client_code || '').toLowerCase().includes(search) ||
      (e.style_product_name || '').toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding: 20px;">No ${sectionName} entries found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((e, index) => {
      let fabricDisplay = escapeHtml(e.fabric_code);
      if (e.fabric_colour) fabricDisplay += ` / ${escapeHtml(e.fabric_colour)}`;
      if (e.inventory_id && e.inventory_name) {
        fabricDisplay = `<span class="badge badge--neutral" title="${escapeHtml(e.inventory_name)}">🔗 ${escapeHtml(e.inventory_article || e.fabric_code)}</span>`;
      }

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(e.order_date || '—')}</td>
          <td><span class="badge">${e.work_type === 'b2b' ? 'B2B' : 'B2C'}</span></td>
          <td style="font-weight: 500;">${escapeHtml(e.company_name || '—')}</td>
          <td><span class="mono">${escapeHtml(e.client_code || '—')}</span></td>
          <td>${escapeHtml(e.style_product_name || '—')}</td>
          <td>${fabricDisplay || '—'}</td>
          <td>${escapeHtml(e.brand_name || '—')}</td>
          <td>${Number(e.quantity) || 0}</td>
          <td style="color: ${e.transfer_to_workshop ? 'var(--accent-color)' : 'var(--text-secondary)'}">${escapeHtml(e.transfer_to_workshop || '—')}</td>
          <td>${escapeHtml(e.delivered_date || '—')}</td>
          <td><span class="badge">${escapeHtml(e.status)}</span></td>
          <td>
            <button class="btn-icon ctb-edit-btn" data-id="${e.id}">✎</button>
            <button class="btn-icon ctb-del-btn" data-id="${e.id}" style="color: var(--text-secondary);">✕</button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Bind actions
    tbody.querySelectorAll('.ctb-edit-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
    tbody.querySelectorAll('.ctb-del-btn').forEach(btn => btn.addEventListener('click', () => deleteEntry(btn.dataset.id)));
  }

  document.getElementById('b2b-search').addEventListener('input', renderTable);

  // Modal logic
  const modal = document.getElementById('b2b-modal');
  const invModal = document.getElementById('b2b-inv-modal');
  
  function openModal(id = null) {
    currentEditId = id;
    document.getElementById('b2b-modal-title').textContent = id ? `Edit ${sectionName} Entry` : `Add ${sectionName} Entry`;
    
    if (id) {
      const e = entries.find(x => x.id === id);
      document.getElementById('b2b-f-date').value = e.order_date || '';
      document.getElementById('b2b-f-work-type').value = e.work_type === 'b2b' ? 'b2b' : 'b2c';
      document.getElementById('b2b-f-client-name').value = e.company_name || '';
      document.getElementById('b2b-f-client-code').value = e.client_code || '';
      document.getElementById('b2b-f-client-id').value = e.client_id || '';
      document.getElementById('b2b-f-client-code').readOnly = Boolean(e.client_id);
      document.getElementById('b2b-f-style').value = e.style_product_name || '';
      document.getElementById('b2b-f-fabric-code').value = e.fabric_code || '';
      document.getElementById('b2b-f-fabric-colour').value = e.fabric_colour || '';
      document.getElementById('b2b-f-inventory-id').value = e.inventory_id || '';
      document.getElementById('b2b-f-brand').value = e.brand_name || '';
      document.getElementById('b2b-f-qty').value = e.quantity || '';
      document.getElementById('b2b-f-workshop').value = e.transfer_to_workshop || '';
      document.getElementById('b2b-f-delivered').value = e.delivered_date || '';
      document.getElementById('b2b-f-status').value = e.status || 'pending';
      document.getElementById('b2b-f-notes').value = e.notes || '';
      updateInvDisplay(e.inventory_id);
    } else {
      document.getElementById('b2b-f-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('b2b-f-work-type').value = workType;
      document.getElementById('b2b-f-client-name').value = '';
      document.getElementById('b2b-f-client-code').value = '';
      document.getElementById('b2b-f-client-id').value = '';
      document.getElementById('b2b-f-client-code').readOnly = false;
      document.getElementById('b2b-f-style').value = '';
      document.getElementById('b2b-f-fabric-code').value = '';
      document.getElementById('b2b-f-fabric-colour').value = '';
      document.getElementById('b2b-f-inventory-id').value = '';
      document.getElementById('b2b-f-brand').value = '';
      document.getElementById('b2b-f-qty').value = '1';
      document.getElementById('b2b-f-workshop').value = '';
      document.getElementById('b2b-f-delivered').value = '';
      document.getElementById('b2b-f-status').value = 'pending';
      document.getElementById('b2b-f-notes').value = '';
      updateInvDisplay('');
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    currentEditId = null;
  }
  
  document.getElementById('b2b-new-btn').addEventListener('click', () => openModal());
  document.getElementById('b2b-modal-close').addEventListener('click', closeModal);
  document.getElementById('b2b-modal-cancel').addEventListener('click', closeModal);
  
  document.getElementById('b2b-modal-save').addEventListener('click', async () => {
    const data = {
      entry_type: 'corporate_order',
      work_type: document.getElementById('b2b-f-work-type').value,
      order_date: document.getElementById('b2b-f-date').value,
      company_name: document.getElementById('b2b-f-client-name').value,
      client_id: document.getElementById('b2b-f-client-id').value,
      client_code: document.getElementById('b2b-f-client-code').value,
      style_product_name: document.getElementById('b2b-f-style').value,
      fabric_code: document.getElementById('b2b-f-fabric-code').value,
      fabric_colour: document.getElementById('b2b-f-fabric-colour').value,
      inventory_id: document.getElementById('b2b-f-inventory-id').value,
      brand_name: document.getElementById('b2b-f-brand').value,
      quantity: document.getElementById('b2b-f-qty').value,
      transfer_to_workshop: document.getElementById('b2b-f-workshop').value,
      delivered_date: document.getElementById('b2b-f-delivered').value,
      status: document.getElementById('b2b-f-status').value,
      notes: document.getElementById('b2b-f-notes').value
    };
    
    try {
      const selectedWorkType = data.work_type;
      if (currentEditId) {
        await api.updateB2BEntry(currentEditId, data);
        showToast('Updated entry');
      } else {
        await api.createB2BEntry(data);
        showToast('Created entry');
      }
      closeModal();
      if (selectedWorkType !== workType) {
        router.navigate(selectedWorkType === 'b2b' ? '#b2b-work-progress' : '#b2b-logistics');
      } else {
        load();
      }
    } catch(err) {
      showToast(err.message, 'error');
    }
  });

  async function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this B2B entry?')) return;
    try {
      await api.deleteB2BEntry(id);
      showToast('Deleted');
      load();
    } catch(err) {
      showToast(err.message, 'error');
    }
  }

  // Inventory Picker
  function populateInventoryPicker() {
    const select = document.getElementById('b2b-inv-select');
    select.replaceChildren(...inventoryItems.map(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.dataset.code = item.article_number;
      option.dataset.name = item.name;
      option.textContent = `${item.article_number} - ${item.name}`;
      return option;
    }));
  }
  
  function updateInvDisplay(invId) {
    const disp = document.getElementById('b2b-inv-display');
    if (!invId) { disp.textContent = ''; return; }
    const i = inventoryItems.find(x => x.id === invId);
    if (i) disp.textContent = `Linked: ${i.name}`;
  }

  document.getElementById('b2b-f-link-inv').addEventListener('click', (e) => {
    e.preventDefault();
    invModal.style.display = 'flex';
  });
  
  document.getElementById('b2b-inv-close').addEventListener('click', () => invModal.style.display = 'none');
  
  document.getElementById('b2b-inv-confirm').addEventListener('click', () => {
    const select = document.getElementById('b2b-inv-select');
    const option = select.options[select.selectedIndex];
    if (option) {
      document.getElementById('b2b-f-inventory-id').value = option.value;
      document.getElementById('b2b-f-fabric-code').value = option.dataset.code;
      updateInvDisplay(option.value);
    }
    invModal.style.display = 'none';
  });

  load();

  document.getElementById('b2b-f-client-name').addEventListener('input', () => {
    const name = document.getElementById('b2b-f-client-name').value.trim().toLocaleLowerCase();
    const match = clients.find(client => client.name.trim().toLocaleLowerCase() === name);
    document.getElementById('b2b-f-client-id').value = match?.id || '';
    document.getElementById('b2b-f-client-code').value = match?.client_ref || '';
    document.getElementById('b2b-f-client-code').readOnly = Boolean(match);
  });

  function populateClientPicker() {
    const list = document.getElementById('b2b-client-list');
    list.replaceChildren(...clients.map(client => {
      const option = document.createElement('option');
      option.value = client.name;
      return option;
    }));
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
