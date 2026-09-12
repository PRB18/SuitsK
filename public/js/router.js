/**
 * router.js — Hash-based client screen router
 */
import { state } from './state.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.rootElement = null;

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init(rootElement, routes) {
    this.rootElement = rootElement;
    this.routes = routes;

    // Normalize empty hash so navigate('#dashboard') and browser history stay consistent
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

  handleRoute() {
    const rawHash = window.location.hash || '#dashboard';
    const cleanHash = rawHash.split('?')[0];

    // Auth guard: If vault is locked or first run, force #lock
    if (!state.status.unlocked) {
      if (cleanHash !== '#lock') {
        window.location.hash = '#lock';
        return;
      }
    } else {
      // If vault is unlocked, prevent going to #lock
      if (cleanHash === '#lock') {
        window.location.hash = '#congressional';
        return;
      }
    }

    const handler = this.routes[cleanHash] || this.routes['#congressional'];
    if (handler && this.rootElement) {
      this.currentRoute = cleanHash;
      this.rootElement.innerHTML = '';
      handler(this.rootElement);
    }
  }
}

export const router = new Router();
