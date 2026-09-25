/**
 * router.js — Hash-based client screen router
 *
 * Supports query parameters in hash: #client-profile?id=UUID
 * The route handler is called with parsed { params } object.
 *
 * Auth redirects and "back to hub" use history.replaceState so the browser
 * back button cannot ping-pong between two hashes (classic SPA loop).
 */
import { state } from './state.js';
import { ensureShell, teardownShell, setActiveNav } from './shell.js';

class Router {
  constructor() {
    this.routes       = {};
    this.currentRoute = null;
    this.rootElement  = null;
    this._rendering   = false;

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

  /**
   * @param {string} hash
   * @param {{ replace?: boolean }} [opts]
   */
  navigate(hash, opts = {}) {
    const target = hash.startsWith('#') ? hash : `#${hash}`;
    const replace = !!opts.replace;

    if (window.location.hash === target) {
      this.handleRoute();
      return;
    }

    if (replace) {
      history.replaceState(null, '', target);
      this.handleRoute();
    } else {
      window.location.hash = target;
    }
  }

  /** Navigate to a route with query params, e.g. navigateTo('#client-profile', { id: 'abc' }) */
  navigateTo(base, params = {}, opts = {}) {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const target = (base.startsWith('#') ? base : `#${base}`) + qs;
    this.navigate(target, opts);
  }

  /**
   * Leave the current screen without stacking hub in history.
   * Prefer replace so browser Back cannot bounce between the same two pages.
   */
  backToHub() {
    this.navigate('#congressional', { replace: true });
  }

  /**
   * Leave nested screens without stacking history.
   * Always replace — pairing history.back() with navigate() was the ping-pong loop.
   */
  back(fallback = '#congressional') {
    const fb = fallback.startsWith('#') ? fallback : `#${fallback}`;
    this.navigate(fb, { replace: true });
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
    if (this._rendering) return;
    this._rendering = true;

    try {
      let rawHash   = window.location.hash || '#congressional';
      let qi        = rawHash.indexOf('?');
      let cleanHash = qi === -1 ? rawHash : rawHash.slice(0, qi);

      // Auth guard — always replace (never push) to prevent lock↔hub loops
      if (!state.status.unlocked) {
        if (cleanHash !== '#lock') {
          history.replaceState(null, '', '#lock');
          cleanHash = '#lock';
        }
      } else if (cleanHash === '#lock') {
        history.replaceState(null, '', '#congressional');
        cleanHash = '#congressional';
      }

      // Parse query params and inject client/order context into state
      const params = this.getParams();
      if (params.client_id) state.setCurrentClientId(params.client_id);
      if (cleanHash === '#client-profile') { state.setCurrentClientId(params.id || null); }
      if (params.order_id)  state.setCurrentOrderId(params.order_id);
      if (params.project_id) state.setCurrentProjectId(params.project_id);

      const handler = this.routes[cleanHash] || this.routes['#congressional'];
      if (!handler || !this.rootElement) return;

      this.currentRoute = cleanHash;

      // Lock: full-bleed, no sidebar. Unlocked: persistent shell, swap main only.
      if (cleanHash === '#lock') {
        teardownShell(this.rootElement);
        handler(this.rootElement);
        return;
      }

      const main = ensureShell(this.rootElement);
      main.innerHTML = '';
      setActiveNav(cleanHash);
      handler(main);
      // Focus main for a11y without scrolling the page harshly
      if (typeof main.focus === 'function') {
        try { main.focus({ preventScroll: true }); } catch { /* ignore */ }
      }
    } finally {
      this._rendering = false;
    }
  }
}

export const router = new Router();
