/**
 * shortcomingsScreen.js — Issue Log (Tailoring / Managerial / Client)
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';

const CATEGORIES = ['tailoring','managerial','client'];
const CAT_LABELS = { tailoring:'Tailoring Issues', managerial:'Managerial Issues', client:'Client Issues' };
const SEVERITIES = ['high','medium','low'];
const SEV_BADGE  = { high:'badge--danger', medium:'badge--warning', low:'badge--neutral' };
const STATUSES   = ['open','in_progress','resolved'];
const STAT_LABELS = { open:'Open', in_progress:'In Progress', resolved:'Resolved' };

export async function renderShortcomingsScreen(container) {
  let allIssues  = [];
  let clients    = [];
  let activeTab  = 'tailoring';
  let activeStat = 'all';
  let stats      = {};

  container.innerHTML = `
    <div class="screen-wrapper shortc-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="sc-back">← Back</button>
        <div class="screen-header-title"><h1 class="screen-title">Shortcomings</h1></div>
        <div class="screen-header-actions">
          <button class="btn btn-primary" id="sc-new-btn">+ Log Issue</button>
        </div>
      </header>

      <!-- Stats strip -->
      <div class="shortc-stats" id="sc-stats"></div>

      <!-- Category tabs -->
      <div class="tab-bar" id="sc-tabs">
        ${CATEGORIES.map(c => `<button class="tab-btn ${c === activeTab ? 'tab-btn--active' : ''}" data-cat="${c}">${CAT_LABELS[c]}</button>`).join('')}
      </div>

      <!-- Status filter -->
      <div class="filter-chips" id="sc-status-chips">
        <button class="chip chip--active" data-status="all">All</button>
        <button class="chip" data-status="open">Open</button>
        <button class="chip" data-status="in_progress">In Progress</button>
        <button class="chip" data-status="resolved">Resolved</button>
      </div>

      <!-- Issues list -->
      <div class="shortc-list" id="sc-list">
        <div class="table-loading">Loading…</div>
      </div>
    </div>

    <!-- Log / Edit Issue Modal -->
    <div class="modal-overlay" id="sc-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="sc-modal-title">Log Issue</h2>
          <button class="btn-icon modal-close" id="sc-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-field">
              <label>Severity</label>
              <div class="toggle-group">
                <button class="toggle-btn toggle-btn--danger"  data-sev="high">High</button>
                <button class="toggle-btn toggle-btn--active toggle-btn--warn" data-sev="medium">Medium</button>
                <button class="toggle-btn" data-sev="low">Low</button>
              </div>
            </div>
            <div class="form-field">
              <label for="sc-f-cat">Category</label>
              <select id="sc-f-cat" class="input">
                ${CATEGORIES.map(c => `<option value="${c}">${CAT_LABELS[c]}</option>`).join('')}
              </select>
            </div>
            <div class="form-field form-field--full">
              <label for="sc-f-title">Title <span class="required">*</span></label>
              <input type="text" id="sc-f-title" class="input" placeholder="Brief description of the issue">
            </div>
            <div class="form-field form-field--full">
              <label for="sc-f-desc">Description</label>
              <textarea id="sc-f-desc" class="input textarea" rows="3" placeholder="Detailed explanation…"></textarea>
            </div>
            <div class="form-field">
              <label for="sc-f-client">Link to Client (optional)</label>
              <select id="sc-f-client" class="input">
                <option value="">— None —</option>
              </select>
            </div>
            <div class="form-field">
              <label for="sc-f-project">Link to Project (optional)</label>
              <select id="sc-f-project" class="input" disabled>
                <option value="">— Select client first —</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="sc-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="sc-modal-save">Log Issue</button>
        </div>
      </div>
    </div>

    <!-- Resolve Issue Modal -->
    <div class="modal-overlay" id="sc-resolve-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title">Resolve Issue</h2>
          <button class="btn-icon modal-close" id="sc-res-close">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-subtitle" id="sc-res-issue-title"></p>
          <div class="form-field">
            <label for="sc-res-note">Resolution Note <span class="required">*</span></label>
            <textarea id="sc-res-note" class="input textarea" rows="3" placeholder="How was this issue resolved?"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="sc-res-cancel">Cancel</button>
          <button class="btn btn-success" id="sc-res-confirm">Mark Resolved</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('sc-back').addEventListener('click', () => router.navigate('#congressional'));

  async function load() {
    try {
      [allIssues, clients, stats] = await Promise.all([
        api.getShortcomings(),
        api.getClients(),
        api.getShortcomingStats(),
      ]);
      renderStats();
      renderList();
      populateClientDropdown();
    } catch (err) { showToast('Failed to load: ' + err.message, 'error'); }
  }

  function renderStats() {
    document.getElementById('sc-stats').innerHTML = `
      <div class="shortc-stat shortc-stat--open"><span class="shortc-stat-val">${stats.open||0}</span><span>Open</span></div>
      <div class="shortc-stat shortc-stat--progress"><span class="shortc-stat-val">${stats.in_progress||0}</span><span>In Progress</span></div>
      <div class="shortc-stat shortc-stat--resolved"><span class="shortc-stat-val">${stats.resolved||0}</span><span>Resolved</span></div>
    `;
  }

  function renderList() {
    const list = document.getElementById('sc-list');
    const filtered = allIssues.filter(i => {
      if (i.category !== activeTab) return false;
      if (activeStat !== 'all' && i.status !== activeStat) return false;
      return true;
    });

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><p class="text-muted">No ${activeStat !== 'all' ? STAT_LABELS[activeStat] + ' ' : ''}${CAT_LABELS[activeTab]} found.</p></div>`;
      return;
    }

    list.innerHTML = filtered.map(issue => `
      <div class="shortc-card ${issue.status === 'resolved' ? 'shortc-card--resolved' : ''}">
        <div class="shortc-card-header">
          <span class="badge ${SEV_BADGE[issue.severity]}">${issue.severity.toUpperCase()}</span>
          <span class="badge ${issue.status === 'open' ? 'badge--danger' : issue.status === 'in_progress' ? 'badge--warning' : 'badge--success'}">
            ${STAT_LABELS[issue.status]}
          </span>
          <span class="shortc-date text-muted">${fmtDate(issue.created_at)}</span>
        </div>
        <div class="shortc-title ${issue.status === 'resolved' ? 'shortc-title--resolved' : ''}">
          ${escHtml(issue.title)}
        </div>
        ${issue.description ? `<div class="shortc-desc">${escHtml(issue.description)}</div>` : ''}
        ${issue.client_name ? `<div class="shortc-client">👤 ${escHtml(issue.client_name)} (${escHtml(issue.client_ref||'')})</div>` : ''}
        ${issue.status === 'resolved' ? `
          <div class="shortc-resolution">
            ✓ Resolved ${fmtDate(issue.resolved_at)}: ${escHtml(issue.resolved_note)}
          </div>` : ''}
        <div class="shortc-actions">
          ${issue.status !== 'resolved' ? `
            ${issue.status === 'open' ? `<button class="btn-link btn-xs" data-action="in-progress" data-id="${issue.id}">Mark In Progress</button>` : ''}
            <button class="btn-link btn-xs btn-link-success" data-action="resolve" data-id="${issue.id}">✓ Resolve</button>
          ` : ''}
          <button class="btn-link btn-xs btn-link-danger" data-action="delete" data-id="${issue.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-action]').forEach(btn => {
      const id    = btn.dataset.id;
      const issue = allIssues.find(i => i.id === id);
      if (btn.dataset.action === 'in-progress') {
        btn.addEventListener('click', async () => {
          try { await api.updateShortcoming(id, { status: 'in_progress' }); await load(); }
          catch (err) { showToast('Error: '+err.message,'error'); }
        });
      } else if (btn.dataset.action === 'resolve') {
        btn.addEventListener('click', () => openResolveModal(issue));
      } else if (btn.dataset.action === 'delete') {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this issue?')) return;
          try { await api.deleteShortcoming(id); allIssues = allIssues.filter(i=>i.id!==id); renderList(); stats[issue.status] = Math.max(0,(stats[issue.status]||0)-1); renderStats(); }
          catch (err) { showToast('Error: '+err.message,'error'); }
        });
      }
    });
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn--active'));
      btn.classList.add('tab-btn--active');
      activeTab = btn.dataset.cat;
      document.getElementById('sc-f-cat').value = activeTab;
      renderList();
    });
  });

  // ── Status filter ──────────────────────────────────────────────────────────
  container.querySelectorAll('.chip[data-status]').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip[data-status]').forEach(c=>c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      activeStat = chip.dataset.status;
      renderList();
    });
  });

  // ── Log Issue Modal ────────────────────────────────────────────────────────
  let activeSeverity = 'medium';
  document.getElementById('sc-new-btn').addEventListener('click', () => {
    document.getElementById('sc-f-title').value = '';
    document.getElementById('sc-f-desc').value  = '';
    document.getElementById('sc-f-cat').value   = activeTab;
    activeSeverity = 'medium';
    setActiveSeverity('medium');
    document.getElementById('sc-modal').style.display = 'flex';
  });
  document.getElementById('sc-modal-close').addEventListener('click',  () => { document.getElementById('sc-modal').style.display = 'none'; });
  document.getElementById('sc-modal-cancel').addEventListener('click', () => { document.getElementById('sc-modal').style.display = 'none'; });

  function setActiveSeverity(sev) {
    activeSeverity = sev;
    container.querySelectorAll('[data-sev]').forEach(b => {
      b.classList.remove('toggle-btn--active','toggle-btn--danger','toggle-btn--warn');
      if (b.dataset.sev === sev) {
        b.classList.add('toggle-btn--active');
        if (sev === 'high')   b.classList.add('toggle-btn--danger');
        if (sev === 'medium') b.classList.add('toggle-btn--warn');
      }
    });
  }
  container.querySelectorAll('[data-sev]').forEach(btn => btn.addEventListener('click', () => setActiveSeverity(btn.dataset.sev)));

  function populateClientDropdown() {
    ['sc-f-client'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = `<option value="">— None —</option>` +
        clients.map(c => `<option value="${c.id}">${escHtml(c.name)} (${escHtml(c.client_ref)})</option>`).join('');
    });
  }

  document.getElementById('sc-f-client').addEventListener('change', async e => {
    const projSel = document.getElementById('sc-f-project');
    if (!e.target.value) { projSel.innerHTML = '<option value="">— None —</option>'; projSel.disabled = true; return; }
    projSel.innerHTML = '<option value="">Loading…</option>'; projSel.disabled = false;
    try {
      const c = await api.getClient(e.target.value);
      const projects = c.orders.flatMap(o => (o.projects||[]).map(p => ({...p, order_ref: o.order_ref})));
      projSel.innerHTML = `<option value="">— None —</option>` +
        projects.map(p => `<option value="${p.id}">${escHtml(p.garment_type)} (${escHtml(p.order_ref)})</option>`).join('');
    } catch { projSel.innerHTML = '<option value="">— Error —</option>'; }
  });

  document.getElementById('sc-modal-save').addEventListener('click', async () => {
    const title = document.getElementById('sc-f-title').value.trim();
    if (!title) { showToast('Title is required.','error'); return; }
    const btn = document.getElementById('sc-modal-save');
    btn.disabled = true; btn.textContent = 'Logging…';
    try {
      const issue = await api.createShortcoming({
        category:    document.getElementById('sc-f-cat').value,
        severity:    activeSeverity,
        title,
        description: document.getElementById('sc-f-desc').value.trim(),
        client_id:   document.getElementById('sc-f-client').value,
        project_id:  document.getElementById('sc-f-project').value,
      });
      allIssues.unshift(issue);
      document.getElementById('sc-modal').style.display = 'none';
      showToast('Issue logged.','success');
      stats.open = (stats.open || 0) + 1;
      renderStats(); renderList();
    } catch (err) { showToast('Error: '+err.message,'error'); }
    finally { btn.disabled = false; btn.textContent = 'Log Issue'; }
  });

  // ── Resolve Modal ──────────────────────────────────────────────────────────
  let resolveTargetId = null;
  function openResolveModal(issue) {
    resolveTargetId = issue.id;
    document.getElementById('sc-res-issue-title').textContent = `Resolving: "${issue.title}"`;
    document.getElementById('sc-res-note').value = '';
    document.getElementById('sc-resolve-modal').style.display = 'flex';
    document.getElementById('sc-res-note').focus();
  }
  document.getElementById('sc-res-close').addEventListener('click',  () => { document.getElementById('sc-resolve-modal').style.display = 'none'; });
  document.getElementById('sc-res-cancel').addEventListener('click', () => { document.getElementById('sc-resolve-modal').style.display = 'none'; });
  document.getElementById('sc-res-confirm').addEventListener('click', async () => {
    const note = document.getElementById('sc-res-note').value.trim();
    if (!note) { showToast('Resolution note is required.','error'); return; }
    const btn = document.getElementById('sc-res-confirm');
    btn.disabled = true;
    try {
      const updated = await api.resolveShortcoming(resolveTargetId, note);
      const idx = allIssues.findIndex(i => i.id === resolveTargetId);
      if (idx !== -1) allIssues[idx] = updated;
      document.getElementById('sc-resolve-modal').style.display = 'none';
      showToast('Issue resolved!','success');
      stats.resolved = (stats.resolved||0) + 1; stats.open = Math.max(0,(stats.open||0)-1);
      renderStats(); renderList();
    } catch (err) { showToast('Error: '+err.message,'error'); }
    finally { btn.disabled = false; }
  });

  await load();
}

function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}); } catch { return d; } }
function escHtml(str) { return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
