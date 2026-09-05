# Suits API Module

## `server/suits.js`

### Purpose
Provides CRUD operations for suit configurations via `/api/suits/*` routes. All routes require the database to be unlocked (enforced by `requireUnlocked` middleware in `server/index.js`).

### Key Design Decisions
- **Encryption:** Handled entirely by SQLCipher at the page level. This layer stores and retrieves **plain JSON** in the `data` column. No application-layer encrypt/decrypt calls.
- **PUT semantics:** Full replace of the `data` column — no partial merge.
- **GET /api/suits:** Returns lightweight list only — **no full data blob** (uses `makeSummary()` helper).
- **Duplicate:** Copies data blob as-is with new `id`, new timestamps, and `"(copy)"` suffix added to name.

---

## Routes

### `GET /api/suits`
**Purpose:** List all suits with lightweight summaries.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Navy 2-Piece Business Suit",
    "notes": "Scabal fabric, spring delivery",
    "updatedAt": "2026-09-04T15:30:00.000Z",
    "summary": {
      "lapelStyle": "Peak",
      "collarStyle": "Cutaway",
      "fabricCode": "Scabal Royal 7041",
      "pipingColor": "#8B6F47",
      "fieldCount": 28
    }
  }
]
```

**Helper: `makeSummary(dataJson)`**
- Extracts a small display summary from the data JSON blob.
- Returns: `{ lapelStyle, collarStyle, fabricCode, pipingColor, fieldCount }`.
- `fieldCount` is the number of non-empty fields across all 6 categories (jacket, shirt, trouser, waistcoat, embroidery, measurements). Used to calculate completeness percentage (out of ~32 total picklist/text fields).

---

### `GET /api/suits/:id`
**Purpose:** Fetch a single suit with full configuration data.

**Response:**
```json
{
  "id": "uuid",
  "name": "Navy 2-Piece Business Suit",
  "notes": "Scabal fabric, spring delivery",
  "createdAt": "2026-09-02T10:00:00.000Z",
  "updatedAt": "2026-09-04T15:30:00.000Z",
  "data": {
    "jacket": { "lapelStyle": "Peak", ... },
    "shirt": { ... },
    "trouser": { ... },
    "waistcoat": { ... },
    "embroidery": { ... },
    "measurements": { ... }
  }
}
```

---

### `POST /api/suits`
**Purpose:** Create a new suit configuration.

**Request Body:**
```json
{
  "name": "Navy 2-Piece Business Suit",
  "notes": "Scabal fabric, spring delivery",
  "data": { /* full configuration object */ }
}
```

**Validation:**
- `name` is required, must be non-empty string.
- `notes` defaults to `''`.
- `data` defaults to `{}`.

**Response:** 201 Created with the full suit object (same shape as GET).

---

### `PUT /api/suits/:id`
**Purpose:** Update an existing suit (full replace, not merge).

**Request Body:**
```json
{
  "name": "Updated Suit Name",
  "notes": "Updated notes",
  "data": { /* full new configuration object */ }
}
```

**Semantics:**
- Any field not provided remains unchanged.
- If `data` is provided, it **completely replaces** the existing `data` column.
- No partial merge — the frontend sends the full configuration object every time.

**Response:** 200 OK with the updated suit object.

---

### `POST /api/suits/:id/duplicate`
**Purpose:** Create an exact copy of an existing suit.

**Request Body (optional):**
```json
{
  "name": "Custom Name for Copy"
}
```

**Behavior:**
- Copies the `data` blob exactly as-is.
- Generates new `id` and timestamps.
- If `name` is not provided in request body, defaults to `<original-name> (copy)`.
- Copies `notes` from original.

**Response:** 201 Created with the new suit object.

---

### `DELETE /api/suits/:id`
**Purpose:** Permanently delete a suit.

**Response:**
- 200 OK: `{ ok: true }`
- 404 Not Found: `{ error: "Suit not found." }`
