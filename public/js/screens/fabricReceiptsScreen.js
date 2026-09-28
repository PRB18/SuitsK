/**
 * fabricReceiptsScreen.js — Fabric Raw Material Receipt
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';

export async function renderFabricReceiptsScreen(container) {
  let entries = [];
  let inventoryItems = [];
  let allClients = [];
  
  container.innerHTML = `
    <div class="screen-wrapper fabric-receipt-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="fr-back">← Back</button>
        <div class="screen-header-title"><h1 class="screen-title">Fabric Raw Material Receipt</h1></div>
        <div class="screen-header-actions">
          <input type="text" id="fr-search" class="input" placeholder="Search Receipts..." style="width: 250px; margin-right: 12px;">
          <button class="btn btn-primary" id="fr-new-btn">+ Add Receipt</button>
        </div>
      </header>

      <div class="table-container" style="flex: 1; overflow-y: auto;">
        <table class="data-table" id="fr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Client Code</th>
              <th>Client Name</th>
              <th>Fabric Code</th>
              <th>Accessories / Lining / Fusing</th>
              <th>Sample / Others</th>
              <th>Order Date</th>
              <th>Received Date</th>
              <th style="width: 80px;">Actions</th>
            </tr>
          </thead>
          <tbody id="fr-tbody">
            <tr><td colspan="9" style="text-align:center; padding: 20px;">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="fr-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="fr-modal-title">Add Fabric Receipt</h2>
          <button class="btn-icon modal-close" id="fr-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-field form-field--full" style="position:relative;">
              <label>Client Code (Search)</label>
              <input type="text" id="fr-f-client-code" class="input" autocomplete="off">
              <div id="fr-client-dropdown" class="dropdown-menu" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:10; background:white; border:1px solid #ccc; max-height:200px; overflow-y:auto;"></div>
              <input type="hidden" id="fr-f-client-id">
            </div>
            <div class="form-field">
              <label>Client Name</label>
              <input type="text" id="fr-f-client-name" class="input">
            </div>
            <div class="form-field">
              <label>Fabric Code</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="fr-f-fabric-code" class="input">
                <button class="btn btn-ghost" id="fr-f-link-inv">🔗 Link Inventory</button>
                <input type="hidden" id="fr-f-inventory-id">
              </div>
              <div id="fr-inv-display" style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;"></div>
            </div>
            <div class="form-field form-field--full">
              <label>Accessories / Lining / Fusing / Monica Parts</label>
              <textarea id="fr-f-accessories" class="input textarea" rows="2"></textarea>
            </div>
            <div class="form-field form-field--full">
              <label>Sample / Others</label>
              <input type="text" id="fr-f-sample" class="input">
            </div>
            <div class="form-field">
              <label>Order Date</label>
              <input type="date" id="fr-f-order-date" class="input">
            </div>
            <div class="form-field">
              <label>Received Date</label>
              <input type="date" id="fr-f-received-date" class="input">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="fr-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="fr-modal-save">Save Receipt</button>
        </div>
      </div>
    </div>
    
    <!-- Inventory Picker Modal -->
    <div class="modal-overlay" id="fr-inv-modal" style="display:none; z-index: 9999;" role="dialog">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title">Select Fabric from Inventory</h2>
          <button class="btn-icon modal-close" id="fr-inv-close">✕</button>
        </div>
        <div class="modal-body">
          <select id="fr-inv-select" class="input" size="8" style="height: auto; max-height: 250px;">
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" id="fr-inv-confirm">Select</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('fr-back').addEventListener('click', () => router.backToHub());
  
  let currentEditId = null;

  async function load() {
    try {
      const [resFR, resInv, resClients] = await Promise.all([
        api.getFabricReceipts(),
        api.getInventory(),
        api.getClients()
      ]);
      entries = resFR;
      inventoryItems = resInv.filter(i => i.type === 'fabric');
      allClients = resClients;
      renderTable();
      populateInventoryPicker();
    } catch (err) {
      showToast('Error loading Fabric Receipts: ' + err.message, 'error');
    }
  }

  function renderTable() {
    const tbody = document.getElementById('fr-tbody');
    const search = document.getElementById('fr-search').value.toLowerCase();
    
    const filtered = entries.filter(e => 
      (e.client_name || '').toLowerCase().includes(search) ||
      (e.client_code || '').toLowerCase().includes(search) ||
      (e.fabric_code || '').toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">No receipts found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((e, index) => {
      let fabricDisplay = e.fabric_code;
      if (e.inventory_id && e.inventory_name) {
        fabricDisplay = \`<span class="badge badge--neutral" title="\${e.inventory_name}">🔗 \${e.inventory_article || e.fabric_code}</span>\`;
      }
      
      let rcvDate = e.received_date ? e.received_date : '<span style="color:#C9881A; font-weight:bold;">—</span>';

      return \`
        <tr>
          <td>\${index + 1}</td>
          <td><span class="mono">\${e.client_code || '—'}</span></td>
          <td style="font-weight: 500;">\${e.client_name_lookup || e.client_name || '—'}</td>
          <td>\${fabricDisplay || '—'}</td>
          <td title="\${e.accessories_desc || ''}" style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${e.accessories_desc || '—'}</td>
          <td>\${e.sample_notes || '—'}</td>
          <td>\${e.order_date || '—'}</td>
          <td>\${rcvDate}</td>
          <td>
            <button class="btn-icon ctb-edit-btn" data-id="\${e.id}">✎</button>
            <button class="btn-icon ctb-del-btn" data-id="\${e.id}" style="color: var(--text-secondary);">✕</button>
          </td>
        </tr>
      \`;
    }).join('');
    
    tbody.querySelectorAll('.ctb-edit-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
    tbody.querySelectorAll('.ctb-del-btn').forEach(btn => btn.addEventListener('click', () => deleteEntry(btn.dataset.id)));
  }

  document.getElementById('fr-search').addEventListener('input', renderTable);

  // Modal logic
  const modal = document.getElementById('fr-modal');
  const invModal = document.getElementById('fr-inv-modal');
  
  function openModal(id = null) {
    currentEditId = id;
    document.getElementById('fr-modal-title').textContent = id ? 'Edit Receipt' : 'Add Receipt';
    
    if (id) {
      const e = entries.find(x => x.id === id);
      document.getElementById('fr-f-client-id').value = e.client_id || '';
      document.getElementById('fr-f-client-code').value = e.client_code || '';
      document.getElementById('fr-f-client-name').value = e.client_name || '';
      document.getElementById('fr-f-fabric-code').value = e.fabric_code || '';
      document.getElementById('fr-f-inventory-id').value = e.inventory_id || '';
      document.getElementById('fr-f-accessories').value = e.accessories_desc || '';
      document.getElementById('fr-f-sample').value = e.sample_notes || '';
      document.getElementById('fr-f-order-date').value = e.order_date || '';
      document.getElementById('fr-f-received-date').value = e.received_date || '';
      updateInvDisplay(e.inventory_id);
    } else {
      document.getElementById('fr-f-client-id').value = '';
      document.getElementById('fr-f-client-code').value = '';
      document.getElementById('fr-f-client-name').value = '';
      document.getElementById('fr-f-fabric-code').value = '';
      document.getElementById('fr-f-inventory-id').value = '';
      document.getElementById('fr-f-accessories').value = '';
      document.getElementById('fr-f-sample').value = '';
      document.getElementById('fr-f-order-date').value = '';
      document.getElementById('fr-f-received-date').value = '';
      updateInvDisplay('');
    }
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    currentEditId = null;
    document.getElementById('fr-client-dropdown').style.display = 'none';
  }
  
  document.getElementById('fr-new-btn').addEventListener('click', () => openModal());
  document.getElementById('fr-modal-close').addEventListener('click', closeModal);
  document.getElementById('fr-modal-cancel').addEventListener('click', closeModal);
  
  document.getElementById('fr-modal-save').addEventListener('click', async () => {
    const data = {
      client_id: document.getElementById('fr-f-client-id').value,
      client_code: document.getElementById('fr-f-client-code').value,
      client_name: document.getElementById('fr-f-client-name').value,
      fabric_code: document.getElementById('fr-f-fabric-code').value,
      inventory_id: document.getElementById('fr-f-inventory-id').value,
      accessories_desc: document.getElementById('fr-f-accessories').value,
      sample_notes: document.getElementById('fr-f-sample').value,
      order_date: document.getElementById('fr-f-order-date').value,
      received_date: document.getElementById('fr-f-received-date').value,
    };
    
    try {
      if (currentEditId) {
        await api.updateFabricReceipt(currentEditId, data);
        showToast('Updated receipt');
      } else {
        await api.createFabricReceipt(data);
        showToast('Created receipt');
      }
      closeModal();
      load();
    } catch(err) {
      showToast(err.message, 'error');
    }
  });

  async function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this receipt?')) return;
    try {
      await api.deleteFabricReceipt(id);
      showToast('Deleted');
      load();
    } catch(err) {
      showToast(err.message, 'error');
    }
  }

  // Client Autocomplete
  const clientInput = document.getElementById('fr-f-client-code');
  const clientDropdown = document.getElementById('fr-client-dropdown');
  
  clientInput.addEventListener('input', () => {
    const q = clientInput.value.toLowerCase();
    if (!q) { clientDropdown.style.display = 'none'; return; }
    
    const matches = allClients.filter(c => (c.client_ref || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q));
    if (matches.length === 0) { clientDropdown.style.display = 'none'; return; }
    
    clientDropdown.innerHTML = matches.map(c => 
      \`<div class="dropdown-item" style="padding:8px; cursor:pointer; border-bottom:1px solid #eee;" data-id="\${c.id}" data-name="\${c.name}" data-ref="\${c.client_ref}">\${c.client_ref || '-'} : \${c.name}</div>\`
    ).join('');
    
    clientDropdown.querySelectorAll('.dropdown-item').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('fr-f-client-id').value = el.dataset.id;
        document.getElementById('fr-f-client-code').value = el.dataset.ref;
        document.getElementById('fr-f-client-name').value = el.dataset.name;
        clientDropdown.style.display = 'none';
      });
    });
    
    clientDropdown.style.display = 'block';
  });

  // Inventory Picker
  function populateInventoryPicker() {
    const select = document.getElementById('fr-inv-select');
    select.innerHTML = inventoryItems.map(i => 
      \`<option value="\${i.id}" data-code="\${i.article_number}" data-name="\${i.name}">\${i.article_number} - \${i.name}</option>\`
    ).join('');
  }
  
  function updateInvDisplay(invId) {
    const disp = document.getElementById('fr-inv-display');
    if (!invId) { disp.textContent = ''; return; }
    const i = inventoryItems.find(x => x.id === invId);
    if (i) disp.textContent = \`Linked: \${i.name}\`;
  }

  document.getElementById('fr-f-link-inv').addEventListener('click', (e) => {
    e.preventDefault();
    invModal.style.display = 'flex';
  });
  
  document.getElementById('fr-inv-close').addEventListener('click', () => invModal.style.display = 'none');
  
  document.getElementById('fr-inv-confirm').addEventListener('click', () => {
    const select = document.getElementById('fr-inv-select');
    const option = select.options[select.selectedIndex];
    if (option) {
      document.getElementById('fr-f-inventory-id').value = option.value;
      document.getElementById('fr-f-fabric-code').value = option.dataset.code;
      updateInvDisplay(option.value);
    }
    invModal.style.display = 'none';
  });

  load();
}
