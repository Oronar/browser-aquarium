import { chromium } from 'playwright';
import path from 'node:path';

const distPath = path.resolve('dist/index.html');
const url = 'file://' + distPath;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto(url);
await page.waitForTimeout(300);

// Force a known, deterministic trait (graceful, hungerDecayMult 0.95), then rewind the
// LIVE in-memory lastSavedAt by 12 hours and trigger the same "tab hidden" flush path
// the app uses in real use (see M9's flush-on-hide) to make it recompute catch-up now.
// (We deliberately don't fake this via localStorage + reload: the flush-on-hide handler
// would just re-save the live, not-yet-aged state over that edit before the new page
// re-reads it — that's a test-methodology conflict, not an app bug.)
async function ageStateBy(hours, hunger = 100) {
  const lastSavedAt = new Date(Date.now() - hours * 3_600_000).toISOString();
  await page.evaluate(
    ({ lastSavedAt, hunger }) => {
      window.__aquariumState.fish = window.__aquariumState.fish.map((f) => ({
        ...f,
        traitId: 'graceful',
        hunger,
      }));
      window.__aquariumState.lastSavedAt = lastSavedAt;
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    },
    { lastSavedAt, hunger },
  );
}

await ageStateBy(12);
await page.waitForTimeout(100);
const state = await page.evaluate(() => window.__aquariumState);

const expectedRate = (100 / 24) * 0.95;
const expectedHunger = 100 - expectedRate * 12; // ~52.5
const actualHunger = state.fish[0].hunger;
const withinTolerance = Math.abs(actualHunger - expectedHunger) < 0.5;

console.log('Expected hunger after 12h catch-up (~):', expectedHunger.toFixed(2));
console.log('Actual hunger after catch-up:', actualHunger.toFixed(2));
console.log('Within tolerance:', withinTolerance);

const persistedHunger = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('digitalAquarium.state.v1'));
  return raw.fish[0].hunger;
});
const persistedMatches = Math.abs(persistedHunger - actualHunger) < 0.01;
console.log('Catch-up result was persisted to localStorage:', persistedMatches);

// Now test the floor: age by 30 days, hunger must clamp at 0, never go negative/terminal.
await ageStateBy(30 * 24);
await page.waitForTimeout(100);
const flooredState = await page.evaluate(() => window.__aquariumState);
const allFloored = flooredState.fish.every((f) => f.hunger === 0);
console.log('30-day neglect floors at exactly 0 (never negative):', allFloored);

console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

await browser.close();
process.exit(errors.length > 0 || !withinTolerance || !persistedMatches || !allFloored ? 1 : 0);
