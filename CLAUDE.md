# Krishna Suits Custom — Project Rules & Guidelines

## Standing Rules for All AI Assistants

### 1. Evidence-First Standard
- **Never claim something works without showing real proof** (command output, file contents, API responses, screenshots).
- Partial test coverage must be explicitly disclosed, never presented as complete.
- When reporting bug fixes, state the **actual root cause**, not just "resolved" or "fixed."
- If a test fails, report the failure and error message honestly.

### 2. Schema is Locked Source of Truth
- `public/js/schema.js` is the **single source of truth** for all field names and picklist options across all 6 categories:
  - **Jacket** (14 fields: lapels, buttons, vents, pockets, body shapes, colors, fabric)
  - **Shirt** (5 fields: collar, cuff, pocket count, pocket shape, placket)
  - **Trouser** (6 fields: pleats, back pockets, belt loops, waistband, gurkha, coin pocket)
  - **Waistcoat** (3 fields: style, piping, lining)
  - **Embroidery** (4 fields: shirt, pant, jacket locations, thread color)
  - **Measurements** (unit toggle, 12 standard tailoring metrics, custom dynamic fields)
- **Never invent or modify options** without explicit user approval.
- `TOOLTIP_DESCRIPTIONS` in `public/js/schema.js` maps each option string to its explanation.

### 3. Security Architecture is Locked
- **SQLCipher page-level encryption**: The entire `data/suits.db` file is AES-256-CBC encrypted at the page level. Byte 0 to end is opaque ciphertext.
- **Dual-salt scrypt key derivation** (`N=65536, r=8, p=1, maxmem=~134MB`):
  1. `verifierKey = scrypt(password, verifierSalt, 32)` → stored as hex in `data/config.json` for password validation.
  2. `dbKey = scrypt(password, dbSalt, 32)` → **never stored on disk**; passed directly to SQLCipher via `PRAGMA key = "x'<hex>'"` in memory only.
  3. The two salts are independent random 32-byte values, so `dbKey` cannot be derived from `verifierKey` (or vice versa).
- **Server binding**: Express binds **strictly to `127.0.0.1:3737`** — never `0.0.0.0`.
- **Zero telemetry/cloud**: Completely offline and local.
- **Never commit vault files**: `data/` directory is in `.gitignore` and must never be committed.

### 4. Checkpoint & Testing Discipline
- Present each fix/feature as its own discrete checkpoint with git commits.
- After any code change to `server/` or `public/`, **re-run the full smoke test**:
  ```bash
  node scratch/smoke_e2e.mjs
  ```
  or via the slash command `/smoke-test`.
- Do not test only the one thing that broke — verify all 23 checks pass.

### 5. HCI & Usability Standard (Mandatory)
- **No dead controls**: Every visible button, link, and toggle must work from every state.
- **No layout overflow**: At standard laptop resolutions (~1280×720 / 1366×768), content must scroll inside its container (`.dashboard-main`, `.wizard-main`), never clip unreachably.
- **Way back**: Dashboard navigation button, browser back/hash, and Escape key in wizard must always return to dashboard.
- **Keyboard navigation**: Tab order, visible `:focus-visible`, Enter/Space on option cards, keyboard shortcuts (`N` for new suit, `?` for shortcuts overlay, `1`-`7` for wizard steps, `S` for save step, arrow keys for navigation).
- **Feedback**: Toast notifications for operations, loading states while saving/unlocking, modal confirmations for destructive actions (e.g., delete).

### 6. Documentation Maintenance
- Keep `docs/DECISIONS.md` updated as a living log (newest at top) with: `Decision / Why / Alternatives considered / Status`.
- Keep `docs/code-flow/` files accurate when modifying architecture or module flows.
