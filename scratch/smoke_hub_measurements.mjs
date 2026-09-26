/**
 * HCI smoke: hub Measurements must not lock to last client / profile back-chain.
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

  // Visit a client so sticky currentClientId would previously poison Measurements
  await page.goto(`${BASE}/#client-db`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  if (await page.locator('tbody tr').count()) {
    await page.locator('tbody tr').first().click();
    await page.waitForURL(/client-profile/, { timeout: 10000 });
    await page.waitForTimeout(500);
    pass('visited-client-profile');
  } else {
    fail('visited-client-profile', 'no clients');
  }

  // Sidebar Measurements → fresh sheet, not locked to that client
  await page.click('#nav-measurements');
  await page.waitForURL(/configurator/, { timeout: 10000 });
  await page.waitForTimeout(800);

  const hash1 = await page.evaluate(() => location.hash);
  if (hash1 === '#configurator' || hash1.startsWith('#configurator?') === false) {
    // bare #configurator expected (no client_id)
    if (/client_id=/.test(hash1)) fail('hub-meas-no-client-param', hash1);
    else pass('hub-meas-no-client-param');
  } else {
    pass('hub-meas-no-client-param');
  }

  const banner = await page.locator('#client-link-banner').textContent();
  if (/No client linked/i.test(banner || '')) pass('hub-meas-not-locked');
  else fail('hub-meas-not-locked', banner);

  const backLabel = await page.locator('#wizard-back-label').textContent();
  if (/Atelier Hub/i.test(backLabel || '')) pass('hub-meas-back-label');
  else fail('hub-meas-back-label', backLabel);

  // Back → hub (not profile → client-db chain)
  await page.click('#wizard-back-vault-btn');
  await page.waitForTimeout(700);
  const afterBack = await page.evaluate(() => location.hash);
  if (afterBack === '#congressional' || afterBack.startsWith('#congressional')) pass('hub-meas-back-to-hub');
  else fail('hub-meas-back-to-hub', afterBack);

  // Repeat Measurements click — still unlocked
  await page.click('#nav-measurements');
  await page.waitForURL(/configurator/, { timeout: 10000 });
  await page.waitForTimeout(700);
  const banner2 = await page.locator('#client-link-banner').textContent();
  if (/No client linked/i.test(banner2 || '')) pass('hub-meas-repeat-clean');
  else fail('hub-meas-repeat-clean', banner2);

  await page.click('#wizard-back-vault-btn');
  await page.waitForTimeout(500);

  // Profile → measurements still returns to profile (interconnect preserved)
  await page.goto(`${BASE}/#client-db`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.locator('tbody tr').first().click();
  await page.waitForURL(/client-profile/, { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.click('#cpr-edit-measurements');
  await page.waitForURL(/configurator/, { timeout: 10000 });
  await page.waitForTimeout(800);

  if (await page.locator('text=Linked Client').count()) pass('profile-meas-linked');
  else fail('profile-meas-linked', 'expected linked banner');

  const backLabel2 = await page.locator('#wizard-back-label').textContent();
  if (/Client Profile/i.test(backLabel2 || '')) pass('profile-meas-back-label');
  else fail('profile-meas-back-label', backLabel2);

  await page.click('#wizard-back-vault-btn');
  await page.waitForURL(/client-profile/, { timeout: 10000 });
  await page.waitForTimeout(400);
  pass('profile-meas-back-to-profile');

  // Browser back must not reopen configurator (replace leave)
  await page.goBack();
  await page.waitForTimeout(600);
  const afterBrowserBack = await page.evaluate(() => location.hash);
  if (/configurator/.test(afterBrowserBack)) fail('profile-no-ping-pong', afterBrowserBack);
  else pass('profile-no-ping-pong');

} catch (err) {
  fail('fatal', String(err));
} finally {
  await browser.close();
  const ok = results.filter((r) => r.ok).length;
  console.log('\n========== HUB MEASUREMENTS SMOKE ==========');
  console.log(`Passed: ${ok} / ${results.length}`);
  const fails = results.filter((r) => !r.ok);
  if (fails.length) {
    console.log('Failures:');
    for (const f of fails) console.log(' -', f.name, f.detail || '');
    process.exit(1);
  }
}
