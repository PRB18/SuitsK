/**
 * scratch/smoke_order_workshop.mjs — Add Order → Measurements → Workshop
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');

const BASE = 'http://127.0.0.1:3737';
const PW = 'test-pass-1234';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

function pass(m) { console.log('PASS', m); }
function fail(m, d) { console.log('FAIL', m, d || ''); }

await page.request.post(`${BASE}/api/auth/lock`);
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.fill('#password-input', PW);
await page.click('#lock-submit-btn');
await page.locator('.ctb-shell').waitFor({ timeout: 45000 });

// Create client via API (session cookie from browser context)
const unlock = await page.request.post(`${BASE}/api/auth/unlock`, {
  data: { password: PW },
});
console.log('api unlock', unlock.status());

const name = `Workshop Auto ${Date.now()}`;
const created = await page.request.post(`${BASE}/api/clients`, {
  data: { name, phone: `9${String(Date.now()).slice(-9)}`, city: 'Test' },
});
const client = await created.json();
if (!created.ok()) {
  fail('create-client', JSON.stringify(client));
  await browser.close();
  process.exit(1);
}
pass(`create-client ${client.id}`);

await page.goto(`${BASE}/#client-profile?id=${client.id}`, { waitUntil: 'networkidle' });
await page.waitForSelector('#cpr-new-order', { timeout: 15000 });

await page.click('#cpr-new-order');
await page.waitForSelector('#order-modal', { state: 'visible' });
const continueLabel = await page.locator('#ord-save').textContent();
if (continueLabel.includes('Measurements')) pass('order-cta-label');
else fail('order-cta-label', continueLabel);

await page.selectOption('#ord-garment', 'Pant');
const del = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
await page.fill('#ord-delivery', del);
await page.click('#ord-save');

await page.locator('.configurator-wrapper').waitFor({ timeout: 20000 });
const counter = await page.locator('#step-counter-text').textContent();
if (counter.includes('Measurements')) pass('landed-on-measurements');
else fail('landed-on-measurements', counter);

const hash = await page.evaluate(() => location.hash);
if (hash.includes('project_id=') && hash.includes('client_id=')) pass('hash-has-project-context');
else fail('hash-has-project-context', hash);

await page.click('#nav-workshop-db');
await page.waitForSelector('#kanban-board', { timeout: 15000 });
await page.waitForTimeout(500);
const boardText = await page.locator('#kanban-board').innerText();
const boardLower = boardText.toLowerCase();
if (boardLower.includes('pant') && boardLower.includes('workshop auto')) pass('workshop-shows-garment');
else fail('workshop-shows-garment', boardText.slice(0, 500));

let failed = errs.length > 0;
// Re-scan console markers poorly — track explicitly
const results = { ok: boardLower.includes('pant') && boardLower.includes('workshop auto') && counter.includes('Measurements') };

console.log('pageerrors', errs);
await browser.close();
process.exit(results.ok && errs.length === 0 ? 0 : 1);
