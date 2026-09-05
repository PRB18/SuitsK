/**
 * Deep overflow audit — find every element that spills viewport or parent.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3737';
const OUT = path.resolve('scratch/overflow_shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

async function unlock() {
  await page.request.post(`${BASE}/api/auth/unlock`, {
    data: { password: 'correct-horse-battery-staple' },
  }).catch(() => {});
}

function auditScript() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const offenders = [];

  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) continue;
    const cs = getComputedStyle(el);
    const parent = el.parentElement;
    const pr = parent?.getBoundingClientRect();

    const spillRight = r.right > vw + 1;
    const spillLeft = r.left < -1;
    const spillBottom = r.bottom > vh + 1;
    const spillTop = r.top < -1;

    let parentSpillX = false;
    let parentSpillY = false;
    if (pr && parent) {
      const pOverflowX = getComputedStyle(parent).overflowX;
      const pOverflowY = getComputedStyle(parent).overflowY;
      const parentClipsX = pOverflowX === 'hidden' || pOverflowX === 'auto' || pOverflowX === 'scroll';
      const parentClipsY = pOverflowY === 'hidden' || pOverflowY === 'auto' || pOverflowY === 'scroll';
      // spill relative to parent box
      if (r.right > pr.right + 1 || r.left < pr.left - 1) parentSpillX = true;
      if (r.bottom > pr.bottom + 1 || r.top < pr.top - 1) parentSpillY = true;
      // only count if parent does NOT scroll/clip that axis (visible overflow)
      if (parentClipsX) parentSpillX = false;
      if (parentClipsY) parentSpillY = false;
    }

    // Elements intentionally below fold inside a scroll container are OK
    const scrollAncestor = (() => {
      let n = el;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 2) return n;
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 2) return n;
        n = n.parentElement;
      }
      return null;
    })();

    const badViewportY = (spillBottom || spillTop) && !scrollAncestor;
    const badViewportX = spillRight || spillLeft;
    const badParent = parentSpillX || (parentSpillY && !scrollAncestor);

    if (badViewportX || badViewportY || badParent || spillRight) {
      const sel = el.id
        ? `#${el.id}`
        : (el.className && typeof el.className === 'string' && el.className.trim())
          ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
          : el.tagName.toLowerCase();
      offenders.push({
        sel,
        tag: el.tagName,
        badViewportX,
        badViewportY,
        badParent,
        spillRight,
        spillBottom,
        parentSpillX,
        parentSpillY,
        hasScrollAncestor: !!scrollAncestor,
        scrollAncestorCls: scrollAncestor?.className?.toString?.().slice(0, 60),
        rect: { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        overflow: `${cs.overflowX}/${cs.overflowY}`,
        display: cs.display,
        position: cs.position,
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }

  // Doc-level
  const doc = {
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    hash: location.hash,
  };

  // Dedup similar
  offenders.sort((a, b) => (b.rect.w * b.rect.h) - (a.rect.w * a.rect.h));
  return { doc, offenders: offenders.slice(0, 40), count: offenders.length };
}

await unlock();

const screens = [
  { name: 'dashboard', go: async () => { await page.goto(`${BASE}/#dashboard`, { waitUntil: 'networkidle' }); } },
  { name: 'configurator', go: async () => {
    await page.goto(`${BASE}/#dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.locator('#new-suit-btn, #empty-create-btn').first().click();
    await page.waitForTimeout(400);
  }},
];

for (const s of screens) {
  await s.go();
  await page.waitForTimeout(300);
  const report = await page.evaluate(auditScript);
  console.log(`\n======== ${s.name} ========`);
  console.log('DOC', JSON.stringify(report.doc));
  console.log('offender count', report.count);
  for (const o of report.offenders.slice(0, 15)) {
    console.log(JSON.stringify(o));
  }
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: false });
}

// Also check jacket step with many option cards at narrower laptop width
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto(`${BASE}/#configurator`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const narrow = await page.evaluate(auditScript);
console.log('\n======== configurator 1280x720 ========');
console.log('DOC', JSON.stringify(narrow.doc));
console.log('offender count', narrow.count);
for (const o of narrow.offenders.slice(0, 20)) console.log(JSON.stringify(o));
await page.screenshot({ path: path.join(OUT, 'configurator-1280.png'), fullPage: false });

// Scroll wizard-main to bottom and check footer collision / overflow
await page.evaluate(() => {
  const m = document.querySelector('.wizard-main');
  if (m) m.scrollTop = m.scrollHeight;
});
await page.waitForTimeout(200);
const atBottom = await page.evaluate(auditScript);
console.log('\n======== configurator scrolled to bottom ========');
console.log('DOC', JSON.stringify(atBottom.doc));
console.log('offender count', atBottom.count);
for (const o of atBottom.offenders.slice(0, 15)) console.log(JSON.stringify(o));
await page.screenshot({ path: path.join(OUT, 'configurator-bottom.png'), fullPage: false });

await browser.close();
console.log('\nScreenshots in', OUT);
