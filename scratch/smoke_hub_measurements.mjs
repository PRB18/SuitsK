/**
 * HCI smoke: Measurements nav opens the B2B vault section (#b2b).
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
    await page.waitForSelector('.ctb-shell', { timeout: 60000 });
    pass('unlock');
  } else {
    pass('already-in-app');
  }

  await page.click('#nav-measurements');
  await page.waitForTimeout(900);
  const hash = await page.evaluate(() => location.hash);
  if (hash === '#b2b') pass('measurements-hash-b2b');
  else fail('measurements-hash-b2b', hash);

  if (await page.locator('#nav-measurements.is-active').count()) pass('measurements-nav-active');
  else fail('measurements-nav-active', 'III not active');

  if (await page.locator('#b2b-panel-container, .b2b-panel').count()) pass('b2b-panel-visible');
  else fail('b2b-panel-visible', 'missing');

  // Hub tile also goes to B2B
  await page.goto(`${BASE}/#congressional`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('#tile-measurements');
  await page.waitForTimeout(900);
  const hash2 = await page.evaluate(() => location.hash);
  if (hash2 === '#b2b') pass('hub-tile-to-b2b');
  else fail('hub-tile-to-b2b', hash2);

} catch (err) {
  fail('fatal', String(err));
} finally {
  await browser.close();
  const ok = results.filter((r) => r.ok).length;
  console.log(`\nPassed: ${ok} / ${results.length}`);
  if (results.some((r) => !r.ok)) process.exit(1);
}
