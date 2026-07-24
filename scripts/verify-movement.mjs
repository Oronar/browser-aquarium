import { chromium } from 'playwright';
import path from 'node:path';

const distPath = path.resolve('dist/index.html');
const url = 'file://' + distPath;

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text());
});

await page.goto(url);
await page.waitForTimeout(200);

const traits = ['bold', 'skittish', 'lazy', 'curious', 'graceful'];

// Replace the tank with one fish per trait, all the same species, so any
// behavioral difference we observe is attributable to the trait alone.
await page.evaluate((traitIds) => {
  const now = new Date().toISOString();
  window.__aquariumState.fish = traitIds.map((traitId, i) => ({
    id: 'test-' + traitId,
    name: traitId,
    speciesId: 'betta',
    traitId,
    birthDate: now,
    status: 'active',
    hunger: 100,
    createdAt: now,
  }));
}, traits);

await page.waitForTimeout(300); // let runtimes spawn

const samples = [];
for (let i = 0; i < 10; i++) {
  const snapshot = await page.evaluate(() =>
    Array.from(window.__tankHandle.getRuntimes().entries()).map(([id, r]) => [id, r.x, r.y]),
  );
  samples.push(snapshot);
  await page.waitForTimeout(300);
}

const pathLength = {};
for (const traitId of traits) {
  const fishId = 'test-' + traitId;
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1].find(([id]) => id === fishId);
    const cur = samples[i].find(([id]) => id === fishId);
    if (!prev || !cur) continue;
    total += Math.hypot(cur[1] - prev[1], cur[2] - prev[2]);
  }
  pathLength[traitId] = total;
}

console.log('Path length traveled over ~3s per trait:');
for (const [trait, len] of Object.entries(pathLength)) {
  console.log(`  ${trait}: ${len.toFixed(1)}px`);
}

// Note: "lazy" has a 50% per-decision chance to idle-hover (0 movement), so a
// single short sample can legitimately show 0px for it — that's correct behavior,
// not a bug. We only assert the simulation is moving fish overall, and that lazy
// is never the *most* active trait relative to bold.
const someMovement = Object.values(pathLength).some((len) => len > 0);
const lazyNotMoreActiveThanBold = pathLength.lazy <= pathLength.bold;

console.log('Simulation produces movement overall:', someMovement);
console.log('Lazy is not more active than bold:', lazyNotMoreActiveThanBold);
console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

await browser.close();
process.exit(errors.length > 0 || !someMovement || !lazyNotMoreActiveThanBold ? 1 : 0);
