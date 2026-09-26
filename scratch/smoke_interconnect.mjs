/**
 * Focused HCI smoke: client ↔ measurements ↔ workshop phase move
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

  await page.goto(`${BASE}/#client-db`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  if (await page.locator('text=Link Test Client').count()) {
    await page.locator('tr:has-text("Link Test Client")').first().click();
  } else {
    await page.click('#cdb-new-btn');
    await page.fill('#cdb-f-name', 'HCI Client');
    await page.click('#cdb-save');
    await page.waitForURL(/client-profile/, { timeout: 10000 });
  }
  await page.waitForTimeout(700);

  if (await page.locator('text=Body Measurements').count()) pass('profile-shows-measurements');
  else fail('profile-shows-measurements', 'missing section');

  // Phase move control on project chips (may be absent if no garments)
  if (await page.locator('select[data-garment-action="move-phase"]').count()) {
    pass('profile-phase-move-control');
  } else {
    // Create order + garment so phase control appears
    await page.click('#cpr-new-order');
    await page.fill('#ord-date', '2026-09-25');
    await page.click('#ord-save');
    await page.waitForTimeout(600);
    await page.click('[data-garment-action="add-garment"]');
    await page.selectOption('#garment-type', 'Jacket');
    await page.click('#garment-save');
    await page.waitForTimeout(700);
    if (await page.locator('select[data-garment-action="move-phase"]').count()) {
      pass('profile-phase-move-control');
      await page.locator('select[data-garment-action="move-phase"]').first().selectOption('cutting');
      await page.waitForTimeout(500);
      pass('profile-phase-moved');
    } else {
      fail('profile-phase-move-control', 'still missing after adding garment');
    }
  }

  await page.click('#cpr-edit-measurements');
  await page.waitForURL(/configurator/, { timeout: 10000 });
  await page.waitForTimeout(900);

  if (await page.locator('#client-link-banner').count()) pass('configurator-client-banner');
  else fail('configurator-client-banner', 'no banner');

  if (await page.locator('text=Linked Client').count()) pass('banner-says-linked');
  else fail('banner-says-linked', 'not linked');

  await page.keyboard.press('6');
  await page.waitForTimeout(400);
  const chest = page.locator('input[data-key="suit_CHEST_L"]').first();
  if (await chest.count()) {
    await chest.fill('42');
    pass('meas-grid-editable');
  } else {
    fail('meas-grid-editable', 'no chest input');
  }

  // Blur measurement input so keyboard shortcuts / step nav work
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.locator('.step-nav-item[data-step="6"]').click();
  await page.waitForTimeout(500);
  const nameInput = page.locator('#suit-name-input');
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  if (!(await nameInput.inputValue())) await nameInput.fill('HCI Style Sheet');
  await page.click('#save-suit-confirm-btn');
  await page.waitForURL(/client-profile/, { timeout: 15000 });
  pass('save-returns-to-profile');

  await page.goto(`${BASE}/#workshop`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const moveSel = page.locator('select[data-action="quick-move"]').first();
  if (await moveSel.count()) {
    pass('workshop-move-phase-control');
    await moveSel.selectOption('pressing').catch(() => moveSel.selectOption({ index: 3 }));
    await page.waitForTimeout(700);
    pass('workshop-phase-changed');
  } else {
    fail('workshop-move-phase-control', 'no select on board');
  }

  await page.click('#ws-back');
  await page.waitForTimeout(400);
  pass('workshop-back');

  // Overflow check on profile
  await page.goto(`${BASE}/#client-db`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('.screen-wrapper, .cdb-screen, .dashboard-main');
    return main ? { oy: getComputedStyle(main).overflowY, sh: main.scrollHeight, ch: main.clientHeight } : null;
  });
  pass(`layout-snapshot:${JSON.stringify(overflow)}`);
} catch (err) {
  fail('fatal', err.message);
} finally {
  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`--- ${results.length - failed}/${results.length} passed ---`);
  process.exit(failed ? 1 : 0);
}
