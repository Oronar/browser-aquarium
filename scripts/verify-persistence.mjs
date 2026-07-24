import { chromium } from 'playwright';
import path from 'node:path';

const distPath = path.resolve('dist/index.html');
const url = 'file://' + distPath;

const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

// First load: should seed 3 starter fish and write to localStorage.
await page.goto(url);
await page.waitForTimeout(300);

const firstLoadState = await page.evaluate(() => window.__aquariumState);
const storedRaw = await page.evaluate(() => localStorage.getItem('digitalAquarium.state.v1'));

console.log('First load fish count:', firstLoadState.fish.length);
console.log('Names:', firstLoadState.fish.map((f) => f.name).join(', '));
console.log('localStorage populated:', !!storedRaw);

// Second load (same page context / storage): should restore identical fish, not reseed.
await page.reload();
await page.waitForTimeout(300);
const secondLoadState = await page.evaluate(() => window.__aquariumState);

const sameIds =
  firstLoadState.fish.length === secondLoadState.fish.length &&
  firstLoadState.fish.every((f, i) => f.id === secondLoadState.fish[i].id);

console.log('Second load restores same fish IDs:', sameIds);
console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

await browser.close();
process.exit(errors.length > 0 || !sameIds || firstLoadState.fish.length !== 3 ? 1 : 0);
