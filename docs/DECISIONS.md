# Architecture & Design Decisions Log

This document records key technical decisions made for the Krishna Suits Custom project.  
Format: **Decision / Why / Alternatives considered / Status**

---

### [DEC-010] Dashboard Scroll Container Flex Layout Fix
- **Decision:** Remove `height: 0` from `.dashboard-wrapper` in `public/styles/main.css` and change `.dashboard-main` from `overflow-y: scroll` to `overflow-y: auto`.
- **Why:** The `height: 0` was intended as a flex-shrink trick (similar to `.configurator-wrapper`), but in the dashboard's specific layout with a fixed `.app-header`, it constrained the outer wrapper to exactly match the viewport height (768px) rather than allowing the flex layout to naturally allocate space between the fixed header and the scrollable `.dashboard-main`. This caused the smoke test's `dashboard-scroll-container` check to fail with `wrapH === rootH` instead of proper containment. Additionally, `overflow-y: scroll` forced a permanent scrollbar even when content fit; `auto` only shows the scrollbar when needed.
- **Alternatives considered:** Keep `height: 0` and adjust header positioning (discarded: more complex, breaks other layout assumptions), add negative margin compensation (discarded: fragile hack).
- **Status:** Fixed and verified in smoke test (23/23 passing). Git commit `0afd1ea`.
- **Historical note:** This was a long-standing bug reported in previous sessions and diagnosed via `scratch/diagnose_bugs.js` but left unfixed until 2026-09-05.

---

### [DEC-009] Delete Modal Async Cleanup Race Condition Fix
- **Decision:** Make the delete confirmation modal's confirm button callback `async` and `await onConfirm()` before allowing the event listener to complete, in `public/js/screens/dashboardScreen.js`.
- **Why:** The original synchronous confirm listener called `close()` (which removes the modal backdrop from DOM) and then immediately invoked `onConfirm()` without awaiting it. Because `onConfirm()` is an async function that calls `api.deleteSuit()` followed by `loadSuits()` (which wipes and re-renders `gridContainer.innerHTML`), subsequent UI interactions (like clicking another delete button) attempted to interact with cards while DOM repaints were still occurring. This left lingering modal backdrop elements that intercepted pointer events, causing Playwright's smoke test to timeout with "element intercepts pointer events." Making the callback `async` and awaiting the full deletion + refresh cycle ensures the modal is fully cleaned up before the next interaction.
- **Alternatives considered:** Add longer artificial delays in the smoke test (discarded: masks the root cause, doesn't fix production UX), manually track and cleanup all modal instances globally (discarded: overengineered for a single-modal UI).
- **Status:** Fixed and verified in smoke test (23/23 passing). Git commit `0afd1ea`.

---

### [DEC-008] Dashboard Button Non-Blocking Navigation from Wizard
- **Decision:** Remove blocking `window.confirm("Leave without saving?")` dialog when user clicks "Dashboard" button or presses Escape during wizard configuration. Instead, navigate immediately to `#dashboard` while preserving draft state in `state.currentSuit` (in-memory), and add a re-render trigger in `router.navigate()` when already on the target hash.
- **Why:** The blocking browser `confirm()` dialog caused multiple UX issues: (1) When user canceled the dialog or browser privacy settings blocked it, the Dashboard button appeared completely dead with no visual feedback; (2) The modal confirm interrupted workflow and felt jarring in a bespoke tailoring application; (3) Router had an edge case where clicking the Dashboard button when already on `#dashboard` hash was a no-op, not triggering `handleRoute()`. Preserving the draft in memory until explicit save or vault lock allows frictionless navigation without data loss, and the router fix ensures navigation always works regardless of current hash state.
- **Alternatives considered:** Replace `window.confirm()` with custom modal but still block navigation (discarded: still interrupts flow), auto-save draft to database (discarded: requires draft schema flags and clutters suit vault with incomplete configurations), add visual "unsaved changes" indicator only (discarded: doesn't solve the dead-button bug).
- **Status:** Fixed and verified in smoke test (dashboard-button-navigates passing). Git commit `0afd1ea`.
- **Historical note:** This was a long-standing bug reported in previous sessions. Evidence from `scratch/diagnose_bugs.js` (line 31-32) and `scratch/smoke_dash_edge.mjs` shows it was actively being investigated across multiple scenarios (CANCEL dialog, ACCEPT dialog, forced hash manipulation edge cases) but left unfixed until 2026-09-05. The diagnostic scripts tested three specific failure modes, confirming this was a known multi-layered issue.

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
