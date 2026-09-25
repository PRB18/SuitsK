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
    // No client in state — fetch all clients and show a picker so the user
    // doesn't have to leave the screen and navigate to client-db manually.
    container.innerHTML = `
      <div class="screen-wrapper cpr-screen">
        <header class="screen-header">
          <button class="btn-icon back-btn" id="cpr-pick-back" aria-label="Back">← Back</button>
          <div class="screen-header-title">
            <h1 class="screen-title">Client Profiles</h1>
          </div>
          <div class="screen-header-actions">
            <button class="btn btn-primary" id="cpr-new-btn">+ New Client</button>
          </div>
        </header>
        <div class="cpr-body" id="cpr-pick-body">
          <div class="table-loading">Loading clients…</div>
        </div>
      </div>`;

    document.getElementById('cpr-pick-back').addEventListener('click', () => router.navigate('#congressional'));
    document.getElementById('cpr-new-btn').addEventListener('click', () => router.navigate('#client-db'));

    try {
      const clients = await api.getClients();
      const body = document.getElementById('cpr-pick-body');
      if (!body) return;
      if (!clients || clients.length === 0) {
        body.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👤</div>
            <h3>No Clients Yet</h3>
            <p>Create your first client in the Client Database.</p>
            <button class="btn btn-primary" id="cpr-go-db">Open Client Database</button>
          </div>`;
        document.getElementById('cpr-go-db').addEventListener('click', () => router.navigate('#client-db'));
        return;
      }
      body.innerHTML = `
        <div style="padding: 0 0 24px 0;">
          <p class="text-sm text-muted" style="margin-bottom: 16px;">Select a client to view their profile</p>
          <div style="display:flex; flex-direction:column; gap: 8px;" id="cpr-pick-list"></div>
        </div>`;
      const list = document.getElementById('cpr-pick-list');
      clients.forEach(c => {
        const card = document.createElement('button');
        card.className = 'cdb-row';
        card.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface); cursor:pointer; text-align:left; width:100%;';
        card.innerHTML = `
          <div>
            <div style="font-weight:600; color:var(--color-text);">${escHtml(c.name)}</div>
            <div style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:2px;">${escHtml(c.client_ref || '')}${c.city ? ' · ' + escHtml(c.city) : ''}</div>
          </div>
          <span class="badge badge--neutral">${escHtml(c.phone || '')}</span>`;
        card.addEventListener('click', () => router.navigateTo('#client-profile', { id: c.id }));
        list.appendChild(card);
      });
    } catch (err) {
      const body = document.getElementById('cpr-pick-body');
      if (body) body.innerHTML = `<div class="empty-state"><p style="color:var(--color-danger)">Failed to load clients: ${escHtml(err.message)}</p></div>`;
    }
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
    <!-- Add Visit Modal -->
    <div class="modal-overlay" id="visit-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="visit-modal-title">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title" id="visit-modal-title">Add Client Visit</h2>
          <button class="btn-icon modal-close" id="visit-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-field"><label for="visit-date">Visit Date <span class="required">*</span></label><input type="date" id="visit-date" class="input"></div>
          <div class="form-field"><label for="visit-purpose">Purpose</label><input type="text" id="visit-purpose" class="input" placeholder="Fitting, consultation, collection…"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" id="visit-cancel">Cancel</button><button class="btn btn-primary" id="visit-save">Add Visit</button></div>
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
    window.history.back();
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
        ${clientData.phone ? `<div class="cpr-contact-row"><span class="cpr-contact-icon">📞</span><a href="tel:${escHtml(clientData.phone)}">${escHtml(clientData.phone)}</a></div>` : ''}
        ${clientData.email ? `<div class="cpr-contact-row"><span class="cpr-contact-icon">✉️</span><a href="mailto:${escHtml(clientData.email)}">${escHtml(clientData.email)}</a></div>` : ''}
        ${clientData.address || clientData.city ? `<div class="cpr-contact-row"><span class="cpr-contact-icon">📍</span>${escHtml([clientData.address, clientData.city].filter(Boolean).join(', '))}</div>` : ''}
        ${clientData.notes ? `<div class="cpr-contact-row cpr-notes"><span class="cpr-contact-icon">📝</span>${escHtml(clientData.notes)}</div>` : ''}
      </div>

      <section class="cpr-section cpr-profile-tools">
        <div class="cpr-section-header">
          <h2>Body Measurements</h2>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" id="cpr-edit-measurements">Edit on Style Sheet</button>
            <button class="btn btn-ghost btn-sm" id="cpr-open-measurements">Full Configurator</button>
          </div>
        </div>
        ${(() => {
          const meas = clientData.measurement;
          if (!meas) return '<p class="text-muted">No measurement profile yet — created automatically with this client. Click Edit to fill the paper-form sheet.</p>';
          const vals = meas.values
            || (typeof meas.values_json === 'string' ? (() => { try { return JSON.parse(meas.values_json || '{}'); } catch { return {}; } })() : (meas.values_json || {}));
          const unit = meas.unit || 'in';
          const HIGHLIGHT = [
            ['Chest', 'suit_CHEST_L'], ['Waist', 'pant_WAIST_L'], ['Shoulder', 'suit_SHOULDER_L'],
            ['Sleeve', 'suit_SLEEVE_L'], ['Collar', 'suit_COLLAR_L'], ['Hips', 'suit_HIPS_L'],
            ['Shirt Chest', 'shirt_CHEST_L'], ['Pant Length', 'pant_LENGTH_L'],
          ];
          const filled = HIGHLIGHT.filter(([, k]) => vals[k]);
          const anyFilled = Object.keys(vals).some(k => vals[k] !== '' && vals[k] != null);
          if (!anyFilled) {
            return '<p class="text-muted">Measurement profile linked — no values entered yet. Use <strong>Edit on Style Sheet</strong> to fill the same grid as the paper order form.</p>';
          }
          return (filled.length
            ? '<div class="cpr-meas-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:0.5rem;margin-top:0.5rem;">' +
              filled.map(([label, key]) =>
                '<div class="cpr-meas-cell" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:6px;padding:0.5rem;text-align:center;">' +
                '<div style="font-size:0.7rem;color:var(--color-text-secondary);text-transform:uppercase;">' + label + '</div>' +
                '<div style="font-weight:600;font-size:1rem;">' + vals[key] + '</div>' +
                '<div style="font-size:0.65rem;color:var(--color-text-secondary);">' + unit + '</div>' +
                '</div>'
              ).join('') + '</div>'
            : '<p class="text-muted">' + Object.keys(vals).filter(k => vals[k]).length + ' measurement fields on file.</p>') +
            '<p class="text-muted" style="margin-top:0.35rem;font-size:0.75rem;">Last updated ' + fmtDate(meas.updated_at) + ' · Linked to this client profile</p>';
        })()}
      </section>

      ${(clientData.suits && clientData.suits.length) ? `
      <section class="cpr-section">
        <div class="cpr-section-header"><h2>Linked Style Sheets</h2></div>
        <div class="cpr-visits">
          ${clientData.suits.map(s => `
            <div class="cpr-visit-row" style="cursor:pointer;" data-suit-id="${s.id}">
              <strong>${escHtml(s.name)}</strong>
              <span class="text-muted">${fmtDate(s.updated_at)}</span>
            </div>
          `).join('')}
        </div>
      </section>` : ''}

      <section class="cpr-section">
        <div class="cpr-section-header"><h2>Client Visits</h2><button class="btn btn-primary btn-sm" id="cpr-add-visit">+ Add Visit</button></div>
        ${(clientData.visits || []).length ? `<div class="cpr-visits">${clientData.visits.map(v => `<div class="cpr-visit-row"><strong>${fmtDate(v.visit_date)}</strong><span>${escHtml(v.purpose || 'General visit')}</span></div>`).join('')}</div>` : '<p class="text-muted">No visits recorded yet.</p>'}
      </section>

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
    document.getElementById('cpr-add-visit').addEventListener('click', openVisitModal);

    const openLinkedConfigurator = (step = 0) => {
      state.setCurrentClientId(clientId);
      state.startNewSuit();
      // Prefer editing an existing linked style sheet when available
      const linkedSuit = (clientData.suits || [])[0];
      const go = () => {
        state.setStep(step);
        router.navigateTo('#configurator', { client_id: clientId });
      };
      if (linkedSuit) {
        api.getSuit(linkedSuit.id).then(suit => {
          state.editSuit(suit);
          state.setCurrentClientId(clientId);
          go();
        }).catch(() => go());
      } else {
        go();
      }
    };

    document.getElementById('cpr-edit-measurements').addEventListener('click', () => openLinkedConfigurator(5));
    document.getElementById('cpr-open-measurements').addEventListener('click', () => openLinkedConfigurator(0));

    document.querySelectorAll('[data-suit-id]').forEach(row => {
      row.addEventListener('click', async () => {
        try {
          const suit = await api.getSuit(row.dataset.suitId);
          state.setCurrentClientId(clientId);
          state.editSuit(suit);
          router.navigateTo('#configurator', { client_id: clientId });
        } catch (err) {
          showToast('Could not open style sheet: ' + err.message, 'error');
        }
      });
    });

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
          state.setCurrentClientId(clientId);
          state.setCurrentProjectId(projectId);
          state.setCurrentOrderId(project.order_id);
          if (project.suit_config_id) {
            api.getSuit(project.suit_config_id).then(suit => {
              state.editSuit(suit);
              router.navigateTo('#configurator', { client_id: clientId, project_id: projectId, order_id: project.order_id });
            }).catch(() => {
              state.startNewSuit();
              router.navigateTo('#configurator', { client_id: clientId, project_id: projectId, order_id: project.order_id });
            });
          } else {
            state.startNewSuit();
            router.navigateTo('#configurator', { client_id: clientId, project_id: projectId, order_id: project.order_id });
          }
        });
      } else if (action === 'print-meas') {
        const project = findProject(projectId);
        btn.addEventListener('click', () => {
          if (project) printMeasurementCard(clientData, project);
        });
      } else if (action === 'complete-order') {
        btn.addEventListener('click', () => completeOrder(orderId));
      } else if (action === 'move-phase') {
        btn.addEventListener('change', async () => {
          const newStatus = btn.value;
          const project = findProject(projectId);
          if (!project || newStatus === project.status) return;
          const prev = project.status;
          try {
            await api.updateProjectStatus(projectId, newStatus);
            showToast(`Moved to ${STAGE_LABELS[newStatus]}.`, 'success');
            await load();
          } catch (err) {
            showToast('Phase move failed: ' + err.message, 'error');
            btn.value = prev;
          }
        });
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
    const stageOptions = PROJECT_STAGES.map(s =>
      `<option value="${s}"${s === project.status ? ' selected' : ''}>${STAGE_LABELS[s] || s}</option>`
    ).join('');
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
          <label class="text-muted" style="font-size:0.65rem;display:block;margin-top:0.35rem;">Move phase</label>
          <select class="input" style="font-size:0.75rem;padding:2px 6px;height:28px;width:100%;" data-garment-action="move-phase" data-project-id="${project.id}" data-order-id="${orderId}" aria-label="Move ${escHtml(project.garment_type)} to another workshop phase">${stageOptions}</select>
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
    let meas = project.measurements || {};
    // Fall back to linked client profile when garment has no values yet.
    if (Object.keys(meas).length === 0 && clientData.measurement) {
      meas = clientData.measurement.values
        || (typeof clientData.measurement.values_json === 'string'
          ? (() => { try { return JSON.parse(clientData.measurement.values_json || '{}'); } catch { return {}; } })()
          : {})
        || {};
    }
    renderMeasPanelBody(meas, false);
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
          <label for="ec-phone">Phone <span class="optional">(optional)</span></label>
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

  function openVisitModal() {
    document.getElementById('visit-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('visit-purpose').value = '';
    document.getElementById('visit-modal').style.display = 'flex';
  }
  document.getElementById('visit-modal-close').addEventListener('click', () => { document.getElementById('visit-modal').style.display = 'none'; });
  document.getElementById('visit-cancel').addEventListener('click', () => { document.getElementById('visit-modal').style.display = 'none'; });
  document.getElementById('visit-save').addEventListener('click', async () => {
    const visit_date = document.getElementById('visit-date').value;
    const purpose = document.getElementById('visit-purpose').value.trim();
    if (!visit_date) { showToast('Visit date is required.', 'error'); return; }
    try {
      await api.addClientVisit(clientId, { visit_date, purpose });
      document.getElementById('visit-modal').style.display = 'none';
      showToast('Visit added.', 'success');
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
