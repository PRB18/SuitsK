/**
 * state.js — In-memory client application state
 */
import { createEmptyDraft } from './schema.js';

class AppState {
  constructor() {
    this.status = { firstRun: false, unlocked: false };
    this.suits = [];
    this.currentSuit = null; // { id, name, notes, data }
    this.currentStep = 0;    // 0: Jacket, 1: Shirt, 2: Trouser, 3: Waistcoat, 4: Embroidery, 5: Measurements, 6: Save
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(event, payload) {
    for (const fn of this.listeners) {
      try {
        fn(event, payload);
      } catch (err) {
        console.error('[State] Listener error:', err);
      }
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

  startNewSuit() {
    this.currentSuit = {
      id: null,
      name: '',
      notes: '',
      data: createEmptyDraft()
    };
    this.currentStep = 0;
    this.notify('suit_started', this.currentSuit);
  }

  editSuit(suit) {
    const emptyDraft = createEmptyDraft();
    // Merge existing suit data over empty draft to prevent missing category errors
    const mergedData = {
      ...emptyDraft,
      ...(suit.data || {}),
      jacket: { ...emptyDraft.jacket, ...(suit.data?.jacket || {}) },
      shirt: { ...emptyDraft.shirt, ...(suit.data?.shirt || {}) },
      trouser: { ...emptyDraft.trouser, ...(suit.data?.trouser || {}) },
      waistcoat: { ...emptyDraft.waistcoat, ...(suit.data?.waistcoat || {}) },
      embroidery: { ...emptyDraft.embroidery, ...(suit.data?.embroidery || {}) },
      measurements: { ...emptyDraft.measurements, ...(suit.data?.measurements || {}) },
    };

    this.currentSuit = {
      id: suit.id,
      name: suit.name,
      notes: suit.notes || '',
      data: mergedData
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
    if (!this.currentSuit || !this.currentSuit.data) return;
    if (this.currentSuit.data[category]) {
      this.currentSuit.data[category][field] = value;
      this.notify('draft_updated', { category, field, value });
    }
  }
}

export const state = new AppState();
