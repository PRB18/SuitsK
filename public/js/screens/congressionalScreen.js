/**
 * congressionalScreen.js — "Congressional The Bespoke" Atelier Hub
 * Hub content only — persistent sidebar lives in shell.js
 */

import { router } from '../router.js';
import { api } from '../api.js';
import { HUB_MODULES, IMPLEMENTED_ROUTES } from '../navConfig.js';

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

    <!-- Active Orders Section -->
    <div id="active-orders-section" class="active-orders-section" style="margin: 2rem 0; width: 100%;">
      <div class="ctb-hero-sub" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <span style="font-size: 1.1rem; color: var(--text-primary); font-family: var(--font-serif); font-style: italic;">Active Orders</span>
        <a href="#workshop" class="btn btn-ghost btn-sm" style="font-size: 0.75rem;">View Workshop Kanban</a>
      </div>
      <div id="active-orders-container" class="suits-grid" style="margin-top: 1rem;">
        <div class="loading-state">Loading active orders…</div>
      </div>
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
      if (IMPLEMENTED_ROUTES.includes(cleanRoute)) {
        router.navigate(route);
      } else {
        _pulse(el);
      }
    });
  });

  container.innerHTML = '';
  container.appendChild(wrapper);

  loadStatusQuoWidget(wrapper.querySelector('#status-quo-widget'));
  renderActiveOrders(wrapper.querySelector('#active-orders-container'));
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

// ---------------------------------------------------------------------------
// Render Active Orders
// ---------------------------------------------------------------------------
async function renderActiveOrders(container) {
  try {
    const orders = await api.getActiveOrders();
    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="empty-vault-card" style="padding: 1.5rem; text-align: center; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card);">
          <div class="empty-icon-wrap" style="width: 40px; height: 40px; margin: 0 auto 0.5rem auto; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(0,0,0,0.05);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #8B6F47)" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="empty-title" style="font-size: 1rem; margin-top: 0.5rem; color: var(--text-primary);">All caught up! No active orders right now.</h3>
          <p class="empty-text" style="font-size: 0.85rem; margin-bottom: 0; color: var(--text-secondary);">Start a new order in the B2B section or client profile.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
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
      card.style.height = '100%';
      
      const dateStr = new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      
      card.innerHTML = `
        <div class="suit-card-inner" style="padding: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary); font-family: var(--font-serif);">${escapeHTML(order.customer)}</h3>
            <span class="vault-status-badge ${getBadgeClass(order.status)}" style="font-size: 0.65rem; text-transform: uppercase; padding: 0.2rem 0.5rem;">${escapeHTML(order.status.replace('_', ' '))}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
            <strong>Ref:</strong> ${escapeHTML(order.order_ref)} &nbsp;|&nbsp; <strong>Date:</strong> ${dateStr}
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            <div style="flex: 1; text-align: center; background: rgba(0,0,0,0.02); padding: 0.5rem; border-radius: 4px;">
              <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em; margin-bottom: 0.25rem;">Garments</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${order.qty}</div>
            </div>
            <div style="flex: 1; text-align: center; background: rgba(0,0,0,0.02); padding: 0.5rem; border-radius: 4px;">
              <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em; margin-bottom: 0.25rem;">Amount</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">₹${Number(order.amount).toLocaleString()}</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `
      <div class="form-error" style="display:block;">
        Failed to load active orders: ${String(err.message)}
      </div>
    `;
  }
}
