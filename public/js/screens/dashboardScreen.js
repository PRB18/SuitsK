/**
 * dashboardScreen.js — Saved bespoke suits dashboard
 *
 * HCI Golden Rules applied:
 *  1. Consistency    — unified header pattern, button styles match configurator
 *  2. Shortcuts      — N = new suit, ? = shortcut overlay, Escape closes modals
 *  3. Feedback       — Toast replaces alert(), suit count badge, analytics charts
 *  4. Error Prev.    — Delete uses a proper confirmation modal (not browser confirm)
 *  5. Recognition    — Analytics panel shows collection at a glance, ? legend always visible
 */

import { api }       from '../api.js';
import { state }     from '../state.js';
import { router }    from '../router.js';
import { showToast } from '../toast.js';

// ---------------------------------------------------------------------------
// Chart colour palette (7 accent-harmonised colours)
// ---------------------------------------------------------------------------
const CHART_COLORS = [
  '#8B6F47', '#C9A87A', '#5B7FA6', '#4E9E6D',
  '#A05C5C', '#7A6EA0', '#6A8F7A',
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
export function renderDashboardScreen(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dashboard-wrapper';

  wrapper.innerHTML = `
    <!-- ── Main Content (global sidebar is in shell.js) ──────────── -->
    <div class="ds-content">

      <!-- Top bar -->
      <div class="ds-top-bar">
        <div>
          <div class="ds-top-heading">Suit Collection</div>
          <div class="ds-top-sub">Your bespoke configurations, encrypted at rest</div>
        </div>
        <div class="ds-top-actions">
          <button id="new-suit-btn" class="btn btn-primary btn-sm" aria-label="Configure new suit (N)">New Suit</button>
          <button id="backup-vault-btn" class="btn btn-ghost btn-sm" aria-label="Create encrypted backup">Backup</button>
          <button id="shortcut-help-btn" class="btn btn-ghost btn-sm" aria-label="Keyboard shortcuts">Shortcuts</button>
          <span id="suit-count-badge" class="vault-status-badge" aria-live="polite">
            <span class="status-dot"></span>
            <span id="suit-count-text">— suits</span>
          </span>
        </div>
      </div>
      <!-- Active Orders Section -->
      <div id="active-orders-section" class="active-orders-section" style="margin-bottom: 2rem;">
        <div class="ds-section-label" style="display: flex; justify-content: space-between; align-items: baseline;">
          <span>Active Orders</span>
          <a href="#workshop" class="btn btn-ghost btn-sm" style="font-size: 0.75rem;">View Workshop Kanban</a>
        </div>
        <div id="active-orders-container" class="suits-grid-container">
          <div class="loading-state">Loading active orders…</div>
        </div>
      </div>

      <!-- Stats strip -->
      <div class="ds-stats-strip" id="ds-stats-strip">
        <div class="ds-stat">
          <div class="ds-stat-value" id="stat-total">—</div>
          <div class="ds-stat-label">Total Suits</div>
        </div>
        <div class="ds-stat">
          <div class="ds-stat-value" id="stat-avg">—</div>
          <div class="ds-stat-label">Avg. Complete</div>
        </div>
        <div class="ds-stat">
          <div class="ds-stat-value" id="stat-fabrics">—</div>
          <div class="ds-stat-label">Unique Fabrics</div>
        </div>
      </div>

      <!-- Backup receipt -->
      <section id="backup-receipt" class="backup-receipt" role="status" aria-live="polite" hidden></section>

      <!-- Scrollable body -->
      <div class="ds-scroll">
        <div class="ds-section-label">Configured Garments</div>
        <div id="suits-grid-container" class="suits-grid-container">
          <div class="loading-state">Loading your vault…</div>
        </div>
        <div id="analytics-panel-container"></div>
        <div class="ds-section-label" style="margin-top: 2rem;">B2B Logistics</div>
        <div id="b2b-panel-container"></div>
      </div>

      <!-- FAB -->
      <button id="fab-new-suit" class="fab-new-suit" title="New bespoke suit (N)" aria-label="Configure new suit">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Bespoke Suit
      </button>
    </div>
  `;

  container.appendChild(wrapper);

  // ── Bind header actions ──────────────────────────────────────────────────
  const openNewSuit = () => {
    state.startNewSuit();
    state.setConfiguratorReturn('#b2b');
    router.navigate('#configurator');
  };

  wrapper.querySelector('#new-suit-btn').addEventListener('click', openNewSuit);
  wrapper.querySelector('#fab-new-suit').addEventListener('click', openNewSuit);

  wrapper.querySelector('#backup-vault-btn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Backing up…';
    const receipt = wrapper.querySelector('#backup-receipt');
    try {
      const result = await api.backupVault();
      receipt.innerHTML = `
        <h3>Encrypted backup created</h3>
        <p>Saved in your vault’s data folder:</p>
        <code>backups\\${escapeHtml(result.backupName)}</code>
        <p>Standard data folder: <code>%LOCALAPPDATA%\\KrishnaSuitsCustom\\data</code></p>
        <p>Keep <strong>config.json</strong> and <strong>suits.db</strong> together. Recovery requires the password used for this backup. Copy the complete backup folder to a separate local drive for protection against disk failure.</p>
      `;
      receipt.hidden = false;
      receipt.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      showToast(`Encrypted backup created: ${result.backupName}`, 'success');
    } catch (err) {
      receipt.textContent = 'Backup failed: ' + err.message + '. No new backup is confirmed; try again.';
      receipt.hidden = false;
      showToast('Backup failed: ' + err.message, 'error');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.innerHTML = originalLabel;
    }
  });

  wrapper.querySelector('#shortcut-help-btn').addEventListener('click', () => {
    showShortcutOverlay('dashboard');
  });

  // ── Keyboard shortcuts — Rule 2 ─────────────────────────────────────────
  const onDashboardKey = (e) => {
    // Skip if typing in an input
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === 'n' || e.key === 'N') openNewSuit();
    if (e.key === '?') showShortcutOverlay('dashboard');
  };
  document.addEventListener('keydown', onDashboardKey);

  // ── Load and render suits & B2B ───────────────────────────────────────────
  const gridContainer = wrapper.querySelector('#suits-grid-container');
  const analyticsContainer = wrapper.querySelector('#analytics-panel-container');
  const b2bContainer = wrapper.querySelector('#b2b-panel-container');
  
  renderActiveOrders(wrapper.querySelector('#active-orders-container'));
  loadSuits(gridContainer, analyticsContainer, wrapper);
  renderB2bPanel(b2bContainer);
  if (window.location.hash === '#b2b' || window.location.hash.includes('section=b2b')) {
    setTimeout(() => b2bContainer.scrollIntoView({ behavior: 'auto', block: 'start' }), 0);
  }

  // ── Cleanup keyboard listener when screen is torn down ───────────────────
  const obs = new MutationObserver(() => {
    if (!document.body.contains(wrapper)) {
      document.removeEventListener('keydown', onDashboardKey);
      obs.disconnect();
    }
  });
  obs.observe(container, { childList: true });
}

// ---------------------------------------------------------------------------
// Render Active Orders
// ---------------------------------------------------------------------------
async function renderActiveOrders(container) {
  try {
    const orders = await api.getActiveOrders();
    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="empty-vault-card" style="padding: 1.5rem; text-align: center;">
          <div class="empty-icon-wrap" style="width: 40px; height: 40px; margin-bottom: 0.5rem; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(0,0,0,0.05);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="empty-title" style="font-size: 1rem; margin-top: 0.5rem;">All caught up! No active orders right now.</h3>
          <p class="empty-text" style="font-size: 0.85rem; margin-bottom: 0;">Start a new order in the B2B section or client profile.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'suits-grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
    
    const getBadgeClass = (status) => {
      if (status === 'pending') return 'badge--neutral';
      if (status === 'in_progress') return 'badge--info';
      if (status === 'ready') return 'badge--success';
      return 'badge--neutral';
    };

    const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );

    orders.forEach(order => {
      const card = document.createElement('a');
      card.href = '#workshop';
      card.className = 'suit-card';
      card.style.textDecoration = 'none';
      card.style.color = 'inherit';
      
      const dateStr = new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      
      card.innerHTML = `
        <div class="suit-card-inner">
          <div class="suit-card-header" style="margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <h3 class="suit-card-title">${escapeHTML(order.customer)}</h3>
            <span class="vault-status-badge ${getBadgeClass(order.status)}" style="font-size: 0.7rem;">${escapeHTML(order.status.replace('_', ' '))}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            <strong>Ref:</strong> ${escapeHTML(order.order_ref)} &nbsp;|&nbsp; <strong>Date:</strong> ${dateStr}
          </div>
          <div class="suit-card-summary" style="gap: 0.5rem; margin-bottom: 0; display: flex;">
            <div class="summary-badge" style="flex: 1; text-align: center;">
              <span class="badge-label">Garments</span>
              <span class="badge-value">${order.qty}</span>
            </div>
            <div class="summary-badge" style="flex: 1; text-align: center;">
              <span class="badge-label">Amount</span>
              <span class="badge-value">₹${Number(order.amount).toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    container.appendChild(grid);
  } catch (err) {
    container.innerHTML = `
      <div class="form-error" style="display:block;">
        Failed to load active orders: ${String(err.message)}
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Load suits + wire all sub-rendering
// ---------------------------------------------------------------------------
async function loadSuits(gridContainer, analyticsContainer, wrapper) {
  try {
    const suits = await api.getSuits();
    state.setSuits(suits);

    const countText = wrapper.querySelector('#suit-count-text');
    if (countText) countText.textContent = `${suits.length} suit${suits.length !== 1 ? 's' : ''}`;

    // Update stats strip
    const statTotal = wrapper.querySelector('#stat-total');
    const statAvg   = wrapper.querySelector('#stat-avg');
    const statFabrics = wrapper.querySelector('#stat-fabrics');
    if (statTotal) statTotal.textContent = suits.length;
    if (statAvg) {
      const avgFilled = suits.length
        ? Math.round(suits.reduce((s, x) => s + (x.summary?.fieldCount ?? 0), 0) / suits.length)
        : 0;
      statAvg.textContent = Math.round((avgFilled / 32) * 100) + '%';
    }
    if (statFabrics) {
      const fabSet = new Set(suits.map(s => s.summary?.fabricCode).filter(Boolean));
      statFabrics.textContent = fabSet.size || '—';
    }

    // Render analytics panel (even with 0 suits — shows empty state)
    renderAnalyticsPanel(analyticsContainer, suits);

    if (suits.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-vault-card">
          <div class="empty-icon-wrap">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2"></rect>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
          </div>
          <h3 class="empty-title">Your Vault is Empty</h3>
          <p class="empty-text">No bespoke suits configured yet. Start your first configuration with your tailoring choices and measurements.</p>
          <button id="empty-create-btn" class="btn btn-primary">Configure First Suit</button>
        </div>
      `;
      gridContainer.querySelector('#empty-create-btn')?.addEventListener('click', () => {
        state.startNewSuit();
        state.setConfiguratorReturn('#b2b');
        router.navigate('#configurator');
      });
      return;
    }

    gridContainer.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'suits-grid';

    for (const suit of suits) {
      const card = createSuitCard(suit, gridContainer, analyticsContainer, wrapper);
      grid.appendChild(card);
    }

    gridContainer.appendChild(grid);

  } catch (err) {
    gridContainer.innerHTML = `
      <div class="form-error" style="display:block;">
        Failed to load suits: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Suit Card
// ---------------------------------------------------------------------------
function createSuitCard(suit, gridContainer, analyticsContainer, wrapper) {
  const card = document.createElement('div');
  card.className = 'suit-card';

  const dateStr = suit.updatedAt
    ? new Date(suit.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Recently';

  const lapel  = suit.summary?.lapelStyle  || 'Standard';
  const collar = suit.summary?.collarStyle || 'Standard';
  const fabric = suit.summary?.fabricCode  || 'Custom Fabric';
  const piping = suit.summary?.pipingColor || null;
  const filled = suit.summary?.fieldCount  ?? 0;
  const pct    = Math.round((filled / 32) * 100);

  card.innerHTML = `
    <div class="suit-card-stripe"></div>
    <div class="suit-card-inner">
      <div class="suit-card-header">
        <h3 class="suit-card-title">${escapeHtml(suit.name)}</h3>
        <span class="suit-card-date">${dateStr}</span>
      </div>

      ${suit.notes ? `<p class="suit-card-notes">${escapeHtml(suit.notes)}</p>` : ''}

      <div class="suit-card-summary">
        <div class="summary-badge">
          <span class="badge-label">Lapel</span>
          <span class="badge-value">${escapeHtml(lapel)}</span>
        </div>
        <div class="summary-badge">
          <span class="badge-label">Shirt</span>
          <span class="badge-value">${escapeHtml(collar)}</span>
        </div>
        <div class="summary-badge">
          <span class="badge-label">Fabric</span>
          <span class="badge-value">${escapeHtml(fabric)}</span>
        </div>
        ${piping ? `
          <div class="summary-badge">
            <span class="badge-label">Piping</span>
            <span class="badge-value piping-chip">
              <span class="color-swatch" style="background-color: ${escapeHtml(piping)};"></span>
              ${escapeHtml(piping)}
            </span>
          </div>
        ` : ''}
      </div>

      <div style="margin-bottom: var(--space-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:0.6rem; text-transform:uppercase; letter-spacing:0.1em; color:#C9A84C; font-weight:600;">Configured</span>
          <span style="font-size:0.75rem; font-weight:600; color:#2C1810;">${pct}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%; background:#C9A84C"></div>
        </div>
      </div>

      <div class="suit-card-actions">
        <button class="btn btn-outline btn-sm action-edit">Edit</button>
        <button class="btn btn-ghost btn-sm action-duplicate">Duplicate</button>
        <button class="btn btn-ghost btn-sm text-danger action-delete">Delete</button>
      </div>
    </div>
  `;

  // ── Edit ─────────────────────────────────────────────────────────────────
  card.querySelector('.action-edit').addEventListener('click', async () => {
    try {
      const fullSuit = await api.getSuit(suit.id);
      state.editSuit(fullSuit);
      state.setConfiguratorReturn('#b2b');
      router.navigate('#configurator');
    } catch (err) {
      showToast('Error opening suit: ' + err.message, 'error');
    }
  });

  // ── Duplicate ─────────────────────────────────────────────────────────────
  card.querySelector('.action-duplicate').addEventListener('click', async () => {
    try {
      await api.duplicateSuit(suit.id);
      showToast(`"${suit.name}" duplicated.`, 'success');
      await loadSuits(gridContainer, analyticsContainer, wrapper);
    } catch (err) {
      showToast('Error duplicating suit: ' + err.message, 'error');
    }
  });

  // ── Delete (Rule 4: use modal, not browser confirm) ───────────────────────
  card.querySelector('.action-delete').addEventListener('click', () => {
    showDeleteModal(suit.name, async () => {
      try {
        await api.deleteSuit(suit.id);
        showToast(`"${suit.name}" deleted.`, 'info');
        await loadSuits(gridContainer, analyticsContainer, wrapper);
      } catch (err) {
        showToast('Error deleting suit: ' + err.message, 'error');
      }
    });
  });

  return card;
}

// ---------------------------------------------------------------------------
// Delete Confirmation Modal — Rule 4: Error Prevention
// ---------------------------------------------------------------------------
function showDeleteModal(suitName, onConfirm) {
  const backdrop = document.createElement('div');
  backdrop.className = 'ks-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'delete-modal-title');

  backdrop.innerHTML = `
    <div class="ks-modal">
      <div class="ks-modal__icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
        </svg>
      </div>
      <h3 class="ks-modal__title" id="delete-modal-title">Delete Suit?</h3>
      <p class="ks-modal__body">
        <strong>${escapeHtml(suitName)}</strong> will be permanently deleted from the encrypted vault.
        This action cannot be undone.
      </p>
      <div class="ks-modal__actions">
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary text-danger" id="modal-confirm-btn" style="background:var(--color-danger); border-color:var(--color-danger);">Delete Permanently</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = bindDialog(backdrop, '#modal-cancel-btn');
  backdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);

  backdrop.querySelector('#modal-confirm-btn').addEventListener('click', async () => {
    close();
    await onConfirm();
  });

  // Focus the cancel button for safety (Rule 4)
  requestAnimationFrame(() => backdrop.querySelector('#modal-cancel-btn')?.focus());
}

// ---------------------------------------------------------------------------
// Keyboard Shortcut Overlay — Rule 5: Recognition over Recall
// ---------------------------------------------------------------------------
function showShortcutOverlay(context = 'dashboard') {
  const backdrop = document.createElement('div');
  backdrop.className = 'ks-shortcuts-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Keyboard shortcuts');

  const dashboardShortcuts = `
    <div class="ks-shortcut-group-title">Dashboard</div>
    <div class="ks-shortcut-row"><span>New suit</span><kbd>N</kbd></div>
    <div class="ks-shortcut-row"><span>Show shortcuts</span><kbd>?</kbd></div>
    <div class="ks-shortcut-group-title">Configurator Wizard</div>
    <div class="ks-shortcut-row"><span>Back to dashboard</span><kbd>Esc</kbd></div>
    <div class="ks-shortcut-row"><span>Jump to Save step</span><kbd>S</kbd></div>
    <div class="ks-shortcut-row"><span>Jump to step 1–7</span><kbd>1</kbd>–<kbd>7</kbd></div>
    <div class="ks-shortcut-row"><span>Previous step</span><kbd>←</kbd></div>
    <div class="ks-shortcut-row"><span>Next step</span><kbd>→</kbd></div>
  `;

  backdrop.innerHTML = `
    <div class="ks-shortcuts-panel">
      <div class="ks-shortcuts-title">
        Keyboard Shortcuts
        <button class="ks-shortcuts-close" id="shortcuts-close-btn" aria-label="Close shortcuts">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="ks-shortcuts-grid">
        ${dashboardShortcuts}
      </div>
      <p style="font-size:0.8125rem; color:var(--color-text-muted); margin-top:var(--space-lg);">
        Press <kbd style="font-size:0.75rem; background:var(--color-surface-muted); border:1px solid var(--color-border); border-bottom-width:2px; border-radius:4px; padding:1px 6px;">Esc</kbd> to close this panel.
      </p>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = bindDialog(backdrop, '#shortcuts-close-btn');
  backdrop.querySelector('#shortcuts-close-btn').addEventListener('click', close);
}

function bindDialog(backdrop, initialFocus) {
  const previousFocus = document.activeElement;
  const app = document.getElementById('app');
  const wasInert = app.inert;
  app.inert = true;

  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    app.inert = wasInert;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  const onKey = (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      const buttons = [...backdrop.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey, true);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
  backdrop.querySelector(initialFocus).focus();
  return close;
}

// ---------------------------------------------------------------------------
// Analytics Panel — Graphify (pure SVG, no library)
// ---------------------------------------------------------------------------
function renderAnalyticsPanel(container, suits) {
  container.innerHTML = '';
  if (suits.length === 0) return; // hide panel entirely when vault is empty

  // ── Data preparation ─────────────────────────────────────────────────────
  // 1. Lapel style distribution
  const lapelCounts = {};
  for (const s of suits) {
    const l = s.summary?.lapelStyle || 'Unspecified';
    lapelCounts[l] = (lapelCounts[l] || 0) + 1;
  }
  const lapelEntries = Object.entries(lapelCounts).sort((a, b) => b[1] - a[1]);

  // 2. Top fabrics
  const fabricCounts = {};
  for (const s of suits) {
    const f = s.summary?.fabricCode;
    if (f) fabricCounts[f] = (fabricCounts[f] || 0) + 1;
  }
  const fabricEntries = Object.entries(fabricCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // 3. Average completeness
  const fieldCounts = suits.map(s => s.summary?.fieldCount ?? 0);
  const avgFilled = fieldCounts.length ? Math.round(fieldCounts.reduce((a, b) => a + b, 0) / fieldCounts.length) : 0;
  const avgPct = Math.round((avgFilled / 32) * 100);

  // ── Render panel ─────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.className = 'analytics-panel';
  panel.id = 'analytics-panel';

  let chartsHTML = '';

  // Chart 1: Donut — Lapel Style Distribution
  chartsHTML += `
    <div class="chart-block">
      <div class="chart-block-title">Lapel Style Distribution</div>
      ${renderDonutChart(lapelEntries, suits.length)}
    </div>
  `;

  // Chart 2: Bar — Top Fabrics
  chartsHTML += `
    <div class="chart-block">
      <div class="chart-block-title">Top Fabrics Used</div>
      ${fabricEntries.length > 0 ? renderBarChart(fabricEntries) : '<p style="font-size:0.875rem;color:var(--color-text-muted);padding-top:8px;">No fabrics recorded yet.</p>'}
    </div>
  `;

  // Chart 3: Gauge — Avg Completeness
  chartsHTML += `
    <div class="chart-block">
      <div class="chart-block-title">Avg. Configuration Completeness</div>
      ${renderGaugeChart(avgPct)}
      <div class="gauge-pct-sub" style="margin-top:4px;">across ${suits.length} suit${suits.length !== 1 ? 's' : ''}</div>
    </div>
  `;

  panel.innerHTML = `
    <div class="analytics-header">
      <div class="analytics-title">
        <svg class="analytics-title-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        Collection Analytics
      </div>
      <button class="analytics-toggle" id="analytics-toggle-btn" aria-expanded="true" aria-controls="analytics-charts">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" id="analytics-chevron">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
        Collapse
      </button>
    </div>
    <div class="analytics-charts-row" id="analytics-charts">
      ${chartsHTML}
    </div>
  `;

  container.appendChild(panel);

  // Toggle collapse/expand
  const toggleBtn = panel.querySelector('#analytics-toggle-btn');
  const chartsEl  = panel.querySelector('#analytics-charts');
  const chevron   = panel.querySelector('#analytics-chevron');

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      chartsEl.style.display = 'none';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg> Expand`;
    } else {
      chartsEl.style.display = '';
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg> Collapse`;
    }
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    panel.querySelectorAll('.bar-fill[data-target-width]').forEach(bar => {
      bar.style.width = bar.dataset.targetWidth;
    });
  });
}

// ---------------------------------------------------------------------------
// Chart Renderers (pure SVG)
// ---------------------------------------------------------------------------

function renderDonutChart(entries, total) {
  const R = 46, CX = 65, CY = 65, stroke = 18;
  const circ = 2 * Math.PI * R;

  let html = `
    <div class="donut-wrap">
      <svg class="donut-svg" viewBox="0 0 130 130" aria-hidden="true">
        <!-- track -->
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#E2DDD6" stroke-width="${stroke}"/>
  `;

  let offset = 0;
  entries.forEach((([label, count], i) => {
    const pct = count / total;
    const dashLen = pct * circ;
    html += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="${CHART_COLORS[i % CHART_COLORS.length]}"
      stroke-width="${stroke}"
      stroke-dasharray="${dashLen} ${circ - dashLen}"
      stroke-dashoffset="${-offset}"
      aria-label="${escapeHtml(label)}: ${Math.round(pct * 100)}%"
    />`;
    offset += dashLen;
  }));

  html += `</svg>
      <div class="donut-center-label">
        <span class="donut-center-value">${total}</span>
        <span class="donut-center-sub">suits</span>
      </div>
    </div>
    <div class="donut-legend">
  `;

  entries.slice(0, 4).forEach(([label, count], i) => {
    const pct = Math.round((count / total) * 100);
    html += `
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]};"></span>
        <span class="donut-legend-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        <span class="donut-legend-pct">${pct}%</span>
      </div>
    `;
  });

  if (entries.length > 4) {
    html += `<div class="donut-legend-item"><span class="donut-legend-dot" style="background:#ccc;"></span><span class="donut-legend-label">Others</span></div>`;
  }

  html += '</div>';
  return html;
}

function renderBarChart(entries) {
  const maxCount = entries[0]?.[1] || 1;
  let html = '<div class="bar-chart">';

  entries.forEach(([label, count], i) => {
    const pct = Math.round((count / maxCount) * 100);
    html += `
      <div class="bar-row">
        <span class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        <div class="bar-track">
          <!-- start at 0, animate to target in requestAnimationFrame -->
          <div class="bar-fill" style="width:0%; background:${CHART_COLORS[i % CHART_COLORS.length]};" data-target-width="${pct}%"></div>
        </div>
        <span class="bar-count">${count}</span>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

function renderGaugeChart(pct) {
  // Semi-circle gauge: arc from 180° to 0° (left to right)
  const R = 50, CX = 65, CY = 75, stroke = 14;
  // Arc length for a semi-circle
  const arcLen = Math.PI * R;  // πr
  const filled = (pct / 100) * arcLen;
  const empty  = arcLen - filled;

  // Color: red < 30, amber < 60, green >= 60
  const fillColor = pct >= 60 ? '#27AE60' : pct >= 30 ? '#C9A87A' : '#A93226';

  return `
    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 130 80" aria-label="Completeness gauge: ${pct}%">
        <!-- track: semi-circle -->
        <path d="M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}"
          fill="none" stroke="#E2DDD6" stroke-width="${stroke}" stroke-linecap="round"/>
        <!-- fill arc -->
        <path d="M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}"
          fill="none"
          stroke="${fillColor}"
          stroke-width="${stroke}"
          stroke-linecap="round"
          stroke-dasharray="${filled} ${empty + 1}"
          stroke-dashoffset="0"
        />
      </svg>
      <div class="gauge-pct-label">
        <div class="gauge-pct-value">${pct}%</div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// B2B Panel
// ---------------------------------------------------------------------------
async function renderB2bPanel(container) {
  container.innerHTML = `
    <div class="b2b-panel">
      <div class="b2b-tabs" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
        <button class="btn btn-outline b2b-tab active" data-tab="corporate">Corporate Orders</button>
        <button class="btn btn-outline b2b-tab" data-tab="vendor">Vendor Purchases</button>
      </div>
      <div id="b2b-content" style="min-height: 200px; position: relative;">
        <div class="loading-state">Loading B2B data...</div>
      </div>
    </div>
  `;

  let currentTab = 'corporate';
  const contentEl = container.querySelector('#b2b-content');
  const tabs = container.querySelectorAll('.b2b-tab');

  const loadData = async () => {
    try {
      const entries = await api.getB2B({ type: currentTab === 'corporate' ? 'corporate_order' : 'vendor_purchase' });
      renderB2bContent(contentEl, entries, currentTab, loadData);
    } catch (err) {
      contentEl.innerHTML = `<div class="form-error" style="display:block;">Error loading B2B: ${escapeHtml(err.message)}</div>`;
    }
  };

  tabs.forEach(t => t.addEventListener('click', (e) => {
    tabs.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentTab = e.target.dataset.tab;
    contentEl.innerHTML = '<div class="loading-state">Loading...</div>';
    loadData();
  }));

  loadData();
}

function renderB2bContent(container, entries, type, reloadFn) {
  const STATUS_LABELS = {
    pending: 'Pending', in_progress: 'In Progress',
    completed: 'Completed', cancelled: 'Cancelled',
  };
  const STATUS_CLASS = {
    pending: 'badge--neutral', in_progress: 'badge--info',
    completed: 'badge--success', cancelled: 'badge--danger',
  };

  if (type === 'corporate') {
    container.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin-bottom:1rem;">
        <button id="add-corp-btn" class="btn btn-primary">+ New Corporate Order</button>
      </div>
      ${entries.length === 0 ? '<div class="empty-state">No corporate orders yet. Create one above.</div>' : `
        <div class="b2b-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
          ${entries.map(e => `
            <div class="suit-card" data-b2b-id="${e.id}">
              <div class="suit-card-inner">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                  <h3 class="suit-card-title" style="margin:0;">${escapeHtml(e.company_name)}</h3>
                  <span class="badge ${STATUS_CLASS[e.status] || 'badge--neutral'}">${STATUS_LABELS[e.status] || e.status}</span>
                </div>
                ${e.contact_person ? `<div class="text-sm text-muted">Contact: ${escapeHtml(e.contact_person)}</div>` : ''}
                ${e.contact_phone  ? `<div class="text-sm text-muted">Phone: ${escapeHtml(e.contact_phone)}</div>` : ''}
                <div class="summary-badge"><span class="badge-label">Qty</span><span class="badge-value">${e.quantity || 0} garments</span></div>
                ${e.total_amount ? `<div class="summary-badge"><span class="badge-label">Amount</span><span class="badge-value">₹${Number(e.total_amount).toLocaleString()}</span></div>` : ''}
                ${e.delivery_date ? `<div class="summary-badge"><span class="badge-label">Delivery</span><span class="badge-value">${new Date(e.delivery_date).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</span></div>` : ''}
                ${e.notes ? `<div class="text-sm text-muted" style="margin-top:0.4rem; font-style:italic;">${escapeHtml(e.notes)}</div>` : ''}
                <div class="suit-card-actions" style="margin-top:1rem; display:flex; gap:0.5rem;">
                  <button class="btn btn-ghost btn-sm b2b-edit-btn" data-id="${e.id}">Edit</button>
                  <button class="btn btn-ghost btn-sm text-danger b2b-delete-btn" data-id="${e.id}">Delete</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
    container.querySelector('#add-corp-btn')?.addEventListener('click', () => showB2BModal('corporate', null, reloadFn));
  } else {
    container.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin-bottom:1rem;">
        <button id="add-vendor-btn" class="btn btn-primary">+ New Purchase Order</button>
      </div>
      ${entries.length === 0 ? '<div class="empty-state">No vendor purchases yet. Create one above.</div>' : `
        <table class="inventory-table" style="width:100%; text-align:left; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--color-border);">
              <th style="padding:8px;">Vendor</th>
              <th style="padding:8px;">Items</th>
              <th style="padding:8px;">Order Date</th>
              <th style="padding:8px;">Expected</th>
              <th style="padding:8px;">Amount</th>
              <th style="padding:8px;">Status</th>
              <th style="padding:8px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => `
              <tr style="border-bottom:1px solid var(--color-border);" data-b2b-id="${e.id}">
                <td style="padding:8px; font-weight:600;">${escapeHtml(e.vendor_name)}</td>
                <td style="padding:8px; max-width:160px; word-break:break-word;">${escapeHtml(e.items_ordered)}</td>
                <td style="padding:8px;">${e.order_date ? new Date(e.order_date).toLocaleDateString('en-PK',{day:'numeric',month:'short'}) : '—'}</td>
                <td style="padding:8px;">${e.delivery_date ? new Date(e.delivery_date).toLocaleDateString('en-PK',{day:'numeric',month:'short'}) : '—'}</td>
                <td style="padding:8px;">${e.total_amount ? '₹' + Number(e.total_amount).toLocaleString() : '—'}</td>
                <td style="padding:8px;"><span class="badge ${STATUS_CLASS[e.status] || 'badge--neutral'}">${STATUS_LABELS[e.status] || e.status}</span></td>
                 <td style="padding:8px; white-space:nowrap;">
                   <button class="btn btn-ghost btn-sm b2b-edit-btn" data-id="${e.id}">Edit</button>
                   <button class="btn btn-ghost btn-sm text-danger b2b-delete-btn" data-id="${e.id}">Delete</button>
                 </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    `;
    container.querySelector('#add-vendor-btn')?.addEventListener('click', () => showB2BModal('vendor', null, reloadFn));
  }

  // Attach Edit handlers
  const entriesMap = Object.fromEntries(entries.map(en => [en.id, en]));
  container.querySelectorAll('.b2b-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = entriesMap[btn.dataset.id];
      if (entry) showB2BModal(entry.entry_type === 'corporate_order' ? 'corporate' : 'vendor', entry, reloadFn);
    });
  });

  // Attach Delete handlers
  container.querySelectorAll('.b2b-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this B2B entry?')) return;
      try {
        await api.deleteB2BEntry(btn.dataset.id);
        showToast('Deleted.', 'success');
        reloadFn();
      } catch (err) { showToast('Delete failed: ' + err.message, 'error'); }
    });
  });
}

function showB2BModal(type, existingEntry, onSuccess) {
  const backdrop = document.createElement('div');
  backdrop.className = 'ks-modal-backdrop';

  const isCorp = type === 'corporate';
  const isEdit = !!existingEntry;
  const today  = new Date().toISOString().split('T')[0];
  const ent    = existingEntry || {};

  const statusOptions = ['pending','in_progress','completed','cancelled'].map(s =>
    '<option value="' + s + '"' + ((ent.status || 'pending') === s ? ' selected' : '') + '>' +
    ({pending:'Pending',in_progress:'In Progress',completed:'Completed',cancelled:'Cancelled'}[s]) +
    '</option>'
  ).join('');

  const corpFields = '<div><label class="form-label">Company Name *</label><input type="text" id="b2b-company" class="form-input" required value="' + escapeHtml(ent.company_name || '') + '"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
    '<div><label class="form-label">Contact Person</label><input type="text" id="b2b-contact" class="form-input" value="' + escapeHtml(ent.contact_person || '') + '"></div>' +
    '<div><label class="form-label">Phone</label><input type="text" id="b2b-phone" class="form-input" value="' + escapeHtml(ent.contact_phone || '') + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
    '<div><label class="form-label">Quantity</label><input type="number" id="b2b-qty" class="form-input" min="0" value="' + (ent.quantity || '') + '"></div>' +
    '<div><label class="form-label">Amount (Rs)</label><input type="number" id="b2b-amount" class="form-input" min="0" value="' + (ent.total_amount || '') + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
    '<div><label class="form-label">Order Date</label><input type="date" id="b2b-order" class="form-input" value="' + (ent.order_date || today) + '"></div>' +
    '<div><label class="form-label">Delivery Date</label><input type="date" id="b2b-delivery" class="form-input" value="' + (ent.delivery_date || '') + '"></div>' +
    '</div>';

  const vendorFields = '<div><label class="form-label">Vendor Name *</label><input type="text" id="b2b-vendor" class="form-input" required value="' + escapeHtml(ent.vendor_name || '') + '"></div>' +
    '<div><label class="form-label">Items Ordered *</label><input type="text" id="b2b-items" class="form-input" required value="' + escapeHtml(ent.items_ordered || '') + '"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">' +
    '<div><label class="form-label">Order Date</label><input type="date" id="b2b-order" class="form-input" value="' + (ent.order_date || today) + '"></div>' +
    '<div><label class="form-label">Expected Delivery</label><input type="date" id="b2b-delivery" class="form-input" value="' + (ent.delivery_date || '') + '"></div>' +
    '</div>' +
    '<div><label class="form-label">Amount (Rs)</label><input type="number" id="b2b-amount" class="form-input" min="0" value="' + (ent.total_amount || '') + '"></div>';

  backdrop.innerHTML =
    '<div class="ks-modal" style="width:520px;max-width:92vw;">' +
    '<h3 class="ks-modal__title">' + (isEdit ? 'Edit' : 'New') + ' ' + (isCorp ? 'Corporate Order' : 'Vendor Purchase') + '</h3>' +
    '<form id="b2b-form" style="display:flex;flex-direction:column;gap:1rem;margin-top:1rem;">' +
    (isCorp ? corpFields : vendorFields) +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;"><div><label class="form-label">Status</label><select id="b2b-status" class="form-input">' + statusOptions + '</select></div></div>' +
    '<div><label class="form-label">Notes</label><textarea id="b2b-notes" class="form-input" rows="2" style="resize:vertical;">' + escapeHtml(ent.notes || '') + '</textarea></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:0.5rem;">' +
    '<button type="button" class="btn btn-secondary" id="b2b-cancel">Cancel</button>' +
    '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Update' : 'Save') + '</button>' +
    '</div></form></div>';

  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('#b2b-cancel').addEventListener('click', close);

  backdrop.querySelector('#b2b-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const submitBtn = backdrop.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const data = {
      entry_type:     isCorp ? 'corporate_order' : 'vendor_purchase',
      company_name:   isCorp ? (backdrop.querySelector('#b2b-company').value || '').trim()  : undefined,
      contact_person: isCorp ? (backdrop.querySelector('#b2b-contact').value || '').trim()  : undefined,
      contact_phone:  isCorp ? (backdrop.querySelector('#b2b-phone').value || '').trim()    : undefined,
      quantity:       isCorp ? parseInt(backdrop.querySelector('#b2b-qty').value || '0', 10) : undefined,
      vendor_name:    !isCorp ? (backdrop.querySelector('#b2b-vendor').value || '').trim()  : undefined,
      items_ordered:  !isCorp ? (backdrop.querySelector('#b2b-items').value || '').trim()   : undefined,
      order_date:     (backdrop.querySelector('#b2b-order') ? backdrop.querySelector('#b2b-order').value : null) || today,
      delivery_date:  backdrop.querySelector('#b2b-delivery').value || null,
      total_amount:   parseFloat(backdrop.querySelector('#b2b-amount').value) || 0,
      status:         backdrop.querySelector('#b2b-status').value,
      notes:          (backdrop.querySelector('#b2b-notes').value || '').trim(),
    };

    try {
      if (isEdit) {
        await api.updateB2BEntry(ent.id, data);
        showToast('B2B entry updated.', 'success');
      } else {
        await api.createB2BEntry(data);
        showToast('B2B entry created.', 'success');
      }
      close();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Update' : 'Save';
    }
  });
}
