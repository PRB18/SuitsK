/**
 * trialSheetScreen.js — Combined client trial and visit history.
 */
import { api } from '../api.js';
import { router } from '../router.js';
import { showToast } from '../toast.js';

export async function renderTrialSheetScreen(container) {
  let records = [];
  let activeType = 'all';
  let search = '';

  container.innerHTML = `
    <div class="screen-wrapper trial-sheet-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="trial-sheet-back">← Back</button>
        <div class="screen-header-title"><h1 class="screen-title">Trial Sheet</h1></div>
      </header>
      <div class="cdb-controls">
        <input type="search" id="trial-sheet-search" class="search-input" placeholder="Search client, order, or details">
        <div class="filter-chips" role="group" aria-label="Filter trial sheet">
          <button class="chip chip--active" data-type="all">All</button>
          <button class="chip" data-type="trial">Trials</button>
          <button class="chip" data-type="client_visit">Visits</button>
        </div>
      </div>
      <div class="cdb-table-wrap" style="flex:1; overflow:auto;">
        <table class="cdb-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Client</th><th>Order / Garment</th><th>Details</th><th>Status</th></tr>
          </thead>
          <tbody id="trial-sheet-body">
            <tr><td colspan="6" style="text-align:center; padding:20px;">Loading trial sheet…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('trial-sheet-back').addEventListener('click', () => router.backToHub());
  document.getElementById('trial-sheet-search').addEventListener('input', (event) => {
    search = event.target.value.trim().toLowerCase();
    renderRecords();
  });
  container.querySelectorAll('[data-type]').forEach((button) => {
    button.addEventListener('click', () => {
      activeType = button.dataset.type;
      container.querySelectorAll('[data-type]').forEach((item) => item.classList.toggle('chip--active', item === button));
      renderRecords();
    });
  });

  function renderRecords() {
    const body = document.getElementById('trial-sheet-body');
    const filtered = records.filter((record) => {
      if (activeType !== 'all' && record.event_type !== activeType) return false;
      const text = [
        record.client_name, record.client_ref, record.order_ref,
        record.garment_type, record.title, record.description,
      ].join(' ').toLowerCase();
      return !search || text.includes(search);
    });

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px;">${records.length ? 'No matching trials or visits.' : 'No trials or visits recorded yet.'}</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map((record) => {
      const detail = [record.title, record.description].filter(Boolean).join(' — ');
      const order = [record.order_ref && `Order ${record.order_ref}`, record.garment_type].filter(Boolean).join(' · ');
      return `
        <tr>
          <td>${escapeHtml(formatDate(record.event_date))}${record.event_time ? `<br><span class="text-muted">${escapeHtml(record.event_time)}</span>` : ''}</td>
          <td>${record.event_type === 'trial' ? 'Trial' : 'Client Visit'}</td>
          <td>
            ${record.client_id
              ? `<button class="btn-link" data-client-id="${escapeHtml(record.client_id)}">${escapeHtml(record.client_name || 'View client')}</button>`
              : escapeHtml(record.client_name || '—')}
            ${record.client_ref ? `<br><span class="text-muted">${escapeHtml(record.client_ref)}</span>` : ''}
          </td>
          <td>${escapeHtml(order || 'No order linked')}</td>
          <td>${escapeHtml(detail || '—')}</td>
          <td>${escapeHtml(record.status || 'completed')}</td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('[data-client-id]').forEach((button) => {
      button.addEventListener('click', () => router.navigateTo('#client-profile', { id: button.dataset.clientId }));
    });
  }

  try {
    records = await api.getTrialSheet();
    renderRecords();
  } catch (err) {
    document.getElementById('trial-sheet-body').innerHTML =
      `<tr><td colspan="6" class="error-state" style="text-align:center; padding:24px;">Failed to load Trial Sheet: ${escapeHtml(err.message)}</td></tr>`;
    showToast('Failed to load Trial Sheet: ' + err.message, 'error');
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PK');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
