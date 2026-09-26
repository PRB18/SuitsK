/**
 * workshopLink.js — Ensure client measurements land on the Workshop Kanban.
 *
 * Workshop lists garment *projects* (not bare orders or client measurement rows).
 * These helpers create / reuse an active order+project so profile → measurements
 * always has a Kanban card.
 */
import { api } from './api.js';
import { openClientMeasurements } from './configuratorEntry.js';

/**
 * Create a brand-new order with its first garment project (Add Order flow).
 */
export async function createOrderWithProject(clientId, orderFields, garmentType) {
  const order = await api.createOrder(clientId, orderFields);
  const project = await api.addProject(clientId, order.id, { garment_type: garmentType });
  return { order, project };
}

/**
 * Guarantee an active workshop project for a client.
 * Reuses the newest open order/project when possible; otherwise creates them.
 */
export async function ensureActiveWorkshopProject(clientId, garmentType = 'Jacket') {
  const client = await api.getClient(clientId);
  const activeOrders = (client.orders || []).filter(
    (o) => !['completed', 'cancelled'].includes(o.status),
  );

  for (const order of activeOrders) {
    const open = (order.projects || []).find((p) => p.status !== 'delivered');
    if (open) return { order, project: open };
  }

  if (activeOrders.length > 0) {
    const order = activeOrders[0];
    const project = await api.addProject(clientId, order.id, { garment_type: garmentType });
    return { order, project };
  }

  const order = await api.createOrder(clientId, {
    order_date: new Date().toISOString().split('T')[0],
  });
  const project = await api.addProject(clientId, order.id, { garment_type: garmentType });
  return { order, project };
}

/**
 * Open the configurator wizard on the measurements step for a workshop project.
 */
export function openMeasurementsForProject({
  clientId,
  orderId,
  projectId,
  suit = null,
  step = 5,
}) {
  openClientMeasurements({ clientId, orderId, projectId, suit, step });
}
