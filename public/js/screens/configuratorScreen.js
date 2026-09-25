/**
 * configuratorScreen.js — Bespoke suit configurator wizard (Stage 4)
 *
 * Fully wired to canonical TAILORING_SCHEMA across all 7 steps:
 * 1. Jacket (14 fields: lapels, buttons, vents, pockets, body shapes, colors, fabric)
 * 2. Shirt (5 fields: collar, cuff, pocket count, pocket shape, placket)
 * 3. Trouser (6 fields: pleats, back pockets, belt loops, waistband, gurkha, coin pocket)
 * 4. Waistcoat (3 fields: style [Option B], piping, lining)
 * 5. Embroidery (4 fields: shirt, pant, jacket locations, thread color)
 * 6. Measurements (unit toggle, paper-form grid — linked to client profile when set)
 * 7. Save Suit (naming, notes, visual summary breakdown, vault commit)
 */

import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { TAILORING_SCHEMA, TOOLTIP_DESCRIPTIONS } from '../schema.js';
import { showToast } from '../toast.js';
import { getIconForOption } from '../icons.js';
import { printMeasurementCard } from '../print.js';
import { ensureActiveWorkshopProject } from '../workshopLink.js';

// ── Styled Tooltip DOM ────────────────────────────────────────────────────────
// Single floating tooltip element reused across all option cards.
let _tooltipEl = null;
let _tooltipTimeout = null;

function getTooltipEl() {
  if (_tooltipEl) return _tooltipEl;
  _tooltipEl = document.createElement('div');
  _tooltipEl.id = 'option-card-tooltip';
  _tooltipEl.setAttribute('role', 'tooltip');
  _tooltipEl.style.cssText = [
    'position:fixed',
    'z-index:9999',
    'max-width:280px',
    'padding:8px 12px',
    'background:#1C1C1E',
    'border:1px solid #8B6F47',
    'border-radius:8px',
    'color:#E2DDD6',
    'font-size:0.78rem',
    'line-height:1.5',
    'pointer-events:none',
    'opacity:0',
    'transition:opacity 0.15s ease',
    'box-shadow:0 4px 20px rgba(0,0,0,0.6)',
    'font-family:var(--font-primary, Inter, system-ui, sans-serif)'
  ].join(';');
  document.body.appendChild(_tooltipEl);
  return _tooltipEl;
}

function showTooltip(text, anchorEl) {
  clearTimeout(_tooltipTimeout);
  const el = getTooltipEl();
  el.textContent = text;
  el.style.opacity = '0';
  el.style.display = 'block';

  _tooltipTimeout = setTimeout(() => {
    const rect = anchorEl.getBoundingClientRect();
    const tw = el.offsetWidth;
    const th = el.offsetHeight;
    const vw = window.innerWidth;

    // Prefer above the card; fall back to below if not enough room
    let top = rect.top - th - 8;
    if (top < 4) top = rect.bottom + 8;

    // Horizontally centre under the card, clamped to viewport
    let left = rect.left + (rect.width / 2) - (tw / 2);
    left = Math.max(8, Math.min(left, vw - tw - 8));

    el.style.top = top + 'px';
    el.style.left = left + 'px';
    el.style.opacity = '1';
  }, 120);
}

function hideTooltip() {
  clearTimeout(_tooltipTimeout);
  if (!_tooltipEl) return;
  _tooltipEl.style.opacity = '0';
  _tooltipEl.style.display = 'none';
}

const STEPS = [
  { id: 'jacket', label: 'Jacket', subtitle: 'Lapels, silhouette, pockets & bespoke details' },
  { id: 'shirt', label: 'Shirt', subtitle: 'Collar, cuffs, placket & pocket styling' },
  { id: 'trouser', label: 'Trouser', subtitle: 'Pleats, waistband, pockets & cut' },
  { id: 'waistcoat', label: 'Waistcoat', subtitle: 'Vest silhouette & bespoke trims' },
  { id: 'embroidery', label: 'Embroidery', subtitle: 'Monogramming & personalized embroidery' },
  { id: 'measurements', label: 'Measurements', subtitle: 'Tailoring dimensions & custom metrics' },
  { id: 'save', label: 'Save Suit', subtitle: 'Review configuration & commit to encrypted vault' }
];

const PRESET_PALETTE = [
  '#1C1C1E', // Obsidian / Black
  '#2C2C2E', // Charcoal
  '#1B2A4A', // Midnight Navy
  '#8B6F47', // Brasswood Accent
  '#C9A87A', // Warm Camel
  '#5B1E31', // Burgundy Wine
  '#2D4A3E', // British Racing Green
  '#E2DDD6'  // Cream Lining
];

export async function renderConfiguratorScreen(container) {
  if (!state.currentSuit) {
    state.startNewSuit();
  }

  // Link measurements + style sheet to a client profile whenever one is in context.
  await ensureClientLinkage();

  // Avoid stacking listeners / DOM when re-entering after linking a client.
  if (container._wizardKeydown) {
    document.removeEventListener('keydown', container._wizardKeydown);
    container._wizardKeydown = null;
  }
  container.innerHTML = '';

  const isEditing = Boolean(state.currentSuit.id);
  const linked = state.linkedClientInfo;

  const wrapper = document.createElement('div');
  wrapper.className = 'configurator-wrapper';

  wrapper.innerHTML = `
    <!-- Top Bar -->
    <header class="wizard-header">
      <div class="wizard-header-container">
        <div class="wizard-left">
          <button type="button" id="wizard-back-vault-btn" class="btn btn-ghost btn-sm" aria-label="Back to dashboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Dashboard
          </button>
          <div class="wizard-title-block">
            <h1 class="wizard-suit-title" id="wizard-suit-title-display">
              ${escapeHtml(state.currentSuit.name || (isEditing ? 'Edit Suit' : 'New Bespoke Suit'))}
            </h1>
            <span class="wizard-mode-badge">${isEditing ? 'Editing Existing' : 'New Configuration'}</span>
          </div>
        </div>

        <div class="wizard-right">
          <button type="button" id="wizard-quick-save-btn" class="btn btn-primary btn-sm">
            Review & Save
          </button>
        </div>
      </div>
    </header>

    ${linked ? `
      <div class="client-link-banner" id="client-link-banner" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.65rem 1.25rem;background:var(--color-surface);border-bottom:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;gap:0.75rem;min-width:0;">
          <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-secondary);white-space:nowrap;">Linked Client</span>
          <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(linked.name)}</strong>
          <span class="badge badge--neutral">${escapeHtml(linked.client_ref || '')}</span>
          <span class="text-muted" style="font-size:0.8rem;">Measurements & style stay on this profile</span>
        </div>
        <div style="display:flex;gap:0.5rem;flex-shrink:0;">
          <button type="button" class="btn btn-ghost btn-sm" id="wizard-open-client">Open Profile</button>
          <button type="button" class="btn btn-ghost btn-sm" id="wizard-change-client">Change</button>
        </div>
      </div>
    ` : `
      <div class="client-link-banner client-link-banner--warn" id="client-link-banner" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.65rem 1.25rem;background:#FFF8E8;border-bottom:1px solid var(--color-border);">
        <div style="min-width:0;">
          <strong>No client linked</strong>
          <span class="text-muted" style="margin-left:0.5rem;font-size:0.85rem;">Pick a client so measurements and style interconnect with Workshop & Profile.</span>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="wizard-pick-client">Link Client</button>
      </div>
    `}

    <!-- Stepper Navigation Bar -->
    <nav class="wizard-stepper-nav">
      <div class="stepper-container">
        ${STEPS.map((step, idx) => `
          <button class="step-nav-item ${idx === state.currentStep ? 'active' : ''} ${idx < state.currentStep ? 'completed' : ''}" data-step="${idx}" title="${step.label} — ${step.subtitle}">
            <div class="step-num">${idx + 1}</div>
            <div class="step-meta">
              <span class="step-label">${step.label}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </nav>

    <!-- Progress bar — Rule 3: visible step progress feedback -->
    <div class="wizard-progress-bar" role="progressbar"
         aria-valuenow="${state.currentStep + 1}"
         aria-valuemin="1"
         aria-valuemax="${STEPS.length}"
         aria-label="Step ${state.currentStep + 1} of ${STEPS.length}">
      <div class="wizard-progress-fill" id="wizard-progress-fill"
           style="width: ${Math.round(((state.currentStep + 1) / STEPS.length) * 100)}%">
      </div>
    </div>

    <!-- Wizard Content Panel -->
    <main class="wizard-main">
      <div class="wizard-panel-container" id="wizard-panel-container">
        <!-- Step panel rendered here dynamically -->
      </div>
    </main>

    <!-- Bottom Navigation Footer -->
    <footer class="wizard-footer">
      <div class="wizard-footer-container">
        <button type="button" id="wizard-prev-btn" class="btn btn-secondary" ${state.currentStep === 0 ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Previous
        </button>

        <div class="step-counter-text" id="step-counter-text">
          Step ${state.currentStep + 1} of ${STEPS.length} — ${STEPS[state.currentStep].label}
        </div>

        <button type="button" id="wizard-next-btn" class="btn btn-primary">
          ${state.currentStep === STEPS.length - 1 ? 'Finish & Save' : 'Next Step'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            ${state.currentStep === STEPS.length - 1 
              ? '<polyline points="20 6 9 17 4 12"></polyline>' 
              : '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>'}
          </svg>
        </button>
      </div>
    </footer>
  `;

  container.appendChild(wrapper);

  // Client link controls
  wrapper.querySelector('#wizard-open-client')?.addEventListener('click', () => {
    if (state.currentClientId) router.navigateTo('#client-profile', { id: state.currentClientId });
  });
  const pickClient = () => openClientPickerModal(async (client) => {
    state.setCurrentClientId(client.id);
    state.setLinkedClientInfo({ id: client.id, name: client.name, client_ref: client.client_ref });
    if (state.currentSuit) state.currentSuit.clientId = client.id;
    await hydrateMeasurementsFromClient(client.id);
    // Re-render so banner + measurement values refresh
    await renderConfiguratorScreen(container);
  });
  wrapper.querySelector('#wizard-pick-client')?.addEventListener('click', pickClient);
  wrapper.querySelector('#wizard-change-client')?.addEventListener('click', pickClient);

  // Hook up event listeners
  const panelContainer = wrapper.querySelector('#wizard-panel-container');
  const stepButtons = wrapper.querySelectorAll('.step-nav-item');
  const prevBtn = wrapper.querySelector('#wizard-prev-btn');
  const nextBtn = wrapper.querySelector('#wizard-next-btn');
  const counterText = wrapper.querySelector('#step-counter-text');
  const quickSaveBtn = wrapper.querySelector('#wizard-quick-save-btn');
  const backVaultBtn = wrapper.querySelector('#wizard-back-vault-btn');

  backVaultBtn.addEventListener('click', () => {
    hideTooltip();
    // Prefer returning to the linked client profile when one is in context.
    if (state.currentClientId) {
      router.navigateTo('#client-profile', { id: state.currentClientId });
    } else {
      router.navigate('#dashboard');
    }
  });

  // Keyboard shortcuts — Rule 2: efficient shortcuts for power users
  const onWizardKeydown = (e) => {
    const inInput = e.target && (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'SELECT'
    );

    if (e.key === 'Escape') {
      if (inInput) { e.target.blur(); return; }
      hideTooltip();
      if (state.currentClientId) {
        router.navigateTo('#client-profile', { id: state.currentClientId });
      } else {
        router.navigate('#dashboard');
      }
      return;
    }

    // Don't intercept shortcuts while typing
    if (inInput) return;

    // 1-7: jump to step
    if (e.key >= '1' && e.key <= '7') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < STEPS.length) goToStep(idx);
      return;
    }

    // S: jump to Save step
    if (e.key === 's' || e.key === 'S') {
      goToStep(STEPS.length - 1);
      return;
    }

    // ← → : previous / next step
    if (e.key === 'ArrowLeft' && state.currentStep > 0) {
      goToStep(state.currentStep - 1);
      return;
    }
    if (e.key === 'ArrowRight' && state.currentStep < STEPS.length - 1) {
      goToStep(state.currentStep + 1);
      return;
    }
  };
  document.addEventListener('keydown', onWizardKeydown);
  container._wizardKeydown = onWizardKeydown;

  quickSaveBtn.addEventListener('click', () => {
    goToStep(6);
  });

  stepButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetStep = parseInt(btn.dataset.step, 10);
      goToStep(targetStep);
    });
  });

  prevBtn.addEventListener('click', () => {
    if (state.currentStep > 0) {
      goToStep(state.currentStep - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (state.currentStep < STEPS.length - 1) {
      goToStep(state.currentStep + 1);
    } else {
      handleFinalSave();
    }
  });

  function goToStep(index) {
    hideTooltip();
    state.setStep(index);
    updateStepUI();
    wrapper.querySelector('.wizard-main').scrollTop = 0;
    panelContainer.querySelector('.step-panel-title').focus({ preventScroll: true });
    stepButtons[index].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }

  function updateStepUI() {
    stepButtons.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === state.currentStep);
      btn.classList.toggle('completed', idx < state.currentStep);
      if (idx === state.currentStep) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
    const progress = wrapper.querySelector('.wizard-progress-bar');
    progress.setAttribute('aria-valuenow', state.currentStep + 1);
    progress.setAttribute('aria-label', `Step ${state.currentStep + 1} of ${STEPS.length}`);

    prevBtn.disabled = state.currentStep === 0;
    nextBtn.innerHTML = state.currentStep === STEPS.length - 1
      ? 'Finish & Save <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : 'Next Step <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';

    counterText.textContent = `Step ${state.currentStep + 1} of ${STEPS.length} — ${STEPS[state.currentStep].label}`;

    // Update progress bar — Rule 3: feedback
    const progressFill = wrapper.querySelector('#wizard-progress-fill');
    if (progressFill) {
      const pct = Math.round(((state.currentStep + 1) / STEPS.length) * 100);
      progressFill.style.width = pct + '%';
    }

    renderStepPanel(panelContainer, state.currentStep);
  }

  // Initial render
  updateStepUI();
  wrapper.querySelector('.wizard-main').addEventListener('scroll', hideTooltip, { passive: true });

  // Cleanup Escape listener when the screen is torn down by the router
  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrapper)) {
      document.removeEventListener('keydown', onWizardKeydown);
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });
}

function renderStepPanel(container, stepIndex) {
  container.innerHTML = '';
  const step = STEPS[stepIndex];

  const panel = document.createElement('div');
  panel.className = 'step-panel-card';

  panel.innerHTML = `
    <div class="step-panel-header">
      <div class="step-tag">Step 0${stepIndex + 1}</div>
      <h2 class="step-panel-title" tabindex="-1">${step.id === 'save' ? 'Review & Save' : step.label + ' Configuration'}</h2>
      <p class="step-panel-subtitle">${step.subtitle}</p>
    </div>

    <div class="step-panel-content" id="step-content-area">
      <!-- Dynamic Step Content Form -->
    </div>
  `;

  container.appendChild(panel);
  const contentArea = panel.querySelector('#step-content-area');

  switch (step.id) {
    case 'jacket':
      renderJacketPanel(contentArea);
      break;
    case 'shirt':
      renderShirtPanel(contentArea);
      break;
    case 'trouser':
      renderTrouserPanel(contentArea);
      break;
    case 'waistcoat':
      renderWaistcoatPanel(contentArea);
      break;
    case 'embroidery':
      renderEmbroideryPanel(contentArea);
      break;
    case 'measurements':
      renderMeasurementsPanel(contentArea);
      break;
    case 'save':
      renderSavePanel(contentArea);
      break;
  }
}

// ---------------------------------------------------------------------------
// Step 1: Jacket (14 Fields)
// ---------------------------------------------------------------------------
function renderJacketPanel(container) {
  const d = state.currentSuit.data.jacket;

  container.innerHTML = `
    <div class="step-form-wrapper">
      ${renderOptionSection('Lapel Style', 'jacket', 'lapelStyle', TAILORING_SCHEMA.jacket.lapelStyle, d.lapelStyle)}
      ${renderTextInputSection('Lapel Size', 'jacket', 'lapelSize', d.lapelSize, 'e.g. 3.25 in / 8.5 cm (write-in dimension)')}
      ${renderOptionSection('Lapel Detail', 'jacket', 'lapelDetail', TAILORING_SCHEMA.jacket.lapelDetail, d.lapelDetail)}
      ${renderOptionSection('Button & Breast Style', 'jacket', 'buttonBreastStyle', TAILORING_SCHEMA.jacket.buttonBreastStyle, d.buttonBreastStyle)}
      ${renderOptionSection('Sleeve Button Style', 'jacket', 'sleeveButtonStyle', TAILORING_SCHEMA.jacket.sleeveButtonStyle, d.sleeveButtonStyle)}
      ${renderOptionSection('Vent', 'jacket', 'vent', TAILORING_SCHEMA.jacket.vent, d.vent)}
      ${renderOptionSection('Pocket Style', 'jacket', 'pocketStyle', TAILORING_SCHEMA.jacket.pocketStyle, d.pocketStyle)}
      ${renderOptionSection('Shoulder Shape', 'jacket', 'shoulderShape', TAILORING_SCHEMA.jacket.shoulderShape, d.shoulderShape)}
      ${renderOptionSection('Back Shape', 'jacket', 'backShape', TAILORING_SCHEMA.jacket.backShape, d.backShape)}
      ${renderOptionSection('Stomach Shape', 'jacket', 'stomachShape', TAILORING_SCHEMA.jacket.stomachShape, d.stomachShape)}
      ${renderColorSection('Piping Color', 'jacket', 'pipingColor', d.pipingColor)}
      ${renderColorSection('Buttonhole Color', 'jacket', 'buttonholeColor', d.buttonholeColor)}
      ${renderColorSection('Lining Color', 'jacket', 'liningColor', d.liningColor)}
      ${renderTextInputSection('Fabric Code', 'jacket', 'fabricCode', d.fabricCode, 'e.g. Scabal Royal 7041 / Navy Herringbone')}
    </div>
  `;

  bindOptionCards(container);
  bindTextInputs(container);
  bindColorPickers(container);
}

// ---------------------------------------------------------------------------
// Step 2: Shirt (5 Fields: collarStyle, cuffStyle, pocketCount, pocketShape, placketStyle)
// ---------------------------------------------------------------------------
function renderShirtPanel(container) {
  const d = state.currentSuit.data.shirt;
  const showPocketShape = d.pocketCount === 'One Pocket' || d.pocketCount === 'Two Pockets';

  container.innerHTML = `
    <div class="step-form-wrapper">
      ${renderOptionSection('Collar Style', 'shirt', 'collarStyle', TAILORING_SCHEMA.shirt.collarStyle, d.collarStyle)}
      ${renderOptionSection('Cuff Style', 'shirt', 'cuffStyle', TAILORING_SCHEMA.shirt.cuffStyle, d.cuffStyle)}
      ${renderOptionSection('Pocket Count', 'shirt', 'pocketCount', TAILORING_SCHEMA.shirt.pocketCount, d.pocketCount)}
      
      <div id="shirt-pocket-shape-container" style="${showPocketShape ? '' : 'display:none;'}">
        ${renderOptionSection('Pocket Shape', 'shirt', 'pocketShape', TAILORING_SCHEMA.shirt.pocketShape, d.pocketShape)}
      </div>

      ${renderOptionSection('Placket Style', 'shirt', 'placketStyle', TAILORING_SCHEMA.shirt.placketStyle, d.placketStyle)}
    </div>
  `;

  bindOptionCards(container, (field, value) => {
    if (field === 'pocketCount') {
      const shapeContainer = container.querySelector('#shirt-pocket-shape-container');
      if (shapeContainer) {
        shapeContainer.style.display = (value === 'One Pocket' || value === 'Two Pockets') ? 'block' : 'none';
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Step 3: Trouser (6 Fields: pleats, back pockets, belt loops, waistband, gurkha, coin pocket)
// ---------------------------------------------------------------------------
function renderTrouserPanel(container) {
  const d = state.currentSuit.data.trouser;

  container.innerHTML = `
    <div class="step-form-wrapper">
      ${renderOptionSection('Pleat Style', 'trouser', 'pleatStyle', TAILORING_SCHEMA.trouser.pleatStyle, d.pleatStyle)}
      ${renderOptionSection('Back Pocket Style', 'trouser', 'backPocketStyle', TAILORING_SCHEMA.trouser.backPocketStyle, d.backPocketStyle)}
      ${renderOptionSection('Belt Loop Style', 'trouser', 'beltLoopStyle', TAILORING_SCHEMA.trouser.beltLoopStyle, d.beltLoopStyle)}
      ${renderOptionSection('Waistband Style', 'trouser', 'waistbandStyle', TAILORING_SCHEMA.trouser.waistbandStyle, d.waistbandStyle)}
      ${renderBooleanToggleSection('Gurkha Trouser', 'trouser', 'gurkhaTrouser', d.gurkhaTrouser, 'Standard Waistband', 'Gurkha Wrap Waistband')}
      ${renderOptionSection('Front Coin Pocket Style', 'trouser', 'frontCoinPocketStyle', TAILORING_SCHEMA.trouser.frontCoinPocketStyle, d.frontCoinPocketStyle)}
    </div>
  `;

  bindOptionCards(container);
  bindBooleanToggles(container);
}

// ---------------------------------------------------------------------------
// Step 4: Waistcoat (3 Fields: style [Option B], pipingColor, liningColor)
// ---------------------------------------------------------------------------
function renderWaistcoatPanel(container) {
  const d = state.currentSuit.data.waistcoat;

  container.innerHTML = `
    <div class="step-form-wrapper">
      ${renderOptionSection('Waistcoat Style', 'waistcoat', 'style', TAILORING_SCHEMA.waistcoat.style, d.style)}
      ${renderColorSection('Piping Color', 'waistcoat', 'pipingColor', d.pipingColor)}
      ${renderColorSection('Lining Color', 'waistcoat', 'liningColor', d.liningColor)}
    </div>
  `;

  bindOptionCards(container);
  bindColorPickers(container);
}

// ---------------------------------------------------------------------------
// Step 5: Embroidery (4 Fields: shirtLocation, pantLocation, jacketLocation, threadColor)
// ---------------------------------------------------------------------------
function renderEmbroideryPanel(container) {
  const d = state.currentSuit.data.embroidery;

  container.innerHTML = `
    <div class="step-form-wrapper">
      ${renderTextInputSection('Shirt Monogram Location', 'embroidery', 'shirtLocation', d.shirtLocation, 'e.g. Left Cuff Monogram: K.S.')}
      ${renderTextInputSection('Pant Monogram Location', 'embroidery', 'pantLocation', d.pantLocation, 'e.g. Inside Waistband Facing')}
      ${renderTextInputSection('Jacket Monogram Location', 'embroidery', 'jacketLocation', d.jacketLocation, 'e.g. Inside Chest Pocket Facing')}
      ${renderColorSection('Thread Color', 'embroidery', 'threadColor', d.threadColor)}
    </div>
  `;

  bindTextInputs(container);
  bindColorPickers(container);
}

// ---------------------------------------------------------------------------
// Step 6: Measurements (Exact Paper Form Replica)
// ---------------------------------------------------------------------------
function renderMeasurementsPanel(container) {
  const m = state.currentSuit.data.measurements;
  if (!m.values) m.values = {};
  if (!m.custom) m.custom = [];

  const styleQty = state.currentSuit.data.styleQty || {
    Jacket: '', Sherwani: '', Sadri: '', Waistcoat: '', Jodhpuri: '',
    ShirtsKurta: '', Pant: '', SafariJkt: '', Denim: ''
  };

  container.innerHTML = `
    <div class="step-form-wrapper" style="max-width: 1000px;">
      
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 2rem;">
        <!-- Header Info -->
        <div style="flex:1;">
          <div style="display:flex; gap: 1rem; margin-bottom: 1rem; font-weight:bold;">
            <div>Meters: <input type="text" class="form-input" style="display:inline; width:60px; padding:2px;" data-field="meters" value="${m.values.meters || ''}"></div>
            <div>Suit: <input type="text" class="form-input" style="display:inline; width:60px; padding:2px;" data-field="suit_meters" value="${m.values.suit_meters || ''}"></div>
            <div>Shirt: <input type="text" class="form-input" style="display:inline; width:60px; padding:2px;" data-field="shirt_meters" value="${m.values.shirt_meters || ''}"></div>
            <div>Pant: <input type="text" class="form-input" style="display:inline; width:60px; padding:2px;" data-field="pant_meters" value="${m.values.pant_meters || ''}"></div>
          </div>
          <p class="text-sm text-muted">${state.linkedClientInfo
            ? `Linked to <strong>${escapeHtml(state.linkedClientInfo.name)}</strong> (${escapeHtml(state.linkedClientInfo.client_ref || '')}). Saving updates this client's measurement profile.`
            : 'Link a client (banner above) so these measurements stay on their profile and feed Workshop garments.'}</p>
        </div>

        <!-- Style QTY -->
        <div style="border:1px solid var(--color-border); padding: 8px;">
          <table style="font-size: 0.85rem; border-collapse: collapse;">
            <thead><tr><th style="text-align:left; padding-right:16px;">STYLE</th><th>QTY</th></tr></thead>
            <tbody>
              ${['Jacket','Sherwani','Sadri','Waistcoat','Jodhpuri','ShirtsKurta','Pant','SafariJkt','Denim'].map(style => `
                <tr>
                  <td>${style.replace('ShirtsKurta', 'Shirts/Kurta').replace('SafariJkt', 'Safari jkt')}</td>
                  <td><input type="text" class="form-input style-qty-input" data-style="${style}" style="width:40px; padding:2px; text-align:center;" value="${styleQty[style] || ''}"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="measurements-header-row" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span class="unit-toggle-label">Active Tailoring Unit:</span>
          <div class="unit-toggle-buttons" style="display:inline-block;">
            <button type="button" class="unit-btn ${m.unit === 'cm' ? 'active' : ''}" data-unit="cm">Metric (cm)</button>
            <button type="button" class="unit-btn ${m.unit === 'in' ? 'active' : ''}" data-unit="in">Imperial (in)</button>
          </div>
        </div>
        <button class="btn btn-primary" id="meas-print-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print Measurement Card
        </button>
      </div>

      <!-- 4 Column Grid -->
      <div style="overflow-x:auto;">
        <table class="inventory-table" style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:center;">
          <thead>
            <tr style="background:var(--color-surface-muted);">
              <th colspan="3" style="border:1px solid var(--color-border); padding:4px;">SUIT / JODHPURI</th>
              <th colspan="3" style="border:1px solid var(--color-border); padding:4px;">PANT</th>
              <th colspan="3" style="border:1px solid var(--color-border); padding:4px;">SHIRT / KURTA</th>
              <th colspan="1" style="border:1px solid var(--color-border); padding:4px;">WAISTCOAT</th>
            </tr>
            <tr>
              <th style="border:1px solid var(--color-border); padding:4px;">Measurement</th>
              <th style="border:1px solid var(--color-border); padding:4px; width:45px;">L</th>
              <th style="border:1px solid var(--color-border); padding:4px; width:45px;">R</th>
              
              <th style="border:1px solid var(--color-border); padding:4px;">Measurement</th>
              <th style="border:1px solid var(--color-border); padding:4px; width:45px;">L</th>
              <th style="border:1px solid var(--color-border); padding:4px; width:45px;">R</th>
              
              <th style="border:1px solid var(--color-border); padding:4px;">Measurement</th>
              <th style="border:1px solid var(--color-border); padding:4px; width:45px;">L</th>
              <th style="border:1px solid var(--color-border); padding:4px; width:45px;">R</th>
              
              <th style="border:1px solid var(--color-border); padding:4px;">Measurement</th>
            </tr>
          </thead>
          <tbody>
            ${renderMeasurementRows(m)}
          </tbody>
        </table>
      </div>
      
    </div>
  `;

  // Unit toggle
  container.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      m.unit = btn.dataset.unit;
      state.updateDraftCategory('measurements', 'unit', m.unit);
      renderMeasurementsPanel(container);
    });
  });

  // Inputs
  container.querySelectorAll('input[data-field], input.meas-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.dataset.field || e.target.dataset.key;
      m.values[key] = e.target.value;
      state.updateDraftCategory('measurements', 'values', m.values);
    });
  });

  // Style QTY Inputs
  container.querySelectorAll('.style-qty-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const style = e.target.dataset.style;
      if (!state.currentSuit.data.styleQty) state.currentSuit.data.styleQty = {};
      state.currentSuit.data.styleQty[style] = e.target.value;
      state.saveDraft();
    });
  });

  // Print Button
  const printBtn = container.querySelector('#meas-print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', async () => {
      const linked = state.linkedClientInfo;
      const client = linked
        ? { name: linked.name, client_ref: linked.client_ref, phone: linked.phone || '' }
        : { name: 'Unlinked Draft', client_ref: state.currentSuit.name || 'Draft Suit', phone: '' };
      const project = {
        garment_type: 'Bespoke Suit',
        measurements: m.values || {},
        suitConfig: state.currentSuit.data,
      };
      printMeasurementCard(client, project);
    });
  }
}
  function renderMeasurementRows(m) {
  const suitFields = ['FRONT LENGTH','SLEEVE','CHEST','BELOW CHEST','HIPS','SHOULDER','BACK LENGTH','COLLAR','CROSS F','CROSS B','BICEPS','STOMACH','WRIST','H BACK','SHOULDER TO ELBOW','ELBOW TO WRIST','COLLAR TO STOMACH'];
  const pantFields = ['FRONT LENGTH','LENGTH','WAIST','WAIST TO KNEE','THIGHS','KNEE','BOTTOM','CROTCH','INSEAM L','FLY','FRONT','BACK'];
  const shirtFields = ['FRONT LENGTH','SLEEVE','STOMACH','BACK LENGTH','CHEST','BICEPS','HIPS','COLLAR','ELBOW L','WRIST','BACK LENGTH','COLLAR TO STOMACH','SHOULDER TO ELBOW','ELBOW TO WRIST','HALF SHOULDER'];
  const wcFields = ['LENGTH','CHEST','STOMACH','SHOULDER','ARMHOLE','COLLAR','V SHAPE'];

  const maxRows = Math.max(suitFields.length, pantFields.length, shirtFields.length, wcFields.length);
  let rows = '';

  for (let i = 0; i < maxRows; i++) {
    rows += `<tr>`;
    
    // Suit
    if (i < suitFields.length) {
      const f = suitFields[i];
      const kL = 'suit_'+f.replace(/ /g, '_')+'_L';
      const kR = 'suit_'+f.replace(/ /g, '_')+'_R';
      rows += `<td style="border:1px solid var(--color-border); padding:2px; text-align:left;">${f}</td>`;
      rows += `<td style="border:1px solid var(--color-border); padding:0;"><input type="text" class="meas-input" data-key="${kL}" value="${m.values[kL]||''}" style="width:100%; border:none; background:transparent; text-align:center;"></td>`;
      rows += `<td style="border:1px solid var(--color-border); padding:0;"><input type="text" class="meas-input" data-key="${kR}" value="${m.values[kR]||''}" style="width:100%; border:none; background:transparent; text-align:center;"></td>`;
    } else {
      rows += `<td colspan="3" style="border:1px solid var(--color-border);"></td>`;
    }

    // Pant
    if (i < pantFields.length) {
      const f = pantFields[i];
      const kL = 'pant_'+f.replace(/ /g, '_')+'_L';
      const kR = 'pant_'+f.replace(/ /g, '_')+'_R';
      rows += `<td style="border:1px solid var(--color-border); padding:2px; text-align:left;">${f}</td>`;
      rows += `<td style="border:1px solid var(--color-border); padding:0;"><input type="text" class="meas-input" data-key="${kL}" value="${m.values[kL]||''}" style="width:100%; border:none; background:transparent; text-align:center;"></td>`;
      rows += `<td style="border:1px solid var(--color-border); padding:0;"><input type="text" class="meas-input" data-key="${kR}" value="${m.values[kR]||''}" style="width:100%; border:none; background:transparent; text-align:center;"></td>`;
    } else {
      rows += `<td colspan="3" style="border:1px solid var(--color-border);"></td>`;
    }

    // Shirt
    if (i < shirtFields.length) {
      const f = shirtFields[i];
      const kL = 'shirt_'+f.replace(/ /g, '_')+'_L';
      const kR = 'shirt_'+f.replace(/ /g, '_')+'_R';
      rows += `<td style="border:1px solid var(--color-border); padding:2px; text-align:left;">${f}</td>`;
      rows += `<td style="border:1px solid var(--color-border); padding:0;"><input type="text" class="meas-input" data-key="${kL}" value="${m.values[kL]||''}" style="width:100%; border:none; background:transparent; text-align:center;"></td>`;
      rows += `<td style="border:1px solid var(--color-border); padding:0;"><input type="text" class="meas-input" data-key="${kR}" value="${m.values[kR]||''}" style="width:100%; border:none; background:transparent; text-align:center;"></td>`;
    } else {
      rows += `<td colspan="3" style="border:1px solid var(--color-border);"></td>`;
    }

    // Waistcoat
    if (i < wcFields.length) {
      const f = wcFields[i];
      const k = 'wc_'+f.replace(/ /g, '_');
      rows += `<td style="border:1px solid var(--color-border); padding:2px; text-align:left; display:flex; justify-content:space-between; align-items:center;">
        ${f}
        <input type="text" class="meas-input" data-key="${k}" value="${m.values[k]||''}" style="width:40px; border:none; border-bottom:1px solid var(--color-border); background:transparent; text-align:center;">
      </td>`;
    } else {
      rows += `<td style="border:1px solid var(--color-border);"></td>`;
    }

    rows += `</tr>`;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Step 7: Save Suit (Name, Notes, Complete Visual Breakdown)
// ---------------------------------------------------------------------------
function renderSavePanel(container) {
  const s = state.currentSuit;
  const isEditing = Boolean(s.id);

  container.innerHTML = `
    <div class="save-panel-content">
      <div class="form-group">
        <label for="suit-name-input" class="form-label">Suit Configuration Name *</label>
        <input 
          type="text" 
          id="suit-name-input" 
          class="form-input form-input-lg" 
          placeholder="e.g. Navy 2-Piece Business Suit" 
          value="${escapeHtml(s.name || '')}" 
          required 
        />
      </div>

      <div class="form-group">
        <label for="suit-notes-input" class="form-label">Tailoring Notes & Observations</label>
        <textarea 
          id="suit-notes-input" 
          class="form-input form-textarea" 
          placeholder="Enter cloth merchant details, fitting comments, lining preferences, or delivery target..."
        >${escapeHtml(s.notes || '')}</textarea>
      </div>

      <div class="save-summary-breakdown">
        <h3 class="breakdown-group-title">Complete Configuration Breakdown</h3>

        <div class="breakdown-section">
          <div class="breakdown-group-title">1. Jacket</div>
          <div class="breakdown-chips-grid">
            <div class="breakdown-item"><span>Lapel:</span> <strong>${escapeHtml(s.data.jacket.lapelStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Lapel Size:</span> <strong>${escapeHtml(s.data.jacket.lapelSize || 'Standard')}</strong></div>
            <div class="breakdown-item"><span>Lapel Detail:</span> <strong>${escapeHtml(s.data.jacket.lapelDetail || 'Standard')}</strong></div>
            <div class="breakdown-item"><span>Buttons:</span> <strong>${escapeHtml(s.data.jacket.buttonBreastStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Sleeve Buttons:</span> <strong>${escapeHtml(s.data.jacket.sleeveButtonStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Vent:</span> <strong>${escapeHtml(s.data.jacket.vent || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Pocket Style:</span> <strong>${escapeHtml(s.data.jacket.pocketStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Shoulders:</span> <strong>${escapeHtml(s.data.jacket.shoulderShape || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Back Shape:</span> <strong>${escapeHtml(s.data.jacket.backShape || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Stomach Shape:</span> <strong>${escapeHtml(s.data.jacket.stomachShape || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Fabric Code:</span> <strong>${escapeHtml(s.data.jacket.fabricCode || 'None')}</strong></div>
            <div class="breakdown-item"><span>Piping:</span> <strong>${escapeHtml(s.data.jacket.pipingColor)}</strong></div>
            <div class="breakdown-item"><span>Buttonhole:</span> <strong>${escapeHtml(s.data.jacket.buttonholeColor)}</strong></div>
            <div class="breakdown-item"><span>Lining:</span> <strong>${escapeHtml(s.data.jacket.liningColor)}</strong></div>
          </div>
        </div>

        <div class="breakdown-section">
          <div class="breakdown-group-title">2. Shirt</div>
          <div class="breakdown-chips-grid">
            <div class="breakdown-item"><span>Collar:</span> <strong>${escapeHtml(s.data.shirt.collarStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Cuff:</span> <strong>${escapeHtml(s.data.shirt.cuffStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Pockets:</span> <strong>${escapeHtml(s.data.shirt.pocketCount || 'None')}</strong></div>
            ${s.data.shirt.pocketCount !== 'No Pockets' ? `
              <div class="breakdown-item"><span>Pocket Shape:</span> <strong>${escapeHtml(s.data.shirt.pocketShape || 'Not set')}</strong></div>
            ` : ''}
            <div class="breakdown-item"><span>Placket:</span> <strong>${escapeHtml(s.data.shirt.placketStyle || 'Not set')}</strong></div>
          </div>
        </div>

        <div class="breakdown-section">
          <div class="breakdown-group-title">3. Trouser</div>
          <div class="breakdown-chips-grid">
            <div class="breakdown-item"><span>Pleat:</span> <strong>${escapeHtml(s.data.trouser.pleatStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Back Pocket:</span> <strong>${escapeHtml(s.data.trouser.backPocketStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Belt Loop:</span> <strong>${escapeHtml(s.data.trouser.beltLoopStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Waistband:</span> <strong>${escapeHtml(s.data.trouser.waistbandStyle || 'Not set')}</strong></div>
            <div class="breakdown-item"><span>Gurkha:</span> <strong>${s.data.trouser.gurkhaTrouser ? 'Yes (Wrap Waistband)' : 'No (Standard)'}</strong></div>
            <div class="breakdown-item"><span>Front Coin Pocket:</span> <strong>${escapeHtml(s.data.trouser.frontCoinPocketStyle || 'Not set')}</strong></div>
          </div>
        </div>

        <div class="breakdown-section">
          <div class="breakdown-group-title">4. Waistcoat</div>
          <div class="breakdown-chips-grid">
            <div class="breakdown-item"><span>Style:</span> <strong>${escapeHtml(s.data.waistcoat.style || 'None / Not Selected')}</strong></div>
            <div class="breakdown-item"><span>Piping:</span> <strong>${escapeHtml(s.data.waistcoat.pipingColor)}</strong></div>
            <div class="breakdown-item"><span>Lining:</span> <strong>${escapeHtml(s.data.waistcoat.liningColor)}</strong></div>
          </div>
        </div>

        <div class="breakdown-section">
          <div class="breakdown-group-title">5. Embroidery</div>
          <div class="breakdown-chips-grid">
            <div class="breakdown-item"><span>Shirt:</span> <strong>${escapeHtml(s.data.embroidery.shirtLocation || 'None')}</strong></div>
            <div class="breakdown-item"><span>Pant:</span> <strong>${escapeHtml(s.data.embroidery.pantLocation || 'None')}</strong></div>
            <div class="breakdown-item"><span>Jacket:</span> <strong>${escapeHtml(s.data.embroidery.jacketLocation || 'None')}</strong></div>
            <div class="breakdown-item"><span>Thread:</span> <strong>${escapeHtml(s.data.embroidery.threadColor)}</strong></div>
          </div>
        </div>

        <div class="breakdown-section">
          <div class="breakdown-group-title">6. Measurements (${s.data.measurements.unit.toUpperCase()})</div>
          <div class="breakdown-chips-grid">
            ${Object.entries(s.data.measurements.values || {}).filter(([_, v]) => v != null).map(([k, v]) => `
              <div class="breakdown-item"><span>${escapeHtml(k)}:</span> <strong>${v} ${s.data.measurements.unit}</strong></div>
            `).join('') || '<div class="text-secondary">No dimensions entered yet.</div>'}
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:var(--space-md); margin-top:var(--space-md);">
        <button type="button" id="save-suit-confirm-btn" class="btn btn-primary btn-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          ${isEditing ? 'Update Suit in Vault' : 'Save Suit to Encrypted Vault'}
        </button>
      </div>

      <div id="save-error-msg" class="form-error" style="display:none; margin-top:var(--space-md);"></div>
    </div>
  `;

  const nameInput = container.querySelector('#suit-name-input');
  const notesInput = container.querySelector('#suit-notes-input');
  const confirmBtn = container.querySelector('#save-suit-confirm-btn');

  nameInput.addEventListener('input', (e) => {
    state.currentSuit.name = e.target.value;
    const headerTitle = document.querySelector('#wizard-suit-title-display');
    if (headerTitle) {
      headerTitle.textContent = e.target.value || 'Untitled Bespoke Suit';
    }
  });

  notesInput.addEventListener('input', (e) => {
    state.currentSuit.notes = e.target.value;
  });

  confirmBtn.addEventListener('click', () => {
    handleFinalSave();
  });
}

// ---------------------------------------------------------------------------
// Final Save Logic
// ---------------------------------------------------------------------------
async function handleFinalSave() {
  const suit = state.currentSuit;
  const name = suit.name ? suit.name.trim() : '';
  const errorEl = document.querySelector('#save-error-msg');
  const confirmBtn = document.querySelector('#save-suit-confirm-btn');

  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  if (!name) {
    const msg = 'Please enter a name for your bespoke suit before saving.';
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    } else {
      showToast(msg, 'error');
    }
    document.querySelector('#suit-name-input')?.focus();
    return;
  }

  const prevLabel = confirmBtn ? confirmBtn.innerHTML : '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.setAttribute('aria-busy', 'true');
    confirmBtn.textContent = 'Saving…';
  }

  try {
    const clientId = state.currentClientId || state.currentSuit.clientId || '';
    let saved;
    if (suit.id) {
      saved = await api.updateSuit(suit.id, {
        name,
        notes: suit.notes || '',
        data: suit.data,
        client_id: clientId,
      });
    } else {
      saved = await api.createSuit({
        name,
        notes: suit.notes || '',
        data: suit.data,
        client_id: clientId,
      });
    }

    // Keep active garment project connected to this style sheet + measurements.
    // If measurements are for a client but no workshop project exists yet, create one
    // so the work appears on the Kanban board automatically.
    let projectId = state.currentProjectId;
    if (clientId && !projectId) {
      try {
        const { order, project } = await ensureActiveWorkshopProject(clientId, 'Jacket');
        projectId = project.id;
        state.setCurrentOrderId(order.id);
        state.setCurrentProjectId(project.id);
      } catch (ensureErr) {
        console.warn('[configurator] workshop ensure failed:', ensureErr);
      }
    }

    if (projectId && saved?.id) {
      try {
        await api.updateProject(projectId, {
          suit_config_id: saved.id,
          measurements: suit.data?.measurements?.values || {},
        });
      } catch (linkErr) {
        console.warn('[configurator] project link failed:', linkErr);
      }
    } else if (projectId && suit.data?.measurements?.values) {
      try {
        await api.updateProject(projectId, {
          measurements: suit.data.measurements.values,
        });
      } catch (linkErr) {
        console.warn('[configurator] project measurement sync failed:', linkErr);
      }
    }

    // Explicitly push measurements to client profile when linked (suits API also syncs).
    if (clientId && suit.data?.measurements) {
      try {
        await api.updateClientMeasurements(clientId, {
          unit: suit.data.measurements.unit || 'in',
          values: suit.data.measurements.values || {},
        });
      } catch (measErr) {
        console.warn('[configurator] client measurement sync failed:', measErr);
      }
    }

    const suits = await api.getSuits();
    state.setSuits(suits);
    showToast(clientId ? 'Saved — linked to client profile.' : 'Suit saved to encrypted vault.', 'success');
    state.currentSuit = null;
    if (clientId) {
      router.navigateTo('#client-profile', { id: clientId });
    } else {
      router.navigate('#dashboard');
    }
  } catch (err) {
    const msg = 'Failed to save suit to encrypted vault: ' + err.message;
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    } else {
      showToast(msg, 'error');
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.removeAttribute('aria-busy');
      confirmBtn.innerHTML = prevLabel;
    }
  }
}

/** Load client profile + measurement values into the current draft when linked. */
async function ensureClientLinkage() {
  const clientId = state.currentClientId || state.currentSuit?.clientId || '';
  if (!clientId) {
    state.setLinkedClientInfo(null);
    return;
  }
  try {
    const client = await api.getClient(clientId);
    state.setCurrentClientId(client.id);
    state.setLinkedClientInfo({
      id: client.id,
      name: client.name,
      client_ref: client.client_ref,
      phone: client.phone || '',
    });
    if (state.currentSuit) state.currentSuit.clientId = client.id;

    // Prefer client measurement profile when the draft measurements are empty.
    const draftVals = state.currentSuit?.data?.measurements?.values || {};
    const hasDraftVals = Object.keys(draftVals).some(k => draftVals[k] !== '' && draftVals[k] != null);
    if (!hasDraftVals && client.measurement) {
      applyClientMeasurementToDraft(client.measurement);
    } else if (!state.currentSuit?.name && client.name) {
      // Helpful default name when starting from a client profile.
      if (!state.currentSuit.id) {
        state.currentSuit.name = `${client.name} — Style Sheet`;
      }
    }
  } catch (err) {
    console.warn('[configurator] ensureClientLinkage failed:', err);
    state.setLinkedClientInfo(null);
  }
}

async function hydrateMeasurementsFromClient(clientId) {
  try {
    const meas = await api.getClientMeasurements(clientId);
    applyClientMeasurementToDraft(meas);
  } catch (_) {
    /* no profile yet — leave draft as-is */
  }
}

function applyClientMeasurementToDraft(measurement) {
  if (!state.currentSuit?.data?.measurements || !measurement) return;
  const values = measurement.values
    || (typeof measurement.values_json === 'string'
      ? (() => { try { return JSON.parse(measurement.values_json || '{}'); } catch { return {}; } })()
      : (measurement.values_json || {}));
  state.currentSuit.data.measurements.unit = measurement.unit || state.currentSuit.data.measurements.unit || 'in';
  state.currentSuit.data.measurements.values = { ...(values || {}) };
}

function openClientPickerModal(onPick) {
  const existing = document.getElementById('wizard-client-picker');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'wizard-client-picker';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title">Link a Client</h2>
        <button class="btn-icon modal-close" id="wcp-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <input type="search" id="wcp-search" class="input" placeholder="Search clients…" style="margin-bottom:0.75rem;">
        <div id="wcp-list" class="table-loading">Loading clients…</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="wcp-cancel">Cancel</button>
        <button class="btn btn-primary" id="wcp-new">New Client</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#wcp-close').addEventListener('click', close);
  overlay.querySelector('#wcp-cancel').addEventListener('click', close);
  overlay.querySelector('#wcp-new').addEventListener('click', () => {
    close();
    router.navigate('#client-db');
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  let clients = [];
  const listEl = overlay.querySelector('#wcp-list');
  const renderList = (q = '') => {
    const filtered = clients.filter(c => {
      if (!q) return true;
      const s = q.toLowerCase();
      return (c.name || '').toLowerCase().includes(s)
        || (c.client_ref || '').toLowerCase().includes(s)
        || (c.phone || '').toLowerCase().includes(s);
    });
    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="text-muted">No clients found.</p>';
      return;
    }
    listEl.innerHTML = filtered.map(c => `
      <button type="button" class="cdb-row" data-id="${c.id}" style="display:flex;width:100%;text-align:left;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--color-border);border-radius:8px;background:var(--color-surface);cursor:pointer;margin-bottom:6px;">
        <div>
          <div style="font-weight:600;">${escapeHtml(c.name)}</div>
          <div class="text-muted" style="font-size:0.8rem;">${escapeHtml(c.client_ref || '')}${c.city ? ' · ' + escapeHtml(c.city) : ''}</div>
        </div>
        <span class="badge badge--neutral">${escapeHtml(c.phone || '')}</span>
      </button>
    `).join('');
    listEl.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const client = clients.find(c => c.id === btn.dataset.id);
        close();
        if (client) await onPick(client);
      });
    });
  };

  api.getClients().then(rows => {
    clients = rows || [];
    renderList();
  }).catch(err => {
    listEl.innerHTML = `<p class="form-error" style="display:block;">${escapeHtml(err.message)}</p>`;
  });

  overlay.querySelector('#wcp-search').addEventListener('input', (e) => {
    renderList(e.target.value.trim());
  });
}

// ---------------------------------------------------------------------------
// HTML Renderers for Option Sections & Controls
// ---------------------------------------------------------------------------

function renderOptionSection(title, category, field, options, currentValue) {
  return `
    <div class="wizard-field-section" data-field-group="${field}">
      <div class="wizard-field-header">
        <h3 class="wizard-field-title">${title}</h3>
        <span class="wizard-field-current" id="current-badge-${category}-${field}">
          ${escapeHtml(currentValue || 'Unselected')}
        </span>
      </div>
      <div class="option-grid">
        ${options.map(opt => renderOptionCard(category, field, opt, opt === currentValue)).join('')}
      </div>
    </div>
  `;
}

function renderOptionCard(category, field, value, isSelected) {
  const tip = TOOLTIP_DESCRIPTIONS[value] || '';
  const customIcon = getIconForOption(category, field, value);
  const iconContent = customIcon || getPlaceholderIcon(category, field, value);

  return `
    <div class="option-card ${isSelected ? 'selected' : ''}"
         data-category="${category}"
         data-field="${field}"
         data-value="${escapeHtml(value)}"
         data-tooltip="${escapeHtml(tip)}"
         tabindex="0"
         role="button"
         aria-pressed="${isSelected}">
      <div class="option-card-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="option-card-icon">
        ${iconContent}
      </div>
      <div class="option-card-label">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderBooleanToggleSection(title, category, field, currentValue, falseLabel, trueLabel) {
  return `
    <div class="wizard-field-section" data-field-group="${field}">
      <div class="wizard-field-header">
        <h3 class="wizard-field-title">${title}</h3>
        <span class="wizard-field-current" id="current-badge-${category}-${field}">
          ${currentValue ? trueLabel : falseLabel}
        </span>
      </div>
      <div class="option-grid option-grid-boolean">
        <div class="option-card ${!currentValue ? 'selected' : ''}" 
             data-category="${category}" 
             data-field="${field}" 
             data-boolean-val="false" 
             tabindex="0" 
             role="button">
          <div class="option-card-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="option-card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="4" width="18" height="16" rx="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
            </svg>
          </div>
          <div class="option-card-label">${falseLabel}</div>
        </div>

        <div class="option-card ${currentValue ? 'selected' : ''}" 
             data-category="${category}" 
             data-field="${field}" 
             data-boolean-val="true" 
             tabindex="0" 
             role="button">
          <div class="option-card-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="option-card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 6h16M4 10h16M6 14h12M8 18h8"></path>
            </svg>
          </div>
          <div class="option-card-label">${trueLabel}</div>
        </div>
      </div>
    </div>
  `;
}

function renderColorSection(title, category, field, currentColor) {
  const activeColor = currentColor || '#8B6F47';

  return `
    <div class="wizard-field-section" data-field-group="${field}">
      <div class="wizard-field-header">
        <h3 class="wizard-field-title">${title}</h3>
        <span class="wizard-field-current" id="current-badge-${category}-${field}">
          ${escapeHtml(activeColor)}
        </span>
      </div>

      <div class="swatch-picker-container">
        <div class="swatch-palette-row">
          ${PRESET_PALETTE.map(hex => `
            <button 
              type="button" 
              class="swatch-btn ${hex.toLowerCase() === activeColor.toLowerCase() ? 'selected' : ''}" 
              data-category="${category}" 
              data-field="${field}" 
              data-color="${hex}" 
              style="background-color: ${hex};" 
              title="${hex}">
            </button>
          `).join('')}
        </div>

        <div class="swatch-custom-wrap">
          <input 
            type="color" 
            class="color-input-swatch color-sync-input"
            aria-label="${title}: custom color"
            data-category="${category}" 
            data-field="${field}" 
            value="${activeColor}" 
          />
          <span class="swatch-custom-label">Custom Hex Swatch</span>
        </div>
      </div>
    </div>
  `;
}

function renderTextInputSection(title, category, field, currentValue, placeholder) {
  return `
    <div class="wizard-field-section" data-field-group="${field}">
      <div class="wizard-field-header">
        <h3 class="wizard-field-title">${title}</h3>
      </div>
      <div class="form-group" style="max-width: 480px;">
        <input 
          type="text" 
          class="form-input text-sync-input"
          aria-label="${title}"
          data-category="${category}" 
          data-field="${field}" 
          value="${escapeHtml(currentValue || '')}" 
          placeholder="${placeholder}" 
        />
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Event Binding Helpers
// ---------------------------------------------------------------------------

function bindOptionCards(container, onSelectCallback) {
  container.querySelectorAll('.option-card[data-value]').forEach(card => {
    // ── Selection ──
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      const field = card.dataset.field;
      const val = card.dataset.value;

      state.updateDraftCategory(cat, field, val);

      const section = card.closest('.wizard-field-section');
      if (section) {
        section.querySelectorAll('.option-card').forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');

        const badge = section.querySelector(`#current-badge-${card.dataset.category}-${card.dataset.field}`);
        if (badge) badge.textContent = val;
      }

      if (typeof onSelectCallback === 'function') {
        onSelectCallback(field, val);
      }
    });

    // ── Tooltip: mouse ──
    card.addEventListener('mouseenter', () => {
      const tip = card.dataset.tooltip;
      if (tip) showTooltip(tip, card);
    });
    card.addEventListener('mouseleave', hideTooltip);

    // ── Tooltip: keyboard focus ──
    card.addEventListener('focus', () => {
      const tip = card.dataset.tooltip;
      if (tip) showTooltip(tip, card);
    });
    card.addEventListener('blur', hideTooltip);

    // ── Keyboard activation (Space/Enter) ──
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

function bindBooleanToggles(container) {
  container.querySelectorAll('.option-card[data-boolean-val]').forEach(card => {
    card.setAttribute('aria-pressed', card.classList.contains('selected'));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      const field = card.dataset.field;
      const val = card.dataset.booleanVal === 'true';

      state.updateDraftCategory(cat, field, val);

      const section = card.closest('.wizard-field-section');
      if (section) {
        section.querySelectorAll('.option-card').forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');

        const badge = section.querySelector(`#current-badge-${cat}-${field}`);
        if (badge) badge.textContent = val ? 'Gurkha Wrap Waistband' : 'Standard Waistband';
      }
    });
  });
}

function bindTextInputs(container) {
  container.querySelectorAll('.text-sync-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const cat = e.target.dataset.category;
      const field = e.target.dataset.field;
      state.updateDraftCategory(cat, field, e.target.value);
    });
  });
}

function bindColorPickers(container) {
  // Preset buttons
  container.querySelectorAll('.swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      const field = btn.dataset.field;
      const color = btn.dataset.color;

      state.updateDraftCategory(cat, field, color);

      const section = btn.closest('.wizard-field-section');
      if (section) {
        section.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const colorInput = section.querySelector('.color-sync-input');
        if (colorInput) colorInput.value = color;

        const badge = section.querySelector(`#current-badge-${cat}-${field}`);
        if (badge) badge.textContent = color;
      }
    });
  });

  // Native color picker
  container.querySelectorAll('.color-sync-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const cat = e.target.dataset.category;
      const field = e.target.dataset.field;
      const color = e.target.value;

      state.updateDraftCategory(cat, field, color);

      const section = input.closest('.wizard-field-section');
      if (section) {
        section.querySelectorAll('.swatch-btn').forEach(b => {
          b.classList.toggle('selected', b.dataset.color.toLowerCase() === color.toLowerCase());
        });

        const badge = section.querySelector(`#current-badge-${cat}-${field}`);
        if (badge) badge.textContent = color;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Placeholder Vector Icon Generator (Gated Stage 5 for full custom SVG set)
// ---------------------------------------------------------------------------
function getPlaceholderIcon(category, field, value) {
  switch (category) {
    case 'jacket':
      if (field === 'lapelStyle') {
        return `
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M4 4l8 14 8-14"></path>
            <path d="M4 4l4 8-4 4"></path>
            <path d="M20 4l-4 8 4 4"></path>
          </svg>
        `;
      }
      if (field === 'buttonBreastStyle' || field === 'sleeveButtonStyle') {
        return `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <circle cx="12" cy="12" r="8"></circle>
            <circle cx="10" cy="10" r="1" fill="currentColor"></circle>
            <circle cx="14" cy="10" r="1" fill="currentColor"></circle>
            <circle cx="10" cy="14" r="1" fill="currentColor"></circle>
            <circle cx="14" cy="14" r="1" fill="currentColor"></circle>
          </svg>
        `;
      }
      if (field === 'vent') {
        return `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <rect x="5" y="3" width="14" height="18" rx="1"></rect>
            <line x1="12" y1="12" x2="12" y2="21" stroke-dasharray="2 2"></line>
          </svg>
        `;
      }
      if (field === 'pocketStyle') {
        return `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M5 8h14v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8z"></path>
            <line x1="5" y1="8" x2="19" y2="8"></line>
          </svg>
        `;
      }
      return `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M6 3h12l3 5-9 13L3 8z"></path>
        </svg>
      `;

    case 'shirt':
      if (field === 'collarStyle') {
        return `
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M4 6l8 4 8-4"></path>
            <path d="M4 6l4 8-2 2"></path>
            <path d="M20 6l-4 8 2 2"></path>
          </svg>
        `;
      }
      if (field === 'cuffStyle') {
        return `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
            <rect x="4" y="6" width="16" height="12" rx="1"></rect>
            <circle cx="16" cy="12" r="1.5" fill="currentColor"></circle>
          </svg>
        `;
      }
      return `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
        </svg>
      `;

    case 'trouser':
      return `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M4 4h16v3l-2 13h-4l-2-10-2 10H6L4 7V4z"></path>
        </svg>
      `;

    case 'waistcoat':
      return `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M6 3h12l2 6-4 12-4-3-4 3-4-12 2-6z"></path>
        </svg>
      `;

    case 'embroidery':
      return `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      `;

    default:
      return `
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
