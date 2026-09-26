/**
 * congressionalScreen.js — "Congressional The Bespoke" Atelier Hub
 * Hub content only — persistent sidebar lives in shell.js
 */

import { router } from '../router.js';
import { api } from '../api.js';
import { HUB_MODULES, IMPLEMENTED_ROUTES } from '../navConfig.js';
import { openHubMeasurements } from '../configuratorEntry.js';

export function renderCongressionalScreen(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ctb-hub';

  wrapper.innerHTML = `
    <div class="ctb-hero">
      <div class="ctb-hero-eyebrow">✦ &nbsp; Atelier Management System &nbsp; ✦</div>
      <h1 class="ctb-hero-title"><em>Congressional</em> <span class="ctb-hero-title-plain">The Bespoke</span></h1>
      <p class="ctb-hero-sub">Ten pillars of the craft. Select a module below or use the sidebar anytime.</p>
      <div class="ctb-hero-rule">
        <span class="ctb-hero-rule-line"></span>
        <span class="ctb-hero-rule-gem">◆</span>
        <span class="ctb-hero-rule-line"></span>
      </div>
    </div>

    <div id="status-quo-widget" class="ctb-status-widget">
      <div class="loading-state">Loading Status Quo...</div>
    </div>

    <div class="ctb-module-grid">
      ${HUB_MODULES.map(m => `
        <button
          class="ctb-tile"
          data-route="${m.route}"
          id="tile-${m.id}"
          aria-label="Open ${m.title}"
        >
          <div class="ctb-tile-roman">${m.roman}</div>
          <div class="ctb-tile-icon-wrap">
            ${m.icon || ''}
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
  `;

  wrapper.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      const route = el.dataset.route;
      const cleanRoute = route.split('?')[0];
      if (!IMPLEMENTED_ROUTES.includes(cleanRoute)) {
        _pulse(el);
        return;
      }
      if (cleanRoute === '#configurator') {
        openHubMeasurements({ step: 5 });
        return;
      }
      router.navigate(route);
    });
  });

  container.innerHTML = '';
  container.appendChild(wrapper);

  loadStatusQuoWidget(wrapper.querySelector('#status-quo-widget'));
}

function _pulse(el) {
  el.classList.add('ctb-soon');
  setTimeout(() => el.classList.remove('ctb-soon'), 1600);
}

async function loadStatusQuoWidget(container) {
  try {
    const [workshopSummary, upcomingEvents, inventory] = await Promise.all([
      api.getWorkshopSummary().catch(() => ({})),
      api.getUpcomingEvents().catch(() => []),
      api.getInventory().catch(() => []),
    ]);

    const activeProjects = workshopSummary.total_active ?? 0;
    const overdueCount = workshopSummary.overdue ?? 0;
    const upcomingCount = Array.isArray(upcomingEvents) ? upcomingEvents.length : 0;
    const lowStock = Array.isArray(inventory)
      ? inventory.filter(item => item.low_stock_alert > 0 && item.quantity <= item.low_stock_alert).length
      : 0;

    container.innerHTML = `
      <div class="ctb-sq-strip">
        <div class="ctb-sq-cell" id="sqw-active" role="button" tabindex="0">
          <div class="ctb-sq-val">${activeProjects}</div>
          <div class="ctb-sq-label">Active Projects</div>
        </div>
        <div class="ctb-sq-cell" id="sqw-overdue" role="button" tabindex="0">
          <div class="ctb-sq-val ${overdueCount > 0 ? 'is-danger' : ''}">${overdueCount}</div>
          <div class="ctb-sq-label">Overdue Deliveries</div>
        </div>
        <div class="ctb-sq-cell" id="sqw-upcoming" role="button" tabindex="0">
          <div class="ctb-sq-val ${upcomingCount > 0 ? 'is-accent' : ''}">${upcomingCount}</div>
          <div class="ctb-sq-label">Events This Week</div>
        </div>
        <div class="ctb-sq-cell" id="sqw-stock" role="button" tabindex="0">
          <div class="ctb-sq-val ${lowStock > 0 ? 'is-warn' : ''}">${lowStock}</div>
          <div class="ctb-sq-label">Low Stock Items</div>
        </div>
      </div>
    `;

    const bindNav = (id, route) => {
      const el = container.querySelector('#' + id);
      if (!el) return;
      const go = () => router.navigate(route);
      el.addEventListener('click', go);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    };
    bindNav('sqw-active', '#workshop');
    bindNav('sqw-overdue', '#workshop');
    bindNav('sqw-upcoming', '#schedule');
    bindNav('sqw-stock', '#inventory');

  } catch (err) {
    container.innerHTML = `<div class="form-error">Could not load status: ${err.message}</div>`;
  }
}
