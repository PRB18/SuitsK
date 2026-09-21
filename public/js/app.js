/**
 * app.js — Main application bootstrap & router setup
 *
 * Performance: all screen modules are LAZY-LOADED via dynamic import().
 * The browser only downloads a screen's JS the first time the user navigates to it.
 * On repeat visits, the file is served from the browser cache (Cache-Control: max-age=1y).
 */
import { api }    from './api.js';
import { state }  from './state.js';
import { router } from './router.js';

/** Wrap a dynamic import so the screen handler is lazy but cached after first load */
function lazy(importFn) {
  let mod = null;
  return async (container) => {
    if (!mod) mod = await importFn();
    return mod.default(container);
  };
}

async function bootstrap() {
  const root = document.getElementById('app');

  try {
    // 1. Check vault status
    const status = await api.getStatus();
    state.setStatus(status);

    // 2. Register all routes — screens are lazy-loaded on first visit
    const routes = {
      '#lock':           lazy(() => import('./screens/lockScreen.js').then(m => ({ default: m.renderLockScreen }))),
      '#congressional':  lazy(() => import('./screens/congressionalScreen.js').then(m => ({ default: m.renderCongressionalScreen }))),
      '#dashboard':      lazy(() => import('./screens/dashboardScreen.js').then(m => ({ default: m.renderDashboardScreen }))),
      '#configurator':   lazy(() => import('./screens/configuratorScreen.js').then(m => ({ default: m.renderConfiguratorScreen }))),
      '#client-db':      lazy(() => import('./screens/clientDbScreen.js').then(m => ({ default: m.renderClientDbScreen }))),
      '#client-profile': lazy(() => import('./screens/clientProfileScreen.js').then(m => ({ default: m.renderClientProfileScreen }))),
      '#inventory':      lazy(() => import('./screens/inventoryScreen.js').then(m => ({ default: m.renderInventoryScreen }))),
      '#schedule':       lazy(() => import('./screens/scheduleScreen.js').then(m => ({ default: m.renderScheduleScreen }))),
      '#work-hierarchy': lazy(() => import('./screens/workHierarchyScreen.js').then(m => ({ default: m.renderWorkHierarchyScreen }))),
      '#workshop':       lazy(() => import('./screens/workshopScreen.js').then(m => ({ default: m.renderWorkshopScreen }))),
      '#shortcomings':   lazy(() => import('./screens/shortcomingsScreen.js').then(m => ({ default: m.renderShortcomingsScreen }))),
      '#status-quo':     lazy(() => import('./screens/statusQuoScreen.js').then(m => ({ default: m.renderStatusQuoScreen }))),
    };

    // 3. Initialize router
    router.init(root, routes);

  } catch (err) {
    console.error('[App] Bootstrap error:', err);
    if (root) {
      root.innerHTML = `
        <div class="initial-loading">
          <h2 style="color: var(--color-danger); font-family: var(--font-display);">Unable to Connect to Vault</h2>
          <p style="color: var(--color-text-secondary); max-width: 480px; text-align: center; margin-top: 8px;">
            ${err.message || 'Check that the local server is running at http://127.0.0.1:3737.'}
          </p>
          <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 16px;">
            Retry Connection
          </button>
        </div>
      `;
    }
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
