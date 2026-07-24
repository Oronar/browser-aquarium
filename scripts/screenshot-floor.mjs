import { chromium } from 'playwright';
import path from 'node:path';

const url = 'file://' + path.resolve('dist/index.html');
const outPath = process.argv[2] || 'floor.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto(url);
await page.waitForTimeout(200);

await page.evaluate(() => {
  const now = new Date().toISOString();
  const make = (id, hunger, x) => ({
    id,
    name: id,
    speciesId: 'goldfish',
    traitId: 'graceful',
    birthDate: now,
    status: 'active',
    hunger,
    createdAt: now,
  });
  window.__aquariumState.fish = [make('healthy', 100, 300), make('neglected', 5, 700)];
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  const runtimes = window.__tankHandle.getRuntimes();
  runtimes.get('healthy').y = 400;
  runtimes.get('healthy').x = 300;
  runtimes.get('neglected').y = 400;
  runtimes.get('neglected').x = 700;
});
await page.waitForTimeout(300);
await page.screenshot({ path: outPath });
await browser.close();
console.log('Saved to', outPath);
