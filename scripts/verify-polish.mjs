import { chromium } from 'playwright';
import path from 'node:path';

const url = 'file://' + path.resolve('dist/index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('dialog', (d) => d.accept());

// Toolbar buttons now live behind a dropdown menu — open it (idempotently) before
// clicking one, since its items are hidden and unclickable while collapsed.
async function openMenu() {
  const hidden = await page.evaluate(
    () => document.querySelector('.menu-dropdown')?.classList.contains('hidden') ?? true,
  );
  if (hidden) await page.click('.menu-toggle');
}

await page.goto(url);
await page.waitForTimeout(200);

// --- Flush on hidden ---
const lastSavedBefore = await page.evaluate(
  () => JSON.parse(localStorage.getItem('digitalAquarium.state.v1')).lastSavedAt,
);
await page.waitForTimeout(50);
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(100);
const lastSavedAfterHidden = await page.evaluate(
  () => JSON.parse(localStorage.getItem('digitalAquarium.state.v1')).lastSavedAt,
);
console.log('lastSavedAt before hide:', lastSavedBefore);
console.log('lastSavedAt after hide: ', lastSavedAfterHidden);
const flushedOnHide = lastSavedAfterHidden > lastSavedBefore;

// Restore visibility for the rest of the test.
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});

// --- Flush on pagehide ---
await page.waitForTimeout(50);
await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
await page.waitForTimeout(100);
const lastSavedAfterPagehide = await page.evaluate(
  () => JSON.parse(localStorage.getItem('digitalAquarium.state.v1')).lastSavedAt,
);
const flushedOnPagehide = lastSavedAfterPagehide > lastSavedAfterHidden;
console.log('lastSavedAt after pagehide:', lastSavedAfterPagehide);

// --- Fullscreen toggle doesn't throw ---
await openMenu();
await page.click('.toolbar-btn:has-text("Fullscreen")');
await page.waitForTimeout(200);
console.log('Fullscreen click produced errors:', errors.length > 0);

// --- Perf smoke test: 6 fish (3 schooling + 3 solo), check render rate + heap growth ---
await page.evaluate(() => {
  const now = new Date().toISOString();
  const make = (id, speciesId, traitId) => ({
    id,
    name: id,
    speciesId,
    traitId,
    birthDate: now,
    status: 'active',
    hunger: 100,
    createdAt: now,
  });
  window.__aquariumState.fish = [
    make('t1', 'neon-tetra', 'bold'),
    make('t2', 'neon-tetra', 'curious'),
    make('t3', 'neon-tetra', 'graceful'),
    make('s1', 'betta', 'skittish'),
    make('s2', 'angelfish', 'lazy'),
    make('s3', 'goldfish', 'bold'),
  ];
});
await page.waitForTimeout(500);

const rc0 = await page.evaluate(() => window.__tankHandle.getRenderCount());
const heap0 = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
await page.waitForTimeout(3000);
const rc1 = await page.evaluate(() => window.__tankHandle.getRenderCount());
await page.waitForTimeout(10000);
const rc2 = await page.evaluate(() => window.__tankHandle.getRenderCount());
const heap1 = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);

const fps = (rc1 - rc0) / 3;
console.log('Effective render rate over 3s:', fps.toFixed(1), 'fps (cap is 30)');
const fpsWithinCap = fps > 5 && fps <= 34; // generous margin over the 30fps cap

console.log('Renders continued over the following 10s (rc1->rc2):', rc1, '->', rc2, rc2 > rc1);

if (heap0 !== null && heap1 !== null) {
  console.log('JS heap used: start', (heap0 / 1e6).toFixed(1), 'MB -> after ~13s', (heap1 / 1e6).toFixed(1), 'MB');
} else {
  console.log('performance.memory not available in this browser build — skipping heap check.');
}
const noRunawayGrowth = heap0 === null || heap1 === null || heap1 < heap0 * 3; // generous: not >3x growth

console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

const allPassed = flushedOnHide && flushedOnPagehide && fpsWithinCap && rc2 > rc1 && noRunawayGrowth;
console.log('All checks passed:', allPassed);

await browser.close();
process.exit(errors.length > 0 || !allPassed ? 1 : 0);
