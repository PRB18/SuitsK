/**
 * workshopScreen.js --- Workshop Kanban board
 *
 * Features:
 *   - Horizontal Kanban: one column per stage
 *   - Project cards with urgency colouring (overdue/due soon/on track)
 *   - "Move to Next Stage" with smart prompts:
 *     --- Trial stage: offer to create a Schedule event
 *     --- Delivered (all garments): offer to mark order complete
 *   - Summary strip (Total / Overdue / Due This Week / Ready)
 *   - Filter by garment type + search by client name
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';

const STAGES = ['pending','cutting','canvas','stitching','buttonholes','pressing','trial','ready','delivered'];
const STAGE_LABELS = {
  pending:'Pending', cutting:'Cutting', canvas:'Canvas', stitching:'Stitching',
  buttonholes:'Buttonholes', pressing:'Pressing', trial:'Trial', ready:'Ready', delivered:'Delivered',
};

export async function renderWorkshopScreen(container) {
  const params      = router.getParams();
  let allProjects   = [];
  let summary       = {};
  let activeFilter  = 'all';
  let searchQuery   = params.search || '';

  container.innerHTML = `
    <div class="screen-wrapper kanban-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="ws-back">--- Back</button>
        <div class="screen-header-title"><h1 class="screen-title">Workshop</h1></div>
        <div class="screen-header-actions"><button class="btn btn-ghost" id="ws-edit-sections">--- Edit Sections</button></div>
      </header>

      <!-- Summary strip -->
      <div class="kanban-summary" id="ws-summary"></div>

      <!-- Controls -->
      <div class="cdb-controls">
        <input type="search" id="ws-search" class="search-input" placeholder="Search by client name..." value="${searchQuery ? searchQuery.replace(/"/g, '&quot;') : ''}">
        <div class="filter-chips">
          <button class="chip chip--active" data-filter="all">All Garments</button>
          <button class="chip" data-filter="overdue">Overdue ----</button>
          <button class="chip" data-filter="due-soon">Due Soon ----</button>
          ${['Jacket','Sherwani','Sadri','Waistcoat','Jodhpuri','Shirts/Kurta','Pant','Safari jkt','Denim'].map(t =>
            `<button class="chip" data-filter="${t}">${t}</button>`).join('')}
        </div>
      </div>

      <!-- Kanban board -->
      <div class="kanban-board" id="kanban-board"></div>
    </div>

    <!-- Stage Move Confirm Modal -->
    <div class="modal-overlay" id="ws-move-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title" id="ws-move-title">Move to Next Stage?</h2>
          <button class="btn-icon modal-close" id="ws-move-close">---</button>
        </div>
        <div class="modal-body" id="ws-move-body"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="ws-move-cancel">Cancel</button>
          <button class="btn btn-primary" id="ws-move-confirm">Move Stage</button>
        </div>
      </div>
    </div>

    <!-- Project Edit Modal -->
    <div class="modal-overlay" id="ws-edit-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="ws-edit-title">
      <div class="modal-panel modal-panel--sm">
        <div class="modal-header">
          <h2 class="modal-title" id="ws-edit-title">Edit Workshop Project</h2>
          <button class="btn-icon modal-close" id="ws-edit-close" aria-label="Close">---</button>
        </div>
        <div class="modal-body">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;">
            <p class="text-muted" id="ws-edit-project-label" style="margin:0;"></p>
            <button class="btn btn-ghost btn-sm" id="ws-edit-view-client">Client Profile ---</button>
          </div>
          <div class="form-field">
            <label for="ws-edit-status">Move to Stage</label>
            <select id="ws-edit-status" class="input">${STAGES.map(stage => `<option value="${stage}">${STAGE_LABELS[stage]}</option>`).join('')}</select>
          </div>
          <div class="form-grid form-grid-2">
            <div class="form-field"><label for="ws-edit-trial">Trial Date</label><input type="date" id="ws-edit-trial" class="input"></div>
            <div class="form-field"><label for="ws-edit-delivery">Delivery Date</label><input type="date" id="ws-edit-delivery" class="input"></div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" id="ws-edit-cancel">Cancel</button><button class="btn btn-primary" id="ws-edit-save">Save Changes</button></div>
      </div>
    </div>

    <!-- Workshop Sections Editor -->
    <div class="modal-overlay" id="ws-sections-modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="ws-sections-title">
      <div class="modal-panel" id="ws-sections-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="ws-sections-title">Edit Workshop Sections</h2>
          <button class="btn-icon modal-close" id="ws-sections-close" aria-label="Close">---</button>
        </div>
        <div class="modal-body" id="ws-sections-body"><div class="table-loading">Loading sections---</div></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="ws-sections-add">+ Add Section</button>
          <div style="flex:1"></div>
          <button class="btn btn-ghost" id="ws-sections-cancel">Cancel</button>
          <button class="btn btn-primary" id="ws-sections-save">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('ws-back').addEventListener('click', () => router.backToHub());
  document.getElementById('ws-edit-sections').addEventListener('click', openSectionsEditor);

  async function load() {
    try {
      [allProjects, summary] = await Promise.all([
        api.getWorkshop(),
        api.getWorkshopSummary(),
      ]);
      renderSummary();
      renderBoard();
    } catch (err) { showToast('Failed to load workshop: ' + err.message, 'error'); }
  }

  function renderSummary() {
    document.getElementById('ws-summary').innerHTML = `
      <div class="kanban-stat"><span class="kanban-stat-val">${summary.total_active || 0}</span><span class="kanban-stat-label">Active Projects</span></div>
      <div class="kanban-stat kanban-stat--danger"><span class="kanban-stat-val">${summary.overdue || 0}</span><span class="kanban-stat-label">Overdue</span></div>
      <div class="kanban-stat kanban-stat--warn"><span class="kanban-stat-val">${countDueSoon()}</span><span class="kanban-stat-label">Due This Week</span></div>
      <div class="kanban-stat kanban-stat--success"><span class="kanban-stat-val">${summary.ready || 0}</span><span class="kanban-stat-label">Ready for Delivery</span></div>
    `;
  }

  function countDueSoon() {
    const today = new Date();
    const week  = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return allProjects.filter(p => {
      if (!p.delivery_date || p.status === 'delivered') return false;
      const d = new Date(p.delivery_date);
      return d >= today && d <= week;
    }).length;
  }

  function getUrgency(deliveryDate) {
    if (!deliveryDate) return 'none';
    const today = new Date(); today.setHours(0,0,0,0);
    const d     = new Date(deliveryDate);
    const diff  = Math.ceil((d - today) / (1000*60*60*24));
    if (diff < 0)  return 'overdue';
    if (diff <= 3) return 'soon';
    return 'ok';
  }

  function renderBoard() {
    const today = new Date().toISOString().split('T')[0];

    const filtered = allProjects.filter(p => {
      if (searchQuery) {
        if (!(p.client_name||'').toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      if (activeFilter === 'overdue') {
        return p.delivery_date && p.delivery_date < today && p.status !== 'delivered';
      }
      if (activeFilter === 'due-soon') {
        if (!p.delivery_date) return false;
        const diff = Math.ceil((new Date(p.delivery_date) - new Date()) / (1000*60*60*24));
        return diff >= 0 && diff <= 7;
      }
      if (activeFilter !== 'all') return p.garment_type === activeFilter;
      return true;
    });

    const board = document.getElementById('kanban-board');
    board.innerHTML = STAGES.filter(s => s !== 'delivered').map(stage => {
      const cards = filtered.filter(p => p.status === stage);
      return `
        <div class="kanban-col">
          <div class="kanban-col-header">
            <span>${STAGE_LABELS[stage]}</span>
            <span class="badge badge--neutral">${cards.length}</span>
          </div>
          <div class="kanban-cards">
            ${cards.map(p => renderCard(p)).join('') || '<div class="kanban-empty">---</div>'}
          </div>
        </div>
      `;
    }).join('');

    board.querySelectorAll('[data-action="move-stage"]').forEach(btn => {
      btn.addEventListener('click', () => openMoveModal(btn.dataset.id, btn.dataset.current));
    });
    board.querySelectorAll('[data-action="view-client"]').forEach(btn => {
      btn.addEventListener('click', () => router.navigateTo('#client-profile', { id: btn.dataset.clientId }));
    });
    board.querySelectorAll('[data-action="edit-project"]').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    // Quick-move: instant stage change from dropdown --- no confirmation needed
    board.querySelectorAll('[data-action="quick-move"]').forEach(sel => {
      sel.addEventListener('change', async () => {
        const projectId = sel.dataset.id;
        const newStage  = sel.value;
        const project   = allProjects.find(p => p.id === projectId);
        if (!project || newStage === project.status) return;
        const origVal = project.status;
        try {
          await api.updateProjectStatus(projectId, newStage);
          showToast(`Moved to ${STAGE_LABELS[newStage]}.`, 'success');
          await load();
        } catch (err) {
          showToast('Move failed: ' + err.message, 'error');
          sel.value = origVal;
        }
      });
    });
  }

  function renderCard(p) {
    const urgency = getUrgency(p.delivery_date);
    const nextStage = STAGES[STAGES.indexOf(p.status) + 1];
    const urgencyClass = urgency === 'overdue' ? 'card-urgent' : urgency === 'soon' ? 'card-warn' : '';
    const dueBadge = p.delivery_date
      ? `<span class="due-badge ${urgency === 'overdue' ? 'badge--danger' : urgency === 'soon' ? 'badge--warning' : 'badge--success'}">
           ${urgency === 'overdue' ? 'Overdue' : urgency === 'soon' ? 'Due soon' : 'On track'}
         </span>`
      : '';
    const stageOptions = STAGES.map(s =>
      `<option value="${s}"${s === p.status ? ' selected' : ''}>${STAGE_LABELS[s]}</option>`
    ).join('');
    return `
      <div class="kanban-card ${urgencyClass}">
        <div class="kanban-card-header">
          <span class="garment-badge">${p.garment_type}</span>
          ${dueBadge}
        </div>
        <div class="kanban-card-client" data-action="view-client" data-client-id="${p.client_id}">
          <strong>${escHtml(p.client_name)}</strong>
          <span class="kanban-card-ref">${escHtml(p.client_ref)} -- ${escHtml(p.order_ref)}</span>
        </div>
        ${p.delivery_date ? `<div class="kanban-card-date">Delivery: ${fmtDate(p.delivery_date)}</div>` : ''}
        <div style="display:flex; gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm kanban-edit-btn" data-action="edit-project" data-id="${p.id}" style="flex:0 0 auto;">Edit</button>
          ${nextStage ? `
          <button class="btn btn-primary btn-sm kanban-move-btn" data-action="move-stage" data-id="${p.id}" data-current="${p.status}" style="flex:1;">
            --- ${STAGE_LABELS[nextStage]}
          </button>` : '<div class="kanban-card-done" style="flex:1;text-align:center;">--- Complete</div>'}
        </div>
        <div style="display:flex; gap:0.3rem; margin-top:0.35rem; align-items:center;">
          <label style="font-size:0.7rem; color:var(--color-text-secondary); white-space:nowrap;" for="ws-jump-${p.id}">Move phase:</label>
          <select id="ws-jump-${p.id}" class="input" style="font-size:0.75rem; padding:2px 6px; height:28px; flex:1;" data-action="quick-move" data-id="${p.id}" aria-label="Move ${escHtml(p.garment_type)} for ${escHtml(p.client_name)} to another phase">${stageOptions}</select>
        </div>
      </div>
    `;
  }

  let editingProject = null;

  function openEditModal(projectId) {
    editingProject = allProjects.find(project => project.id === projectId);
    if (!editingProject) return;
    document.getElementById('ws-edit-project-label').textContent =
      `${editingProject.garment_type} -- ${editingProject.client_name} -- ${editingProject.order_ref}`;
    document.getElementById('ws-edit-status').value   = editingProject.status;
    document.getElementById('ws-edit-trial').value    = editingProject.trial_date || '';
    document.getElementById('ws-edit-delivery').value = editingProject.delivery_date || '';
    // Wire the "Client Profile" button to navigate to this client
    document.getElementById('ws-edit-view-client').onclick = () => {
      closeEditModal();
      router.navigateTo('#client-profile', { id: editingProject.client_id });
    };
    document.getElementById('ws-edit-modal').style.display = 'flex';
  }

  function closeEditModal() {
    editingProject = null;
    document.getElementById('ws-edit-modal').style.display = 'none';
  }

  document.getElementById('ws-edit-close').addEventListener('click', closeEditModal);
  document.getElementById('ws-edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('ws-edit-save').addEventListener('click', async () => {
    if (!editingProject) return;
    const button        = document.getElementById('ws-edit-save');
    const status        = document.getElementById('ws-edit-status').value;
    const trial_date    = document.getElementById('ws-edit-trial').value;
    const delivery_date = document.getElementById('ws-edit-delivery').value;
    button.disabled = true;
    button.textContent = 'Saving...';
    try {
      await Promise.all([
        api.updateProjectStatus(editingProject.id, status),
        api.updateOrder(editingProject.client_id, editingProject.order_id, { trial_date, delivery_date }),
      ]);
      closeEditModal();
      showToast(`Stage updated to "${STAGE_LABELS[status]}".`, 'success');
      await load();
    } catch (err) { showToast('Update failed: ' + err.message, 'error'); }
    finally { button.disabled = false; button.textContent = 'Save Changes'; }
  });

  // Track pending deletions inside the sections editor
  const pendingDeletes = new Set();

  function renderSectionsEditorRow(section) {
    const row = document.createElement('div');
    row.className = 'ws-section-edit-row';
    row.style.cssText = 'display:grid; grid-template-columns:1fr 1fr auto; gap:0.75rem; align-items:end; padding:0.5rem 0; border-bottom:1px solid var(--color-border);';
    if (section.id) row.dataset.sectionId = section.id;
    row.innerHTML = `
      <div class="form-field" style="margin:0">
        <label style="font-size:0.75rem;">Section Name</label>
        <input class="input ws-section-name" value="${escHtml(section.section_name || '')}" placeholder="e.g. Cutting" required>
      </div>
      <div class="form-field" style="margin:0">
        <label style="font-size:0.75rem;">Personnel <span class="optional">(comma separated)</span></label>
        <input class="input ws-section-personnel" value="${escHtml((section.personnel || []).join(', '))}" placeholder="Ali, Raza, Hassan">
      </div>
      <button class="btn-icon btn-icon--danger ws-section-delete-btn" title="Delete section" style="margin-bottom:2px;" aria-label="Delete section">----</button>
    `;
    row.querySelector('.ws-section-delete-btn').addEventListener('click', () => {
      if (section.id) {
        // Existing section --- mark for deletion and fade the row
        pendingDeletes.add(section.id);
        row.style.opacity = '0.35';
        row.querySelectorAll('input').forEach(i => i.disabled = true);
        row.querySelector('.ws-section-delete-btn').textContent = '---';
        row.querySelector('.ws-section-delete-btn').title = 'Undo';
        row.querySelector('.ws-section-delete-btn').onclick = () => {
          pendingDeletes.delete(section.id);
          row.style.opacity = '1';
          row.querySelectorAll('input').forEach(i => i.disabled = false);
          renderSectionsEditorRow._restore(row, section);
        };
      } else {
        // New (unsaved) row --- just remove it
        row.remove();
      }
    });
    return row;
  }
  renderSectionsEditorRow._restore = (row, section) => {
    const btn = row.querySelector('.ws-section-delete-btn');
    btn.textContent = '----';
    btn.title = 'Delete section';
    btn.onclick = null;
    btn.addEventListener('click', () => {
      pendingDeletes.add(section.id);
      row.style.opacity = '0.35';
      row.querySelectorAll('input').forEach(i => i.disabled = true);
    });
  };

  async function openSectionsEditor() {
    const modal = document.getElementById('ws-sections-modal');
    const body = document.getElementById('ws-sections-body');
    pendingDeletes.clear();
    modal.style.display = 'flex';
    body.innerHTML = '<div class="table-loading">Loading sections---</div>';
    try {
      const sections = await api.getHierarchy();
      body.innerHTML = '';
      if (sections.length === 0) {
        body.innerHTML = '<p class="text-muted" style="padding:0.5rem 0;">No sections yet. Click "+ Add Section" to create one.</p>';
      } else {
        sections.forEach(s => body.appendChild(renderSectionsEditorRow(s)));
      }
    } catch (err) {
      body.innerHTML = `<p class="form-error" style="display:block;">Failed to load sections: ${escHtml(err.message)}</p>`;
    }
  }

  function closeSectionsEditor() {
    pendingDeletes.clear();
    document.getElementById('ws-sections-modal').style.display = 'none';
  }

  document.getElementById('ws-sections-close').addEventListener('click', closeSectionsEditor);
  document.getElementById('ws-sections-cancel').addEventListener('click', closeSectionsEditor);

  document.getElementById('ws-sections-add').addEventListener('click', () => {
    const body = document.getElementById('ws-sections-body');
    // Remove empty-state message if present
    const emptyMsg = body.querySelector('p.text-muted');
    if (emptyMsg) emptyMsg.remove();
    body.appendChild(renderSectionsEditorRow({ section_name: '', personnel: [] }));
  });

  document.getElementById('ws-sections-save').addEventListener('click', async () => {
    const button = document.getElementById('ws-sections-save');
    const rows = [...document.querySelectorAll('#ws-sections-body .ws-section-edit-row')];
    button.disabled = true;
    button.textContent = 'Saving---';
    try {
      // 1. Delete marked sections
      if (pendingDeletes.size > 0) {
        await Promise.all([...pendingDeletes].map(id => api.deleteSection(id)));
      }

      // 2. Update or create remaining rows
      const ops = rows
        .filter(row => !pendingDeletes.has(row.dataset.sectionId))
        .flatMap(row => {
          const sectionId = row.dataset.sectionId;  // undefined for new rows
          const name = row.querySelector('.ws-section-name').value.trim();
          const personnel = row.querySelector('.ws-section-personnel').value
            .split(',').map(v => v.trim()).filter(Boolean);
          if (!name) return [];
          if (sectionId) {
            // Existing section --- update
            return [api.updateSection(sectionId, { section_name: name }), api.updatePersonnel(sectionId, personnel)];
          } else {
            // New section --- create then set personnel
            return [api.createSection({ section_name: name }).then(created => api.updatePersonnel(created.id, personnel))];
          }
        });
      await Promise.all(ops);
      closeSectionsEditor();
      showToast('Workshop sections saved.', 'success');
      await load();
    } catch (err) { showToast('Save failed: ' + err.message, 'error'); }
    finally { button.disabled = false; button.textContent = 'Save Changes'; }
  });

  // ------ Move Stage Modal ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  let pendingMoveId = null;
  let pendingNextStage = null;

  function openMoveModal(projectId, currentStage) {
    pendingMoveId   = projectId;
    const nextStage = STAGES[STAGES.indexOf(currentStage) + 1];
    pendingNextStage = nextStage;
    const project   = allProjects.find(p => p.id === projectId);
    const title     = `Move to ${STAGE_LABELS[nextStage]}?`;
    document.getElementById('ws-move-title').textContent = title;

    let extraMsg = '';
    if (nextStage === 'trial') {
      extraMsg = `<div class="modal-tip">---- This garment is moving to Trial. You can create a trial appointment in the Schedule after confirming.</div>`;
    }

    document.getElementById('ws-move-body').innerHTML = `
      <p>Move <strong>${project?.garment_type}</strong> for <strong>${project?.client_name}</strong> to <strong>${STAGE_LABELS[nextStage]}</strong>?</p>
      ${extraMsg}
    `;
    document.getElementById('ws-move-modal').style.display = 'flex';
  }

  document.getElementById('ws-move-close').addEventListener('click',  () => { document.getElementById('ws-move-modal').style.display = 'none'; });
  document.getElementById('ws-move-cancel').addEventListener('click', () => { document.getElementById('ws-move-modal').style.display = 'none'; });

  document.getElementById('ws-move-confirm').addEventListener('click', async () => {
    const btn = document.getElementById('ws-move-confirm');
    btn.disabled = true; btn.textContent = 'Moving---';
    try {
      const result = await api.updateProjectStatus(pendingMoveId, pendingNextStage);
      document.getElementById('ws-move-modal').style.display = 'none';
      showToast(`Moved to ${STAGE_LABELS[pendingNextStage]}.`, 'success');

      // Smart prompts
      if (pendingNextStage === 'trial') {
        if (confirm('Move to Trial noted! Would you like to create a Trial appointment in the Schedule now?')) {
          router.navigate('#schedule');
        }
      }
      if (result.allDelivered) {
        const project = allProjects.find(p => p.id === pendingMoveId);
        if (confirm(`All garments in ${project?.client_name}'s order are now Delivered. Mark the order as Completed?`)) {
          // Find and update the order
          try {
            const clientProfile = await api.getClient(project.client_id);
            const order = clientProfile.orders.find(o => o.id === project.order_id || o.projects?.some(pr => pr.id === pendingMoveId));
            if (order) await api.updateOrder(project.client_id, order.id, { status: 'completed' });
            showToast('Order marked as completed!', 'success');
          } catch(e) { /* non-critical */ }
        }
      }

      await load();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Move Stage'; }
  });

  // ------ Filter chips + Search ------------------------------------------------------------------------------------------------------------------------------------------------------
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      activeFilter = chip.dataset.filter;
      renderBoard();
    });
  });

  let searchTimer;
  document.getElementById('ws-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { searchQuery = e.target.value.trim(); renderBoard(); }, 300);
  });

  await load();
}

function fmtDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-PK',{day:'numeric',month:'short'}); } catch { return d; } }
function escHtml(str) { return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
