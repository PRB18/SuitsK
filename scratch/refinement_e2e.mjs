import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');
const root = process.env.KRISHNA_REFINEMENT_ROOT;
assert(root && path.dirname(path.resolve(root)) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('krishna-design-'), 'Run only against the isolated krishna-design-* test instance, never a client vault');
assert(fs.existsSync(path.join(root, 'server/index.js')));
const BASE = 'http://127.0.0.1:3737';
const OUT = path.resolve('scratch/refinement-review');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const passed = [];
const errors = [];
const external = [];
const artifacts = [];
const fixtureIds = new Set();
const pass = name => { passed.push(name); console.log('PASS', name); };
let expectedFailure = false;
let expectedHttpErrors = 0;

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), animations: 'disabled' });
  artifacts.push(name + '.png');
}

async function layout(page, name) {
  const result = await page.evaluate(() => {
    const vw = innerWidth;
    const bad = [];
    for (const element of document.querySelectorAll('button, input, textarea, [role=button]')) {
      if (!element.getClientRects().length) continue;
      const r = element.getBoundingClientRect();
      let scrollX = false;
      let scrollY = false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth) scrollX = true;
        if (['auto', 'scroll'].includes(style.overflowY) && parent.scrollHeight > parent.clientHeight) scrollY = true;
      }
      if ((r.left < -1 || r.right > vw + 1) && !scrollX) bad.push(element.id || element.className);
      if ((r.top < -1 || r.bottom > innerHeight + 1) && !scrollY) bad.push(element.id || element.className);
    }
    return { documentOverflow: document.documentElement.scrollWidth > vw, bad };
  });
  assert.deepEqual(result, { documentOverflow: false, bad: [] }, name);
  pass('layout:' + name);
}

try {
  for (const [device, width, height] of [['desktop', 1366, 768], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: device === 'mobile', isMobile: device === 'mobile' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      if (expectedFailure && message.text().includes('500')) expectedHttpErrors++;
      else errors.push(message.text());
    });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin !== BASE) {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    const activate = locator => device === 'mobile' ? locator.tap() : locator.click();
    await page.request.post(BASE + '/api/auth/lock');
    await page.goto(BASE);
    await page.locator('#password-input').waitFor();
    await shot(page, device + '-lock');
    await layout(page, device + '-lock');
    await page.fill('#password-input', 'correct-horse-battery-staple');
    await activate(page.locator('#lock-submit-btn'));
    await page.locator('#empty-create-btn').waitFor();
    await shot(page, device + '-dashboard-empty');
    await layout(page, device + '-dashboard-empty');

    await page.keyboard.press('?');
    await page.locator('.ks-shortcuts-backdrop').waitFor();
    await page.keyboard.press('Tab');
    await page.keyboard.press('n');
    assert.equal(await page.locator('.configurator-wrapper').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'shortcuts-close-btn');
    await shot(page, device + '-shortcuts');
    await layout(page, device + '-shortcuts');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ks-shortcuts-backdrop').count(), 0);
    pass(device + ':dialog Escape after Tab, focus trap, background shortcuts blocked');

    await activate(page.locator('#new-suit-btn'));
    for (let step = 0; step < 7; step++) {
      if (step) await activate(page.locator('#wizard-next-btn'));
      assert.equal(await page.locator('.wizard-progress-bar').getAttribute('aria-valuenow'), String(step + 1));
      assert.equal(await page.locator('[aria-current=step]').getAttribute('data-step'), String(step));
      assert.equal(await page.locator('.wizard-main').evaluate(e => e.scrollTop), 0);
      await layout(page, device + '-step-' + (step + 1));
      await shot(page, device + '-step-' + (step + 1));
      if (step === 0) {
        const card = page.locator('.option-card[data-value]').nth(1);
        await card.focus();
        await page.keyboard.press('Space');
        assert.equal(await card.getAttribute('aria-pressed'), 'true');
        await page.waitForTimeout(160);
        assert.equal(await page.locator('#option-card-tooltip').evaluate(e => getComputedStyle(e).display), 'block');
        const swatch = page.locator('.swatch-btn').nth(2);
        await activate(swatch);
        assert(await swatch.evaluate(e => e.classList.contains('selected')));
        await page.locator('.text-sync-input[data-field=fabricCode]').fill('Review — Navy wool');
        await page.locator('.wizard-main').evaluate(e => { e.scrollTop = e.scrollHeight; });
        await shot(page, device + '-jacket-swatches');
        pass(device + ':option keyboard, tooltip, swatch and fabric input');
      }
      if (step === 2) {
        const yes = page.locator('[data-boolean-val=true]');
        const no = page.locator('[data-boolean-val=false]');
        await yes.focus();
        await page.keyboard.press('Enter');
        assert.equal(await yes.getAttribute('aria-pressed'), 'true');
        await no.focus();
        await page.keyboard.press('Space');
        assert.equal(await no.getAttribute('aria-pressed'), 'true');
        await activate(yes);
        assert.equal(await yes.getAttribute('aria-pressed'), 'true');
        await shot(page, device + '-gurkha-selected');
        pass(device + ':Gurkha Enter, Space and pointer/touch');
      }
      if (step === 5) {
        await page.locator('.measurement-default-input').first().fill('100');
        await activate(page.locator('#add-custom-metric-btn'));
        await page.locator('.custom-name-input').fill('Wrist');
        await page.locator('.custom-val-input').fill('18');
        await activate(page.locator('[data-unit=in]'));
        assert.equal(await page.locator('.custom-val-input').inputValue(), '18');
        await activate(page.locator('[data-unit=cm]'));
        await activate(page.locator('#add-custom-metric-btn'));
        await activate(page.locator('.remove-custom-btn').last());
        assert.equal(await page.locator('.custom-field-row').count(), 1);
        await shot(page, device + '-measurements-custom');
        pass(device + ':standard/custom measurements, add/remove, existing unit behavior');
      }
    }
    await activate(page.locator('#save-suit-confirm-btn'));
    assert.match(await page.locator('#save-error-msg').innerText(), /enter a name/);
    const name = 'Refinement review ' + device + ' ' + Date.now();
    await page.fill('#suit-name-input', name);
    const created = page.waitForResponse(r => r.url() === BASE + '/api/suits' && r.request().method() === 'POST');
    await activate(page.locator('#save-suit-confirm-btn'));
    const saved = await (await created).json();
    if (saved.id) fixtureIds.add(saved.id);
    await page.locator('.suit-card', { hasText: name }).waitFor();
    const list = await (await page.request.get(BASE + '/api/suits')).json();
    const fixture = list.find(s => s.name === name);
    assert(fixture);
    fixtureIds.add(fixture.id);
    const full = await (await page.request.get(BASE + '/api/suits/' + fixture.id)).json();
    assert.equal(full.data.trouser.gurkhaTrouser, true);
    assert.equal(full.data.measurements.custom[0].name, 'Wrist');
    assert.equal(full.data.measurements.custom[0].value, 18);
    pass(device + ':required-name validation and persisted selections/custom measurements');
    await shot(page, device + '-dashboard-populated');
    await layout(page, device + '-dashboard-populated');

    await activate(page.locator('.action-delete'));
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'modal-cancel-btn');
    await shot(page, device + '-delete-confirmation');
    await layout(page, device + '-delete-confirmation');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ks-modal-backdrop').count(), 0);
    assert(await page.locator('.action-delete').evaluate(e => e === document.activeElement));
    pass(device + ':delete cancellation, focus return and Escape after Tab');

    const backupResponse = page.waitForResponse(r => r.url().endsWith('/api/auth/backup'));
    await activate(page.locator('#backup-vault-btn'));
    const backup = await (await backupResponse).json();
    await page.locator('#backup-receipt').waitFor({ state: 'visible' });
    assert.match(await page.locator('#backup-receipt').innerText(), /config\.json/);
    assert((await page.locator('#backup-receipt').innerText()).includes('backups\\' + backup.backupName));
    const backupDir = path.join(root, 'vault/backups', backup.backupName);
    for (const file of ['config.json', 'suits.db']) assert(fs.statSync(path.join(backupDir, file)).size > 0);
    await shot(page, device + '-backup-success');
    await layout(page, device + '-backup-success');
    pass(device + ':backup receipt and both isolated backup files present');

    expectedFailure = true;
    await page.route('**/api/auth/backup', async route => {
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated disk failure' }) });
    });
    await activate(page.locator('#backup-vault-btn'));
    assert.equal(await page.locator('#backup-vault-btn').getAttribute('aria-busy'), 'true');
    await page.getByText(/No new backup is confirmed/).waitFor();
    await page.waitForFunction(() => !document.querySelector('#backup-vault-btn').disabled);
    await shot(page, device + '-backup-failure');
    await page.unroute('**/api/auth/backup');
    expectedFailure = false;
    pass(device + ':backup failure feedback and loading-state recovery');

    await activate(page.locator('.action-edit'));
    await page.locator('.configurator-wrapper').waitFor();
    await page.keyboard.press('7');
    assert.equal(await page.locator('#suit-name-input').inputValue(), name);
    await page.keyboard.press('Escape');
    await page.locator('.dashboard-wrapper').waitFor();
    await activate(page.locator('#new-suit-btn'));
    await page.goBack();
    await page.locator('.dashboard-wrapper').waitFor();
    pass(device + ':edit, shortcut and browser-back navigation');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await activate(page.locator('#new-suit-btn'));
    assert.equal(await page.locator('.step-panel-content').evaluate(e => getComputedStyle(e).animationDuration), '1e-05s');
    await shot(page, device + '-reduced-motion');
    pass(device + ':reduced motion');
    await page.request.delete(BASE + '/api/suits/' + fixture.id);
    fixtureIds.delete(fixture.id);
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  pass('no unexpected browser console/page errors and no external runtime requests');
} finally {
  const context = await browser.newContext();
  for (const id of fixtureIds) await context.request.delete(BASE + '/api/suits/' + id);
  await context.request.post(BASE + '/api/auth/lock');
  await browser.close();
  console.log('Focused checks passed:', passed.length);
  console.log('Expected simulated HTTP 500 console entries:', expectedHttpErrors);
  console.log('Unexpected browser errors:', JSON.stringify(errors));
  console.log('External runtime requests:', JSON.stringify(external));
  console.log('Screenshot directory:', OUT);
  console.log('Screenshots:', artifacts.join(', '));
}
