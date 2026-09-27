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
      <div class="ctb-hero-sub" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 1rem;">
        <span style="font-size: 1.1rem; color: var(--text-primary); font-family: var(--font-serif); font-style: italic; white-space: nowrap;">Active Orders</span>
        <div style="flex: 1; display: flex; justify-content: flex-end; align-items: center; gap: 1rem; min-width: 250px;">
          <input type="search" id="active-orders-search" placeholder="Search orders..." style="background: transparent; border: none; border-bottom: 1px solid var(--border-color); font-size: 0.85rem; padding: 0.2rem 0.5rem; color: var(--text-primary); width: 100%; max-width: 200px; outline: none; transition: border-color 0.2s; font-family: inherit;">
          <a href="#workshop" class="btn btn-ghost btn-sm" style="font-size: 0.75rem; white-space: nowrap;">View Workshop Kanban</a>
        </div>
      </div>
      <div id="active-orders-container" style="margin-top: 1rem;">
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

    // Create the outer panel
    const panel = document.createElement('div');
    panel.style.background = 'var(--bg-card, #FFFDF7)';
    panel.style.border = '1px solid var(--border-color, rgba(201,168,76,0.25))';
    panel.style.borderRadius = '6px';
    panel.style.overflowX = 'hidden';
    panel.style.overflowY = 'auto';
    panel.style.maxHeight = '210px'; // Approx 3 rows max
    panel.style.boxShadow = '0 2px 8px rgba(44,24,16,0.04)';
    panel.className = 'ctb-order-panel-scroll';
    
    // Add custom style for hover effect, responsive grid, and custom scrollbar
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .ctb-order-row { transition: background-color 0.2s ease; }
      .ctb-order-row:hover { background-color: rgba(201,168,76,0.06); }
      .ctb-order-grid { display: grid; grid-template-columns: 2fr 1.5fr 1fr 110px 80px 100px; align-items: center; gap: 1rem; }
      .ctb-order-panel-scroll::-webkit-scrollbar { width: 6px; }
      .ctb-order-panel-scroll::-webkit-scrollbar-track { background: transparent; }
      .ctb-order-panel-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 4px; }
      .ctb-order-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.5); }
      #active-orders-search:focus { border-bottom-color: var(--accent-color) !important; }
      @media (max-width: 900px) {
         .ctb-order-grid { grid-template-columns: 1fr auto; gap: 0.75rem; }
         .ctb-hide-mobile { display: none !important; }
      }
    `;
    
    const renderRows = (list) => {
      panel.innerHTML = '';
      panel.appendChild(styleEl);
      if (list.length === 0) {
        panel.innerHTML += `<div style="padding: 2rem; text-align: center; font-size: 0.85rem; color: var(--text-secondary);">No orders match your search.</div>`;
        return;
      }
      
      list.forEach((order, index) => {
        const row = document.createElement('a');
        row.href = '#workshop?search=' + encodeURIComponent(order.customer);
        row.className = 'ctb-order-row ctb-order-grid';
        row.style.textDecoration = 'none';
        row.style.color = 'inherit';
        row.style.padding = '14px 24px';
        
        if (index < list.length - 1) {
          row.style.borderBottom = '1px solid var(--border-color, rgba(201,168,76,0.15))';
        }
        
        const dateStr = new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        
        row.innerHTML = `
          <div style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(order.customer)}</div>
          <div class="ctb-hide-mobile" style="font-size: 0.8rem; color: var(--text-secondary); font-variant-numeric: tabular-nums;">${escapeHTML(order.order_ref)}</div>
          <div class="ctb-hide-mobile" style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</div>
          <div>
            <span class="vault-status-badge ${getBadgeClass(order.status)}" style="font-size: 0.6rem; text-transform: uppercase; padding: 0.2rem 0.5rem; line-height: 1;">${escapeHTML(order.status.replace('_', ' '))}</span>
          </div>
          <div class="ctb-hide-mobile" style="font-size: 0.85rem; text-align: right; color: var(--text-secondary);"><strong style="color: var(--text-primary);">${order.qty}</strong> items</div>
          <div style="font-size: 0.95rem; font-weight: 600; text-align: right; color: var(--text-primary);">₹${Number(order.amount).toLocaleString()}</div>
        `;
        panel.appendChild(row);
      });
    };

    renderRows(orders);
    container.innerHTML = '';
    container.appendChild(panel);

    const searchInput = document.getElementById('active-orders-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = orders.filter(o => 
          (o.customer||'').toLowerCase().includes(q) || 
          (o.order_ref||'').toLowerCase().includes(q)
        );
        renderRows(filtered);
      });
    }
  } catch (err) {
    container.innerHTML = `
      <div class="form-error" style="display:block;">
        Failed to load active orders: ${String(err.message)}
      </div>
    `;
  }
}
