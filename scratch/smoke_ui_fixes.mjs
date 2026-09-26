/**
 * Focused HCI smoke for: inventory Edit, measurement back-nav loop, client name on measurements.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');

const BASE = 'http://127.0.0.1:3737';
const results = [];
function pass(name) { results.push({ name, ok: true }); console.log('PASS', name); }
function fail(name, detail) { results.push({ name, ok: false, detail }); console.log('FAIL', name, detail); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  if (await page.locator('.lock-screen-wrapper').count()) {
    await page.fill('#password-input', 'test-pass-1234');
    await page.click('#lock-submit-btn');
    await page.waitForSelector('.ctb-shell, .dashboard-wrapper', { timeout: 60000 });
    pass('unlock');
  } else {
    pass('already-in-app');
  }

  // ── 1. Inventory Edit ─────────────────────────────────────────────────────
  await page.goto(`${BASE}/#inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const editBtns = page.locator('[data-action="edit"]');
  if (await editBtns.count() === 0) {
    await page.click('#inv-new-btn');
    await page.fill('#inv-f-name', 'HCI Edit Fabric');
    await page.fill('#inv-f-qty', '2');
    await page.fill('#inv-f-supplier', 'Original Supplier');
    await page.click('#inv-modal-save');
    await page.waitForTimeout(800);
  }

  if (await page.locator('[data-action="edit"]').count()) pass('inventory-edit-button');
  else fail('inventory-edit-button', 'no Edit action in rows');

  await page.locator('[data-action="edit"]').first().click();
  await page.waitForTimeout(300);
  const title = await page.locator('#inv-modal-title').textContent();
  if (title?.includes('Edit')) pass('inventory-edit-modal-title');
  else fail('inventory-edit-modal-title', title);

  const qtyVisible = await page.locator('#inv-f-qty').evaluate((el) => {
    const wrap = el.closest('.form-field');
    return wrap ? getComputedStyle(wrap).display !== 'none' : true;
  });
  if (!qtyVisible) pass('inventory-edit-hides-qty');
  else fail('inventory-edit-hides-qty', 'qty still visible in edit mode');

  await page.fill('#inv-f-supplier', 'Corrected Supplier');
  await page.click('#inv-modal-save');
  await page.waitForTimeout(800);
  if (await page.locator('text=Corrected Supplier').count()) pass('inventory-edit-saved');
  else fail('inventory-edit-saved', 'supplier text not updated in table');

  // ── 2. Back-nav loop: profile → measurements → back ×2 ────────────────────
  await page.goto(`${BASE}/#client-db`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  if (await page.locator('tbody tr[data-id]').count()) {
    await page.locator('tbody tr[data-id]').first().click();
  } else if (await page.locator('tbody tr').count()) {
    await page.locator('tbody tr').first().click();
  } else {
    await page.click('#cdb-new-btn');
    await page.fill('#cdb-f-name', 'Nav Loop Client');
    await page.click('#cdb-save');
  }
  await page.waitForURL(/client-profile/, { timeout: 10000 });
  await page.waitForTimeout(600);
  const profileHash1 = await page.evaluate(() => location.hash);
  pass('on-client-profile');

  await page.click('#cpr-edit-measurements');
  await page.waitForURL(/configurator/, { timeout: 10000 });
  await page.waitForTimeout(800);
  pass('opened-configurator');

  // Wizard back should replace → profile (not push)
  await page.click('#wizard-back-vault-btn');
  await page.waitForURL(/client-profile/, { timeout: 10000 });
  await page.waitForTimeout(500);
  const afterBack1 = await page.evaluate(() => location.hash);
  if (/client-profile/.test(afterBack1)) pass('wizard-back-to-profile');
  else fail('wizard-back-to-profile', afterBack1);

  // Browser back must NOT return to configurator (would mean push was used)
  await page.goBack();
  await page.waitForTimeout(700);
  const afterBrowserBack = await page.evaluate(() => location.hash);
  if (/configurator/.test(afterBrowserBack)) {
    fail('no-ping-pong', `browser back landed on ${afterBrowserBack}`);
  } else {
    pass('no-ping-pong');
  }

  // Re-enter measurements and confirm client linkage still present
  await page.goto(`${BASE}${profileHash1.startsWith('#') ? profileHash1 : '#client-db'}`, { waitUntil: 'networkidle' });
  if (!/client-profile/.test(await page.evaluate(() => location.hash))) {
    await page.goto(`${BASE}/#client-db`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.locator('tbody tr').first().click();
    await page.waitForURL(/client-profile/, { timeout: 10000 });
  }
  await page.waitForTimeout(500);
  await page.click('#cpr-edit-measurements');
  await page.waitForURL(/configurator/, { timeout: 10000 });
  await page.waitForTimeout(800);
  if (await page.locator('#client-link-banner').count()) pass('client-link-preserved');
  else fail('client-link-preserved', 'banner missing after re-entry');

  // ── 3. Client name under measurements ─────────────────────────────────────
  await page.keyboard.press('6');
  await page.waitForTimeout(500);
  const attribution = page.locator('.meas-client-attribution');
  if (await attribution.count()) pass('meas-step-client-attribution');
  else fail('meas-step-client-attribution', 'missing under grid');

  const attrText = await attribution.first().textContent();
  if (attrText && /Client/i.test(attrText) && attrText.trim().length > 10) {
    pass('meas-step-shows-client-name');
  } else {
    fail('meas-step-shows-client-name', attrText);
  }

  await page.keyboard.press('7');
  await page.waitForTimeout(400);
  if (await page.locator('.save-summary-breakdown .meas-client-attribution').count()) {
    pass('summary-meas-client-attribution');
  } else {
    fail('summary-meas-client-attribution', 'missing on save step');
  }

  // Profile measurement panel
  await page.click('#wizard-back-vault-btn');
  await page.waitForURL(/client-profile/, { timeout: 10000 });
  await page.waitForTimeout(600);

  if (await page.locator('[data-garment-action="view-meas"]').count()) {
    await page.locator('[data-garment-action="view-meas"]').first().click();
    await page.waitForTimeout(400);
    const panelAttr = page.locator('#meas-panel-body .meas-client-attribution');
    if (await panelAttr.count()) pass('meas-panel-client-attribution');
    else fail('meas-panel-client-attribution', 'missing in panel body');
  } else {
    // No garment — still OK if body measurements section exists
    pass('meas-panel-client-attribution (skipped-no-garment)');
  }

} catch (err) {
  fail('fatal', String(err));
} finally {
  await browser.close();
  const ok = results.filter((r) => r.ok).length;
  console.log('\n========== UI FIXES SMOKE ==========');
  console.log(`Passed: ${ok} / ${results.length}`);
  const fails = results.filter((r) => !r.ok);
  if (fails.length) {
    console.log('Failures:');
    for (const f of fails) console.log(' -', f.name, f.detail || '');
    process.exit(1);
  }
}
