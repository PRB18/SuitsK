# Dashboard UI Module

## `public/js/screens/dashboardScreen.js`

### Purpose
Renders the suit collection dashboard with list/grid view, analytics panel, and CRUD actions.

### Structure

**Top-level wrapper:**
```html
<div class="dashboard-wrapper">
  <header class="app-header">...</header>
  <main class="dashboard-main">
    <div class="content-container">
      <div class="dashboard-intro">...</div>
      <div id="analytics-panel-container">...</div>
      <div id="suits-grid-container">...</div>
    </div>
  </main>
  <button class="fab-new-suit">...</button>
</div>
```

- **app-header:** Brand logo, suit count badge, help button (?), Lock Vault button, New Suit CTA button.
- **dashboard-main:** Scrollable content area (`.dashboard-main` has `overflow-y: auto`).
- **analytics-panel:** Collapsible analytics charts (donut, bar, gauge).
- **suits-grid:** Grid of suit cards (`.suit-card`).
- **fab-new-suit:** Floating action button (bottom-right, always visible).

### Analytics Panel

**renderAnalyticsPanel(container, suits):**
- Hidden entirely when vault is empty.
- Renders three pure SVG charts (no external libraries):

**1. Donut Chart:** Lapel style distribution
- Extracts `lapelStyle` from each suit's summary.
- Renders colored segments proportional to counts.
- Legend shows top 4 styles + "Others".

**2. Bar Chart:** Top fabrics used
- Extracts `fabricCode` from summaries (where present).
- Shows top 5 fabrics with horizontal bars.
- Bars animate on render (width: 0 → target%).

**3. Gauge Chart:** Average completeness
- Calculates avg `fieldCount` across all suits (out of ~32 total fields).
- Semi-circle arc fills from 0° to completeness%.
- Color-coded: red <30%, amber <60%, green ≥60%.

### Suit Cards

**createSuitCard(suit, ...):**
Renders a card for each suit with:
- **Header:** Suit name, last updated date.
- **Notes:** Tailoring notes (if present).
- **Summary badges:** Lapel style, shirt collar, fabric code, piping color (with color swatch).
- **Completeness bar:** Mini progress bar showing filled fields / 32.
- **Actions:**
  - **Edit button** (primary): Fetches full suit via `api.getSuit(id)`, calls `state.editSuit(suit)`, navigates to `#configurator`.
  - **Duplicate button**: Calls `api.duplicateSuit(id)`, shows toast, reloads suit list.
  - **Delete button**: Opens `showDeleteModal()` confirmation, then calls `api.deleteSuit(id)`.

### Delete Modal

**showDeleteModal(suitName, onConfirm):**
- Creates custom DOM modal (`.ks-modal-backdrop` + `.ks-modal`).
- Modal structure:
  ```html
  <div class="ks-modal-backdrop">
    <div class="ks-modal">
      <div class="ks-modal__icon">...</div>
      <h3 class="ks-modal__title">Delete Suit?</h3>
      <p class="ks-modal__body">...</p>
      <div class="ks-modal__actions">
        <button id="modal-cancel-btn">Cancel</button>
        <button id="modal-confirm-btn">Delete Permanently</button>
      </div>
    </div>
  </div>
  ```
- **Cancel button:** Closes modal via `backdrop.remove()`.
- **Confirm button:** Closes modal, **awaits** `onConfirm()` callback (async as of bug fix).
- **Escape key:** Closes modal.
- **Click backdrop:** Closes modal.
- **Focus safety:** Cancel button receives focus on open (prevents accidental deletion).

### Keyboard Shortcuts

**onDashboardKey event handler:**
- `N`: Open new suit configurator.
- `?`: Show keyboard shortcuts overlay (`showShortcutOverlay()`).
- Shortcuts only trigger when not typing in an input/textarea.

### Keyboard Shortcut Overlay

**showShortcutOverlay():**
- Shows a modal dialog listing all available shortcuts.
- Displays shortcuts for both Dashboard and Configurator screens.
- Close via Escape or "X" button.
