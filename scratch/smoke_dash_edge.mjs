import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://127.0.0.1:3737', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// Ensure unlocked client state - server already unlocked
const status = await page.evaluate(async () => (await fetch('/api/auth/status')).json());
console.log('status', status);

if (!(await page.locator('.dashboard-wrapper').count())) {
  await page.evaluate(() => { location.hash = '#dashboard'; });
  await page.waitForTimeout(400);
}

// Measure dashboard cut-off: can we reach bottom of last card?
const dashCut = await page.evaluate(() => {
  const last = document.querySelector('.suit-card:last-child, .empty-vault-card');
  const main = document.querySelector('.dashboard-main');
  const wrap = document.querySelector('.dashboard-wrapper');
  const lastRect = last?.getBoundingClientRect();
  return {
    viewportH: window.innerHeight,
    wrapH: wrap?.clientHeight,
    wrapScrollH: wrap?.scrollHeight,
    mainOverflowY: main ? getComputedStyle(main).overflowY : null,
    lastCardBottom: lastRect?.bottom,
    lastCardCutOff: lastRect ? lastRect.bottom > window.innerHeight : null,
    canScrollBody: document.documentElement.scrollHeight > document.documentElement.clientHeight,
    canScrollMain: main ? main.scrollHeight > main.clientHeight : null,
  };
});
console.log('DASH CUTOFF', JSON.stringify(dashCut, null, 2));

// New suit → try Dashboard with CANCEL on confirm (user might think button broken)
await page.locator('#new-suit-btn, #empty-create-btn').first().click();
await page.waitForTimeout(400);
page.once('dialog', async (d) => { console.log('dialog1', d.message()); await d.dismiss(); });
await page.locator('#wizard-back-vault-btn').click();
await page.waitForTimeout(300);
console.log('After CANCEL confirm, hash=', await page.evaluate(() => location.hash));

// Now ACCEPT
page.once('dialog', async (d) => { await d.accept(); });
await page.locator('#wizard-back-vault-btn').click();
await page.waitForTimeout(400);
console.log('After ACCEPT confirm, hash=', await page.evaluate(() => location.hash), 'dash=', await page.locator('.dashboard-wrapper').count());

// Test: navigate without confirm by setting hash directly mid-wizard then clicking when hash already #dashboard
await page.locator('#new-suit-btn, #empty-create-btn').first().click();
await page.waitForTimeout(300);
await page.evaluate(() => { history.replaceState(null, '', '#dashboard'); });
console.log('Forced hash to #dashboard while still on configurator DOM?', await page.locator('.configurator-wrapper').count());
// Now click Dashboard — navigate sees hash already #dashboard so calls handleRoute()
page.once('dialog', async (d) => { await d.accept(); });
await page.locator('#wizard-back-vault-btn').click();
await page.waitForTimeout(400);
console.log('After forced-hash case: hash=', await page.evaluate(() => location.hash), 'dash=', await page.locator('.dashboard-wrapper').count(), 'config=', await page.locator('.configurator-wrapper').count());

console.log('errors', errors);
await browser.close();
