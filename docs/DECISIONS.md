# Architecture & Design Decisions Log

This document records key technical decisions made for the Krishna Suits Custom project.  
Format: **Decision / Why / Alternatives considered / Status**

---

### [DEC-013] Native macOS Client Package Path
- **Decision:** Keep the Inno Setup installer for Windows and add a macOS package staging script with a `.command` launcher. Resolve the encrypted vault under the platform's standard application-data directory, including `~/Library/Application Support/KrishnaSuitsCustom/data` on macOS.
- **Why:** The Windows `.exe` and `.cmd` launcher cannot run on macOS, and the native SQLite dependency must be installed for the target operating system and architecture. A Mac build must therefore be assembled on macOS rather than relabeled as a Windows installer.
- **Alternatives considered:** Tell users to bypass Gatekeeper (rejected: it does not make a Windows executable compatible with macOS); store data beside the package (rejected: updates and extraction can overwrite application data); cross-compile the native dependency on Windows (rejected: unreliable for the client's Mac architecture).
- **Status:** Implemented in `server/storage.js`, `Start-Krishna-Suits.command`, `Stop-Krishna-Suits.sh`, and `scripts/build-macos-package.sh`. macOS staging requires Node.js 22+ and must be run on macOS; Apple signing/notarization is still a release-distribution step.

---

### [DEC-012] Atelier UI Refinement and Keyboard-Safe Controls
- **Decision:** Retain the existing local garment diagrams and locked schema; refine typography, spacing, brass selection states, mobile layouts and reduced-motion transitions. Keep backup results visible on the dashboard with relative location and paired-file guidance. Share focus containment and Escape cleanup across existing dialogs.
- **Why:** Gurkha cards lacked keyboard activation, dialog Escape handlers used `once: true` (so Tab consumed them), and progress ARIA values did not update with navigation. Fixed-width Gurkha tracks could exceed a mobile panel. The backup action previously supplied only a transient timestamp toast.
- **Alternatives considered:** New 3D assets/dependencies (rejected: no approved licensed asset pipeline); broad redesign (deferred until this stage is reviewed). Research accessed Suitsupply, Oliver Wicks and Drake’s; Proper Cloth and Indochino blocked automated access.
- **Status:** 2026-09-11: baseline and final smoke tests pass 23/23; `scratch/refinement_e2e.mjs` passes 47 focused checks across 1366×768 and 390×844. Screenshots remain local under `scratch/refinement-review/`. Tests use a disposable server copy and temporary vault, not client data. Backup file presence is tested; restore, installer lifecycle and physical-device testing are not covered by this UI stage.

---

### [DEC-011] Per-User Local Vault Storage and Encrypted Backups
- **Decision:** Store `config.json`, `suits.db`, and timestamped backup folders under `%LOCALAPPDATA%\\KrishnaSuitsCustom\\data`. Migrate the legacy project `data/` folder only when the AppData vault is empty. Add a dashboard backup action that copies both vault files together while the vault is unlocked.
- **Why:** Application updates must not overwrite client suit data. The database remains SQLCipher-encrypted, and backups preserve the encrypted database plus its matching salts/configuration without creating plaintext exports or cloud copies.
- **Alternatives considered:** Keep data beside the application (discarded: updates and uninstallers can overwrite or remove it), back up only `suits.db` (discarded: the matching `config.json` salts are required), cloud backup (discarded: violates the offline/local security requirement).
- **Status:** Implemented in `server/storage.js`, `server/auth.js`, `server/db.js`, and the dashboard backup action. Verified by AppData migration, unlock, backup file checks, and the 23-check smoke test.

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
- **Historical note:** Inferred from evidence in scratch/diagnose_bugs.js (line 31-32) and scratch/smoke_dash_edge.mjs, not confirmed against original bug reports. The diagnostic scripts tested three specific failure modes (CANCEL dialog, ACCEPT dialog, forced hash manipulation edge cases), indicating a known multi-layered issue that had been diagnosed but remained unfixed in the codebase.

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
