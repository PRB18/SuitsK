/**
 * scheduleScreen.js — Schedule & Universal Calendar Connector screen
 *
 * Features:
 *   - Month-grid calendar (Mon–Sun) with coloured event dots
 *   - Day detail side panel (slides in on click)
 *   - New Event modal with client + project linking
 *   - Calendar sync panel: Connect Google / Apple / Outlook
 *   - Sync Now / Pull Changes / Disconnect
 *   - Conflict resolution banner
 */
import { api }       from '../api.js';
import { showToast } from '../toast.js';
import { router }    from '../router.js';

const EVENT_TYPE_COLORS = {
  trial:        '#4A90E2',   // blue
  delivery:     '#F5A623',   // amber
  client_visit: '#9B59B6',   // purple
  other:        '#7F8C8D',   // grey
};
const EVENT_TYPE_LABELS = {
  trial: 'Trial', delivery: 'Delivery', client_visit: 'Client Visit', other: 'Other',
};

export async function renderScheduleScreen(container) {
  let currentDate  = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear  = currentDate.getFullYear();
  let allEvents    = [];
  let allClients   = [];
  let calStatus    = {};
  let selectedDay  = null;

  container.innerHTML = `
    <div class="screen-wrapper sched-screen">
      <header class="screen-header">
        <button class="btn-icon back-btn" id="sched-back">← Back</button>
        <div class="screen-header-title"><h1 class="screen-title">Schedule</h1></div>
        <div class="screen-header-actions">
          <button class="btn btn-primary" id="sched-new-event">+ New Event</button>
        </div>
      </header>

      <div class="sched-layout">
        <!-- Month grid -->
        <div class="sched-main">
          <div class="sched-month-nav">
            <button class="btn-icon" id="sched-prev">‹</button>
            <h2 class="sched-month-title" id="sched-month-title">—</h2>
            <button class="btn-icon" id="sched-next">›</button>
            <button class="btn btn-ghost btn-sm" id="sched-today">Today</button>
          </div>
          <div class="cal-grid" id="cal-grid"></div>
        </div>

        <!-- Sidebar: day detail + calendar sync -->
        <aside class="sched-sidebar">
          <div class="day-detail-panel" id="day-detail">
            <p class="text-muted" style="padding:16px;">Select a day to view events.</p>
          </div>

          <!-- Calendar sync panel -->
          <div class="cal-sync-panel">
            <div class="cal-sync-header">🔗 Calendar Sync</div>
            <div id="cal-sync-status" class="cal-sync-status">Loading…</div>
            <div class="cal-sync-actions" id="cal-sync-btns"></div>
            <a class="btn-link btn-xs" href="/api/calendar/export.ics" download>↓ Download .ics</a>
          </div>
        </aside>
      </div>
    </div>

    <!-- New / Edit Event Modal -->
    <div class="modal-overlay" id="event-modal" style="display:none;" role="dialog" aria-modal="true">
      <div class="modal-panel">
        <div class="modal-header">
          <h2 class="modal-title" id="event-modal-title">New Event</h2>
          <button class="btn-icon modal-close" id="event-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid form-grid-2">
            <div class="form-field form-field--full">
              <label>Event Type</label>
              <div class="toggle-group">
                <button class="toggle-btn toggle-btn--active" data-etype="trial">Trial</button>
                <button class="toggle-btn" data-etype="delivery">Delivery</button>
                <button class="toggle-btn" data-etype="client_visit">Client Visit</button>
                <button class="toggle-btn" data-etype="other">Other</button>
              </div>
            </div>
            <div class="form-field form-field--full">
              <label for="ev-title">Title <span class="required">*</span></label>
              <input type="text" id="ev-title" class="input" placeholder="e.g. Trial — Ahmed Suit">
            </div>
            <div class="form-field">
              <label for="ev-client">Link to Client</label>
              <select id="ev-client" class="input">
                <option value="">— None —</option>
              </select>
            </div>
            <div class="form-field">
              <label for="ev-project">Link to Project</label>
              <select id="ev-project" class="input" disabled>
                <option value="">— Select client first —</option>
              </select>
            </div>
            <div class="form-field">
              <label for="ev-date">Date <span class="required">*</span></label>
              <input type="date" id="ev-date" class="input">
            </div>
            <div class="form-field">
              <label for="ev-time">Time</label>
              <input type="time" id="ev-time" class="input">
            </div>
            <div class="form-field form-field--full">
              <label for="ev-desc">Description</label>
              <textarea id="ev-desc" class="input textarea" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="ev-cancel">Cancel</button>
          <button class="btn btn-primary" id="ev-save">Create Event</button>
        </div>
      </div>
    </div>

    <!-- Conflict Resolution Banner -->
    <div class="conflict-banner" id="conflict-banner" style="display:none;" role="alert">
      <div class="conflict-banner-header">⚠️ Calendar Sync Conflict</div>
      <div id="conflict-list"></div>
    </div>
  `;

  document.getElementById('sched-back').addEventListener('click', () => router.navigate('#congressional'));

  // ── Load data ──────────────────────────────────────────────────────────────
  async function load() {
    try {
      const [events, clients, status] = await Promise.all([
        api.getSchedule({ month: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}` }),
        api.getClients(),
        api.getCalendarStatus().catch(() => ({ connected: {} })),
      ]);
      allEvents  = events;
      allClients = clients;
      calStatus  = status.connected || {};
      renderCalendar();
      renderCalSyncPanel();
      populateClientDropdown();

      // Auto-pull on page load
      if (Object.keys(calStatus).length > 0) {
        api.pullCalendar().then(result => {
          if (result.conflicts?.length > 0) showConflicts(result.conflicts);
          if (result.pulled > 0) {
            showToast(`${result.pulled} event(s) updated from calendar.`, 'info');
            load();
          }
        }).catch(() => {});
      }
    } catch (err) {
      showToast('Failed to load schedule: ' + err.message, 'error');
    }
  }

  // ── Render calendar grid ───────────────────────────────────────────────────
  function renderCalendar() {
    const title = document.getElementById('sched-month-title');
    title.textContent = new Date(currentYear, currentMonth, 1)
      .toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

    const grid = document.getElementById('cal-grid');
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    const firstDay = new Date(currentYear, currentMonth, 1);
    // Monday-start: JS getDay() 0=Sun → adjust
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    for (let i = 0; i < startDow; i++) html += '<div class="cal-day cal-day--empty"></div>';

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayStr    = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr  = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents= allEvents.filter(e => e.event_date === dateStr);
      const isToday  = dateStr === todayStr;
      const isSelected = dateStr === selectedDay;
      html += `
        <div class="cal-day ${isToday ? 'cal-day--today' : ''} ${isSelected ? 'cal-day--selected' : ''}"
             data-date="${dateStr}" role="button" tabindex="0" aria-label="${d} ${monthName(currentMonth)}">
          <span class="cal-day-num">${d}</span>
          <div class="cal-dots">
            ${dayEvents.map(ev => `<span class="cal-dot" style="background:${EVENT_TYPE_COLORS[ev.event_type]||'#888'}" title="${ev.title}"></span>`).join('')}
          </div>
        </div>
      `;
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.cal-day[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        selectedDay = cell.dataset.date;
        grid.querySelectorAll('.cal-day--selected').forEach(c => c.classList.remove('cal-day--selected'));
        cell.classList.add('cal-day--selected');
        renderDayDetail(selectedDay);
      });
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') cell.click();
      });
    });
  }

  // ── Day detail panel ───────────────────────────────────────────────────────
  function renderDayDetail(dateStr) {
    const panel  = document.getElementById('day-detail');
    const dayEvs = allEvents.filter(e => e.event_date === dateStr);
    const label  = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long' });

    panel.innerHTML = `
      <div class="day-detail-title">${label}</div>
      ${dayEvs.length === 0
        ? '<p class="text-muted" style="padding:8px 0;">No events on this day.</p>'
        : dayEvs.map(ev => `
          <div class="day-event-card" style="border-left:3px solid ${EVENT_TYPE_COLORS[ev.event_type]};">
            <div class="day-event-type">${EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}</div>
            <div class="day-event-title">${escHtml(ev.title)}</div>
            ${ev.client_name ? `<div class="day-event-client">👤 ${escHtml(ev.client_name)}</div>` : ''}
            ${ev.event_time  ? `<div class="day-event-time">🕐 ${ev.event_time}</div>` : ''}
            ${ev.description ? `<div class="day-event-desc">${escHtml(ev.description)}</div>` : ''}
            <div class="day-event-actions">
              <button class="btn-link btn-xs" data-action="edit-event" data-id="${ev.id}">Edit</button>
              <button class="btn-link btn-xs btn-link-danger" data-action="del-event" data-id="${ev.id}">Delete</button>
            </div>
          </div>
        `).join('')
      }
      <button class="btn btn-ghost btn-sm" id="day-add-btn" data-date="${dateStr}" style="margin-top:8px;">+ Add Event</button>
    `;

    panel.querySelectorAll('[data-action="del-event"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this event?')) return;
        try { await api.deleteEvent(btn.dataset.id); showToast('Event deleted.','success'); await load(); }
        catch (err) { showToast('Error: '+err.message,'error'); }
      });
    });
    document.getElementById('day-add-btn').addEventListener('click', e => {
      openEventModal(null, e.target.dataset.date);
    });
  }

  // ── Month navigation ───────────────────────────────────────────────────────
  document.getElementById('sched-prev').addEventListener('click', () => {
    currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    load();
  });
  document.getElementById('sched-next').addEventListener('click', () => {
    currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    load();
  });
  document.getElementById('sched-today').addEventListener('click', () => {
    currentDate  = new Date();
    currentMonth = currentDate.getMonth();
    currentYear  = currentDate.getFullYear();
    load();
  });

  // ── New Event Button ───────────────────────────────────────────────────────
  document.getElementById('sched-new-event').addEventListener('click', () => openEventModal());

  // ── Event Modal ────────────────────────────────────────────────────────────
  let editingEventId = null;
  let activeEventType = 'trial';

  function openEventModal(eventData = null, prefillDate = null) {
    editingEventId = eventData?.id || null;
    const isEdit   = !!editingEventId;
    document.getElementById('event-modal-title').textContent = isEdit ? 'Edit Event' : 'New Event';
    document.getElementById('ev-save').textContent           = isEdit ? 'Save Changes' : 'Create Event';
    setEventType(eventData?.event_type || 'trial');
    document.getElementById('ev-title').value = eventData?.title || '';
    document.getElementById('ev-date').value  = eventData?.event_date || prefillDate || new Date().toISOString().split('T')[0];
    document.getElementById('ev-time').value  = eventData?.event_time || '';
    document.getElementById('ev-desc').value  = eventData?.description || '';
    document.getElementById('ev-client').value  = eventData?.client_id || '';
    document.getElementById('ev-project').value = eventData?.project_id || '';
    document.getElementById('event-modal').style.display = 'flex';
  }

  function setEventType(type) {
    activeEventType = type;
    document.querySelectorAll('[data-etype]').forEach(btn => {
      btn.classList.toggle('toggle-btn--active', btn.dataset.etype === type);
    });
    // Auto-fill title hint
    const title = document.getElementById('ev-title');
    if (!title.value) {
      const clientSel = document.getElementById('ev-client');
      const clientName = clientSel.options[clientSel.selectedIndex]?.text || '';
      if (clientName && clientName !== '— None —')
        title.value = `${EVENT_TYPE_LABELS[type]} — ${clientName}`;
    }
  }

  container.querySelectorAll('[data-etype]').forEach(btn => {
    btn.addEventListener('click', () => setEventType(btn.dataset.etype));
  });

  function populateClientDropdown() {
    const sel = document.getElementById('ev-client');
    sel.innerHTML = `<option value="">— None —</option>` +
      allClients.map(c => `<option value="${c.id}">${escHtml(c.name)} (${escHtml(c.client_ref)})</option>`).join('');
  }

  document.getElementById('ev-client').addEventListener('change', async e => {
    const clientId = e.target.value;
    const projSel  = document.getElementById('ev-project');
    projSel.innerHTML = '<option value="">Loading…</option>';
    projSel.disabled  = !clientId;
    if (!clientId) { projSel.innerHTML = '<option value="">— None —</option>'; return; }
    try {
      const client = await api.getClient(clientId);
      const projects = client.orders.flatMap(o => (o.projects || []).map(p => ({ ...p, order_ref: o.order_ref })));
      projSel.innerHTML = `<option value="">— None —</option>` +
        projects.map(p => `<option value="${p.id}">${escHtml(p.garment_type)} (${escHtml(p.order_ref)})</option>`).join('');
    } catch { projSel.innerHTML = '<option value="">— Error —</option>'; }
  });

  document.getElementById('event-modal-close').addEventListener('click', () => { document.getElementById('event-modal').style.display = 'none'; });
  document.getElementById('ev-cancel').addEventListener('click',          () => { document.getElementById('event-modal').style.display = 'none'; });

  document.getElementById('ev-save').addEventListener('click', async () => {
    const title = document.getElementById('ev-title').value.trim();
    const date  = document.getElementById('ev-date').value;
    if (!title) { showToast('Title is required.','error'); return; }
    if (!date)  { showToast('Date is required.','error');  return; }
    const btn = document.getElementById('ev-save');
    btn.disabled = true;
    const payload = {
      event_type:  activeEventType,
      title,
      event_date:  date,
      event_time:  document.getElementById('ev-time').value,
      description: document.getElementById('ev-desc').value.trim(),
      client_id:   document.getElementById('ev-client').value,
      project_id:  document.getElementById('ev-project').value,
      all_day:     !document.getElementById('ev-time').value ? 1 : 0,
    };
    try {
      if (editingEventId) {
        await api.updateEvent(editingEventId, payload);
        showToast('Event updated.','success');
      } else {
        await api.createEvent(payload);
        showToast('Event created!','success');
      }
      document.getElementById('event-modal').style.display = 'none';
      await load();
      if (selectedDay) renderDayDetail(selectedDay);
    } catch (err) { showToast('Error: '+err.message,'error'); }
    finally { btn.disabled = false; }
  });

  // ── Calendar Sync Panel ────────────────────────────────────────────────────
  function renderCalSyncPanel() {
    const statusEl = document.getElementById('cal-sync-status');
    const btnsEl   = document.getElementById('cal-sync-btns');
    const providers = ['google','apple','outlook'];
    const connected = Object.keys(calStatus);

    statusEl.innerHTML = connected.length === 0
      ? '<span class="text-muted">No calendar connected.</span>'
      : connected.map(p => `<div class="cal-connected-badge">✅ ${p.charAt(0).toUpperCase()+p.slice(1)} Connected</div>`).join('');

    btnsEl.innerHTML = providers.map(p => {
      if (calStatus[p]) {
        return `
          <button class="btn btn-ghost btn-sm" data-cal-action="sync" data-provider="${p}">⟳ Sync Now</button>
          <button class="btn btn-ghost btn-sm" data-cal-action="pull" data-provider="${p}">↓ Pull Changes</button>
          <button class="btn btn-ghost btn-sm btn-link-danger" data-cal-action="disconnect" data-provider="${p}">Disconnect ${p}</button>
        `;
      } else {
        const label = p === 'google' ? '🔵 Google' : p === 'apple' ? '🍎 Apple' : '📅 Outlook';
        return `<button class="btn btn-ghost btn-sm" data-cal-action="connect" data-provider="${p}">Connect ${label}</button>`;
      }
    }).join('');

    btnsEl.querySelectorAll('[data-cal-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action   = btn.dataset.calAction;
        const provider = btn.dataset.provider;
        btn.disabled   = true;
        try {
          if (action === 'connect') {
            const result = await api.connectCalendar(provider);
            if (result.auth_url) {
              // Open OAuth popup
              const popup = window.open(result.auth_url, 'calendar_oauth', 'width=500,height=600');
              const handler = async (e) => {
                if (e.data?.type === 'cal_connected') {
                  window.removeEventListener('message', handler);
                  showToast(`${provider} calendar connected!`,'success');
                  await load();
                }
              };
              window.addEventListener('message', handler);
            } else if (result.ok) {
              showToast(`${provider} connected!`,'success');
              await load();
            } else {
              // For Apple/Outlook: prompt for ICS URL
              const icsUrl = prompt(`Enter your ${provider} calendar .ics subscription URL:`);
              if (icsUrl) {
                await api.connectCalendar(provider, { ics_url: icsUrl });
                showToast(`${provider} connected!`,'success');
                await load();
              }
            }
          } else if (action === 'sync') {
            const result = await api.syncCalendar();
            showToast(`Synced ${result.synced} event(s).`,'success');
          } else if (action === 'pull') {
            const result = await api.pullCalendar();
            if (result.conflicts?.length > 0) showConflicts(result.conflicts);
            showToast(`Pulled ${result.pulled} update(s).`, 'success');
            await load();
          } else if (action === 'disconnect') {
            if (confirm(`Disconnect ${provider} calendar?`)) {
              await api.disconnectCalendar(provider);
              showToast(`${provider} disconnected.`,'success');
              await load();
            }
          }
        } catch (err) { showToast('Error: '+err.message,'error'); }
        finally { btn.disabled = false; }
      });
    });
  }

  // ── Conflict Banner ────────────────────────────────────────────────────────
  function showConflicts(conflicts) {
    const banner = document.getElementById('conflict-banner');
    const list   = document.getElementById('conflict-list');
    banner.style.display = 'block';
    list.innerHTML = conflicts.map(c => `
      <div class="conflict-item">
        <strong>${escHtml(c.local?.title || 'Event')}</strong>
        <div class="conflict-versions">
          <div class="conflict-version conflict-version--local">
            <div class="conflict-version-label">App version</div>
            <div>${escHtml(c.local?.event_date || '')}</div>
            <button class="btn btn-ghost btn-xs" data-keep="local" data-id="${c.local_event_id}">Keep this</button>
          </div>
          <div class="conflict-version conflict-version--remote">
            <div class="conflict-version-label">Calendar version</div>
            <div>${escHtml(c.remote?.event_date || '')}</div>
            <button class="btn btn-primary btn-xs" data-keep="remote" data-id="${c.local_event_id}" data-date="${c.remote?.event_date}" data-title="${escHtml(c.remote?.title||'')}">Use this</button>
          </div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-keep]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.dataset.keep === 'remote') {
          try {
            await api.updateEvent(btn.dataset.id, { title: btn.dataset.title, event_date: btn.dataset.date });
            showToast('Event updated from calendar.','success');
            await load();
          } catch(e) { showToast('Error: '+e.message,'error'); }
        }
        banner.style.display = 'none';
      });
    });
  }

  await load();
}

function monthName(m) { return ['January','February','March','April','May','June','July','August','September','October','November','December'][m]; }
function escHtml(str) { return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
