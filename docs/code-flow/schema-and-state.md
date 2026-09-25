# Schema & State Management

## `public/js/schema.js`

### Purpose
The **single source of truth** for all bespoke suit configuration options, field names, and tooltip explanations. All other modules (configurator wizard, dashboard summary, validation) reference this file.

### Exports

#### `TAILORING_SCHEMA`
Centralized schema object defining all configuration categories and their fields:

```javascript
{
  jacket: {
    lapelStyle: ['Notch', 'Peak', 'Shawl', ...],
    lapelSize: 'text',  // write-in dimension
    lapelDetail: ['Milanese by hand', 'Eyelet by hand', 'No-em seam'],
    buttonBreastStyle: ['1 Button Suit', '2 Button Suit', ...],
    sleeveButtonStyle: ['HS3', 'H4', 'HS5', 'HS4', 'Same as Sample'],
    vent: ['Single Vent', 'Double Vent'],
    pocketStyle: ['Straight Bone', 'Slanted Bone', ...],
    shoulderShape: ['Square', 'Regular', 'Sloping'],
    backShape: ['Normal', 'Erect', 'Hunched'],
    stomachShape: ['Flat', 'Slight', 'Large'],
    pipingColor: 'color',      // hex picker
    buttonholeColor: 'color',
    liningColor: 'color',
    fabricCode: 'text'         // write-in code
  },
  shirt: { ... },
  trouser: { ... },
  waistcoat: { ... },
  embroidery: { ... },
  measurements: {
    units: ['cm', 'in'],
    defaultFields: [
      { key: 'chest', label: 'Chest' },
      { key: 'waist', label: 'Waist' },
      ...
    ]
  }
}
```

#### `createEmptyDraft()`
Returns a well-structured empty draft object matching the audited schema with sensible defaults (e.g., default colors set to brasswood accent `#8B6F47`, cream lining `#E2DDD6`, etc.).

#### `TOOLTIP_DESCRIPTIONS`
A parallel lookup map with **94+ entries** mapping each option string to a 1-sentence plain-language explanation:

```javascript
{
  'Peak': 'The lapel tip points upward and outward past the collar seam, giving a strong, wide, formal silhouette.',
  'Milanese by hand': 'The lapel buttonhole is hand-stitched in the Milanese method, producing a raised, flower-like finish...',
  'HS3': '3 sleeve buttons, half-stitched (the innermost buttonhole is functional/kissing — it can actually be unbuttoned).',
  'Barchetta': 'A curved, boat-shaped breast pocket with no flap, curving upward at the ends — an Italian design hallmark.',
  'Gurkha Wrap Waistband': 'Two overlapping fabric straps that wrap and cross over the front, buckled at the side...',
  ...
}
```

Used by the configurator wizard to show styled hover/focus tooltips on all option cards.

---

## `public/js/state.js`

### Purpose
Client-side state management for the suit vault and current draft configuration.

### Exports

#### `state` singleton
```javascript
{
  status: { firstRun: boolean, unlocked: boolean },
  suits: [],              // List of all suits from GET /api/suits
  currentSuit: null,      // Draft being edited in configurator
  currentStep: 0,         // Wizard step index (0-6)
  
  setStatus(status),
  setSuits(suits),
  startNewSuit(),         // Initializes currentSuit with createEmptyDraft()
  editSuit(suit),         // Loads existing suit into currentSuit for editing
  setStep(index),         // Updates wizard step
  updateDraftCategory(category, field, value)  // Updates currentSuit.data
}
```

### Key Behaviors

**Client measurement ownership:**
- Creating a client also creates one blank `client_measurements` record.
- `GET /api/clients/:id` returns the linked measurement profile and dated `client_visits`.
- `PUT /api/clients/:id/measurements` replaces the client-level measurement values; garment-project measurements remain available for order-specific overrides.
- `POST /api/clients/:id/visits` records a visit date and purpose.

**Draft Persistence:**
- `currentSuit` stays in memory during wizard navigation.
- No auto-save to database — suit is only persisted on explicit "Save" action.
- Navigating away from configurator (Dashboard button, Escape, browser back) keeps the draft in `state.currentSuit` until:
  - User explicitly saves the suit.
  - User locks the vault (wipes all client state).

**Edit vs. Create:**
- `startNewSuit()`: Creates fresh draft with `id: null`.
- `editSuit(suit)`: Loads existing suit with `id` intact.
- Save action checks for `id` presence: `id ? PUT : POST`.
