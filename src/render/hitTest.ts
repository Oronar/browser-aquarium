import type { Fish } from '../state/schema';
import { SPECIES } from '../domain/species';
import type { FishRuntime } from '../sim/types';

const HIT_RADIUS_MULT = 0.9;

/**
 * Finds the active fish nearest a click point, using a generous circular hit
 * region (not exact rotated-shape math) — cheaper and more forgiving for
 * imprecise clicking/tapping than the alternative, and cost is irrelevant
 * either way since this only runs on click, not every frame.
 */
export function pickFishAt(
  x: number,
  y: number,
  fish: Fish[],
  runtimes: Map<string, FishRuntime>,
): Fish | null {
  let closest: Fish | null = null;
  let closestDist = Infinity;

  for (const f of fish) {
    if (f.status !== 'active') continue;
    const runtime = runtimes.get(f.id);
    if (!runtime) continue;
    const radius = SPECIES[f.speciesId].bodyLength * HIT_RADIUS_MULT;
    const dist = Math.hypot(runtime.x - x, runtime.y - y);
    if (dist <= radius && dist < closestDist) {
      closest = f;
      closestDist = dist;
    }
  }
  return closest;
}
