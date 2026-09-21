/**
 * router.js — Hash-based client screen router
 *
 * Supports query parameters in hash: #client-profile?id=UUID
 * The route handler is called with parsed { params } object.
 */
import { state } from './state.js';

class Router {
  constructor() {
    this.routes       = {};
    this.currentRoute = null;
    this.rootElement  = null;

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init(rootElement, routes) {
    this.rootElement = rootElement;
    this.routes      = routes;

    if (!window.location.hash) {
      const initial = state.status.unlocked ? '#congressional' : '#lock';
      history.replaceState(null, '', initial);
    }

    this.handleRoute();
  }

  navigate(hash) {
    const target = hash.startsWith('#') ? hash : `#${hash}`;
    if (window.location.hash === target) {
      this.handleRoute();
    } else {
      window.location.hash = target;
    }
  }

  /** Navigate to a route with query params, e.g. navigateTo('#client-profile', { id: 'abc' }) */
  navigateTo(base, params = {}) {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const target = (base.startsWith('#') ? base : `#${base}`) + qs;
    if (window.location.hash === target) {
      this.handleRoute();
    } else {
      window.location.hash = target;
    }
  }

  /** Parse query params from the hash portion, e.g. #route?id=abc → { id: 'abc' } */
  getParams() {
    const hash = window.location.hash || '';
    const qi   = hash.indexOf('?');
    if (qi === -1) return {};
    try {
      return Object.fromEntries(new URLSearchParams(hash.slice(qi + 1)));
    } catch {
      return {};
    }
  }

  handleRoute() {
    const rawHash  = window.location.hash || '#congressional';
    const qi       = rawHash.indexOf('?');
    const cleanHash = qi === -1 ? rawHash : rawHash.slice(0, qi);

    // Auth guard
    if (!state.status.unlocked) {
      if (cleanHash !== '#lock') { window.location.hash = '#lock'; return; }
    } else {
      if (cleanHash === '#lock') { window.location.hash = '#congressional'; return; }
    }

    // Parse query params and inject client/order context into state
    const params = this.getParams();
    if (params.client_id) state.setCurrentClientId(params.client_id);
    if (params.id && cleanHash === '#client-profile') state.setCurrentClientId(params.id);
    if (params.order_id)  state.setCurrentOrderId(params.order_id);
    if (params.project_id) state.setCurrentProjectId(params.project_id);

    const handler = this.routes[cleanHash] || this.routes['#congressional'];
    if (handler && this.rootElement) {
      this.currentRoute = cleanHash;
      this.rootElement.innerHTML = '';
      handler(this.rootElement);
    }
  }
}

export const router = new Router();
