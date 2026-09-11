# Configurator UI Module

## `public/js/screens/configuratorScreen.js`

### Purpose
Renders and manages the 7-step bespoke suit configuration wizard.

### Structure

**Top-level wrapper:**
```html
<div class="configurator-wrapper">
  <header class="wizard-header">...</header>
  <nav class="wizard-stepper-nav">...</nav>
  <div class="wizard-progress-bar">...</div>
  <main class="wizard-main" id="wizard-main">...</main>
  <footer class="wizard-footer">...</footer>
</div>
```

- **wizard-header:** Top bar with Dashboard back-button, suit title, and "Review & Save" quick-jump button.
- **wizard-stepper-nav:** Clickable step indicator (1-7) with completion badges.
- **wizard-progress-bar:** Visual percentage progress bar (fills as user advances through steps).
- **wizard-main:** Scrollable content area containing the active step panel (`.step-panel-card`).
- **wizard-footer:** Fixed bottom bar with Previous/Next buttons and step counter.

### 7 Steps

Each step calls a dedicated `render*Panel()` function that builds the form UI inside `.step-panel-card`:

1. **renderJacketPanel()** — 14 fields:
   - Option grids: lapel style, lapel detail, button/breast style, sleeve button style, vent, pocket style, shoulder shape, back shape, stomach shape.
   - Text inputs: lapel size, fabric code.
   - Color pickers: piping, buttonhole, lining.

2. **renderShirtPanel()** — 5 fields:
   - Option grids: collar style, cuff style, pocket count, pocket shape (conditional on pocket count), placket style.

3. **renderTrouserPanel()** — 6 fields:
   - Option grids: pleat style, back pocket style, belt loop style, waistband style, front coin pocket style.
   - Boolean toggle: Gurkha trouser (wrap waistband vs standard).

4. **renderWaistcoatPanel()** — 3 fields:
   - Option grid: style (Option B silhouettes).
   - Color pickers: piping, lining.

5. **renderEmbroideryPanel()** — 4 fields:
   - Text inputs: shirt monogram location, pant location, jacket location.
   - Color picker: thread color.

6. **renderMeasurementsPanel()** — Tailoring metrics:
   - Unit toggle (cm / in).
   - 12 standard metric inputs (chest, waist, hip, shoulder width, sleeve length, jacket length, trouser waist, trouser inseam, trouser outseam, neck/collar size, shirt length, bicep).
   - Dynamic custom measurement fields (user can add/remove key-value pairs).

7. **renderSavePanel()** — Final review:
   - Suit name input (required).
   - Tailoring notes textarea.
   - Complete visual breakdown of all configuration choices across all 6 categories.
   - "Save Suit to Encrypted Vault" button.

### Tooltips

**Floating Tooltip System:**
- Single reusable tooltip element (`#option-card-tooltip`) created on-demand via `getTooltipEl()`.
- On hover or focus of any `.option-card`, `showTooltip(text, anchorEl)` displays the explanation from `TOOLTIP_DESCRIPTIONS`.
- Positioned above or below the card (falls back if not enough room).
- `hideTooltip()` clears on mouseleave, blur, or navigation.

### Navigation

**Keyboard Shortcuts (handled in `onWizardKeydown`):**
- `1`-`7`: Jump to specific step.
- `S`: Jump to Save step.
- `←` / `→`: Previous / Next step.
- `Escape`: Return to dashboard (draft stays in memory).

**Click Navigation:**
- Step nav items (`.step-nav-item`) clickable.
- "Dashboard" button (`#wizard-back-vault-btn`) returns to `#dashboard`.
- "Review & Save" button (`#wizard-quick-save-btn`) jumps to step 7.
- Step changes hide tooltips, reset main scroll, focus the new heading and reveal the active step in the horizontally scrolling navigation.
- Active navigation uses `aria-current="step"`; progress ARIA values update with the visible step.
- Both option cards and Gurkha cards support Enter/Space with synchronized `aria-pressed` states. Standard measurement inputs have associated labels.

**Draft State:**
- All field changes are stored in `state.currentSuit.data` via `state.updateDraftCategory(category, field, value)`.
- Draft persists in memory across navigation until explicit save or vault lock.

### Save Flow

**handleFinalSave():**
1. Validates that suit name is non-empty.
2. Checks if `state.currentSuit.id` exists:
   - If yes: `PUT /api/suits/:id` (update).
   - If no: `POST /api/suits` (create).
3. On success: Shows toast, refreshes suit list, clears draft, navigates to `#dashboard`.
4. On error: Displays inline error message in Save panel.
