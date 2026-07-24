import type { Fish } from '../state/schema';
import type { FishRuntime } from './types';

const NEIGHBOR_RADIUS = 150;
const SEPARATION_RADIUS = 40;

// Flock influence is capped at 40% so personality/wander stays the dominant behavior
// and grouping reads as "loose shoaling," not a rigid formation.
const COHESION_WEIGHT = 0.4;
const SEPARATION_WEIGHT = 0.6;
const ALIGNMENT_WEIGHT = 0.3;
const PERSONAL_WEIGHT = 0.6;
const FLOCK_WEIGHT = 0.4;

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Blends a schooling fish's personal wander heading with a boids-lite
 * cohesion/separation/alignment heading from same-species tankmates within
 * range. No-op if there are no such neighbors nearby. At 3-6 total fish this
 * is a handful of pairwise comparisons — no spatial partitioning needed.
 */
export function applySchoolingBlend(
  fish: Fish,
  runtime: FishRuntime,
  allFish: Fish[],
  runtimes: Map<string, FishRuntime>,
): void {
  const neighbors: FishRuntime[] = [];
  for (const other of allFish) {
    if (other.id === fish.id || other.status !== 'active' || other.speciesId !== fish.speciesId) continue;
    const otherRuntime = runtimes.get(other.id);
    if (!otherRuntime) continue;
    if (Math.hypot(otherRuntime.x - runtime.x, otherRuntime.y - runtime.y) <= NEIGHBOR_RADIUS) {
      neighbors.push(otherRuntime);
    }
  }
  if (neighbors.length === 0) return;

  let avgX = 0;
  let avgY = 0;
  let alignX = 0;
  let alignY = 0;
  let sepX = 0;
  let sepY = 0;

  for (const n of neighbors) {
    avgX += n.x;
    avgY += n.y;
    alignX += Math.cos(n.heading);
    alignY += Math.sin(n.heading);

    const dx = runtime.x - n.x;
    const dy = runtime.y - n.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < SEPARATION_RADIUS) {
      sepX += dx / dist;
      sepY += dy / dist;
    }
  }

  const cohesionHeading = Math.atan2(avgY / neighbors.length - runtime.y, avgX / neighbors.length - runtime.x);
  const alignmentHeading = Math.atan2(alignY, alignX);

  let flockX = Math.cos(cohesionHeading) * COHESION_WEIGHT + Math.cos(alignmentHeading) * ALIGNMENT_WEIGHT;
  let flockY = Math.sin(cohesionHeading) * COHESION_WEIGHT + Math.sin(alignmentHeading) * ALIGNMENT_WEIGHT;

  if (sepX !== 0 || sepY !== 0) {
    const separationHeading = Math.atan2(sepY, sepX);
    flockX += Math.cos(separationHeading) * SEPARATION_WEIGHT;
    flockY += Math.sin(separationHeading) * SEPARATION_WEIGHT;
  }

  const flockHeading = Math.atan2(flockY, flockX);
  const blendedX = Math.cos(runtime.targetHeading) * PERSONAL_WEIGHT + Math.cos(flockHeading) * FLOCK_WEIGHT;
  const blendedY = Math.sin(runtime.targetHeading) * PERSONAL_WEIGHT + Math.sin(flockHeading) * FLOCK_WEIGHT;

  runtime.targetHeading = normalizeAngle(Math.atan2(blendedY, blendedX));
}
