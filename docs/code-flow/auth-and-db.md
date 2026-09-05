# Authentication & Database Module

## `server/auth.js`

### Purpose
Handles user authentication via master password and manages vault lock/unlock state.

### Key Functions

#### `deriveKey(password, saltHex) → Buffer`
- Uses scrypt with `N=65536, r=8, p=1, maxmem=~134MB` to derive a 32-byte key.
- Takes ~100-200ms per derivation on modern hardware (intentional KDF cost for brute-force resistance).

#### Dual-Salt Architecture
Two independent keys are derived from the same master password using different salts:

1. **Verifier Key** (`verifierKey = scrypt(password, verifierSalt, 32)`)
   - Stored as hex in `data/config.json` alongside `verifierSalt`.
   - Used only for password validation via `crypto.timingSafeEqual()`.
   - Never used for encryption.

2. **Database Key** (`dbKey = scrypt(password, dbSalt, 32)`)
   - **Never stored on disk** — exists only in memory during the unlock session.
   - Passed directly to SQLCipher via `PRAGMA key = "x'<hex>'"`.
   - Independent from `verifierKey` (different salt = different key).

### Routes

#### `GET /api/auth/status`
Returns `{ firstRun: boolean, unlocked: boolean }`.
- `firstRun: true` when `data/config.json` does not exist.
- `unlocked: true` when the database handle is open in `server/db.js`.

#### `POST /api/auth/setup { password }`
First-run initialization:
1. Generates two random 32-byte salts.
2. Derives `verifierKey` and stores `{ verifierSalt, verifierHash, dbSalt }` in `data/config.json`.
3. Derives `dbKey` and passes it to `openDatabase(dbKey, true)` to create the encrypted database.

#### `POST /api/auth/unlock { password }`
Subsequent vault unlocks:
1. Reads `data/config.json`.
2. Derives `verifierKey` and validates against stored `verifierHash`.
3. If valid, derives `dbKey` and calls `openDatabase(dbKey, false)`.
4. On wrong password, delays response by 300ms (rate-limiting).

#### `POST /api/auth/lock`
Closes the database handle via `closeDatabase()` and clears the in-memory key.

---

## `server/db.js`

### Purpose
Manages the SQLCipher-encrypted database handle and schema initialization.

### Encryption Details
- **Library:** `better-sqlite3-multiple-ciphers` (bundles SQLite3MultipleCiphers, the maintained successor to the original SQLCipher project).
- **Cipher:** AES-256-CBC in SQLCipher compatibility mode.
- **HMAC:** HMAC-SHA512 for page authentication.
- **Page Size:** 4096 bytes — every page of the file is encrypted, including header, schema, and all row data.
- **Key Injection:** `PRAGMA key = "x'<64-hex-chars>'"` bypasses SQLCipher's internal PBKDF2 KDF; we use scrypt instead.

### Key Functions

#### `openDatabase(keyBuf, isNew) → Database`
- `keyBuf`: 32-byte key from scrypt derivation.
- `isNew`: true on first run; calls `initSchema()`.
- Sets SQLCipher compatibility mode via `PRAGMA cipher='sqlcipher'`.
- Injects the key as a raw hex literal.
- Verifies the key with `PRAGMA user_version` (throws on wrong key).

#### `closeDatabase()`
Closes the handle and wipes the in-memory reference, making the database locked again.

#### `isUnlocked() → boolean`
Returns `true` if the database handle is open.

#### `getDb() → Database`
Returns the active handle. Throws if called while locked.

#### `initSchema(instance)`
Creates the `suits` table on first run:
```sql
CREATE TABLE IF NOT EXISTS suits (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '{}'
);
```
The `data` column stores plain JSON — SQLCipher encrypts it transparently at the page level.
