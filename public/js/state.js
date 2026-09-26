/**
 * state.js — In-memory client application state
 *
 * Tracks: auth status, suit collection (existing), current suit wizard,
 * and new: current client ID / order ID for routing between screens.
 */
import { createEmptyDraft } from './schema.js';

class AppState {
  constructor() {
    this.status         = { firstRun: false, unlocked: false };
    this.suits          = [];
    this.currentSuit    = null;   // { id, name, notes, data }
    this.currentStep    = 0;      // wizard step index 0–6
    this.currentClientId = null;  // set when navigating to #client-profile
    this.currentOrderId  = null;  // set when navigating with a specific order context
    this.currentProjectId= null;  // set when opening a project in the configurator
    this.linkedClientInfo = null; // { id, name, client_ref } for banner UI
    // Where configurator Back/Escape should go (hub vs client profile vs dashboard).
    // Prevents sticky currentClientId from forcing Measurements → Profile → Client DB loops.
    this.configuratorReturnHash = null;
    this.listeners      = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(event, payload) {
    for (const fn of this.listeners) {
      try { fn(event, payload); }
      catch (err) { console.error('[State] Listener error:', err); }
    }
  }

  setStatus(status) {
    this.status = status;
    this.notify('status', status);
  }

  setSuits(suits) {
    this.suits = suits;
    this.notify('suits', suits);
  }

  // ── Current Client / Order / Project context ──────────────────────────────
  setCurrentClientId(id) {
    this.currentClientId = id || null;
    this.notify('client_changed', id);
  }

  setCurrentOrderId(id) {
    this.currentOrderId = id || null;
    this.notify('order_changed', id);
  }

  setCurrentProjectId(id) {
    this.currentProjectId = id || null;
    this.notify('project_changed', id);
  }

  /** Optional metadata for the linked client (name/ref) shown in configurator. */
  setLinkedClientInfo(info) {
    this.linkedClientInfo = info || null;
  }

  clearClientContext() {
    this.currentClientId  = null;
    this.currentOrderId   = null;
    this.currentProjectId = null;
    this.linkedClientInfo = null;
  }

  /** Remember where Back should leave the configurator (e.g. #congressional, #client-profile?id=…). */
  setConfiguratorReturn(hash) {
    if (!hash) {
      this.configuratorReturnHash = null;
      return;
    }
    this.configuratorReturnHash = hash.startsWith('#') ? hash : `#${hash}`;
  }

  clearConfiguratorReturn() {
    this.configuratorReturnHash = null;
  }

  // ── Configurator suit wizard ───────────────────────────────────────────────
  startNewSuit() {
    this.currentSuit = { id: null, name: '', notes: '', clientId: this.currentClientId || '', data: createEmptyDraft() };
    this.currentStep = 0;
    this.notify('suit_started', this.currentSuit);
  }

  editSuit(suit) {
    const emptyDraft = createEmptyDraft();
    const mergedData = {
      ...emptyDraft,
      ...(suit.data || {}),
      jacket:      { ...emptyDraft.jacket,      ...(suit.data?.jacket      || {}) },
      shirt:       { ...emptyDraft.shirt,        ...(suit.data?.shirt       || {}) },
      trouser:     { ...emptyDraft.trouser,      ...(suit.data?.trouser     || {}) },
      waistcoat:   { ...emptyDraft.waistcoat,    ...(suit.data?.waistcoat   || {}) },
      embroidery:  { ...emptyDraft.embroidery,   ...(suit.data?.embroidery  || {}) },
      measurements:{ ...emptyDraft.measurements, ...(suit.data?.measurements|| {}) },
    };
    this.currentSuit = {
      id: suit.id,
      name: suit.name,
      notes: suit.notes || '',
      clientId: suit.clientId || suit.client_id || this.currentClientId || '',
      data: mergedData,
    };
    this.currentStep = 0;
    this.notify('suit_editing', this.currentSuit);
  }

  setStep(index) {
    if (index >= 0 && index <= 6) {
      this.currentStep = index;
      this.notify('step_changed', this.currentStep);
    }
  }

  updateDraftCategory(category, field, value) {
    if (!this.currentSuit?.data) return;
    if (this.currentSuit.data[category]) {
      this.currentSuit.data[category][field] = value;
      this.notify('draft_updated', { category, field, value });
    }
  }
}

export const state = new AppState();
