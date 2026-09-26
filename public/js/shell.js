/**
 * shell.js — Persistent atelier shell (sidebar + main).
 *
 * Survives route changes so the sidebar is not rebuilt on every navigate.
 * Lock screen tears the shell down for a full-bleed unlock UI.
 *
 * Navigation callbacks are injected via configureShell() to avoid a
 * circular import with router.js.
 */
import {
  NAV_MODULES,
  IMPLEMENTED_ROUTES,
  routeToNavId,
} from './navConfig.js';
import { state } from './state.js';

let shellEl = null;
let mainEl  = null;
let bound   = false;
let navigate = (hash) => { window.location.hash = hash; };
let onLockVault = async () => {};

export function configureShell(opts = {}) {
  if (typeof opts.navigate === 'function') navigate = opts.navigate;
  if (typeof opts.onLockVault === 'function') onLockVault = opts.onLockVault;
}

export function ensureShell(rootElement) {
  if (shellEl && mainEl && rootElement.contains(shellEl)) {
    return mainEl;
  }

  rootElement.innerHTML = '';
  shellEl = document.createElement('div');
  shellEl.className = 'ctb-shell';
  shellEl.innerHTML = `
    <aside class="ctb-sidebar" aria-label="Atelier navigation">
      <button type="button" class="ctb-sidebar-brand" id="shell-brand-home" aria-label="Go to Atelier Hub">
        <div class="ctb-brand-mark">CTB</div>
        <div>
          <div class="ctb-brand-name">Congressional</div>
          <div class="ctb-brand-tag">The Bespoke</div>
        </div>
      </button>

      <nav class="ctb-sidebar-nav" aria-label="Atelier modules">
        ${NAV_MODULES.map((m) => `
          <button type="button" class="ctb-nav-item" data-route="${m.route}" data-id="${m.id}" id="nav-${m.id}" aria-label="${m.title}">
            <span class="ctb-nav-roman">${m.roman}</span>
            <span class="ctb-nav-label">${m.title}</span>
          </button>
        `).join('')}
      </nav>

      <div class="ctb-sidebar-footer">
        <button type="button" class="ctb-lock-btn" id="shell-lock-vault" aria-label="Lock vault">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Lock Vault
        </button>
        <div class="ctb-vault-status">
          <div class="ctb-vault-dot"></div>
          <span>Vault Secured</span>
        </div>
      </div>
    </aside>

    <div id="shell-main" class="ctb-shell-main" role="main" tabindex="-1"></div>
  `;

  rootElement.appendChild(shellEl);
  mainEl = shellEl.querySelector('#shell-main');
  bindShellOnce(shellEl);
  return mainEl;
}

export function teardownShell(rootElement) {
  shellEl = null;
  mainEl  = null;
  bound   = false;
  if (rootElement) rootElement.innerHTML = '';
}

export function setActiveNav(cleanHash) {
  if (!shellEl) return;
  const activeId = routeToNavId(cleanHash);
  shellEl.querySelectorAll('.ctb-nav-item').forEach((btn) => {
    const isActive = btn.dataset.id === activeId;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  shellEl.classList.toggle('ctb-shell--hub', cleanHash === '#congressional');
}

function bindShellOnce(shell) {
  if (bound) return;
  bound = true;

  shell.querySelector('#shell-brand-home')?.addEventListener('click', () => {
    navigate('#congressional');
  });

  shell.querySelectorAll('.ctb-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      const clean = route.split('?')[0];
      if (!IMPLEMENTED_ROUTES.includes(clean)) return;
      // Measurements module: always a fresh sheet, never the last client visited.
      if (btn.dataset.id === 'measurements' || clean === '#configurator') {
        state.clearClientContext();
        state.startNewSuit();
        state.setStep(5);
        state.setConfiguratorReturn('#congressional');
        navigate('#configurator', { replace: true });
        return;
      }
      navigate(route);
    });
  });

  shell.querySelector('#shell-lock-vault')?.addEventListener('click', async () => {
    const btn = shell.querySelector('#shell-lock-vault');
    btn.disabled = true;
    try {
      await onLockVault();
    } catch {
      btn.disabled = false;
    }
  });
}
