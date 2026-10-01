/**
 * statusQuoScreen.js — Status Quo: full-screen overview
 *
 * Three panels:
 *   1. Inventory Status  (all items, sorted: out-of-stock → low → in-stock)
 *   2. Delivery Status   (active projects with delivery dates, overdue first)
 *   3. Logistics Status  (B2B vendor purchases)
 *
 * Also includes: Weekly Atelier Report button + preview modal
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
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-ghost" id="sq-refresh">↻ Refresh</button>
          <button class="btn btn-primary" id="sq-weekly-report" style="display:flex;align-items:center;gap:6px;">
            <span>📥</span> Weekly Report
          </button>
        </div>
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

    <!-- Weekly Report Preview Modal -->
    <div class="modal-overlay" id="wr-modal" style="display:none;" role="dialog" aria-modal="true">
      <div style="
        background: var(--bg-card);
        border-radius: 12px;
        width: 95vw;
        max-width: 1100px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        overflow: hidden;
      ">
        <div style="background:#2C1810;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <div>
            <h2 style="margin:0;color:#C9A84C;font-size:1.3rem;font-weight:700;">📊 Weekly Atelier Report — Preview</h2>
            <p id="wr-date-range" style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:0.85rem;"></p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <button class="btn btn-primary" id="wr-download-btn" style="background:#C9A84C;color:#2C1810;font-weight:700;border:none;">📥 Download Excel</button>
            <button id="wr-close" style="background:rgba(255,255,255,0.1);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
        </div>
        <div id="wr-tabs" style="background:#3a2218;display:flex;gap:0;overflow-x:auto;flex-shrink:0;border-bottom:2px solid #C9A84C;">
          ${['Summary','New Clients & Orders','Active Orders','Deliveries','Issues','Fabric Receipts'].map((t,i) => `
            <button class="wr-tab" data-tab="${i}" style="
              padding:12px 18px;background:${i===0?'#2C1810':'transparent'};
              color:${i===0?'#C9A84C':'rgba(255,255,255,0.6)'};border:none;
              font-size:0.82rem;font-weight:${i===0?700:400};cursor:pointer;white-space:nowrap;
              border-bottom:${i===0?'2px solid #C9A84C':'2px solid transparent'};margin-bottom:-2px;
            ">${t}</button>
          `).join('')}
        </div>
        <div id="wr-body" style="flex:1;overflow-y:auto;padding:20px;">
          <div style="text-align:center;padding:40px;color:var(--text-secondary);">
            <div style="font-size:2rem;margin-bottom:8px;">⏳</div><p>Loading report data…</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('sq-back').addEventListener('click', () => router.backToHub());
  document.getElementById('sq-goto-inv').addEventListener('click', () => router.navigate('#inventory'));
  document.getElementById('sq-goto-ws').addEventListener('click',  () => router.navigate('#workshop'));
  document.getElementById('sq-goto-dash').addEventListener('click',() => router.navigate('#b2b'));
  document.getElementById('sq-refresh').addEventListener('click',  load);

  let b2bData   = [];
  let b2bFilter = 'all';

  // ── Weekly Report Logic ────────────────────────────────────────────────────
  let wrData = null;
  let wrFrom = '';
  let wrTo   = '';

  document.getElementById('sq-weekly-report').addEventListener('click', async () => {
    const modal = document.getElementById('wr-modal');
    modal.style.display     = 'flex';
    modal.style.alignItems  = 'center';
    modal.style.justifyContent = 'center';

    const now  = new Date();
    wrTo   = now.toISOString().slice(0, 10);
    wrFrom = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    document.getElementById('wr-date-range').textContent =
      `Period: ${fmtDateFull(wrFrom)} – ${fmtDateFull(wrTo)}`;

    // Reset tabs
    setActiveTab(0);

    try {
      document.getElementById('wr-body').innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-secondary);">
          <div style="font-size:2rem;margin-bottom:8px;">⏳</div><p>Loading report data…</p>
        </div>`;
      wrData = await api.getWeeklyReportPreview(wrFrom, wrTo);
      renderTab(0);
    } catch (err) {
      document.getElementById('wr-body').innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--color-danger);">
          <p>Failed to load report: ${escHtml(err.message)}</p>
        </div>`;
    }
  });

  document.getElementById('wr-close').addEventListener('click', () => {
    document.getElementById('wr-modal').style.display = 'none';
  });
  document.getElementById('wr-modal').addEventListener('click', (e) => {
    if (e.target.id === 'wr-modal') document.getElementById('wr-modal').style.display = 'none';
  });

  document.getElementById('wr-download-btn').addEventListener('click', () => {
    if (!wrFrom || !wrTo) return;
    const a = document.createElement('a');
    a.href = api.getWeeklyReportUrl(wrFrom, wrTo);
    a.download = `Weekly-Report_${wrTo.replace(/-/g,'')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📥 Downloading Weekly Report…');
  });

  document.getElementById('wr-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.wr-tab');
    if (!btn) return;
    const idx = Number(btn.dataset.tab);
    setActiveTab(idx);
    if (wrData) renderTab(idx);
  });

  function setActiveTab(idx) {
    document.querySelectorAll('.wr-tab').forEach((t, i) => {
      const active = i === idx;
      t.style.background   = active ? '#2C1810' : 'transparent';
      t.style.color        = active ? '#C9A84C' : 'rgba(255,255,255,0.6)';
      t.style.fontWeight   = active ? '700' : '400';
      t.style.borderBottom = active ? '2px solid #C9A84C' : '2px solid transparent';
    });
  }

  function renderTab(idx) {
    const body = document.getElementById('wr-body');
    if (!wrData) return;
    const fns = [renderSummaryTab, renderClientsOrdersTab, renderActiveOrdersTab, renderDeliveriesTab, renderIssuesTab, renderFabricTab];
    body.innerHTML = (fns[idx] || renderSummaryTab)(wrData);
  }

  function renderSummaryTab(d) {
    const stats = [
      ['🧑 New Clients Added',     d.summary.newClients,        '#4CAF50'],
      ['📦 New Orders Created',    d.summary.newOrders,         '#2196F3'],
      ['🚧 Active Orders Total',   d.summary.activeOrders,      '#FF9800'],
      ['✅ Garments Delivered',    d.summary.deliveredGarments, '#4CAF50'],
      ['⚠️ Issues Logged',        d.summary.issuesLogged,      '#f44336'],
      ['🔧 Issues Resolved',      d.summary.issuesResolved,    '#4CAF50'],
      ['🧶 Fabric Receipts',      d.summary.fabricReceived,    '#9C27B0'],
    ];
    return `
      <div style="margin-bottom:20px;">
        <h3 style="color:var(--accent-color);margin:0 0 4px;">Congressional The Bespoke</h3>
        <p style="color:var(--text-secondary);margin:0;font-size:0.9rem;">Weekly Atelier Report — ${fmtDateFull(wrFrom)} to ${fmtDateFull(wrTo)}</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:24px;">
        ${stats.map(([label, val, color]) => `
          <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;border-left:4px solid ${color};">
            <div style="font-size:1.8rem;font-weight:700;color:${color};">${val}</div>
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">${label}</div>
          </div>
        `).join('')}
      </div>
      <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;font-size:0.82rem;color:var(--text-secondary);">
        ℹ️ This preview mirrors what will be in your Excel file. Click <strong>📥 Download Excel</strong> above to get all 6 sheets in a beautifully formatted spreadsheet.
      </div>`;
  }

  function renderClientsOrdersTab(d) {
    return `
      <h3 style="color:var(--accent-color);margin:0 0 12px;">🧑 New Clients This Week (${d.newClients.length})</h3>
      ${wrTable(['Client Ref','Name','Phone','Email','Date Added'],
        d.newClients.map(c => [c.ref||'—', c.name, c.phone||'—', c.email||'—', c.added]))}
      <h3 style="color:var(--accent-color);margin:24px 0 12px;">📦 New Orders This Week (${d.newOrders.length})</h3>
      ${wrTable(['Order Ref','Client','Trial Date','Delivery Date','Status'],
        d.newOrders.map(o => [o.ref, `${o.client} (${o.clientRef||''})`, o.trial||'—', o.delivery||'—', statusBadge(o.status)]))}`;
  }

  function renderActiveOrdersTab(d) {
    return `
      <h3 style="color:var(--accent-color);margin:0 0 12px;">🚧 All Active Orders (${d.activeOrders.length})</h3>
      ${wrTable(['Order Ref','Client','Status','Trial Date','Delivery Date','Fabric Code','Fabric Color','Garments'],
        d.activeOrders.map(o => [o.ref, `${o.client} (${o.clientRef||''})`, statusBadge(o.status), o.trial||'—', o.delivery||'—', o.fabricCode||'—', o.fabricColor||'—', o.garments||0]))}`;
  }

  function renderDeliveriesTab(d) {
    return `
      <h3 style="color:var(--accent-color);margin:0 0 12px;">✅ Garments Delivered This Week (${d.deliveries.length})</h3>
      ${wrTable(['Order Ref','Client','Garment Type','Delivery Date','Notes'],
        d.deliveries.map(p => [p.order, `${p.client} (${p.clientRef||''})`, p.type, p.delivery||'—', p.notes||'—']))}`;
  }

  function renderIssuesTab(d) {
    return `
      <h3 style="color:var(--accent-color);margin:0 0 12px;">⚠️ Issues This Week (${d.issues.length})</h3>
      ${wrTable(['Category','Severity','Status','Client','Description','Logged','Resolved'],
        d.issues.map(s => [s.category, statusBadge(s.severity), statusBadge(s.status), s.client, s.description, s.logged||'—', s.resolved||'—']))}`;
  }

  function renderFabricTab(d) {
    return `
      <h3 style="color:var(--accent-color);margin:0 0 12px;">🧶 Fabric Received This Week (${d.fabricReceipts.length})</h3>
      ${wrTable(['Client Ref','Client','Fabric Code','Fabric Color','Accessories','Order Date','Received'],
        d.fabricReceipts.map(f => [f.clientRef||'—', f.client||'—', f.fabricCode||'—', f.fabricColor||'—', f.accessories||'—', f.orderDate||'—', f.received||'—']))}`;
  }

  function wrTable(headers, rows) {
    if (rows.length === 0) {
      return `<p style="color:var(--text-secondary);font-style:italic;padding:12px 0;">No data for this period.</p>`;
    }
    return `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
          <thead>
            <tr style="background:#2C1810;">
              ${headers.map(h => `<th style="padding:10px 12px;color:#C9A84C;font-weight:700;text-align:left;white-space:nowrap;border:1px solid #3a2218;">${escHtml(String(h))}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, i) => `
              <tr style="background:${i%2===0?'var(--bg-card)':'var(--bg-secondary)'};border-bottom:1px solid var(--border-color);">
                ${row.map(cell => `<td style="padding:9px 12px;color:var(--text-primary);vertical-align:middle;">${cell}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function statusBadge(val) {
    if (!val) return '—';
    const map = {
      high:'badge--danger', medium:'badge--warning', low:'badge--neutral',
      open:'badge--danger', in_progress:'badge--warning', resolved:'badge--success',
      pending:'badge--neutral', delivered:'badge--success', completed:'badge--success',
      cancelled:'badge--danger', ready:'badge--info',
    };
    return `<span class="badge ${map[val]||'badge--neutral'}">${escHtml(String(val).replace(/_/g,' '))}</span>`;
  }

  // ── Status Quo Panel Loaders ───────────────────────────────────────────────
  async function load() {
    const [inv, workshop, b2b] = await Promise.allSettled([
      api.getInventory(),
      api.getWorkshop(),
      api.getB2B(),
    ]);

    const invItems = inv.status === 'fulfilled' ? inv.value : [];
    const sorted   = [...invItems].sort((a,b) => {
      const order = { out_of_stock:0, low_stock:1, in_stock:2 };
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
              <tr class="${item.stock_status==='out_of_stock'?'row-danger':item.stock_status==='low_stock'?'row-warn':''}">
                <td><strong>${escHtml(item.name)}</strong><br><small class="text-muted">${escHtml(item.article_number||'')}</small></td>
                <td>${item.quantity}${item.unit}</td>
                <td>${stockBadge(item.stock_status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    }

    const projects = workshop.status === 'fulfilled' ? workshop.value : [];
    const today    = new Date().toISOString().split('T')[0];
    const withDate = projects
      .filter(p => p.delivery_date && p.status !== 'delivered')
      .sort((a,b) => {
        const ao = a.delivery_date < today, bo = b.delivery_date < today;
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
              const diff = Math.ceil((new Date(p.delivery_date)-new Date())/(1000*60*60*24));
              const urg  = diff<0?'overdue':diff<=3?'soon':'ok';
              const badge= urg==='overdue'?`<span class="badge badge--danger">🔴 ${Math.abs(diff)}d overdue</span>`
                :urg==='soon'?`<span class="badge badge--warning">🟡 ${diff}d</span>`
                :`<span class="badge badge--success">🟢 ${diff}d</span>`;
              return `<tr class="${urg==='overdue'?'row-danger':urg==='soon'?'row-warn':''}">
                <td><strong>${escHtml(p.client_name)}</strong><br><small class="text-muted">${escHtml(p.client_ref)}</small></td>
                <td>${escHtml(p.garment_type)}</td>
                <td>${fmtDate(p.delivery_date)}</td>
                <td>${badge}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }

    b2bData = b2b.status === 'fulfilled' ? b2b.value : [];
    renderLogistics();
  }

  function renderLogistics() {
    const logBody  = document.getElementById('sq-log-body');
    const filtered = b2bData.filter(e => b2bFilter==='all' || e.entry_type===b2bFilter);
    if (filtered.length === 0) {
      logBody.innerHTML = '<p class="text-muted" style="padding:12px;">No B2B entries.</p>';
      return;
    }
    logBody.innerHTML = `
      <table class="sq-table">
        <thead><tr><th>Party</th><th>Type</th><th>Ordered</th><th>Expected</th><th>Status</th></tr></thead>
        <tbody>
          ${filtered.map(e => {
            const party = e.entry_type==='vendor_purchase'?e.vendor_name:e.company_name;
            return `<tr>
              <td><strong>${escHtml(party)}</strong></td>
              <td><span class="badge ${e.entry_type==='vendor_purchase'?'badge--info':'badge--neutral'}">${e.entry_type==='vendor_purchase'?'Vendor':'Corporate'}</span></td>
              <td>${fmtDate(e.order_date)}</td>
              <td>${fmtDate(e.delivery_date)||'—'}</td>
              <td><span class="badge ${e.status==='completed'?'badge--success':e.status==='in_progress'?'badge--info':'badge--neutral'}">${e.status.replace('_',' ')}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

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
function fmtDateFull(d) { if (!d) return ''; try { return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d; } }
function escHtml(str) { return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
