/**
 * api.js — Thin API client for Krishna Suits backend
 * All requests are same-origin to http://127.0.0.1:3737
 */

async function request(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth endpoints
  async getStatus() {
    return request('/api/auth/status');
  },

  async setup(password) {
    return request('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async unlock(password) {
    return request('/api/auth/unlock', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async lock() {
    return request('/api/auth/lock', {
      method: 'POST',
    });
  },

  // Suit CRUD endpoints
  async getSuits() {
    return request('/api/suits');
  },

  async getSuit(id) {
    return request(`/api/suits/${encodeURIComponent(id)}`);
  },

  async createSuit({ name, notes = '', data = {} }) {
    return request('/api/suits', {
      method: 'POST',
      body: JSON.stringify({ name, notes, data }),
    });
  },

  async updateSuit(id, { name, notes, data }) {
    return request(`/api/suits/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ name, notes, data }),
    });
  },

  async duplicateSuit(id, name) {
    return request(`/api/suits/${encodeURIComponent(id)}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteSuit(id) {
    return request(`/api/suits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
