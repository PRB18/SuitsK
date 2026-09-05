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
    <header class="app-header">
      <div class="header-container">
        <div class="header-brand">
          <div class="brand-monogram sm">KS</div>
          <div class="header-titles">
            <h1 class="header-title">Krishna Suits</h1>
            <span class="header-subtitle">Tailoring Vault</span>
          </div>
        </div>

        <div class="header-actions">
          <!-- Suit count badge — Rule 3: visible feedback on collection size -->
          <span id="suit-count-badge" class="suit-count-badge" aria-live="polite" title="Total suits in vault">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2"></rect>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
            </svg>
            <span id="suit-count-text">— suits</span>
          </span>

          <!-- Help button — Rule 5: always visible shortcut reference -->
          <button id="shortcut-help-btn" class="btn-help" title="Keyboard shortcuts (?)" aria-label="Show keyboard shortcuts">?</button>

          <button id="lock-vault-btn" class="btn btn-secondary btn-sm" title="Lock the encrypted vault" aria-label="Lock vault">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Lock Vault
          </button>

          <!-- Primary CTA visible at all times in header — Rule 2: Shortcut to main action -->
          <button id="new-suit-btn" class="btn btn-primary btn-sm" title="New bespoke suit (N)" aria-label="Configure new suit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Suit
          </button>
        </div>
      </div>
    </header>

    <main class="dashboard-main">
      <div class="content-container">

        <!-- Section header -->
        <div class="dashboard-intro">
          <div class="intro-text">
            <h2 class="section-title">Your Suit Collection</h2>
            <p class="section-description">Select a suit to view, edit tailoring details, or configure a new bespoke garment.</p>
          </div>
          <div class="vault-status-badge">
            <span class="status-dot"></span>
            SQLCipher Encrypted (Local)
          </div>
        </div>

        <!-- Analytics panel — Rule 5: collection overview at a glance -->
        <div id="analytics-panel-container"></div>

        <!-- Suit cards grid -->
        <div id="suits-grid-container" class="suits-grid-container">
          <div class="loading-state">Loading your vault…</div>
        </div>
      </div>
    </main>

    <!-- Floating Action Button — Rule 2: primary action always 1 click away -->
    <button id="fab-new-suit" class="fab-new-suit" title="New bespoke suit (N)" aria-label="Configure new suit">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      New Bespoke Suit
    </button>
  `;

  container.appendChild(wrapper);

  // ── Bind header actions ──────────────────────────────────────────────────
  const openNewSuit = () => {
    state.startNewSuit();
    router.navigate('#configurator');
  };

  wrapper.querySelector('#new-suit-btn').addEventListener('click', openNewSuit);
  wrapper.querySelector('#fab-new-suit').addEventListener('click', openNewSuit);

  wrapper.querySelector('#lock-vault-btn').addEventListener('click', async () => {
    try {
      await api.lock();
      state.setStatus({ firstRun: false, unlocked: false });
      router.navigate('#lock');
    } catch (err) {
      showToast('Error locking vault: ' + err.message, 'error');
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

  // ── Load and render suits ────────────────────────────────────────────────
  const gridContainer = wrapper.querySelector('#suits-grid-container');
  const analyticsContainer = wrapper.querySelector('#analytics-panel-container');
  loadSuits(gridContainer, analyticsContainer, wrapper);

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
// Load suits + wire all sub-rendering
// ---------------------------------------------------------------------------
async function loadSuits(gridContainer, analyticsContainer, wrapper) {
  try {
    const suits = await api.getSuits();
    state.setSuits(suits);

    // Update suit count badge
    const countText = wrapper.querySelector('#suit-count-text');
    if (countText) countText.textContent = `${suits.length} suit${suits.length !== 1 ? 's' : ''}`;

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

    <!-- Completeness mini-bar — Rule 3: visible progress feedback -->
    <div style="margin-bottom: var(--space-sm);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--color-text-muted); font-weight:600;">Configured</span>
        <span style="font-size:0.75rem; font-weight:600; color:var(--color-accent);">${pct}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%"></div>
      </div>
    </div>

    <div class="suit-card-actions">
      <!-- Edit is the primary action — most prominent -->
      <button class="btn btn-outline btn-sm action-edit" title="Edit this suit configuration">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit
      </button>
      <button class="btn btn-ghost btn-sm action-duplicate" title="Duplicate this suit">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Duplicate
      </button>
      <button class="btn btn-ghost btn-sm text-danger action-delete" title="Delete this suit permanently">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
        </svg>
        Delete
      </button>
    </div>
  `;

  // ── Edit ─────────────────────────────────────────────────────────────────
  card.querySelector('.action-edit').addEventListener('click', async () => {
    try {
      const fullSuit = await api.getSuit(suit.id);
      state.editSuit(fullSuit);
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

  const close = () => backdrop.remove();

  backdrop.querySelector('#modal-cancel-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  }, { once: true });

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

  const close = () => backdrop.remove();
  backdrop.querySelector('#shortcuts-close-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  }, { once: true });
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
