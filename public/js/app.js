/**
 * app.js — Main application bootstrap & router setup
 *
 * Registers all screen routes and wires the persistent atelier shell.
 */
import { api }    from './api.js';
import { state }  from './state.js';
import { router } from './router.js';
import { configureShell } from './shell.js';
import { showToast } from './toast.js';

import { renderLockScreen }          from './screens/lockScreen.js';

import { renderCongressionalScreen } from './screens/congressionalScreen.js';
import { renderDashboardScreen }     from './screens/dashboardScreen.js';
import { renderConfiguratorScreen }  from './screens/configuratorScreen.js';
import { renderClientDbScreen }      from './screens/clientDbScreen.js';
import { renderClientProfileScreen } from './screens/clientProfileScreen.js';
import { renderInventoryScreen }     from './screens/inventoryScreen.js';
import { renderScheduleScreen }      from './screens/scheduleScreen.js';
import { renderWorkHierarchyScreen } from './screens/workHierarchyScreen.js';
import { renderWorkshopScreen }      from './screens/workshopScreen.js';
import { renderShortcomingsScreen }  from './screens/shortcomingsScreen.js';
import { renderStatusQuoScreen }     from './screens/statusQuoScreen.js';

async function bootstrap() {
  const root = document.getElementById('app');

  try {
    const status = await api.getStatus();
    state.setStatus(status);

    configureShell({
      navigate: (hash, opts) => router.navigate(hash, opts),
      onLockVault: async () => {
        try {
          await api.lock();
          state.setStatus({ firstRun: false, unlocked: false });
          router.navigate('#lock', { replace: true });
        } catch (err) {
          showToast('Error locking vault: ' + err.message, 'error');
          throw err;
        }
      },
    });

    const routes = {
      '#lock':           renderLockScreen,
      '#congressional':  renderCongressionalScreen,
      '#dashboard':      renderDashboardScreen,
      '#b2b':            renderDashboardScreen,
      '#configurator':   renderConfiguratorScreen,
      '#client-db':      renderClientDbScreen,
      '#client-profile': renderClientProfileScreen,
      '#inventory':      renderInventoryScreen,
      '#schedule':       renderScheduleScreen,
      '#work-hierarchy': renderWorkHierarchyScreen,
      '#workshop':       renderWorkshopScreen,
      '#shortcomings':   renderShortcomingsScreen,
      '#status-quo':     renderStatusQuoScreen,
    };

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
