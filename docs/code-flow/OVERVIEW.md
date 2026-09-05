# Application Architecture & Code Flow Overview

This document provides a plain-English, step-by-step walkthrough of how Krishna Suits Custom functions from initial launch to database encryption.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Lock Screen   │ ────> │    Dashboard    │ ────> │   Configurator  │
│  (#lock router) │       │(#dashboard route│       │(#configurator)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  /api/auth/*    │       │  /api/suits/*   │       │  /api/suits     │
│  (setup/unlock) │       │  (list/summary) │       │  (POST / PUT)   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   ▼
                        ┌─────────────────────┐
                        │   SQLCipher Engine  │
                        │     data/suits.db   │
                        │    (AES-256-CBC)    │
                        └─────────────────────┘
```

---

## 1. Application Launch & Server Startup
- **Entry point:** `server/index.js`
- **Port:** `3737` on `127.0.0.1` (localhost only, never bound to `0.0.0.0`).
- **Static Assets:** Express serves `public/` directory statically.
- **Client Bootstrap:** When the browser visits `http://127.0.0.1:3737`, `public/index.html` loads `public/js/app.js`.
- **Vault Status Check:** `bootstrap()` in `app.js` calls `api.getStatus()` (`GET /api/auth/status`).
  - If `firstRun: true` or `unlocked: false`: Router routes to `#lock`.
  - If `unlocked: true`: Router routes to `#dashboard`.

---

## 2. Vault Lock & Unlock Flow
- **First Run:**
  1. User enters master password in `renderLockScreen()` (`public/js/screens/lockScreen.js`).
  2. `api.setup(password)` sends `POST /api/auth/setup`.
  3. `server/auth.js` generates two random 32-byte salts: `verifierSalt` and `dbSalt`.
  4. Scrypt derives `verifierKey` (saved to `data/config.json`) and `dbKey` (used in-memory).
  5. `openDatabase(dbKey, true)` in `server/db.js` initializes `data/suits.db` with SQLCipher AES-256-CBC encryption and creates the `suits` table schema.
- **Subsequent Unlocks:**
  1. User enters password on `#lock`.
  2. `POST /api/auth/unlock` validates the password against stored `verifierHash` using `crypto.timingSafeEqual`.
  3. On match, `server/auth.js` derives `dbKey` using `dbSalt` and calls `openDatabase(dbKey, false)`.
  4. SQLCipher verifies the key via `PRAGMA user_version`. If valid, database is unlocked.

---

## 3. Dashboard & Suit Collection
- **Screen:** `renderDashboardScreen()` (`public/js/screens/dashboardScreen.js`).
- **Data Fetch:** Calls `api.getSuits()` (`GET /api/suits`).
- **Lightweight List:** `server/suits.js` queries `SELECT id, name, notes, updated_at, data FROM suits`, but returns only a lightweight summary for each suit via `makeSummary(data)` (lapel style, shirt collar, fabric code, piping color, and completeness percentage).
- **Analytics Panel:** Pure SVG charts rendered without external libraries:
  - Donut Chart: Lapel distribution across all suits.
  - Bar Chart: Top fabrics selected.
  - Gauge Chart: Average configuration completeness.
- **Actions:**
  - **Edit:** Fetches full suit via `api.getSuit(id)`, sets `state.editSuit(suit)`, and navigates to `#configurator`.
  - **Duplicate:** Calls `POST /api/suits/:id/duplicate`, creating an exact data copy with `(copy)` suffix.
  - **Delete:** Opens custom `showDeleteModal()` confirmation dialog, then calls `DELETE /api/suits/:id`.

---

## 4. 7-Step Configurator Wizard
- **Screen:** `renderConfiguratorScreen()` (`public/js/screens/configuratorScreen.js`).
- **Draft Management:** Stored in `state.currentSuit` (`public/js/state.js`).
- **Steps:**
  1. **Jacket:** 14 fields (lapels, breast/buttons, sleeve buttons, vents, pockets, shoulder shape, back shape, stomach shape, piping/buttonhole/lining colors, fabric code).
  2. **Shirt:** 5 fields (collar, cuffs, pocket count, pocket shape, placket).
  3. **Trouser:** 6 fields (pleats, back pocket, belt loops, waistband, Gurkha toggle, coin pocket).
  4. **Waistcoat:** 3 fields (style silhouette, piping color, lining color).
  5. **Embroidery:** 4 fields (shirt, pant, jacket locations, thread color).
  6. **Measurements:** Tailoring unit toggle (`cm` / `in`), 12 standard metrics, plus dynamic custom measurement key-value fields.
  7. **Save:** Configuration name, tailoring notes, full visual breakdown summary, and vault commit button.
- **Tooltips:** Hovering or focusing any option card displays the corresponding explanation from `TOOLTIP_DESCRIPTIONS` in `public/js/schema.js`.

---

## 5. Persistence & Encryption
- **Save Action:** `handleFinalSave()` in `configuratorScreen.js` sends `POST /api/suits` (create) or `PUT /api/suits/:id` (update).
- **Database Storage:** Express route handler stores the configuration JSON string into the `data` column of `suits.db`.
- **Transparent Page Encryption:** SQLCipher encrypts the entire SQLite file page by page. No unencrypted text is ever written to disk.
