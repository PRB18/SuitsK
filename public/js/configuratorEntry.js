/**
 * configuratorEntry.js — Canonical ways to open the style/measurements wizard.
 *
 * Hub/sidebar Measurements must NOT inherit a sticky currentClientId from a
 * prior profile visit (that caused Measurements → Profile → Client DB loops).
 * Profile/workshop entry keeps the client link and returns to the profile.
 */
import { state } from './state.js';
import { router } from './router.js';

/** Sidebar / hub tile: fresh sheet, no locked client, Back → Atelier Hub. */
export function openHubMeasurements({ step = 5 } = {}) {
  state.clearClientContext();
  state.startNewSuit();
  state.setStep(step);
  state.setConfiguratorReturn('#congressional');
  router.navigate('#configurator', { replace: true });
}

/** Client profile / workshop: keep client linkage, Back → that profile. */
export function openClientMeasurements({
  clientId,
  orderId = null,
  projectId = null,
  suit = null,
  step = 5,
}) {
  if (!clientId) {
    openHubMeasurements({ step });
    return;
  }
  state.setCurrentClientId(clientId);
  if (orderId) state.setCurrentOrderId(orderId);
  else state.setCurrentOrderId(null);
  if (projectId) state.setCurrentProjectId(projectId);
  else state.setCurrentProjectId(null);
  if (suit) state.editSuit(suit);
  else state.startNewSuit();
  state.setStep(step);
  state.setConfiguratorReturn(`#client-profile?id=${encodeURIComponent(clientId)}`);
  const params = { client_id: clientId };
  if (orderId) params.order_id = orderId;
  if (projectId) params.project_id = projectId;
  router.navigateTo('#configurator', params);
}
