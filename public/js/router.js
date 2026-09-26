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
    this.routes        = {};
    this.currentRoute  = null;
    this.previousRoute = null;  // track where we came FROM for smart Back
    this.rootElement   = null;
    this._rendering    = false;

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
   * Smart back navigation.
   * If the immediately-previous route matches the intended fallback, use the
   * native history.back() so we don't duplicate the entry in history.
   * Otherwise replace the current entry (prevents ping-pong loops).
   */
  back(fallback = '#congressional') {
    const fb = fallback.startsWith('#') ? fallback : `#${fallback}`;
    // Extract the base route from previousRoute (strip query string)
    const prevBase = this.previousRoute
      ? this.previousRoute.split('?')[0]
      : null;
    const fbBase = fb.split('?')[0];
    if (prevBase && prevBase === fbBase) {
      // Previous history entry IS the fallback — use native back so we don't
      // add a second copy of that route to history.
      history.back();
    } else {
      this.navigate(fb, { replace: true });
    }
  }

  /** Returns the previous clean route (base hash without query params). */
  getPreviousRoute() {
    return this.previousRoute ? this.previousRoute.split('?')[0] : null;
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
      if (params.order_id)  state.setCurrentOrderId(params.order_id);
      if (params.project_id) state.setCurrentProjectId(params.project_id);

      if (cleanHash === '#client-profile') {
        state.setCurrentClientId(params.id || null);
      }

      if (cleanHash === '#configurator') {
        if (params.client_id) {
          state.setCurrentClientId(params.client_id);
          // Deep link from profile/workshop — Back returns to that client, not hub.
          if (!state.configuratorReturnHash) {
            state.setConfiguratorReturn(`#client-profile?id=${encodeURIComponent(params.client_id)}`);
          }
        } else if (!params.project_id && !params.order_id) {
          // Bare #configurator (hub Measurements / dashboard). Drop sticky client
          // from a prior profile visit so the sheet is not locked to one person.
          const editingVaultSuit = Boolean(state.currentSuit?.id);
          state.clearClientContext();
          if (!editingVaultSuit) {
            // Leftover draft from a previous client session — start clean.
            // Dashboard already called startNewSuit/editSuit; startNewSuit again is harmless.
            if (!state.currentSuit || state.currentSuit.clientId) {
              state.startNewSuit();
            }
          }
          if (!state.configuratorReturnHash) {
            state.setConfiguratorReturn('#congressional');
          }
        }
      } else if (params.client_id) {
        state.setCurrentClientId(params.client_id);
      }

      const handler = this.routes[cleanHash] || this.routes['#congressional'];
      if (!handler || !this.rootElement) return;

      // Track previous route for smart Back navigation (before updating currentRoute)
      if (this.currentRoute && this.currentRoute !== cleanHash) {
        this.previousRoute = this.currentRoute;
      }
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
