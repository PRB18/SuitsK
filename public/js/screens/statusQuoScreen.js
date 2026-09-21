/**
 * statusQuoScreen.js — Status Quo: full-screen overview
 *
 * Three panels:
 *   1. Inventory Status  (all items, sorted: out-of-stock → low → in-stock)
 *   2. Delivery Status   (active projects with delivery dates, overdue first)
 *   3. Logistics Status  (B2B vendor purchases)
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';

export async function renderStatusQuoScreen(container) {
  container.innerHTML = `
    <div class="screen-wrapper sq-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="sq-back">← Back</button>
        <div class="screen-header-title">
          <h1 class="screen-title">Status Quo</h1>
          <span class="badge badge--neutral">Live Overview</span>
        </div>
        <button class="btn btn-ghost" id="sq-refresh">↻ Refresh</button>
      </header>

      <div class="sq-grid">
        <!-- Panel 1: Inventory -->
        <section class="sq-panel">
          <div class="sq-panel-header">
            <h2>📦 Inventory Status</h2>
            <button class="btn-link btn-xs" id="sq-goto-inv">View All →</button>
          </div>
          <div id="sq-inv-body"><div class="table-loading">Loading…</div></div>
        </section>

        <!-- Panel 2: Delivery -->
        <section class="sq-panel">
          <div class="sq-panel-header">
            <h2>🚚 Delivery Status</h2>
            <button class="btn-link btn-xs" id="sq-goto-ws">View Workshop →</button>
          </div>
          <div id="sq-del-body"><div class="table-loading">Loading…</div></div>
        </section>

        <!-- Panel 3: Logistics / B2B -->
        <section class="sq-panel">
          <div class="sq-panel-header">
            <h2>📋 Logistics Status</h2>
            <button class="btn-link btn-xs" id="sq-goto-dash">View B2B →</button>
          </div>
          <div class="filter-chips" id="sq-logistics-filter">
            <button class="chip chip--active" data-filter="all">All</button>
            <button class="chip" data-filter="vendor_purchase">Vendor Orders</button>
            <button class="chip" data-filter="corporate_order">Corporate Orders</button>
          </div>
          <div id="sq-log-body"><div class="table-loading">Loading…</div></div>
        </section>
      </div>
    </div>
  `;

  document.getElementById('sq-back').addEventListener('click', () => router.navigate('#congressional'));
  document.getElementById('sq-goto-inv').addEventListener('click', () => router.navigate('#inventory'));
  document.getElementById('sq-goto-ws').addEventListener('click',  () => router.navigate('#workshop'));
  document.getElementById('sq-goto-dash').addEventListener('click',() => router.navigate('#dashboard'));
  document.getElementById('sq-refresh').addEventListener('click',  load);

  let b2bData   = [];
  let b2bFilter = 'all';

  async function load() {
    const [inv, workshop, b2b] = await Promise.allSettled([
      api.getInventory(),
      api.getWorkshop(),
      api.getB2B(),
    ]);

    // ── Inventory Panel ──────────────────────────────────────────────────────
    const invItems = inv.status === 'fulfilled' ? inv.value : [];
    const sorted   = [...invItems].sort((a,b) => {
      const order = { out_of_stock: 0, low_stock: 1, in_stock: 2 };
      return (order[a.stock_status]||3) - (order[b.stock_status]||3);
    });
    const invBody = document.getElementById('sq-inv-body');
    if (sorted.length === 0) {
      invBody.innerHTML = '<p class="text-muted" style="padding:12px;">No inventory items.</p>';
    } else {
      invBody.innerHTML = `
        <table class="sq-table">
          <thead><tr><th>Item</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>
            ${sorted.map(item => `
              <tr class="${item.stock_status === 'out_of_stock' ? 'row-danger' : item.stock_status === 'low_stock' ? 'row-warn' : ''}">
                <td><strong>${escHtml(item.name)}</strong><br><small class="text-muted">${escHtml(item.article_number||'')}</small></td>
                <td>${item.quantity}${item.unit}</td>
                <td>${stockBadge(item.stock_status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // ── Delivery Panel ───────────────────────────────────────────────────────
    const projects = workshop.status === 'fulfilled' ? workshop.value : [];
    const today    = new Date().toISOString().split('T')[0];
    const withDate = projects
      .filter(p => p.delivery_date && p.status !== 'delivered')
      .sort((a,b) => {
        // Overdue first, then by date
        const ao = a.delivery_date < today;
        const bo = b.delivery_date < today;
        if (ao !== bo) return ao ? -1 : 1;
        return a.delivery_date.localeCompare(b.delivery_date);
      });

    const delBody = document.getElementById('sq-del-body');
    if (withDate.length === 0) {
      delBody.innerHTML = '<p class="text-muted" style="padding:12px;">No active deliveries.</p>';
    } else {
      delBody.innerHTML = `
        <table class="sq-table">
          <thead><tr><th>Client</th><th>Garment</th><th>Delivery</th><th>Days</th></tr></thead>
          <tbody>
            ${withDate.map(p => {
              const diff  = Math.ceil((new Date(p.delivery_date) - new Date()) / (1000*60*60*24));
              const urg   = diff < 0 ? 'overdue' : diff <= 3 ? 'soon' : 'ok';
              const badge = urg === 'overdue'
                ? `<span class="badge badge--danger">🔴 ${Math.abs(diff)}d overdue</span>`
                : urg === 'soon'
                ? `<span class="badge badge--warning">🟡 ${diff}d</span>`
                : `<span class="badge badge--success">🟢 ${diff}d</span>`;
              return `
                <tr class="${urg === 'overdue' ? 'row-danger' : urg === 'soon' ? 'row-warn' : ''}">
                  <td><strong>${escHtml(p.client_name)}</strong><br><small class="text-muted">${escHtml(p.client_ref)}</small></td>
                  <td>${escHtml(p.garment_type)}</td>
                  <td>${fmtDate(p.delivery_date)}</td>
                  <td>${badge}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // ── Logistics Panel ──────────────────────────────────────────────────────
    b2bData = b2b.status === 'fulfilled' ? b2b.value : [];
    renderLogistics();
  }

  function renderLogistics() {
    const logBody = document.getElementById('sq-log-body');
    const filtered = b2bData.filter(e => b2bFilter === 'all' || e.entry_type === b2bFilter);
    if (filtered.length === 0) {
      logBody.innerHTML = '<p class="text-muted" style="padding:12px;">No B2B entries.</p>';
      return;
    }
    logBody.innerHTML = `
      <table class="sq-table">
        <thead><tr><th>Party</th><th>Type</th><th>Ordered</th><th>Expected</th><th>Status</th></tr></thead>
        <tbody>
          ${filtered.map(e => {
            const party = e.entry_type === 'vendor_purchase' ? e.vendor_name : e.company_name;
            const typeBadge = `<span class="badge ${e.entry_type === 'vendor_purchase' ? 'badge--info' : 'badge--neutral'}">${e.entry_type === 'vendor_purchase' ? 'Vendor' : 'Corporate'}</span>`;
            const statusBadge = `<span class="badge ${e.status === 'completed' ? 'badge--success' : e.status === 'in_progress' ? 'badge--info' : 'badge--neutral'}">${e.status.replace('_',' ')}</span>`;
            return `
              <tr>
                <td><strong>${escHtml(party)}</strong></td>
                <td>${typeBadge}</td>
                <td>${fmtDate(e.order_date)}</td>
                <td>${fmtDate(e.delivery_date)||'—'}</td>
                <td>${statusBadge}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // Logistics filter chips
  container.querySelectorAll('#sq-logistics-filter .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#sq-logistics-filter .chip').forEach(c=>c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      b2bFilter = chip.dataset.filter;
      renderLogistics();
    });
  });

  await load();
}

function stockBadge(status) {
  const map = { in_stock:['badge--success','In Stock'], low_stock:['badge--warning','Low Stock'], out_of_stock:['badge--danger','Out of Stock'] };
  const [cls, label] = map[status] || ['badge--neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}
function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}); } catch { return d; } }
function escHtml(str) { return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
