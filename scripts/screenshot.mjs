import { chromium } from 'playwright';
import path from 'node:path';

const url = 'file://' + path.resolve('dist/index.html');
const outPath = process.argv[2] || 'screenshot.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
await page.goto(url);
await page.waitForTimeout(1500);
await page.screenshot({ path: outPath });
await browser.close();
console.log('Saved to', outPath);
