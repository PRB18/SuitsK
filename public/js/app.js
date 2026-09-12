/**
 * app.js — Main application bootstrap & router setup
 */
import { api } from './api.js';
import { state } from './state.js';
import { router } from './router.js';

import { renderLockScreen }        from './screens/lockScreen.js';
import { renderCongressionalScreen } from './screens/congressionalScreen.js';
import { renderDashboardScreen }    from './screens/dashboardScreen.js';
import { renderConfiguratorScreen } from './screens/configuratorScreen.js';

async function bootstrap() {
  const root = document.getElementById('app');

  try {
    // 1. Check vault status
    const status = await api.getStatus();
    state.setStatus(status);

    // 2. Register routes
    const routes = {
      '#lock':           renderLockScreen,
      '#congressional':  renderCongressionalScreen,
      '#dashboard':      renderDashboardScreen,
      '#configurator':   renderConfiguratorScreen,
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
