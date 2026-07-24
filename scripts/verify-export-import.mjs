import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const url = 'file://' + path.resolve('dist/index.html');
const downloadPath = path.resolve('/tmp/aquarium-export-test.json');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

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

// Known state: one active fish, one in stasis.
await page.evaluate(() => {
  const now = new Date().toISOString();
  window.__aquariumState.fish = [
    {
      id: 'export-active',
      name: 'Exportable',
      speciesId: 'clownfish',
      traitId: 'curious',
      birthDate: now,
      status: 'active',
      hunger: 88,
      createdAt: now,
    },
    {
      id: 'export-stasis',
      name: 'Sleeper',
      speciesId: 'catfish',
      traitId: 'lazy',
      birthDate: now,
      status: 'stasis',
      hunger: 42,
      createdAt: now,
    },
  ];
});
await page.waitForTimeout(150);

// --- Export ---
await openMenu();
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('.toolbar-btn:has-text("Export")'),
]);
await download.saveAs(downloadPath);
const exported = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));
console.log('Exported fish count:', exported.fish.length);
console.log('Exported names:', exported.fish.map((f) => f.name).join(', '));
const exportWorked =
  exported.schemaVersion === 1 &&
  exported.fish.length === 2 &&
  exported.fish.some((f) => f.name === 'Exportable') &&
  exported.fish.some((f) => f.name === 'Sleeper' && f.status === 'stasis');

// --- Import ---
// Replace state with something totally different first, to prove import overwrites it.
await page.evaluate(() => {
  window.__aquariumState.fish = [
    {
      id: 'unrelated',
      name: 'Should Be Replaced',
      speciesId: 'goldfish',
      traitId: 'bold',
      birthDate: new Date().toISOString(),
      status: 'active',
      hunger: 100,
      createdAt: new Date().toISOString(),
    },
  ];
});

await openMenu();
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.click('.toolbar-btn:has-text("Import")'),
]);
await fileChooser.setFiles(downloadPath);
await page.waitForTimeout(200);

const afterImport = await page.evaluate(() => window.__aquariumState.fish);
const inStorage = await page.evaluate(() => JSON.parse(localStorage.getItem('digitalAquarium.state.v1')).fish);

console.log('After import, fish:', afterImport.map((f) => `${f.name}(${f.status})`).join(', '));
const importWorked =
  afterImport.length === 2 &&
  afterImport.some((f) => f.name === 'Exportable' && f.status === 'active') &&
  afterImport.some((f) => f.name === 'Sleeper' && f.status === 'stasis') &&
  inStorage.length === 2;

// --- Import rejects garbage ---
const badFilePath = path.resolve('/tmp/aquarium-bad-import.json');
fs.writeFileSync(badFilePath, JSON.stringify({ not: 'a valid aquarium file' }));
let alertMessage = null;
page.once('dialog', async (dialog) => {
  alertMessage = dialog.message();
  await dialog.accept();
});
await openMenu();
const [fileChooser2] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.click('.toolbar-btn:has-text("Import")'),
]);
await fileChooser2.setFiles(badFilePath);
await page.waitForTimeout(200);
const stateUnchangedAfterBadImport = await page.evaluate(() => window.__aquariumState.fish.length === 2);
console.log('Bad import alert message:', alertMessage);
console.log('State unchanged after invalid import:', stateUnchangedAfterBadImport);
const rejectsGarbage = !!alertMessage && stateUnchangedAfterBadImport;

const allPassed = exportWorked && importWorked && rejectsGarbage;
console.log('All checks passed:', allPassed);
console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

fs.rmSync(downloadPath, { force: true });
fs.rmSync(badFilePath, { force: true });

await browser.close();
process.exit(errors.length > 0 || !allPassed ? 1 : 0);
