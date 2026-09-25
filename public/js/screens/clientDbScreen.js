/**
 * clientDbScreen.js — Client Database screen
 *
 * Features:
 *   - Searchable, filterable client roster table
 *   - New Client modal with phone uniqueness guard
 *   - Redirects to #client-profile?id=UUID on row click
 *   - Filter chips: All | Active | Completed | No Orders
 */

import { api }    from '../api.js';
import { router } from '../router.js';
import { showToast } from '../toast.js';
import { getIcon } from '../icons.js';

const GARMENT_TYPES = ['Jacket','Sherwani','Sadri','Waistcoat','Jodhpuri','Shirts/Kurta','Pant','Safari jkt','Denim'];

export async function renderClientDbScreen(container) {
  container.innerHTML = `
    <div class="screen-wrapper cdb-screen">
      <!-- Header -->
      <header class="screen-header">
        <button class="btn-icon back-btn" id="cdb-back" title="Back to Hub" aria-label="Back to Hub">
          ${getIcon('arrow-left') || '←'}
        </button>
        <div class="screen-header-title">
          <h1 class="screen-title">Client Database</h1>
          <span class="badge" id="cdb-count">—</span>
        </div>
        <div class="screen-header-actions">
          <button class="btn btn-primary" id="cdb-new-btn">+ New Client</button>
        </div>
      </header>

      <!-- Search + Filters -->
      <div class="cdb-controls">
        <div class="search-wrap">
          <span class="search-icon">${getIcon('search') || '🔍'}</span>
          <input type="search" id="cdb-search" class="search-input" placeholder="Search by name, phone, reference, city…" autocomplete="off">
        </div>
        <div class="filter-chips" role="group" aria-label="Filter clients">
          <button class="chip chip--active" data-filter="all">All</button>
          <button class="chip" data-filter="active">Active Order</button>
          <button class="chip" data-filter="completed">Completed</button>
          <button class="chip" data-filter="none">No Orders</button>
        </div>
      </div>

      <!-- Client Roster Table -->
      <div class="cdb-table-wrap">
        <table class="cdb-table" id="cdb-table" aria-label="Client roster">
          <thead>
            <tr>
              <th>CTB Ref</th>
              <th>Client Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>Added</th>
              <th>Order Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="cdb-tbody">
            <tr><td colspan="8" class="table-loading">Loading clients…</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State (hidden by default) -->
      <div class="empty-state" id="cdb-empty" style="display:none;">
        <div class="empty-icon">${getIcon('users') || '👥'}</div>
        <h3>No Clients Yet</h3>
        <p>Add your first client to start tracking orders, measurements, and projects.</p>
        <button class="btn btn-primary" id="cdb-empty-new">+ Add First Client</button>
      </div>
    </div>

    <!-- New Client Modal -->
    <div class="modal-overlay" id="cdb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cdb-modal-title" style="display:none;">
      <div class="modal-panel" id="cdb-modal">
        <div class="modal-header">
          <h2 class="modal-title" id="cdb-modal-title">New Client</h2>
          <button class="btn-icon modal-close" id="cdb-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-field">
              <label for="cdb-f-name">Full Name <span class="required">*</span></label>
              <input type="text" id="cdb-f-name" class="input" placeholder="Muhammad Ahmed" autocomplete="name">
            </div>
            <div class="form-field">
              <label for="cdb-f-phone">Phone Number <span class="optional">(optional)</span></label>
              <input type="tel" id="cdb-f-phone" class="input" placeholder="+92-300-1234567" autocomplete="tel">
              <div class="field-error" id="cdb-phone-error" style="display:none;"></div>
            </div>
            <div class="form-field">
              <label for="cdb-f-email">Email</label>
              <input type="email" id="cdb-f-email" class="input" placeholder="client@example.com" autocomplete="email">
            </div>
            <div class="form-field">
              <label for="cdb-f-city">City</label>
              <input type="text" id="cdb-f-city" class="input" placeholder="Lahore" autocomplete="address-level2">
            </div>
            <div class="form-field form-field--full">
              <label for="cdb-f-address">Address</label>
              <input type="text" id="cdb-f-address" class="input" placeholder="123 Main Street" autocomplete="street-address">
            </div>
            <div class="form-field form-field--full">
              <label for="cdb-f-notes">Notes</label>
              <textarea id="cdb-f-notes" class="input textarea" rows="2" placeholder="Any additional notes…"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="cdb-cancel">Cancel</button>
          <button class="btn btn-primary" id="cdb-save">Create Client</button>
        </div>
      </div>
    </div>
  `;

  // ── State ──────────────────────────────────────────────────────────────────
  let allClients = [];
  let activeFilter = 'all';
  let searchQuery  = '';

  // ── Load data ──────────────────────────────────────────────────────────────
  async function loadClients() {
    try {
      allClients = await api.getClients();
      renderTable();
    } catch (err) {
      showToast('Failed to load clients: ' + err.message, 'error');
    }
  }

  // ── Render table ───────────────────────────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('cdb-tbody');
    const empty = document.getElementById('cdb-empty');
    const table = document.getElementById('cdb-table');
    const count = document.getElementById('cdb-count');

    const filtered = allClients.filter(c => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = (c.name || '').toLowerCase().includes(q)
          || (c.phone || '').toLowerCase().includes(q)
          || (c.client_ref || '').toLowerCase().includes(q)
          || (c.city || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      // Filter
      if (activeFilter === 'active')    return c.latest_order_status && !['completed','cancelled'].includes(c.latest_order_status);
      if (activeFilter === 'completed') return c.latest_order_status === 'completed';
      if (activeFilter === 'none')      return !c.latest_order_status;
      return true;
    });

    count.textContent = `${filtered.length} client${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No clients match your search.</td></tr>';
      empty.style.display = allClients.length === 0 ? 'flex' : 'none';
      table.style.display = allClients.length === 0 ? 'none' : '';
      return;
    }

    empty.style.display = 'none';
    table.style.display = '';

    tbody.innerHTML = filtered.map(c => {
      const statusBadge = orderStatusBadge(c.latest_order_status);
      const updatedAgo  = timeAgo(c.updated_at);
      return `
        <tr class="cdb-row" data-id="${c.id}" tabindex="0" role="button" aria-label="View ${escHtml(c.name)}">
          <td><span class="client-ref">${escHtml(c.client_ref)}</span></td>
          <td class="client-name-cell"><strong>${escHtml(c.name)}</strong></td>
          <td>${escHtml(c.phone)}</td>
          <td>${escHtml(c.city || '—')}</td>
          <td class="text-muted">${formatDate(c.created_at)}</td>
          <td>${statusBadge}</td>
          <td class="text-muted">${updatedAgo}</td>
          <td>
            <button class="btn-link cdb-view-btn" data-id="${c.id}">View Profile →</button>
          </td>
        </tr>
      `;
    }).join('');

    // Row click events
    tbody.querySelectorAll('.cdb-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('cdb-view-btn')) return;
        router.navigateTo('#client-profile', { id: row.dataset.id });
      });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') router.navigateTo('#client-profile', { id: row.dataset.id });
      });
    });
    tbody.querySelectorAll('.cdb-view-btn').forEach(btn => {
      btn.addEventListener('click', () => router.navigateTo('#client-profile', { id: btn.dataset.id }));
    });
  }

  // ── Filter chips ───────────────────────────────────────────────────────────
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      activeFilter = chip.dataset.filter;
      renderTable();
    });
  });

  // ── Search ─────────────────────────────────────────────────────────────────
  let searchTimer;
  document.getElementById('cdb-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { searchQuery = e.target.value.trim(); renderTable(); }, 300);
  });

  // ── Back button ────────────────────────────────────────────────────────────
  document.getElementById('cdb-back').addEventListener('click', () => router.navigate('#congressional'));

  // ── Modal ──────────────────────────────────────────────────────────────────
  const overlay = document.getElementById('cdb-modal-overlay');
  function openModal() {
    clearModalForm();
    overlay.style.display = 'flex';
    document.getElementById('cdb-f-name').focus();
  }
  function closeModal() {
    overlay.style.display = 'none';
  }

  document.getElementById('cdb-new-btn').addEventListener('click', openModal);
  document.getElementById('cdb-cancel').addEventListener('click', closeModal);
  document.getElementById('cdb-modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  const emptyNew = document.getElementById('cdb-empty-new');
  if (emptyNew) emptyNew.addEventListener('click', openModal);

  // Phone uniqueness client-side check (debounced)
  const phoneInput  = document.getElementById('cdb-f-phone');
  const phoneError  = document.getElementById('cdb-phone-error');
  let phoneTimer;
  phoneInput.addEventListener('input', () => {
    clearTimeout(phoneTimer);
    phoneError.style.display = 'none';
    const val = phoneInput.value.trim();
    if (!val) return;
    phoneTimer = setTimeout(() => {
      const clash = allClients.find(c => c.phone === val);
      if (clash) {
        phoneError.innerHTML = `A client with this number already exists: <a class="link" data-id="${clash.id}">${escHtml(clash.client_ref)} — ${escHtml(clash.name)}</a>`;
        phoneError.style.display = 'block';
        phoneError.querySelector('a').addEventListener('click', () => {
          closeModal();
          router.navigateTo('#client-profile', { id: clash.id });
        });
      }
    }, 400);
  });

  // Save
  document.getElementById('cdb-save').addEventListener('click', async () => {
    const name    = document.getElementById('cdb-f-name').value.trim();
    const phone   = phoneInput.value.trim();
    const email   = document.getElementById('cdb-f-email').value.trim();
    const city    = document.getElementById('cdb-f-city').value.trim();
    const address = document.getElementById('cdb-f-address').value.trim();
    const notes   = document.getElementById('cdb-f-notes').value.trim();

    if (!name) { showToast('Full name is required.', 'error'); return; }
    if (phoneError.style.display !== 'none') { showToast('Please resolve the duplicate phone number first.', 'error'); return; }

    const saveBtn = document.getElementById('cdb-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Creating…';
    try {
      const created = await api.createClient({ name, phone, email, city, address, notes });
      showToast(`Client ${name} created — measurement profile linked.`, 'success');
      closeModal();
      if (created?.id) {
        router.navigateTo('#client-profile', { id: created.id });
        return;
      }
      await loadClients();
    } catch (err) {
      if (err.status === 409 && err.data?.existing) {
        const ex = err.data.existing;
        phoneError.innerHTML = `Duplicate: <a class="link" data-id="${ex.id}">${escHtml(ex.client_ref)} — ${escHtml(ex.name)}</a>`;
        phoneError.style.display = 'block';
        phoneError.querySelector('a').addEventListener('click', () => {
          closeModal();
          router.navigateTo('#client-profile', { id: ex.id });
        });
      } else {
        showToast('Error: ' + err.message, 'error');
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Create Client';
    }
  });

  function clearModalForm() {
    ['cdb-f-name','cdb-f-phone','cdb-f-email','cdb-f-city','cdb-f-address','cdb-f-notes']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    phoneError.style.display = 'none';
  }

  // ── Initial load ───────────────────────────────────────────────────────────
  await loadClients();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function orderStatusBadge(status) {
  if (!status) return '<span class="badge badge--neutral">No Orders</span>';
  const map = {
    pending:     'badge--warning',
    in_progress: 'badge--info',
    ready:       'badge--success',
    completed:   'badge--neutral',
    cancelled:   'badge--danger',
  };
  const label = {
    pending: 'Pending', in_progress: 'In Progress',
    ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled',
  };
  const cls = map[status] || 'badge--neutral';
  return `<span class="badge ${cls}">${label[status] || status}</span>`;
}

function timeAgo(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' });
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}
