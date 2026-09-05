import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');

const BASE = 'http://127.0.0.1:3737';
const errors = [];
const consoleErrors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

async function measureOverflow(label) {
  const info = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const root = document.getElementById('app');
    const wizardMain = document.querySelector('.wizard-main');
    const wrapper = document.querySelector('.configurator-wrapper, .dashboard-wrapper');
    const header = document.querySelector('.wizard-header, .app-header');
    const btn = document.querySelector('#wizard-back-vault-btn');
    const scrollers = [...document.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2;
    }).map((el) => ({
      cls: el.className?.toString?.().slice(0, 80),
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    }));

    return {
      label: document.title,
      docScrollW: docEl.scrollWidth,
      docClientW: docEl.clientWidth,
      docScrollH: docEl.scrollHeight,
      docClientH: docEl.clientHeight,
      bodyOverflow: getComputedStyle(body).overflow,
      rootH: root?.clientHeight,
      rootScrollH: root?.scrollHeight,
      wrapper: wrapper ? {
        cls: wrapper.className,
        h: wrapper.clientHeight,
        scrollH: wrapper.scrollHeight,
        overflow: getComputedStyle(wrapper).overflow,
      } : null,
      wizardMain: wizardMain ? {
        h: wizardMain.clientHeight,
        scrollH: wizardMain.scrollHeight,
        overflowY: getComputedStyle(wizardMain).overflowY,
        minHeight: getComputedStyle(wizardMain).minHeight,
      } : null,
      header: header ? {
        top: header.getBoundingClientRect().top,
        bottom: header.getBoundingClientRect().bottom,
        z: getComputedStyle(header).zIndex,
      } : null,
      dashBtn: btn ? {
        rect: (() => {
          const r = btn.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, left: r.left };
        })(),
        disabled: btn.disabled,
        pointerEvents: getComputedStyle(btn).pointerEvents,
        visible: !!(btn.offsetWidth || btn.offsetHeight),
        coveredBy: (() => {
          const r = btn.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const topEl = document.elementFromPoint(cx, cy);
          return topEl ? {
            tag: topEl.tagName,
            id: topEl.id,
            cls: topEl.className?.toString?.().slice(0, 80),
            isBtn: topEl === btn || btn.contains(topEl),
          } : null;
        })(),
      } : null,
      activeScrollers: scrollers.slice(0, 8),
      hash: location.hash,
    };
  });
  console.log(`\n=== OVERFLOW @ ${label} ===`);
  console.log(JSON.stringify(info, null, 2));
  return info;
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  console.log('Initial hash:', await page.evaluate(() => location.hash));
  console.log('Page errors so far:', errors);
  console.log('Console errors:', consoleErrors);

  // If lock screen, try unlock with test password
  const hasLock = await page.$('#unlock-form, #setup-form, .lock-wrapper');
  if (hasLock) {
    const unlocked = await page.evaluate(async () => {
      const res = await fetch('/api/auth/status');
      return (await res.json()).unlocked;
    });
    console.log('Server unlocked?', unlocked);

    // Fill password if fields exist
    const pw = page.locator('input[type="password"]').first();
    if (await pw.count()) {
      await pw.fill('correct-horse-battery-staple');
      const submit = page.locator('button[type="submit"], .btn-primary').first();
      await submit.click();
      await page.waitForTimeout(800);
      console.log('After unlock attempt hash:', await page.evaluate(() => location.hash));
      console.log('Errors after unlock:', errors);
    }
  }

  await measureOverflow('after-load');

  // Go to configurator
  const newBtn = page.locator('#new-suit-btn, #empty-create-btn').first();
  if (await newBtn.count()) {
    await newBtn.click();
    await page.waitForTimeout(600);
  } else {
    await page.evaluate(() => { location.hash = '#configurator'; });
    await page.waitForTimeout(600);
  }

  console.log('On configurator hash:', await page.evaluate(() => location.hash));
  console.log('Errors on configurator:', errors);
  const ov = await measureOverflow('configurator');

  // Try dashboard button without dialog accept first — check if click reaches
  const btnInfo = ov.dashBtn;
  console.log('\nDashboard button hit-test before click:', JSON.stringify(btnInfo, null, 2));

  page.once('dialog', async (d) => {
    console.log('Confirm dialog appeared:', d.message());
    await d.accept();
  });

  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#wizard-back-vault-btn');
    if (!btn) return { ok: false, reason: 'missing' };
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    btn.click();
    return {
      ok: true,
      topElement: el ? { id: el.id, cls: el.className?.toString?.().slice(0, 60), tag: el.tagName } : null,
      listenersHint: typeof btn.onclick,
    };
  });
  console.log('Programmatic click result:', clicked);
  await page.waitForTimeout(700);
  console.log('Hash after Dashboard click:', await page.evaluate(() => location.hash));
  console.log('Dashboard visible?', await page.locator('.dashboard-wrapper').count());
  console.log('Errors after dash click:', errors);

  // Also try real mouse click path from configurator again
  if ((await page.locator('.dashboard-wrapper').count()) === 0) {
    await page.evaluate(() => { location.hash = '#configurator'; });
    await page.waitForTimeout(500);
    page.once('dialog', async (d) => { await d.accept(); });
    const box = await page.locator('#wizard-back-vault-btn').boundingBox();
    console.log('Btn bounding box:', box);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(700);
      console.log('Hash after mouse click:', await page.evaluate(() => location.hash));
    }
  }

  await measureOverflow('after-dashboard-nav');
} finally {
  console.log('\nFINAL pageerrors:', errors);
  console.log('FINAL consoleerrors:', consoleErrors);
  await browser.close();
}
