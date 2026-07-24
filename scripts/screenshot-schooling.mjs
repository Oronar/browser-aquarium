import { chromium } from 'playwright';
import path from 'node:path';

const url = 'file://' + path.resolve('dist/index.html');
const outPath = process.argv[2] || 'schooling.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto(url);
await page.waitForTimeout(200);

await page.evaluate(() => {
  const now = new Date().toISOString();
  const make = (id, speciesId) => ({
    id,
    name: id,
    speciesId,
    traitId: 'graceful',
    birthDate: now,
    status: 'active',
    hunger: 100,
    createdAt: now,
  });
  window.__aquariumState.fish = [
    make('school-1', 'neon-tetra'),
    make('school-2', 'neon-tetra'),
    make('school-3', 'neon-tetra'),
    make('solo-1', 'betta'),
    make('solo-2', 'angelfish'),
    make('solo-3', 'goldfish'),
  ];
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  const runtimes = window.__tankHandle.getRuntimes();
  const positions = {
    'school-1': [200, 200],
    'school-2': [1000, 200],
    'school-3': [200, 600],
    'solo-1': [1000, 600],
    'solo-2': [600, 150],
    'solo-3': [600, 650],
  };
  for (const [id, [x, y]] of Object.entries(positions)) {
    const r = runtimes.get(id);
    if (r) { r.x = x; r.y = y; }
  }
});

await page.waitForTimeout(18000);
await page.screenshot({ path: outPath });
await browser.close();
console.log('Saved to', outPath);
