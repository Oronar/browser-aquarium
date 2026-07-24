import { chromium } from 'playwright';
import path from 'node:path';

const distPath = path.resolve('dist/index.html');
const url = 'file://' + distPath;

const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto(url);
await page.waitForTimeout(500);

const canvasExists = await page.evaluate(() => !!document.querySelector('#tank-canvas'));

console.log('URL:', url);
console.log('Canvas present:', canvasExists);
console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

await browser.close();
process.exit(errors.length > 0 || !canvasExists ? 1 : 0);
