---
description: Run the complete E2E smoke test suite
---

# Smoke Test

Runs the full end-to-end smoke test suite (`scratch/smoke_e2e.mjs`) covering all critical paths:

- Lock screen → unlock → dashboard
- New suit → all 7 wizard steps → save
- Edit → duplicate → delete flows
- Layout overflow checks
- Keyboard navigation
- Modal confirmations

## Usage

```bash
/smoke-test
```

## What It Tests

The test validates 23 critical checkpoints:

1. Lock screen loads
2. Overflow checks (lock, dashboard, configurator)
3. Password unlock
4. Dashboard scroll container
5. New suit opens configurator
6. Dashboard button navigation
7. Escape key returns to dashboard
8. All 7 wizard steps (Jacket → Shirt → Trouser → Waistcoat → Embroidery → Measurements → Save)
9. Save returns to dashboard
10. Saved suit appears in list
11. Edit opens configurator
12. Duplicate creates copy
13. Delete with modal confirmation
14. Lock vault
15. No JavaScript errors

## Expected Output

```
PASS lock-screen-shows
PASS overflow:lock
PASS unlock-with-password (correct-horse-battery-staple)
...
========== SMOKE SUMMARY ==========
Passed: 23 / 23
everything above works
```

## On Failure

If any check fails, the output shows:
- Which checkpoint failed
- The actual error or unexpected state
- Exit code 1

Fix the failing check, then re-run `/smoke-test` to verify the fix.
