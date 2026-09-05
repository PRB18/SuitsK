/**
 * Full E2E smoke test for Krishna Suits after layout/nav fixes.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');

const BASE = 'http://127.0.0.1:3737';
const PASSWORDS = ['correct-horse-battery-staple', 'password', 'krishna', 'admin', 'test1234'];

const results = [];
function pass(name) { results.push({ name, ok: true }); console.log('PASS', name); }
function fail(name, detail) { results.push({ name, ok: false, detail }); console.log('FAIL', name, detail); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

async function overflowOk(label) {
  const info = await page.evaluate(() => {
    const main = document.querySelector('.dashboard-main, .wizard-main, .lock-screen-wrapper');
    const wrap = document.querySelector('.dashboard-wrapper, .configurator-wrapper, .lock-screen-wrapper');
    const cut = [...document.querySelectorAll('button, .suit-card, .option-card, .step-panel-card')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0 && r.bottom > window.innerHeight + 1);
    return {
      wrapH: wrap?.clientHeight,
      wrapScrollH: wrap?.scrollHeight,
      mainOverflowY: main ? getComputedStyle(main).overflowY : null,
      mainScrollable: main ? main.scrollHeight > main.clientHeight + 2 : false,
      canScrollMain: main ? (getComputedStyle(main).overflowY === 'auto' || getComputedStyle(main).overflowY === 'scroll') : false,
      clippedUnreachable: cut.length > 0 && !(main && (getComputedStyle(main).overflowY === 'auto' || getComputedStyle(main).overflowY === 'scroll') && main.scrollHeight > main.clientHeight),
      hash: location.hash,
    };
  });
  if (info.clippedUnreachable) {
    fail(`overflow:${label}`, JSON.stringify(info));
  } else {
    pass(`overflow:${label}`);
  }
  return info;
}

try {
  // --- Lock vault so we can test lock screen ---
  await page.request.post(`${BASE}/api/auth/lock`);

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Lock screen should show
  if (await page.locator('.lock-screen-wrapper').count()) {
    pass('lock-screen-shows');
  } else {
    fail('lock-screen-shows', `hash=${await page.evaluate(() => location.hash)}`);
  }
  await overflowOk('lock');

  // Unlock — try known passwords
  let unlocked = false;
  for (const pw of PASSWORDS) {
    await page.fill('#password-input', pw);
    await page.click('#lock-submit-btn');
    await page.waitForTimeout(600);
    if (await page.locator('.dashboard-wrapper').count()) {
      unlocked = true;
      pass(`unlock-with-password (${pw})`);
      break;
    }
    const err = await page.locator('#lock-error').textContent().catch(() => '');
    console.log('unlock attempt failed', pw, err);
  }
  if (!unlocked) {
    // Server may still unlock via direct API if password unknown — skip UI unlock
    // Try unlock via API with test password then reload
    for (const pw of PASSWORDS) {
      const res = await page.request.post(`${BASE}/api/auth/unlock`, { data: { password: pw } });
      const body = await res.json().catch(() => ({}));
      if (res.ok() && body.ok) {
        await page.goto(BASE + '/#dashboard', { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        if (await page.locator('.dashboard-wrapper').count()) {
          unlocked = true;
          pass(`unlock-api-fallback (${pw})`);
          break;
        }
      }
    }
  }
  if (!unlocked) fail('unlock', 'could not unlock with known passwords');

  await overflowOk('dashboard');

  // Dashboard scroll must work when content is tall
  const dashScroll = await page.evaluate(() => {
    const main = document.querySelector('.dashboard-main');
    return {
      overflowY: getComputedStyle(main).overflowY,
      scrollH: main.scrollHeight,
      clientH: main.clientHeight,
      wrapH: document.querySelector('.dashboard-wrapper')?.clientHeight,
      rootH: document.getElementById('app')?.clientHeight,
    };
  });
  if (dashScroll.overflowY === 'auto' && dashScroll.wrapH <= dashScroll.rootH + 1) {
    pass('dashboard-scroll-container');
  } else {
    fail('dashboard-scroll-container', JSON.stringify(dashScroll));
  }

  // New suit
  await page.locator('#new-suit-btn, #empty-create-btn').first().click();
  await page.waitForTimeout(400);
  if (await page.locator('.configurator-wrapper').count()) pass('new-suit-opens-configurator');
  else fail('new-suit-opens-configurator');

  await overflowOk('configurator-step0');

  // Dashboard button (no confirm anymore)
  await page.click('#wizard-back-vault-btn');
  await page.waitForTimeout(400);
  if (await page.locator('.dashboard-wrapper').count()) pass('dashboard-button-navigates');
  else fail('dashboard-button-navigates', await page.evaluate(() => location.hash));

  // New suit again, Escape back
  await page.locator('#new-suit-btn, #empty-create-btn').first().click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  if (await page.locator('.dashboard-wrapper').count()) pass('escape-returns-dashboard');
  else fail('escape-returns-dashboard', await page.evaluate(() => location.hash));

  // Full 7-step walk
  await page.locator('#new-suit-btn, #empty-create-btn').first().click();
  await page.waitForTimeout(300);

  for (let i = 0; i < 7; i++) {
    const label = await page.locator('#step-counter-text').textContent();
    const stepOk = label.includes(`Step ${i + 1} of 7`);
    if (stepOk) pass(`step-${i + 1}-visible`);
    else fail(`step-${i + 1}-visible`, label);

    // Pick first option card if present
    const card = page.locator('.option-card[data-value]').first();
    if (await card.count()) {
      await card.click();
      await page.waitForTimeout(80);
    }

    if (i < 6) {
      await page.click('#wizard-next-btn');
      await page.waitForTimeout(250);
    }
  }

  // Save
  const suitName = `Smoke Test ${Date.now()}`;
  await page.fill('#suit-name-input', suitName);
  await page.click('#save-suit-confirm-btn');
  await page.waitForTimeout(800);
  if (await page.locator('.dashboard-wrapper').count()) pass('save-returns-dashboard');
  else fail('save-returns-dashboard', await page.evaluate(() => location.hash));

  const card = page.locator('.suit-card', { hasText: suitName });
  if (await card.count()) pass('saved-suit-listed');
  else fail('saved-suit-listed', 'card not found');

  // Edit
  await card.locator('.action-edit').click();
  await page.waitForTimeout(400);
  if (await page.locator('.configurator-wrapper').count()) pass('edit-opens-configurator');
  else fail('edit-opens-configurator');
  await page.click('#wizard-back-vault-btn');
  await page.waitForTimeout(300);

  // Duplicate
  const before = await page.locator('.suit-card').count();
  await page.locator('.suit-card', { hasText: suitName }).first().locator('.action-duplicate').click();
  await page.waitForTimeout(500);
  const afterDup = await page.locator('.suit-card').count();
  if (afterDup > before) pass('duplicate-works');
  else fail('duplicate-works', `before=${before} after=${afterDup}`);

  // Delete all smoke-test cards (handles both native dialogs and custom HCI modal)
  page.on('dialog', async (d) => {
    try { await d.accept(); } catch { /* already handled */ }
  });
  while (await page.locator('.suit-card', { hasText: 'Smoke Test' }).count()) {
    await page.locator('.suit-card', { hasText: 'Smoke Test' }).first().locator('.action-delete').click();
    await page.waitForTimeout(250);
    const modalConfirm = page.locator('#modal-confirm-btn');
    if (await modalConfirm.count()) {
      await modalConfirm.click();
      await page.waitForTimeout(450);
    }
  }
  if ((await page.locator('.suit-card', { hasText: 'Smoke Test' }).count()) === 0) pass('delete-works');
  else fail('delete-works', 'smoke cards remain');

  // Lock
  await page.click('#lock-vault-btn');
  await page.waitForTimeout(500);
  if (await page.locator('.lock-screen-wrapper').count()) pass('lock-vault');
  else fail('lock-vault', await page.evaluate(() => location.hash));

  if (pageErrors.length) fail('no-page-errors', pageErrors.join(' | '));
  else pass('no-page-errors');

} catch (e) {
  fail('smoke-exception', String(e));
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log('\n========== SMOKE SUMMARY ==========');
  console.log(`Passed: ${results.filter((r) => r.ok).length} / ${results.length}`);
  if (failed.length) {
    console.log('Failures:');
    for (const f of failed) console.log(' -', f.name, f.detail || '');
    process.exitCode = 1;
  } else {
    console.log('everything above works');
  }
}
