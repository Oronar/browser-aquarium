import { chromium } from 'playwright';
import path from 'node:path';

const url = 'file://' + path.resolve('dist/index.html');
const outPath = process.argv[2] || 'panel.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
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
await page.mouse.click(500, 400);
await page.waitForTimeout(200);
await page.screenshot({ path: outPath });
await browser.close();
console.log('Saved to', outPath);
