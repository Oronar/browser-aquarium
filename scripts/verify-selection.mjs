import { chromium } from 'playwright';
import path from 'node:path';

const url = 'file://' + path.resolve('dist/index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto(url);
await page.waitForTimeout(200);

await page.evaluate(() => {
  const now = new Date().toISOString();
  window.__aquariumState.fish = [
    {
      id: 'click-me',
      name: 'Original Name',
      speciesId: 'goldfish',
      traitId: 'bold',
      birthDate: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      status: 'active',
      hunger: 77,
      createdAt: now,
    },
  ];
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  const r = window.__tankHandle.getRuntimes().get('click-me');
  r.x = 500;
  r.y = 400;
});

// Click precisely on the fish's known position.
await page.mouse.click(500, 400);
await page.waitForTimeout(100);

const panelVisibleAfterClick = await page.evaluate(() => {
  const el = document.querySelector('#fish-detail-panel');
  return el && !el.classList.contains('hidden');
});
const nameValue = await page.$eval('.fish-name-input', (el) => el.value);
const speciesText = await page.$eval('.fish-species', (el) => el.textContent);
const ageText = await page.$eval('.fish-age', (el) => el.textContent);
const statsText = await page.$eval('.fish-stats', (el) => el.textContent);

console.log('Panel visible after click:', panelVisibleAfterClick);
console.log('Name shown:', nameValue);
console.log('Species shown:', speciesText);
console.log('Age shown:', ageText);
console.log('Stats shown:', statsText);

// Rename via the input, confirm state + localStorage update.
await page.fill('.fish-name-input', 'Sir Bubblesworth');
await page.keyboard.press('Tab'); // triggers the `change` event
await page.waitForTimeout(100);

const renamedInState = await page.evaluate(
  () => window.__aquariumState.fish.find((f) => f.id === 'click-me').name,
);
const renamedInStorage = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('digitalAquarium.state.v1'));
  return raw.fish.find((f) => f.id === 'click-me').name;
});

console.log('Renamed in state:', renamedInState);
console.log('Renamed in localStorage:', renamedInStorage);

// Click away from any fish: panel should stay as-is (no accidental close); use close button instead.
await page.click('.panel-close');
await page.waitForTimeout(100);
const panelHiddenAfterClose = await page.evaluate(() => {
  const el = document.querySelector('#fish-detail-panel');
  return el.classList.contains('hidden');
});
console.log('Panel hidden after close button:', panelHiddenAfterClose);

const checks = [
  panelVisibleAfterClick === true,
  nameValue === 'Original Name',
  speciesText === 'Goldfish',
  ageText === '2 hours old',
  statsText.includes('Hunger: 77'),
  renamedInState === 'Sir Bubblesworth',
  renamedInStorage === 'Sir Bubblesworth',
  panelHiddenAfterClose === true,
];
const allPassed = checks.every(Boolean);

console.log('All checks passed:', allPassed);
console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

await browser.close();
process.exit(errors.length > 0 || !allPassed ? 1 : 0);
