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
          <div style="position: relative; width: 100%; max-width: 220px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: rgba(201,168,76,0.6); pointer-events: none;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="search" id="active-orders-search" placeholder="Search orders..." style="background: rgba(255,255,255,0.4); border: 1px solid rgba(201,168,76,0.3); border-radius: 4px; font-size: 0.85rem; padding: 0.4rem 0.5rem 0.4rem 2rem; color: var(--text-primary); width: 100%; outline: none; transition: all 0.2s; font-family: inherit;">
          </div>
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
    const [orders, b2bEntries] = await Promise.all([
      api.getActiveOrders(),
      api.getB2B({ work_type: 'b2b' }),
    ]);
    const activeOrders = (orders || []).sort((a, b) => dateKey(a) - dateKey(b));
    const activeB2b = (b2bEntries || [])
      .filter(entry => !['completed', 'cancelled'].includes(entry.status))
      .map(entry => ({
        ...entry,
        customer: entry.company_name || entry.vendor_name || '—',
        client_ref: entry.client_code || '',
        order_ref: 'B2B Entry',
        date: entry.order_date,
        trial_date: '',
        delivery_date: entry.delivered_date || entry.delivery_date,
        notes: [entry.style_product_name, entry.brand_name, entry.notes].filter(Boolean).join(' · '),
        fabric_color: entry.fabric_colour,
        qty: entry.quantity,
        is_b2b: true,
      }))
      .sort((a, b) => dateKey(a) - dateKey(b));
    if (activeOrders.length === 0 && activeB2b.length === 0) {
      container.innerHTML = `
        <div class="empty-vault-card" style="padding: 1.5rem; text-align: center; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card);">
          <div class="empty-icon-wrap" style="width: 40px; height: 40px; margin: 0 auto 0.5rem auto; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(0,0,0,0.05);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #8B6F47)" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 class="empty-title" style="font-size: 1rem; margin-top: 0.5rem; color: var(--text-primary);">All caught up! No active orders right now.</h3>
          <p class="empty-text" style="font-size: 0.85rem; margin-bottom: 0; color: var(--text-secondary);">Start a new order in B2B or from a client profile.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    
    const getBadgeClass = (status, urgency) => {
      if (urgency === 'overdue') return 'badge--danger';
      if (urgency === 'due_soon') return 'badge--warning';
      if (status === 'pending') return 'badge--neutral';
      if (status === 'in_progress') return 'badge--info';
      if (status === 'ready') return 'badge--success';
      return 'badge--neutral';
    };

    const escapeHTML = (str) => String(str || '').replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );

    const createPanel = () => {
      const element = document.createElement('div');
      element.style.background = 'var(--bg-card, #FFFDF7)';
      element.style.border = '1px solid var(--border-color, rgba(201,168,76,0.25))';
      element.style.borderRadius = '6px';
      element.style.overflowX = 'auto';
      element.style.overflowY = 'auto';
      element.style.maxHeight = '350px';
      element.style.boxShadow = '0 2px 8px rgba(44,24,16,0.04)';
      element.className = 'ctb-order-panel-scroll';
      return element;
    };
    
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .ctb-order-row { transition: background-color 0.2s ease, transform 0.1s ease; cursor: pointer; }
      .ctb-order-row:hover { background-color: rgba(201,168,76,0.12); }
      .ctb-order-row:active { background-color: rgba(201,168,76,0.18); }
      .ctb-order-grid { display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr 1.2fr 1fr 1fr 90px 50px 40px; min-width: 1100px; align-items: center; gap: 1rem; }
      .ctb-req-scroll { min-width: 0; max-width: 150px; overflow: hidden; white-space: nowrap; }
      .ctb-req-scroll-text { display: inline-block; min-width: 100%; }
      .ctb-req-scroll.is-overflowing .ctb-req-scroll-text {
        animation: ctb-req-scroll var(--ctb-req-duration, 6s) linear infinite alternate;
      }
      @keyframes ctb-req-scroll {
        from { transform: translateX(0); }
        to { transform: translateX(var(--ctb-req-distance)); }
      }
      @media (prefers-reduced-motion: reduce) {
        .ctb-req-scroll.is-overflowing .ctb-req-scroll-text { animation: none; }
      }
      .ctb-order-header { 
        position: sticky; top: 0; z-index: 2; 
        background: var(--bg-card); 
        border-bottom: 1px solid var(--border-color); 
        padding: 10px 24px; 
        font-size: 0.75rem; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        color: var(--text-secondary); 
        font-weight: 600;
      }
      .ctb-order-panel-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .ctb-order-panel-scroll::-webkit-scrollbar-track { background: transparent; }
      .ctb-order-panel-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 4px; }
      .ctb-order-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.5); }
      #active-orders-search:focus { border-color: var(--accent-color) !important; background: rgba(255,255,255,0.8) !important; box-shadow: 0 0 0 2px rgba(201,168,76,0.1); }
      
      .ctb-order-accordion {
        overflow: hidden;
        border-bottom: 1px solid var(--border-color);
        background: rgba(247, 244, 239, 0.5);
        padding: 0 24px;
        max-height: 0;
        transition: max-height 0.28s ease, padding 0.28s ease;
      }
      .ctb-order-accordion.open {
        max-height: 400px; /* arbitrary max for transition */
        padding: 16px 24px;
        overflow-y: auto;
      }
      .ctb-stage-pill {
        display: inline-block; padding: 4px 10px; font-size: 0.75rem; border-radius: 4px;
        background: #2C1810; border: 1px solid #2C1810; color: #FFFDF7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
      }
      
      .ctb-expand-btn {
        display: flex; align-items: center; justify-content: center;
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(201,168,76,0.15); color: #2C1810;
        font-size: 1.2rem; transition: all 0.2s ease;
      }
      .ctb-order-row:hover .ctb-expand-btn {
        background: rgba(201,168,76,0.3);
      }
    `;
    
    const renderRows = (list, targetPanel, isB2B = false) => {
      targetPanel.innerHTML = '';
      targetPanel.appendChild(styleEl.cloneNode(true));
      
      // Add sticky header
      const header = document.createElement('div');
      header.className = 'ctb-order-grid ctb-order-header';
      header.innerHTML = `
        <div>Client Name</div>
        <div>Order Ref</div>
        <div>Order Date</div>
        <div>Trial Date</div>
        <div>Delivery Date</div>
        <div>Requirements</div>
        <div>Fabric Code</div>
        <div>Fabric Color</div>
        <div>Status</div>
        <div style="text-align:right;">Qty</div>
        <div></div>
      `;
      targetPanel.appendChild(header);

      if (list.length === 0) {
        targetPanel.innerHTML += `<div style="padding: 2rem; text-align: center; font-size: 0.85rem; color: var(--text-secondary);">No orders match your search.</div>`;
        return;
      }
      
      list.forEach((order, index) => {
        const row = document.createElement('div');
        row.id = 'order-row-' + order.id;
        row.className = 'ctb-order-row ctb-order-grid';
        row.setAttribute('role', 'button');
        row.setAttribute('aria-expanded', 'false');
        row.setAttribute('tabindex', '0');
        row.style.padding = '14px 24px';
        row.style.borderBottom = '1px solid var(--border-color, rgba(201,168,76,0.15))';
        
        const dateStr = new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        
        let trialDisplay = '—';
        if (order.trial_date) {
          trialDisplay = new Date(order.trial_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }

        let deadlineDisplay = '—';
        let deadlineColor = 'inherit';
        if (order.delivery_date) {
          deadlineDisplay = new Date(order.delivery_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          if (order.urgency === 'overdue') deadlineColor = '#D0453A';
          else if (order.urgency === 'due_soon') deadlineColor = '#C9881A';
        }
        
        const reqStr = escapeHTML(order.notes);

        row.innerHTML = `
          <div style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(order.customer)}<small style="display:block;font:0.72rem var(--font-sans);color:var(--text-secondary);">${escapeHTML(order.client_ref || '')}</small></div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); font-variant-numeric: tabular-nums;">${escapeHTML(order.order_ref)}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${trialDisplay}</div>
          <div style="font-size: 0.8rem; color: ${deadlineColor}; font-weight: ${order.urgency !== 'on_track' && order.urgency !== 'none' ? '600' : 'normal'};">${deadlineDisplay}</div>
          <div class="ctb-req-scroll" title="${reqStr}" aria-label="Requirements: ${reqStr || 'none'}"><span class="ctb-req-scroll-text">${reqStr || '—'}</span></div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(order.fabric_code || '—')}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(order.fabric_color || '—')}</div>
          <div>
            <span class="vault-status-badge ${getBadgeClass(order.status, order.urgency)}" style="font-size: 0.6rem; text-transform: uppercase; padding: 0.2rem 0.5rem; line-height: 1;">${escapeHTML(order.status.replace('_', ' '))}</span>
          </div>
          <div style="font-size: 0.85rem; text-align: right; color: var(--text-secondary);"><strong style="color: var(--text-primary);">${order.qty}</strong></div>
          <div style="text-align:center;"><div class="ctb-expand-btn chevron">▾</div></div>
        `;
        targetPanel.appendChild(row);
        const reqViewport = row.querySelector('.ctb-req-scroll');
        const reqText = row.querySelector('.ctb-req-scroll-text');
        const reqOverflow = reqText.scrollWidth - reqViewport.clientWidth;
        if (reqOverflow > 1) {
          reqViewport.style.setProperty('--ctb-req-distance', `-${reqOverflow}px`);
          reqViewport.style.setProperty('--ctb-req-duration', `${Math.max(6, reqOverflow / 30)}s`);
          reqViewport.classList.add('is-overflowing');
        }

        // Accordion
        const accordion = document.createElement('div');
        accordion.id = 'accordion-' + order.id;
        accordion.className = 'ctb-order-accordion';
        targetPanel.appendChild(accordion);

        const toggleAccordion = async () => {
          const isExpanded = row.getAttribute('aria-expanded') === 'true';
          if (isExpanded) {
            row.setAttribute('aria-expanded', 'false');
            accordion.classList.remove('open');
            row.querySelector('.chevron').textContent = '▾';
          } else {
            // Close others (optional, maybe keep others open)
            
            row.setAttribute('aria-expanded', 'true');
            row.querySelector('.chevron').textContent = '▴';
            accordion.classList.add('open');
            
            if (!accordion.getAttribute('data-loaded')) {
              if (isB2B || order.is_b2b) {
                accordion.innerHTML = `
                  <div style="font-weight:600;margin-bottom:8px;font-size:0.9rem;">B2B details for ${escapeHTML(order.customer)}</div>
                  <div>Style / Product: ${escapeHTML(order.style_product_name || '—')}</div>
                  <div>Brand: ${escapeHTML(order.brand_name || '—')}</div>
                  <div>Fabric: ${escapeHTML([order.fabric_code, order.fabric_colour].filter(Boolean).join(' / ') || '—')}</div>
                  <div>Quantity: ${escapeHTML(order.quantity || 0)}</div>
                  <div>Notes: ${escapeHTML(order.notes || '—')}</div>
                  <div style="text-align:right;margin-top:8px;"><a href="#b2b-work-progress" class="btn btn-primary btn-sm" style="text-decoration:none;">Open B2B Work in Progress →</a></div>`;
                accordion.setAttribute('data-loaded', 'true');
                return;
              }
              accordion.innerHTML = '<div style="font-size:0.85rem; color:var(--text-secondary);">Loading projects...</div>';
              try {
                const projects = await api.getClientActiveProjects(order.client_id);
                
                let html = `<div style="font-weight:600; margin-bottom:8px; font-size:0.9rem;">Orders for ${escapeHTML(order.customer)} (active only)</div>`;
                if (projects.length === 0) {
                  html += `<div style="font-size:0.85rem; color:var(--text-secondary);">No garments currently in production for this client.</div>`;
                } else {
                  html += `<table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:12px;">
                    <tr style="border-bottom:1px solid rgba(0,0,0,0.05);">
                      <th style="text-align:left; padding:4px;">Garment Type</th>
                      <th style="text-align:left; padding:4px;">Workshop Stage</th>
                      <th style="text-align:left; padding:4px;">Order Ref</th>
                    </tr>
                  `;
                  
                  const STAGES = ['pending', 'cutting', 'making', 'fitting', 'finishing', 'ready'];
                  
                  projects.forEach(p => {
                    html += `
                      <tr style="border-bottom:1px solid rgba(0,0,0,0.05);">
                        <td style="padding:10px 4px; font-weight: 500;">${escapeHTML(p.garment_type)}</td>
                        <td style="padding:10px 4px;"><span class="ctb-stage-pill">${escapeHTML(p.status)}</span></td>
                        <td style="padding:10px 4px; font-family:monospace; color:var(--text-secondary);">${escapeHTML(p.order_ref)}</td>
                      </tr>
                    `;
                  });
                  html += `</table>`;
                }
                
                html += `
                  <div style="text-align:right;">
                    <a href="#workshop?search=${encodeURIComponent(order.customer)}" class="btn btn-primary btn-sm" style="text-decoration:none;">Open in Workshop →</a>
                  </div>
                `;
                accordion.innerHTML = html;
                accordion.setAttribute('data-loaded', 'true');
              } catch (err) {
                accordion.innerHTML = `<div style="color:var(--color-danger); font-size:0.85rem;">Error loading projects.</div>`;
              }
            }
          }
        };

        row.addEventListener('click', toggleAccordion);
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleAccordion();
          }
        });

      });
    };

    container.innerHTML = '';
    const b2cHeading = document.createElement('h3');
    b2cHeading.textContent = `B2C Client Orders (${activeOrders.length})`;
    b2cHeading.style.cssText = 'margin:1rem 0 0.5rem;font-family:var(--font-serif);';
    const b2cPanel = createPanel();
    const b2bHeading = document.createElement('h3');
    b2bHeading.textContent = `B2B Work in Progress (${activeB2b.length})`;
    b2bHeading.style.cssText = 'margin:1.5rem 0 0.5rem;font-family:var(--font-serif);';
    const b2bPanel = createPanel();
    container.append(b2cHeading, b2cPanel, b2bHeading, b2bPanel);
    renderRows(activeOrders, b2cPanel);
    renderRows(activeB2b, b2bPanel, true);

    const searchInput = document.getElementById('active-orders-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filteredB2c = activeOrders.filter(o =>
          (o.customer||'').toLowerCase().includes(q) || 
          (o.order_ref||'').toLowerCase().includes(q) ||
          (o.notes||'').toLowerCase().includes(q)
        );
        const filteredB2b = activeB2b.filter(o =>
          (o.customer||'').toLowerCase().includes(q) ||
          (o.client_ref||'').toLowerCase().includes(q) ||
          (o.notes||'').toLowerCase().includes(q)
        );
        renderRows(filteredB2c, b2cPanel);
        renderRows(filteredB2b, b2bPanel, true);
      });
    }
  } catch (err) {
    container.innerHTML = `
      <div class="form-error" style="display:block;">
        Failed to load active orders: ${String(err.message)}
      </div>
    `;
  }

  function dateKey(order) {
    const date = order.trial_date || order.date || order.order_date || '';
    const time = Date.parse(`${date}T00:00:00`);
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  }
}
