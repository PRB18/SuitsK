/**
 * clientProfileScreen.js — Full Client Profile screen
 *
 * Shows:
 *   - Client contact details (editable)
 *   - Active order with garment projects (status pipeline + measurements quick view)
 *   - Order history (previous completed/cancelled orders)
 *   - Per-garment: status badge, "View Measurements" slide-in panel,
 *     "Edit in Configurator" deep link, "Print Measurement Card" trigger
 *
 * Navigation: reads state.currentClientId (set by router from ?id= param)
 */

import { api }    from '../api.js';
import { state }  from '../state.js';
import { router } from '../router.js';
import { showToast } from '../toast.js';
import { getIcon }   from '../icons.js';
import { printMeasurementCard } from '../print.js';

const GARMENT_TYPES = ['Jacket','Sherwani','Sadri','Waistcoat','Jodhpuri','Shirts/Kurta','Pant','Safari jkt','Denim'];
const PROJECT_STAGES = ['pending','cutting','canvas','stitching','buttonholes','pressing','trial','ready','delivered'];

const STAGE_LABELS = {
  pending: 'Pending', cutting: 'Cutting', canvas: 'Canvas',
  stitching: 'Stitching', buttonholes: 'Buttonholes', pressing: 'Pressing',
  trial: 'Trial', ready: 'Ready ✓', delivered: 'Delivered',
};

const STAGE_BADGE_CLS = {
  pending: 'badge--neutral', cutting: 'badge--info', canvas: 'badge--info',
  stitching: 'badge--info', buttonholes: 'badge--warning', pressing: 'badge--warning',
  trial: 'badge--warning', ready: 'badge--success', delivered: 'badge--success',
};

export async function renderClientProfileScreen(container) {
  const clientId = state.currentClientId;
  if (!clientId) {
    container.innerHTML = `<div class="screen-wrapper"><p class="text-muted" style="padding:32px;">No client selected. <a class="link" href="#client-db">Go to Client Database</a></p></div>`;
    return;
  }

  // Loading skeleton
  container.innerHTML = `
    <div class="screen-wrapper cpr-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="cpr-back" aria-label="Back to Client Database">← Back</button>
        <div class="screen-header-title">
          <h1 class="screen-title" id="cpr-title">Loading…</h1>
          <span class="badge badge--neutral" id="cpr-ref"></span>
        </div>
        <div class="screen-header-actions">
          <button class="btn btn-ghost" id="cpr-edit-btn">✏️ Edit Details</button>
        </div>
      </header>
      <div class="cpr-body" id="cpr-body">
        <div class="table-loading">Loading client profile…</div>
      </div>
    </div>
    <!-- Measurement Quick-View Panel -->
    <div class="meas-panel-overlay" id="meas-overlay" style="display:none;" aria-hidden="true">
      <div class="meas-panel" id="meas-panel" role="dialog" aria-label="Measurements">
        <div class="meas-panel-header">
          <h3 id="meas-panel-title">Measurements</h3>
          <div class="meas-panel-actions">
            <button class="btn btn-ghost btn-sm" id="meas-print-btn">🖨 Print</button>
            <button class="btn-icon" id="meas-close" aria-label="Close">✕</button>
          </div>
        </div>
        <div class="meas-panel-body" id="meas-panel-body"></div>
      </div>
    </div>
    <!-- Edit Client Modal -->
    <div class="modal-overlay" id="edit-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="edit-modal-title">Edit Client Details</h2>
          <button class="btn-icon modal-close" id="edit-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body" id="edit-modal-body"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="edit-cancel">Cancel</button>
          <button class="btn btn-primary" id="edit-save">Save Changes</button>
        </div>
      </div>
    </div>
    <!-- New Order Modal -->
    <div class="modal-overlay" id="order-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="order-modal-title">New Order</h2>
          <button class="btn-icon modal-close" id="order-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-field">
              <label for="ord-date">Order Date <span class="required">*</span></label>
              <input type="date" id="ord-date" class="input">
            </div>
            <div class="form-field">
              <label for="ord-trial">Trial Date</label>
              <input type="date" id="ord-trial" class="input">
            </div>
            <div class="form-field">
              <label for="ord-delivery">Delivery Date</label>
              <input type="date" id="ord-delivery" class="input">
            </div>
            <div class="form-field">
              <label for="ord-total">Total Amount (₹)</label>
              <input type="number" id="ord-total" class="input" min="0" step="100" placeholder="0">
            </div>
            <div class="form-field">
              <label for="ord-advance">Advance Paid (₹)</label>
              <input type="number" id="ord-advance" class="input" min="0" step="100" placeholder="0">
            </div>
            <div class="form-field form-field--full">
              <label for="ord-notes">Notes</label>
              <textarea id="ord-notes" class="input textarea" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="ord-cancel">Cancel</button>
          <button class="btn btn-primary" id="ord-save">Create Order</button>
        </div>
      </div>
    </div>
    <!-- Add Garment Modal -->
    <div class="modal-overlay" id="garment-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title">Add Garment to Order</h2>
          <button class="btn-icon modal-close" id="garment-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="garment-type">Garment Type <span class="required">*</span></label>
            <select id="garment-type" class="input">
              <option value="">— Select garment —</option>
              ${GARMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="garment-cancel">Cancel</button>
          <button class="btn btn-primary" id="garment-save">Add Garment</button>
        </div>
      </div>
    </div>
  `;

  // ── State ──────────────────────────────────────────────────────────────────
  let clientData = null;
  let activeGarmentAddOrderId = null;
  let activeMeasProject = null;

  document.getElementById('cpr-back').addEventListener('click', () => {
    router.navigate('#client-db');
  });

  // ── Load client ────────────────────────────────────────────────────────────
  async function load() {
    try {
      clientData = await api.getClient(clientId);
      render();
    } catch (err) {
      document.getElementById('cpr-body').innerHTML =
        `<div class="error-state"><p>Failed to load client: ${err.message}</p></div>`;
    }
  }

  function render() {
    document.getElementById('cpr-title').textContent = clientData.name;
    document.getElementById('cpr-ref').textContent   = clientData.client_ref;

    const activeOrders  = clientData.orders.filter(o => !['completed','cancelled'].includes(o.status));
    const historyOrders = clientData.orders.filter(o =>  ['completed','cancelled'].includes(o.status));

    document.getElementById('cpr-body').innerHTML = `
      <!-- Contact Card -->
      <div class="cpr-contact-card">
        <div class="cpr-contact-row">
          <span class="cpr-contact-icon">📞</span>
          <a href="tel:${escHtml(clientData.phone)}">${escHtml(clientData.phone)}</a>
        </div>
        ${clientData.email ? `<div class="cpr-contact-row"><span class="cpr-contact-icon">✉️</span><a href="mailto:${escHtml(clientData.email)}">${escHtml(clientData.email)}</a></div>` : ''}
        ${clientData.address || clientData.city ? `<div class="cpr-contact-row"><span class="cpr-contact-icon">📍</span>${escHtml([clientData.address, clientData.city].filter(Boolean).join(', '))}</div>` : ''}
        ${clientData.notes ? `<div class="cpr-contact-row cpr-notes"><span class="cpr-contact-icon">📝</span>${escHtml(clientData.notes)}</div>` : ''}
      </div>

      <!-- Active Orders -->
      <section class="cpr-section">
        <div class="cpr-section-header">
          <h2>Active Orders</h2>
          <button class="btn btn-primary btn-sm" id="cpr-new-order">+ New Order</button>
        </div>
        ${activeOrders.length === 0
          ? '<p class="text-muted cpr-no-orders">No active orders. Create one to start tracking garments.</p>'
          : activeOrders.map(o => renderOrderCard(o, true)).join('')
        }
      </section>

      <!-- Order History -->
      ${historyOrders.length > 0 ? `
        <section class="cpr-section">
          <div class="cpr-section-header">
            <h2>Order History</h2>
          </div>
          ${historyOrders.map(o => renderOrderCard(o, false)).join('')}
        </section>
      ` : ''}
    `;

    // Bind new order button
    document.getElementById('cpr-new-order').addEventListener('click', openOrderModal);

    // Bind all garment action buttons
    document.querySelectorAll('[data-garment-action]').forEach(btn => {
      const action    = btn.dataset.garmentAction;
      const projectId = btn.dataset.projectId;
      const orderId   = btn.dataset.orderId;
      if (action === 'add-garment') {
        activeGarmentAddOrderId = orderId;
        btn.addEventListener('click', openGarmentModal);
      } else if (action === 'view-meas') {
        const project = findProject(projectId);
        btn.addEventListener('click', () => openMeasPanel(project));
      } else if (action === 'open-configurator') {
        const project = findProject(projectId);
        btn.addEventListener('click', () => {
          state.setCurrentProjectId(projectId);
          state.setCurrentOrderId(project.order_id);
          if (project.suit_config_id) {
            // Edit existing suit config
            api.getSuit(project.suit_config_id).then(suit => {
              state.editSuit(suit);
              router.navigate('#configurator');
            }).catch(() => {
              state.startNewSuit();
              router.navigate('#configurator');
            });
          } else {
            state.startNewSuit();
            router.navigate('#configurator');
          }
        });
      } else if (action === 'print-meas') {
        const project = findProject(projectId);
        btn.addEventListener('click', () => {
          if (project) printMeasurementCard(clientData, project);
        });
      } else if (action === 'complete-order') {
        btn.addEventListener('click', () => completeOrder(orderId));
      }
    });
  }

  function renderOrderCard(order, isActive) {
    const balance = (order.total_amount || 0) - (order.advance_paid || 0);
    return `
      <div class="order-card ${isActive ? 'order-card--active' : 'order-card--history'}">
        <div class="order-card-header">
          <div class="order-card-ref">
            <span class="order-ref">${escHtml(order.order_ref)}</span>
            <span class="badge ${isActive ? 'badge--info' : 'badge--neutral'}">${ORDER_STATUS_LABELS[order.status] || order.status}</span>
          </div>
          <div class="order-card-meta">
            ${order.order_date   ? `<span>Ordered: ${fmtDate(order.order_date)}</span>` : ''}
            ${order.trial_date   ? `<span>Trial: ${fmtDate(order.trial_date)}</span>`   : ''}
            ${order.delivery_date? `<span>Delivery: ${fmtDate(order.delivery_date)}</span>` : ''}
          </div>
          <div class="order-card-amounts">
            <span>Total: ₹${(order.total_amount||0).toLocaleString()}</span>
            <span>Advance: ₹${(order.advance_paid||0).toLocaleString()}</span>
            ${balance > 0 ? `<span class="balance-due">Balance: ₹${balance.toLocaleString()}</span>` : '<span class="balance-clear">✓ Cleared</span>'}
          </div>
          ${isActive ? `<button class="btn btn-ghost btn-sm" data-garment-action="complete-order" data-order-id="${order.id}">Mark Completed</button>` : ''}
        </div>
        <div class="order-projects">
          <div class="project-chips">
            ${(order.projects || []).map(p => renderProjectChip(p, order.id)).join('')}
            ${isActive ? `<button class="project-chip project-chip--add" data-garment-action="add-garment" data-order-id="${order.id}">+ Add Garment</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderProjectChip(project, orderId) {
    const stageCls = STAGE_BADGE_CLS[project.status] || 'badge--neutral';
    return `
      <div class="project-chip-wrap">
        <div class="project-chip" data-project-id="${project.id}">
          <span class="project-chip-type">${escHtml(project.garment_type)}</span>
          <span class="badge ${stageCls} badge--sm">${STAGE_LABELS[project.status] || project.status}</span>
          <div class="project-chip-actions">
            <button class="btn-link btn-xs" data-garment-action="view-meas" data-project-id="${project.id}" data-order-id="${orderId}" title="View measurements">📐</button>
            <button class="btn-link btn-xs" data-garment-action="open-configurator" data-project-id="${project.id}" data-order-id="${orderId}" title="Open in configurator">⚙️</button>
            <button class="btn-link btn-xs" data-garment-action="print-meas" data-project-id="${project.id}" data-order-id="${orderId}" title="Print measurement card">🖨</button>
          </div>
        </div>
      </div>
    `;
  }

  function findProject(projectId) {
    for (const order of (clientData?.orders || [])) {
      const p = (order.projects || []).find(pr => pr.id === projectId);
      if (p) return { ...p, order_id: order.id };
    }
    return null;
  }

  // ── Measurement Quick-View Panel ───────────────────────────────────────────
  const measOverlay  = document.getElementById('meas-overlay');
  const measPanelBody = document.getElementById('meas-panel-body');
  const measPanelTitle= document.getElementById('meas-panel-title');

  function openMeasPanel(project) {
    if (!project) return;
    activeMeasProject = project;
    measPanelTitle.textContent = `${project.garment_type} Measurements`;
    renderMeasPanelBody(project.measurements || {}, false);
    measOverlay.style.display = 'flex';
    measOverlay.setAttribute('aria-hidden', 'false');
  }

  function renderMeasPanelBody(meas, isEdit) {
    const MEAS_FIELDS = getMeasurementFields(activeMeasProject?.garment_type);
    if (isEdit) {
      measPanelBody.innerHTML = `
        <div class="meas-edit-grid">
          ${MEAS_FIELDS.map(f => `
            <div class="meas-field">
              <label for="meas-${f.key}">${f.label}</label>
              <div class="meas-lr">
                <input id="meas-${f.key}-l" class="input input-sm meas-input" type="number" step="0.1" min="0"
                  placeholder="L" value="${meas[f.key+'_l'] || ''}" data-key="${f.key}_l">
                <input id="meas-${f.key}-r" class="input input-sm meas-input" type="number" step="0.1" min="0"
                  placeholder="R" value="${meas[f.key+'_r'] || ''}" data-key="${f.key}_r">
              </div>
            </div>
          `).join('')}
        </div>
        <div class="meas-panel-footer">
          <button class="btn btn-ghost btn-sm" id="meas-cancel-edit">Cancel</button>
          <button class="btn btn-primary btn-sm" id="meas-save-edit">Save Measurements</button>
        </div>
      `;
      document.getElementById('meas-cancel-edit').addEventListener('click', () =>
        renderMeasPanelBody(activeMeasProject?.measurements || {}, false));
      document.getElementById('meas-save-edit').addEventListener('click', async () => {
        const updated = {};
        measPanelBody.querySelectorAll('.meas-input').forEach(input => {
          if (input.value !== '') updated[input.dataset.key] = parseFloat(input.value);
        });
        try {
          await api.updateProject(activeMeasProject.id, { measurements: { ...activeMeasProject.measurements, ...updated } });
          activeMeasProject.measurements = { ...activeMeasProject.measurements, ...updated };
          showToast('Measurements saved.', 'success');
          renderMeasPanelBody(activeMeasProject.measurements, false);
        } catch (e) { showToast('Save failed: ' + e.message, 'error'); }
      });
    } else {
      const filled = MEAS_FIELDS.filter(f => meas[f.key+'_l'] || meas[f.key+'_r'] || meas[f.key]);
      if (filled.length === 0) {
        measPanelBody.innerHTML = `<p class="text-muted" style="padding:16px;">No measurements recorded yet.</p>
          <button class="btn btn-primary btn-sm" id="meas-edit-btn-inner">📝 Enter Measurements</button>`;
        document.getElementById('meas-edit-btn-inner').addEventListener('click', () =>
          renderMeasPanelBody(meas, true));
        return;
      }
      measPanelBody.innerHTML = `
        <table class="meas-view-table">
          <thead><tr><th>Measurement</th><th>L</th><th>R</th></tr></thead>
          <tbody>
            ${MEAS_FIELDS.map(f => {
              const l = meas[f.key+'_l'] ?? meas[f.key] ?? '';
              const r = meas[f.key+'_r'] ?? '';
              if (!l && !r) return '';
              return `<tr><td>${f.label}</td><td>${l || '—'}</td><td>${r || '—'}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="meas-panel-footer">
          <button class="btn btn-ghost btn-sm" id="meas-edit-btn-inner">✏️ Edit</button>
        </div>
      `;
      document.getElementById('meas-edit-btn-inner').addEventListener('click', () =>
        renderMeasPanelBody(meas, true));
    }
  }

  document.getElementById('meas-close').addEventListener('click', () => {
    measOverlay.style.display = 'none';
    measOverlay.setAttribute('aria-hidden', 'true');
  });
  measOverlay.addEventListener('click', e => {
    if (e.target === measOverlay) measOverlay.style.display = 'none';
  });
  document.getElementById('meas-print-btn').addEventListener('click', () => {
    if (activeMeasProject) printMeasurementCard(clientData, activeMeasProject);
  });

  // ── Edit Client Modal ──────────────────────────────────────────────────────
  document.getElementById('cpr-edit-btn').addEventListener('click', () => {
    const body = document.getElementById('edit-modal-body');
    body.innerHTML = `
      <div class="form-grid form-grid-2">
        <div class="form-field">
          <label for="ec-name">Full Name <span class="required">*</span></label>
          <input type="text" id="ec-name" class="input" value="${escHtml(clientData.name)}">
        </div>
        <div class="form-field">
          <label for="ec-phone">Phone <span class="required">*</span></label>
          <input type="tel" id="ec-phone" class="input" value="${escHtml(clientData.phone)}">
        </div>
        <div class="form-field">
          <label for="ec-email">Email</label>
          <input type="email" id="ec-email" class="input" value="${escHtml(clientData.email || '')}">
        </div>
        <div class="form-field">
          <label for="ec-city">City</label>
          <input type="text" id="ec-city" class="input" value="${escHtml(clientData.city || '')}">
        </div>
        <div class="form-field form-field--full">
          <label for="ec-address">Address</label>
          <input type="text" id="ec-address" class="input" value="${escHtml(clientData.address || '')}">
        </div>
        <div class="form-field form-field--full">
          <label for="ec-notes">Notes</label>
          <textarea id="ec-notes" class="input textarea" rows="2">${escHtml(clientData.notes || '')}</textarea>
        </div>
      </div>
    `;
    document.getElementById('edit-modal').style.display = 'flex';
  });

  document.getElementById('edit-modal-close').addEventListener('click', () => { document.getElementById('edit-modal').style.display = 'none'; });
  document.getElementById('edit-cancel').addEventListener('click',       () => { document.getElementById('edit-modal').style.display = 'none'; });

  document.getElementById('edit-save').addEventListener('click', async () => {
    const name    = document.getElementById('ec-name').value.trim();
    const phone   = document.getElementById('ec-phone').value.trim();
    const email   = document.getElementById('ec-email').value.trim();
    const city    = document.getElementById('ec-city').value.trim();
    const address = document.getElementById('ec-address').value.trim();
    const notes   = document.getElementById('ec-notes').value.trim();
    if (!name) { showToast('Name is required.','error'); return; }
    if (!phone){ showToast('Phone is required.','error'); return; }
    try {
      clientData = await api.updateClient(clientId, { name, phone, email, city, address, notes });
      document.getElementById('edit-modal').style.display = 'none';
      showToast('Client updated.', 'success');
      render();
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
    }
  });

  // ── New Order Modal ────────────────────────────────────────────────────────
  function openOrderModal() {
    document.getElementById('ord-date').value     = new Date().toISOString().split('T')[0];
    document.getElementById('ord-trial').value    = '';
    document.getElementById('ord-delivery').value = '';
    document.getElementById('ord-total').value    = '';
    document.getElementById('ord-advance').value  = '';
    document.getElementById('ord-notes').value    = '';
    document.getElementById('order-modal').style.display = 'flex';
  }
  document.getElementById('order-modal-close').addEventListener('click', () => { document.getElementById('order-modal').style.display = 'none'; });
  document.getElementById('ord-cancel').addEventListener('click',         () => { document.getElementById('order-modal').style.display = 'none'; });
  document.getElementById('ord-save').addEventListener('click', async () => {
    const order_date    = document.getElementById('ord-date').value;
    const trial_date    = document.getElementById('ord-trial').value;
    const delivery_date = document.getElementById('ord-delivery').value;
    const total_amount  = parseFloat(document.getElementById('ord-total').value)   || 0;
    const advance_paid  = parseFloat(document.getElementById('ord-advance').value) || 0;
    const notes         = document.getElementById('ord-notes').value.trim();
    if (!order_date) { showToast('Order date is required.','error'); return; }
    try {
      await api.createOrder(clientId, { order_date, trial_date, delivery_date, total_amount, advance_paid, notes });
      document.getElementById('order-modal').style.display = 'none';
      showToast('Order created!', 'success');
      await load();
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  });

  // ── Add Garment Modal ──────────────────────────────────────────────────────
  function openGarmentModal() {
    document.getElementById('garment-type').value = '';
    document.getElementById('garment-modal').style.display = 'flex';
  }
  document.getElementById('garment-modal-close').addEventListener('click', () => { document.getElementById('garment-modal').style.display = 'none'; });
  document.getElementById('garment-cancel').addEventListener('click',       () => { document.getElementById('garment-modal').style.display = 'none'; });
  document.getElementById('garment-save').addEventListener('click', async () => {
    const garment_type = document.getElementById('garment-type').value;
    if (!garment_type) { showToast('Please select a garment type.','error'); return; }
    try {
      await api.addProject(clientId, activeGarmentAddOrderId, { garment_type });
      document.getElementById('garment-modal').style.display = 'none';
      showToast(`${garment_type} added to order!`, 'success');
      await load();
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  });

  // ── Complete Order ─────────────────────────────────────────────────────────
  async function completeOrder(orderId) {
    if (!confirm('Mark this order as completed?')) return;
    try {
      await api.updateOrder(clientId, orderId, { status: 'completed' });
      showToast('Order marked as completed.', 'success');
      await load();
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  }

  // ── Initial load ───────────────────────────────────────────────────────────
  await load();
}

// ── Measurement field definitions per garment type ───────────────────────────
function getMeasurementFields(garmentType) {
  const suitFields = [
    {key:'front_length',label:'Front Length'},{key:'sleeve',label:'Sleeve'},
    {key:'chest',label:'Chest'},{key:'below_chest',label:'Below Chest'},
    {key:'hips',label:'Hips'},{key:'shoulder',label:'Shoulder'},
    {key:'back_length',label:'Back Length'},{key:'collar',label:'Collar'},
    {key:'cross_f',label:'Cross F'},{key:'cross_b',label:'Cross B'},
    {key:'biceps',label:'Biceps'},{key:'stomach',label:'Stomach'},
    {key:'wrist',label:'Wrist'},{key:'h_back',label:'H Back'},
    {key:'shoulder_to_elbow',label:'Shoulder to Elbow'},{key:'elbow_to_wrist',label:'Elbow to Wrist'},
    {key:'collar_to_stomach',label:'Collar to Stomach'},
  ];
  const pantFields = [
    {key:'p_front_length',label:'Front Length'},{key:'p_length',label:'Length'},
    {key:'p_waist',label:'Waist'},{key:'p_waist_to_knee',label:'Waist to Knee'},
    {key:'p_thighs',label:'Thighs'},{key:'p_knee',label:'Knee'},
    {key:'p_bottom',label:'Bottom'},{key:'p_crotch',label:'Crotch'},
    {key:'p_inseam_l',label:'Inseam L'},{key:'p_fly',label:'Fly'},
    {key:'p_front',label:'Front'},{key:'p_back',label:'Back'},
  ];
  const shirtFields = [
    {key:'sh_front_length',label:'Front Length'},{key:'sh_sleeve',label:'Sleeve'},
    {key:'sh_stomach',label:'Stomach'},{key:'sh_back_length',label:'Back Length'},
    {key:'sh_chest',label:'Chest'},{key:'sh_biceps',label:'Biceps'},
    {key:'sh_hips',label:'Hips'},{key:'sh_collar',label:'Collar'},
    {key:'sh_elbow_l',label:'Elbow L'},{key:'sh_wrist',label:'Wrist'},
    {key:'sh_back_length2',label:'Back Length 2'},{key:'sh_collar_to_stomach',label:'Collar to Stomach'},
    {key:'sh_shoulder_to_elbow',label:'Shoulder to Elbow'},{key:'sh_elbow_to_wrist',label:'Elbow to Wrist'},
    {key:'sh_half_shoulder',label:'Half Shoulder'},
  ];
  const wcFields = [
    {key:'wc_length',label:'Length'},{key:'wc_chest',label:'Chest'},
    {key:'wc_stomach',label:'Stomach'},{key:'wc_shoulder',label:'Shoulder'},
    {key:'wc_armhole',label:'Armhole'},{key:'wc_collar',label:'Collar'},
    {key:'wc_v_shape',label:'V Shape'},
  ];

  if (['Jacket','Sherwani','Sadri','Safari jkt'].includes(garmentType)) return suitFields;
  if (garmentType === 'Pant' || garmentType === 'Denim') return pantFields;
  if (garmentType === 'Shirts/Kurta') return shirtFields;
  if (garmentType === 'Waistcoat') return wcFields;
  if (garmentType === 'Jodhpuri') return [...suitFields, ...pantFields];
  return [...suitFields]; // default
}

const ORDER_STATUS_LABELS = {
  pending: 'Pending', in_progress: 'In Progress',
  ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled',
};

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return d; }
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}
