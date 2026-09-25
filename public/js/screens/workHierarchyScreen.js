/**
 * workHierarchyScreen.js — Workshop Section & Personnel Management
 *
 * Features:
 *   - Org-chart style section cards pre-seeded with standard sections
 *   - Rename sections inline
 *   - Add / remove personnel per section
 *   - Drag-to-reorder sections
 *   - Add / delete sections
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';

export async function renderWorkHierarchyScreen(container) {
  let sections = [];

  container.innerHTML = `
    <div class="screen-wrapper hier-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="hier-back">← Back</button>
        <div class="screen-header-title">
          <h1 class="screen-title">Work Hierarchy</h1>
          <span class="badge badge--neutral">Sections & Personnel</span>
        </div>
        <div class="screen-header-actions">
          <button class="btn btn-primary" id="hier-add-section">+ Add Section</button>
        </div>
      </header>
      <p class="screen-subtitle">Drag sections to reorder. Click a section name to rename. Add personnel by typing a name and pressing Enter.</p>
      <div class="hier-grid" id="hier-grid"></div>
    </div>
  `;

  document.getElementById('hier-back').addEventListener('click', () => router.backToHub());
  document.getElementById('hier-add-section').addEventListener('click', addSection);

  async function load() {
    try {
      sections = await api.getHierarchy();
      renderGrid();
    } catch (err) { showToast('Failed to load hierarchy: ' + err.message, 'error'); }
  }

  function renderGrid() {
    const grid = document.getElementById('hier-grid');
    if (sections.length === 0) {
      grid.innerHTML = `<p class="text-muted">No sections yet. Click "+ Add Section" to create one.</p>`;
      return;
    }
    grid.innerHTML = sections.map((sec, idx) => `
      <div class="hier-card" data-id="${sec.id}" data-idx="${idx}" draggable="true">
        <div class="hier-card-header">
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <span class="hier-section-name" data-id="${sec.id}" contenteditable="true" spellcheck="false">${escHtml(sec.section_name)}</span>
          <button class="btn-icon hier-edit-section" data-id="${sec.id}" title="Edit section name" aria-label="Edit section name">✎</button>
          <button class="btn-icon btn-icon--danger hier-del-section" data-id="${sec.id}" title="Delete section">🗑</button>
        </div>
        <div class="hier-personnel-list" data-section-id="${sec.id}">
          ${(sec.personnel || []).map(name => `
            <div class="hier-person-chip">
              <span>${escHtml(name)}</span>
              <button class="hier-remove-person" data-section-id="${sec.id}" data-name="${escHtml(name)}" aria-label="Remove ${escHtml(name)}">✕</button>
            </div>
          `).join('')}
        </div>
        <div class="hier-add-person">
          <input type="text" class="input input-sm hier-person-input" data-section-id="${sec.id}"
            placeholder="Add person… (press Enter)" aria-label="Add person to ${escHtml(sec.section_name)}">
        </div>
      </div>
    `).join('');

    // ── Drag-and-drop reorder ──────────────────────────────────────────────
    let dragSrcIdx = null;
    grid.querySelectorAll('.hier-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        dragSrcIdx = parseInt(card.dataset.idx);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; card.classList.add('drag-over'); });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', async e => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const destIdx = parseInt(card.dataset.idx);
        if (dragSrcIdx === null || dragSrcIdx === destIdx) return;
        // Reorder locally
        const moved = sections.splice(dragSrcIdx, 1)[0];
        sections.splice(destIdx, 0, moved);
        renderGrid();
        // Persist all new sort_orders
        try {
          await Promise.all(sections.map((s, i) => api.updateSection(s.id, { sort_order: i })));
        } catch (err) { showToast('Reorder save failed: ' + err.message, 'error'); await load(); }
      });
    });

    // ── Inline rename ──────────────────────────────────────────────────────
    grid.querySelectorAll('.hier-section-name').forEach(el => {
      el.addEventListener('blur', async () => {
        const id   = el.dataset.id;
        const name = el.textContent.trim();
        if (!name) { await load(); return; }
        const sec = sections.find(s => s.id === id);
        if (sec && sec.section_name !== name) {
          try { await api.updateSection(id, { section_name: name }); sec.section_name = name; }
          catch (err) { showToast('Rename failed: ' + err.message, 'error'); await load(); }
        }
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    });

    // ── Add person (Enter key) ─────────────────────────────────────────────
    grid.querySelectorAll('.hier-person-input').forEach(input => {
      input.addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const name      = input.value.trim();
        const sectionId = input.dataset.sectionId;
        if (!name) return;
        const sec = sections.find(s => s.id === sectionId);
        if (!sec) return;
        if (sec.personnel.includes(name)) { showToast(`${name} is already in this section.`,'warning'); return; }
        const updated = [...sec.personnel, name];
        try {
          await api.updatePersonnel(sectionId, updated);
          sec.personnel = updated;
          renderGrid();
        } catch (err) { showToast('Failed: ' + err.message, 'error'); }
      });
    });

    grid.querySelectorAll('.hier-edit-section').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = grid.querySelector(`.hier-section-name[data-id="${btn.dataset.id}"]`);
        if (!name) return;
        name.focus();
        const range = document.createRange();
        range.selectNodeContents(name);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
    });

    // ── Remove person ──────────────────────────────────────────────────────
    grid.querySelectorAll('.hier-remove-person').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sectionId = btn.dataset.sectionId;
        const name      = btn.dataset.name;
        const sec       = sections.find(s => s.id === sectionId);
        if (!sec) return;
        const updated = sec.personnel.filter(n => n !== name);
        try {
          await api.updatePersonnel(sectionId, updated);
          sec.personnel = updated;
          renderGrid();
        } catch (err) { showToast('Failed: ' + err.message, 'error'); }
      });
    });

    // ── Delete section ─────────────────────────────────────────────────────
    grid.querySelectorAll('.hier-del-section').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id  = btn.dataset.id;
        const sec = sections.find(s => s.id === id);
        if (!confirm(`Delete section "${sec?.section_name}"? This cannot be undone.`)) return;
        try {
          await api.deleteSection(id);
          sections = sections.filter(s => s.id !== id);
          renderGrid();
          showToast('Section deleted.','success');
        } catch (err) { showToast('Delete failed: ' + err.message, 'error'); }
      });
    });
  }

  async function addSection() {
    const name = prompt('New section name:');
    if (!name?.trim()) return;
    try {
      const sec = await api.createSection({ section_name: name.trim() });
      sections.push({ ...sec, personnel: [] });
      renderGrid();
      showToast(`Section "${name}" added.`, 'success');
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
  }

  await load();
}

function escHtml(str) { return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
