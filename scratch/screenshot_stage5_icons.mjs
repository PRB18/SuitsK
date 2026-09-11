import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/babur/AppData/Local/Temp/pw-krishna/node_modules/playwright');

const BASE = 'http://127.0.0.1:3737';
const SCREENSHOT_PATH = 'scratch/stage5_icons_in_real_ui.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

// Unlock vault
await page.request.post(`${BASE}/api/auth/unlock`, {
  data: { password: 'correct-horse-battery-staple' },
}).catch(() => {});

// Navigate to dashboard, then open configurator
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.locator('#new-suit-btn, #empty-create-btn').first().click();
await page.waitForTimeout(600);

// Should be on Jacket step (step 1, index 0) — lapelStyle is the first field
console.log('Current URL:', await page.evaluate(() => location.hash));
console.log('Wizard visible:', await page.locator('.configurator-wrapper').count() > 0);
console.log('Lapel options visible:', await page.locator('.option-card[data-field="lapelStyle"]').count());

// Scroll to make sure all lapel options are in view
await page.evaluate(() => {
  const main = document.querySelector('.wizard-main');
  if (main) main.scrollTop = 0;
});
await page.waitForTimeout(300);

// Take screenshot
await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
console.log(`Screenshot saved to ${SCREENSHOT_PATH}`);

// Also check shoulder shape icons (further down on same page)
await page.evaluate(() => {
  const shoulderSection = document.querySelector('[data-field-group="shoulderShape"]');
  if (shoulderSection) shoulderSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'scratch/stage5_shoulder_icons_in_real_ui.png', fullPage: false });
console.log('Shoulder screenshot saved to scratch/stage5_shoulder_icons_in_real_ui.png');

await browser.close();
console.log('Done');
