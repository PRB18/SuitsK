/**
 * congressionalScreen.js — "Congressional The Bespoke" Atelier Hub
 * REDESIGNED: editorial sidebar layout, bold typography, rich portrait tiles
 */

import { router } from '../router.js';

const MODULES = [
  {
    id: 'client-profile',
    roman: 'I',
    title: 'Client Profile',
    subtitle: 'Personal & contact archive',
    route: '#client-profile',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>`,
  },
  {
    id: 'client-db',
    roman: 'II',
    title: 'Client Database',
    subtitle: 'Full atelier roster',
    route: '#client-db',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v5c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 10v5c0 1.66 4.03 3 9 3s9-1.34 9-3v-5"/>
      <path d="M3 15v4c0 1.66 4.03 3 9 3s9-1.34 9-3v-4"/>
    </svg>`,
  },
  {
    id: 'measurements',
    roman: 'III',
    title: 'Measurements',
    subtitle: 'Style & body data',
    route: '#configurator',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7h18M3 12h18M3 17h18"/>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
    </svg>`,
    chips: ['Style', 'Measurements'],
  },
  {
    id: 'inventory',
    roman: 'IV',
    title: 'Inventory',
    subtitle: 'Fabric, lining & trim',
    route: '#inventory',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4M7 8h2M7 11h5"/>
    </svg>`,
  },
  {
    id: 'schedule',
    roman: 'V',
    title: 'Schedule',
    subtitle: 'Trials & deliveries',
    route: '#schedule',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01"/>
    </svg>`,
  },
  {
    id: 'work-hierarchy',
    roman: 'VI',
    title: 'Work Hierarchy',
    subtitle: 'Roles & task flow',
    route: '#work-hierarchy',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="2" width="6" height="4" rx="1"/>
      <rect x="2" y="18" width="6" height="4" rx="1"/>
      <rect x="9" y="18" width="6" height="4" rx="1"/>
      <rect x="16" y="18" width="6" height="4" rx="1"/>
      <path d="M12 6v5M5 18v-5h14v5"/>
    </svg>`,
  },
  {
    id: 'workshop-db',
    roman: 'VII',
    title: 'Workshop',
    subtitle: 'Craftsmen & Kanban',
    route: '#workshop',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>
    </svg>`,
  },
  {
    id: 'shortcomings',
    roman: 'VIII',
    title: 'Shortcomings',
    subtitle: 'Issue & QA tracking',
    route: '#shortcomings',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
  },
  {
    id: 'dashboard',
    roman: 'IX',
    title: 'B2B Logistics',
    subtitle: 'Vendor & Corporate',
    route: '#dashboard?section=b2b',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>`,
  },
  {
    id: 'status-quo',
    roman: 'X',
    title: 'Status Quo',
    subtitle: 'Live Overview',
    route: '#status-quo',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>`,
  },
];

const IMPLEMENTED = [
  '#dashboard', '#configurator', '#client-profile', '#client-db',
  '#inventory', '#schedule', '#work-hierarchy', '#workshop',
  '#shortcomings', '#status-quo'
];

export function renderCongressionalScreen(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ctb-shell';

  wrapper.innerHTML = `
    <!-- ── Sidebar ───────────────────────────────────── -->
    <aside class="ctb-sidebar">
      <div class="ctb-sidebar-brand">
        <div class="ctb-brand-mark">CTB</div>
        <div>
          <div class="ctb-brand-name">Congressional</div>
          <div class="ctb-brand-tag">The Bespoke</div>
        </div>
      </div>

      <nav class="ctb-sidebar-nav" aria-label="Atelier modules">
        ${MODULES.map(m => `
          <button class="ctb-nav-item" data-route="${m.route}" data-id="${m.id}" id="nav-${m.id}" aria-label="${m.title}">
            <span class="ctb-nav-roman">${m.roman}</span>
            <span class="ctb-nav-label">${m.title}</span>
          </button>
        `).join('')}
      </nav>

      <div class="ctb-sidebar-footer">
        <div class="ctb-vault-dot"></div>
        <span>Vault Secured</span>
      </div>
    </aside>

    <!-- ── Main Content ──────────────────────────────── -->
    <main class="ctb-main-area">

      <!-- Hero -->
      <div class="ctb-hero">
        <div class="ctb-hero-eyebrow">✦ &nbsp; Atelier Management System &nbsp; ✦</div>
        <h1 class="ctb-hero-title"><em>Congressional</em> <span class="ctb-hero-title-plain">The Bespoke</span></h1>
        <p class="ctb-hero-sub">Ten pillars of the craft. Select a module below.</p>
        <div class="ctb-hero-rule">
          <span class="ctb-hero-rule-line"></span>
          <span class="ctb-hero-rule-gem">◆</span>
          <span class="ctb-hero-rule-line"></span>
        </div>
      </div>

      <!-- Status Quo Strip -->
      <div id="status-quo-widget" style="padding: 0 4rem 2rem 4rem;">
        <div class="loading-state">Loading Status Quo...</div>
      </div>

      <!-- Module Grid -->
      <div class="ctb-module-grid">
        ${MODULES.map(m => `
          <button
            class="ctb-tile"
            data-route="${m.route}"
            id="tile-${m.id}"
            aria-label="Open ${m.title}"
          >
            <div class="ctb-tile-roman">${m.roman}</div>
            <div class="ctb-tile-icon-wrap">
              ${m.icon}
            </div>
            <div class="ctb-tile-body">
              <div class="ctb-tile-title">${m.title}</div>
              <div class="ctb-tile-sub">${m.subtitle}</div>
              ${m.chips ? `<div class="ctb-tile-chips">${m.chips.map(c => `<span class="ctb-tile-chip">${c}</span>`).join('')}</div>` : ''}
            </div>
            <div class="ctb-tile-arrow">→</div>
          </button>
        `).join('')}
      </div>

      <footer class="ctb-main-footer">
        <span>Est. in Excellence &nbsp;·&nbsp; Savile Row Standard</span>
      </footer>
    </main>
  `;

  // Wire navigation
  wrapper.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      const route = el.dataset.route;
      const cleanRoute = route.split('?')[0];
      if (IMPLEMENTED.includes(cleanRoute)) {
        router.navigate(route);
      } else {
        _pulse(el);
      }
    });
  });

  container.innerHTML = '';
  container.appendChild(wrapper);

  // Load Status Quo
  loadStatusQuoWidget(wrapper.querySelector('#status-quo-widget'));
}

function _pulse(el) {
  el.classList.add('ctb-soon');
  setTimeout(() => el.classList.remove('ctb-soon'), 1600);
}

import { api } from '../api.js';

async function loadStatusQuoWidget(container) {
  try {
    // Use the exact 3 endpoints specified in the implementation plan (Phase 17)
    const [workshopSummary, upcomingEvents, inventory] = await Promise.all([
      api.getWorkshopSummary().catch(() => ({})),
      api.getUpcomingEvents().catch(() => []),
      api.getInventory().catch(() => []),
    ]);

    // Active projects = all non-delivered stages from workshop summary
    const activeProjects = workshopSummary.total_active ?? 0;

    // Overdue = workshop summary provides this
    const overdueCount = workshopSummary.overdue ?? 0;

    // Upcoming = events in the next 7 days from schedule
    const upcomingCount = Array.isArray(upcomingEvents) ? upcomingEvents.length : 0;

    // Low stock = items at or below their low_stock_alert threshold
    const lowStock = Array.isArray(inventory)
      ? inventory.filter(item => item.low_stock_alert > 0 && item.quantity <= item.low_stock_alert).length
      : 0;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; background: var(--color-surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--color-border);">
        <div style="text-align:center; border-right: 1px solid var(--color-border); cursor:pointer;" id="sqw-active">
          <div style="font-size: 2rem; color: var(--color-primary); font-family: var(--font-serif);">${activeProjects}</div>
          <div class="text-sm text-muted" style="text-transform: uppercase; letter-spacing: 1px; margin-top:0.5rem;">Active Projects</div>
        </div>
        <div style="text-align:center; border-right: 1px solid var(--color-border); cursor:pointer;" id="sqw-overdue">
          <div style="font-size: 2rem; color: ${overdueCount > 0 ? 'var(--color-danger)' : 'var(--color-text)'}; font-family: var(--font-serif);">${overdueCount}</div>
          <div class="text-sm text-muted" style="text-transform: uppercase; letter-spacing: 1px; margin-top:0.5rem;">Overdue Deliveries</div>
        </div>
        <div style="text-align:center; border-right: 1px solid var(--color-border); cursor:pointer;" id="sqw-upcoming">
          <div style="font-size: 2rem; color: ${upcomingCount > 0 ? 'var(--color-primary)' : 'var(--color-text)'}; font-family: var(--font-serif);">${upcomingCount}</div>
          <div class="text-sm text-muted" style="text-transform: uppercase; letter-spacing: 1px; margin-top:0.5rem;">Events This Week</div>
        </div>
        <div style="text-align:center; cursor:pointer;" id="sqw-stock">
          <div style="font-size: 2rem; color: ${lowStock > 0 ? 'var(--color-warning)' : 'var(--color-text)'}; font-family: var(--font-serif);">${lowStock}</div>
          <div class="text-sm text-muted" style="text-transform: uppercase; letter-spacing: 1px; margin-top:0.5rem;">Low Stock Items</div>
        </div>
      </div>
    `;

    // Each tile navigates to its respective screen
    document.getElementById('sqw-active')  ?.addEventListener('click', () => router.navigate('#workshop'));
    document.getElementById('sqw-overdue') ?.addEventListener('click', () => router.navigate('#workshop'));
    document.getElementById('sqw-upcoming')?.addEventListener('click', () => router.navigate('#schedule'));
    document.getElementById('sqw-stock')   ?.addEventListener('click', () => router.navigate('#inventory'));

  } catch (err) {
    container.innerHTML = `<div class="form-error">Could not load status: ${err.message}</div>`;
  }
}
