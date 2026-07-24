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

// Start from a known single fish with low hunger so Feed's effect is measurable.
await page.evaluate(() => {
  const now = new Date().toISOString();
  window.__aquariumState.fish = [
    {
      id: 'feed-me',
      name: 'Hungry',
      speciesId: 'guppy',
      traitId: 'bold',
      birthDate: now,
      status: 'active',
      hunger: 20,
      createdAt: now,
    },
  ];
});
await page.waitForTimeout(150);

// --- Feed ---
// Feeding now drops falling food particles that the fish must swim up to and nibble
// (rather than an instant hunger bump), and a single batch can take up to ~60s to fully
// fall past the bottom. Click Feed a few times (as an Owner would if the fish is slow to
// notice) to get several batches in flight, then poll until one lands instead of a fixed wait.
const hungerBefore = await page.evaluate(
  () => window.__aquariumState.fish.find((f) => f.id === 'feed-me').hunger,
);
await openMenu();
await page.click('.toolbar-btn:has-text("Feed")');
await openMenu();
await page.click('.toolbar-btn:has-text("Feed")');
await openMenu();
await page.click('.toolbar-btn:has-text("Feed")');

let hungerAfter = hungerBefore;
let fedInStorage = hungerBefore;
for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(500);
  ({ hungerAfter, fedInStorage } = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('digitalAquarium.state.v1'));
    const stored = raw.fish.find((f) => f.id === 'feed-me');
    return {
      hungerAfter: window.__aquariumState.fish.find((f) => f.id === 'feed-me').hunger,
      // Not yet persisted at all (no nibble has happened yet) reads as null, not a crash.
      fedInStorage: stored ? stored.hunger : null,
    };
  }));
  if (hungerAfter > hungerBefore) break;
}
console.log('Feed: hunger', hungerBefore, '->', hungerAfter, '(persisted:', fedInStorage, ')');
const feedWorked = hungerAfter > hungerBefore && fedInStorage === hungerAfter;

// --- Add Fish (manual) ---
const countBeforeAdd = await page.evaluate(() => window.__aquariumState.fish.length);
await openMenu();
await page.click('.toolbar-btn:has-text("Add Fish")');
await page.waitForTimeout(100);
await page.selectOption('.field select >> nth=0', 'betta'); // species select is first
await page.selectOption('.field select >> nth=1', 'skittish'); // trait select is second
await page.fill('.modal input', 'Manual Fish');
await page.click('.modal .btn-primary');
await page.waitForTimeout(100);
const afterManualAdd = await page.evaluate(() => window.__aquariumState.fish);
const manualFish = afterManualAdd.find((f) => f.name === 'Manual Fish');
console.log(
  'Add (manual): count',
  countBeforeAdd,
  '->',
  afterManualAdd.length,
  ', species/trait:',
  manualFish?.speciesId,
  manualFish?.traitId,
);
const manualAddWorked =
  afterManualAdd.length === countBeforeAdd + 1 &&
  manualFish?.speciesId === 'betta' &&
  manualFish?.traitId === 'skittish';

// --- Add Fish (random) ---
const countBeforeRandom = afterManualAdd.length;
await openMenu();
await page.click('.toolbar-btn:has-text("Add Fish")');
await page.waitForTimeout(100);
await page.click('.mode-btn:has-text("Random")');
const rolledText = await page.$eval('.rolled-result', (el) => el.textContent);
await page.fill('.modal input', 'Random Fish');
await page.click('.modal .btn-primary');
await page.waitForTimeout(100);
const afterRandomAdd = await page.evaluate(() => window.__aquariumState.fish);
const randomFish = afterRandomAdd.find((f) => f.name === 'Random Fish');
console.log('Add (random): rolled', rolledText, '-> stored', randomFish?.speciesId, randomFish?.traitId);
const randomAddWorked = afterRandomAdd.length === countBeforeRandom + 1 && !!randomFish;

// --- Stasis + Revive ---
await page.evaluate(() => {
  const r = window.__tankHandle.getRuntimes().get('feed-me');
  if (r) { r.x = 500; r.y = 400; }
});
await page.mouse.click(500, 400);
await page.waitForTimeout(100);
const panelOpenBeforeStasis = await page.evaluate(
  () => !document.querySelector('#fish-detail-panel').classList.contains('hidden'),
);
await page.click('button:has-text("Move to Stasis")');
await page.waitForTimeout(100);

const stateAfterStasis = await page.evaluate(() => window.__aquariumState.fish.find((f) => f.id === 'feed-me'));
const panelClosedAfterStasis = await page.evaluate(
  () => document.querySelector('#fish-detail-panel').classList.contains('hidden'),
);
const stasisBadgeText = await page.$eval('.toolbar-btn:has-text("Stasis")', (el) => el.textContent);
console.log('Stasis: status =', stateAfterStasis.status, ', badge =', stasisBadgeText);

await openMenu();
await page.click('.toolbar-btn:has-text("Stasis")'); // open drawer
await page.waitForTimeout(100);
const drawerShowsFish = await page.evaluate(() =>
  document.querySelector('.stasis-list').textContent.includes('Hungry'),
);
await page.click('.stasis-row button:has-text("Revive")');
await page.waitForTimeout(100);
const stateAfterRevive = await page.evaluate(() => window.__aquariumState.fish.find((f) => f.id === 'feed-me'));
console.log('Revive: status =', stateAfterRevive.status, ', drawer showed fish before revive:', drawerShowsFish);
await page.click('#stasis-drawer .panel-close'); // ensure drawer is closed before the next toggle

const stasisRoundTripWorked =
  panelOpenBeforeStasis &&
  stateAfterStasis.status === 'stasis' &&
  panelClosedAfterStasis &&
  stasisBadgeText === 'Stasis (1)' &&
  drawerShowsFish &&
  stateAfterRevive.status === 'active';

// --- Buried hard delete ---
// Put it back into stasis, then permanently delete it from the drawer.
await page.evaluate(() => {
  const idx = window.__aquariumState.fish.findIndex((f) => f.id === 'feed-me');
  window.__aquariumState.fish[idx].status = 'stasis';
});
await openMenu();
await page.click('.toolbar-btn:has-text("Stasis")');
await page.waitForTimeout(100);
await page.click('.stasis-row button:has-text("Delete permanently")');
await page.waitForTimeout(100);
const deletedFromState = await page.evaluate(
  () => !window.__aquariumState.fish.some((f) => f.id === 'feed-me'),
);
const deletedFromStorage = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('digitalAquarium.state.v1'));
  return !raw.fish.some((f) => f.id === 'feed-me');
});
console.log('Hard delete: removed from state =', deletedFromState, ', from storage =', deletedFromStorage);
const hardDeleteWorked = deletedFromState && deletedFromStorage;

const allPassed = [feedWorked, manualAddWorked, randomAddWorked, stasisRoundTripWorked, hardDeleteWorked].every(
  Boolean,
);
console.log('All checks passed:', allPassed);
console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

await browser.close();
process.exit(errors.length > 0 || !allPassed ? 1 : 0);
