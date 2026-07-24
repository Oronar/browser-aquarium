import { chromium } from 'playwright';
import path from 'node:path';

const url = 'file://' + path.resolve('dist/index.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto(url);
await page.waitForTimeout(200);

// 3 same-species schooling fish (neon-tetra) placed far apart, plus 3 different
// non-schooling species also placed far apart. Same personality trait (graceful,
// low variance) on all 6 so any difference in clustering is attributable to the
// schooling flag alone, not personality noise.
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

await page.waitForTimeout(200); // let runtimes spawn with random positions

// Force known, far-apart starting positions (corners) for a clean before/after distance comparison.
await page.evaluate(() => {
  const runtimes = window.__tankHandle.getRuntimes();
  const positions = {
    'school-1': [100, 100],
    'school-2': [1100, 100],
    'school-3': [100, 700],
    'solo-1': [1100, 700],
    'solo-2': [600, 100],
    'solo-3': [600, 700],
  };
  for (const [id, [x, y]] of Object.entries(positions)) {
    const r = runtimes.get(id);
    if (r) {
      r.x = x;
      r.y = y;
    }
  }
});

function avgPairwiseDist(points) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      total += Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
      count++;
    }
  }
  return total / count;
}

async function snapshot() {
  return page.evaluate(() => {
    const runtimes = window.__tankHandle.getRuntimes();
    const get = (id) => {
      const r = runtimes.get(id);
      return [r.x, r.y];
    };
    return {
      school: [get('school-1'), get('school-2'), get('school-3')],
      solo: [get('solo-1'), get('solo-2'), get('solo-3')],
    };
  });
}

const before = await snapshot();
const beforeSchoolDist = avgPairwiseDist(before.school);
const beforeSoloDist = avgPairwiseDist(before.solo);

await page.waitForTimeout(18000); // several decision cycles at graceful's 2.5-5s cadence

const after = await snapshot();
const afterSchoolDist = avgPairwiseDist(after.school);
const afterSoloDist = avgPairwiseDist(after.solo);

console.log('Schooling trio avg pairwise distance: before', beforeSchoolDist.toFixed(0), '-> after', afterSchoolDist.toFixed(0));
console.log('Solo trio avg pairwise distance:      before', beforeSoloDist.toFixed(0), '-> after', afterSoloDist.toFixed(0));

const schoolConverged = afterSchoolDist < beforeSchoolDist;
const schoolConvergedMoreThanSolo = (beforeSchoolDist - afterSchoolDist) > (beforeSoloDist - afterSoloDist);

console.log('Schooling trio moved closer together:', schoolConverged);
console.log('Schooling trio converged more than solo trio:', schoolConvergedMoreThanSolo);
console.log('Console/page errors:', errors.length);
for (const e of errors) console.log(' -', e);

await browser.close();
process.exit(errors.length > 0 || !schoolConverged || !schoolConvergedMoreThanSolo ? 1 : 0);
