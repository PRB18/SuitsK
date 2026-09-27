/**
 * api.js — Thin API client for Krishna Suits backend
 *
 * Covers all endpoints:
 *   Auth, Suits (existing), Clients, Orders, Projects,
 *   Inventory, Schedule, Calendar, Workshop/Hierarchy,
 *   Shortcomings, B2B
 */

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin', // Ensure session cookies are sent
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data   = isJson ? await response.json() : null;

  if (!response.ok) {
    const error   = new Error(data?.error || `Request failed with status ${response.status}`);
    error.status  = response.status;
    error.data    = data;
    throw error;
  }

  return data;
}

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  async getStatus()         { return request('/api/auth/status'); },
  async setup(password)     { return request('/api/auth/setup',  { method: 'POST', body: JSON.stringify({ password }) }); },
  async unlock(password)    { return request('/api/auth/unlock', { method: 'POST', body: JSON.stringify({ password }) }); },
  async lock()              { return request('/api/auth/lock',   { method: 'POST' }); },
  async backupVault()       { return request('/api/auth/backup', { method: 'POST' }); },

  // ── Suits (existing configurator) ────────────────────────────────────────
  async getSuits(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/suits${qs ? '?' + qs : ''}`);
  },
  async getSuit(id)                 { return request(`/api/suits/${encodeURIComponent(id)}`); },
  async createSuit({ name, notes = '', data = {}, client_id = '', clientId = '' }) {
    return request('/api/suits', { method: 'POST', body: JSON.stringify({ name, notes, data, client_id: client_id || clientId || '' }) });
  },
  async updateSuit(id, { name, notes, data, client_id, clientId }) {
    const body = { name, notes, data };
    if (client_id !== undefined || clientId !== undefined) body.client_id = client_id || clientId || '';
    return request(`/api/suits/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  async duplicateSuit(id, name) {
    return request(`/api/suits/${encodeURIComponent(id)}/duplicate`, { method: 'POST', body: JSON.stringify({ name }) });
  },
  async deleteSuit(id) {
    return request(`/api/suits/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // ── Clients ───────────────────────────────────────────────────────────────
  async getClients()        { return request('/api/clients'); },
  async getClient(id)       { return request(`/api/clients/${encodeURIComponent(id)}`); },
  async createClient(data)  { return request('/api/clients', { method: 'POST', body: JSON.stringify(data) }); },
  async updateClient(id, data) {
    return request(`/api/clients/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteClient(id) {
    return request(`/api/clients/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async getClientMeasurements(id) { return request(`/api/clients/${encodeURIComponent(id)}/measurements`); },
  async updateClientMeasurements(id, data) {
    return request(`/api/clients/${encodeURIComponent(id)}/measurements`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async addClientVisit(id, data) {
    return request(`/api/clients/${encodeURIComponent(id)}/visits`, { method: 'POST', body: JSON.stringify(data) });
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  async getActiveOrders()   { return request('/api/active-orders'); },
  async getOrders(clientId) {
    return request(`/api/clients/${encodeURIComponent(clientId)}/orders`);
  },
  async createOrder(clientId, data) {
    return request(`/api/clients/${encodeURIComponent(clientId)}/orders`, { method: 'POST', body: JSON.stringify(data) });
  },
  async updateOrder(clientId, orderId, data) {
    return request(`/api/clients/${encodeURIComponent(clientId)}/orders/${encodeURIComponent(orderId)}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // ── Projects (garments within orders) ────────────────────────────────────
  async addProject(clientId, orderId, data) {
    return request(`/api/clients/${encodeURIComponent(clientId)}/orders/${encodeURIComponent(orderId)}/projects`, { method: 'POST', body: JSON.stringify(data) });
  },
  async updateProject(projectId, data) {
    return request(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async updateProjectStatus(projectId, status) {
    return request(`/api/projects/${encodeURIComponent(projectId)}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  },
  async deleteProject(projectId) {
    return request(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  async getInventory()      { return request('/api/inventory'); },
  async getInventoryItem(id){ return request(`/api/inventory/${encodeURIComponent(id)}`); },
  async createInventoryItem(data) {
    return request('/api/inventory', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateInventoryItem(id, data) {
    return request(`/api/inventory/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteInventoryItem(id, force = false) {
    return request(`/api/inventory/${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify({ force }) });
  },
  async transactInventory(id, { type, quantity, note = '', project_id = '', client_id = '' }) {
    return request(`/api/inventory/${encodeURIComponent(id)}/transact`, {
      method: 'POST', body: JSON.stringify({ type, quantity, note, project_id, client_id }),
    });
  },
  async getInventoryTransactions(id) {
    return request(`/api/inventory/${encodeURIComponent(id)}/transactions`);
  },

  // ── Schedule Events ───────────────────────────────────────────────────────
  async getSchedule(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/schedule${qs ? '?' + qs : ''}`);
  },
  async getUpcomingEvents() { return request('/api/schedule/upcoming'); },
  async createEvent(data)   { return request('/api/schedule', { method: 'POST', body: JSON.stringify(data) }); },
  async updateEvent(id, data) {
    return request(`/api/schedule/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteEvent(id) {
    return request(`/api/schedule/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // ── Calendar Connector ────────────────────────────────────────────────────
  async getCalendarStatus() { return request('/api/calendar/status'); },
  async connectCalendar(provider, extra = {}) {
    return request('/api/calendar/connect', { method: 'POST', body: JSON.stringify({ provider, ...extra }) });
  },
  async syncCalendar()       { return request('/api/calendar/sync', { method: 'POST' }); },
  async pullCalendar()       { return request('/api/calendar/pull', { method: 'POST' }); },
  async disconnectCalendar(provider) {
    return request(`/api/calendar/disconnect?provider=${encodeURIComponent(provider)}`, { method: 'DELETE' });
  },
  getCalendarExportUrl() { return '/api/calendar/export.ics'; },

  // ── Work Hierarchy ────────────────────────────────────────────────────────
  async getHierarchy()      { return request('/api/hierarchy'); },
  async createSection(data) { return request('/api/hierarchy', { method: 'POST', body: JSON.stringify(data) }); },
  async updateSection(id, data) {
    return request(`/api/hierarchy/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async updatePersonnel(id, personnel) {
    return request(`/api/hierarchy/${encodeURIComponent(id)}/personnel`, { method: 'PUT', body: JSON.stringify({ personnel }) });
  },
  async deleteSection(id) {
    return request(`/api/hierarchy/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // ── Workshop Kanban ───────────────────────────────────────────────────────
  async getWorkshop()        { return request('/api/workshop'); },
  async getWorkshopSummary() { return request('/api/workshop/summary'); },

  // ── Shortcomings ──────────────────────────────────────────────────────────
  async getShortcomings(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/shortcomings${qs ? '?' + qs : ''}`);
  },
  async getShortcomingStats() { return request('/api/shortcomings/stats'); },
  async createShortcoming(data) {
    return request('/api/shortcomings', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateShortcoming(id, data) {
    return request(`/api/shortcomings/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async resolveShortcoming(id, resolved_note) {
    return request(`/api/shortcomings/${encodeURIComponent(id)}/resolve`, { method: 'PUT', body: JSON.stringify({ resolved_note }) });
  },
  async deleteShortcoming(id) {
    return request(`/api/shortcomings/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // ── B2B ───────────────────────────────────────────────────────────────────
  async getB2B(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/b2b${qs ? '?' + qs : ''}`);
  },
  async createB2BEntry(data) {
    return request('/api/b2b', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateB2BEntry(id, data) {
    return request(`/api/b2b/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteB2BEntry(id) {
    return request(`/api/b2b/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
