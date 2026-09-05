# Architecture & Design Decisions Log

This document records key technical decisions made for the Krishna Suits Custom project.  
Format: **Decision / Why / Alternatives considered / Status**

---

### [DEC-007] Custom DOM Delete Modal with Asynchronous Cleanup
- **Decision:** Use a custom HTML/CSS modal dialog (`.ks-modal-backdrop` and `.ks-modal`) with `await onConfirm()` instead of browser native `window.confirm()` or un-awaited callbacks.
- **Why:** Browser native `confirm()` looks jarring, inconsistent with the bespoke tailoring aesthetic, and can be suppressed or blocked by browsers. Moving to custom DOM modals provides proper visual hierarchy and focus trapping. Making the callback `async` ensures that database deletion and DOM refresh complete cleanly before removing modal DOM listeners.
- **Alternatives considered:** Native `confirm()` (discarded: ugly, breaks styling, blocks thread), third-party modal library (discarded: unnecessary dependency).
- **Status:** Implemented & Verified in `public/js/screens/dashboardScreen.js`.

---

### [DEC-006] Direct Navigation from Wizard without Blocking Confirm
- **Decision:** When user clicks "Dashboard" button or presses Escape during wizard configuration, navigate immediately to `#dashboard` while keeping draft state in memory (`state.currentSuit`), rather than interrupting with a blocking confirm dialog.
- **Why:** The previous `window.confirm("Leave without saving?")` caused usability friction: if a user canceled or if the browser swallowed the dialog, the button appeared dead. Storing the draft in memory until explicit vault save or lock allows frictionless navigation without data loss.
- **Alternatives considered:** Blocking confirm prompt (discarded: caused "dead button" bug complaints), auto-save to DB as draft (discarded: requires draft schema flags and cluttering the suit vault).
- **Status:** Implemented in `public/js/screens/configuratorScreen.js`.

---

### [DEC-005] Tooltip Explanation System on Option Cards
- **Decision:** Create a parallel lookup table `TOOLTIP_DESCRIPTIONS` in `public/js/schema.js` mapping all 94+ picklist option values to clear, 1-sentence explanations. Render floating tooltips on mouse hover and keyboard focus.
- **Why:** Tailoring terminology (e.g., "Milanese by hand", "Barchetta", "Gurkha wrap", "French Placket", "HS4") contains domain-specific jargon that needs clear explanation. Combining vector visual icons with explanatory tooltips provides both visual recognition and semantic clarity.
- **Alternatives considered:** Inline text under cards (discarded: takes too much vertical grid space), help modal (discarded: breaks configuration flow).
- **Status:** Implemented in `public/js/schema.js` and `public/js/screens/configuratorScreen.js`.

---

### [DEC-004] Design System: Warm Brasswood Palette & Typography
- **Decision:** Use warm tailored brasswood accent (`#8B6F47`), cream canvas (`#F7F4EF`), obsidian darks (`#1C1C1E`), with *Cormorant Garamond* display serif and *Inter* UI sans-serif.
- **Why:** Evokes the luxury, artisanal atmosphere of bespoke Savile Row / high-end tailoring houses while maintaining crisp UI readability.
- **Alternatives considered:** Standard generic dark mode (discarded: lacks bespoke craftsmanship feel), pure monochrome (discarded: lacks warmth).
- **Status:** Implemented in `public/styles/main.css`.  
*(Note: Visual styling choices inferred from codebase, unconfirmed historical reasoning)*

---

### [DEC-003] Canonical Single-Source Schema (`public/js/schema.js`)
- **Decision:** Centralize all configuration categories, fields, picklist options, and default values in `public/js/schema.js` as the strict single source of truth, audited against 16 tailor reference sheets.
- **Why:** Guarantees consistency between wizard steps, validation, summary cards, and database storage. Prevents schema drift across different UI views.
- **Alternatives considered:** Server-side schema endpoint (discarded: adds unnecessary latency to offline SPA), scattered schema definitions across screen files (discarded: high risk of inconsistency).
- **Status:** Implemented in `public/js/schema.js`.  
*(Note: Specific auditing process inferred from codebase, unconfirmed historical reasoning)*

---

### [DEC-002] Two-Salt Scrypt Key Derivation Architecture
- **Decision:** Derive two independent 32-byte keys from the master password using scrypt (`N=65536, r=8, p=1, maxmem=134MB`):
  1. `verifierKey = scrypt(password, verifierSalt, 32)` → stored in `data/config.json` for password verification.
  2. `dbKey = scrypt(password, dbSalt, 32)` → **never stored on disk**; passed directly in-memory to SQLCipher.
- **Why:** If an attacker obtains `config.json`, they cannot decrypt `suits.db` without brute-forcing the master password. The database encryption key is mathematically independent from the verifier hash because they use different random 32-byte salts.
- **Alternatives considered:** Single key stored in memory only with no verifier file (discarded: cannot distinguish between wrong password vs corrupt DB without crashing SQLCipher handle), PBKDF2 (discarded: scrypt offers superior ASIC/GPU memory-hardness).
- **Status:** Implemented in `server/auth.js` and `server/db.js`.

---

### [DEC-001] SQLCipher Page-Level Database Encryption
- **Decision:** Use `better-sqlite3-multiple-ciphers` with SQLCipher compatibility mode (AES-256-CBC, HMAC-SHA512, 4096-byte page size) to encrypt the entire SQLite database file (`data/suits.db`).
- **Why:** Provides transparent, comprehensive encryption at rest for all bespoke customer suit data and tailoring measurements. From byte 0, the `.db` file is complete ciphertext with zero plaintext headers or leaked metadata.
- **Alternatives considered:** Application-level JSON blob encryption with standard SQLite (discarded: leaks SQLite headers, schema, row counts, and timestamps in plaintext), plaintext SQLite (discarded: fails privacy/vault requirement).
- **Status:** Implemented in `server/db.js`.
