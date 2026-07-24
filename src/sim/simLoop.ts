import type { Fish } from '../state/schema';
import { SPECIES } from '../domain/species';
import { TRAITS } from '../domain/personality';
import type { FishRuntime } from './types';
import { decideNextMove } from './steering';
import { applySchoolingBlend } from './schooling';

/**
 * Scans all active fish and lets any that are "due" pick a new heading/speed.
 * Cheap even every frame at this population size (≤6): the per-fish thinking
 * itself only actually runs at each fish's own cadence (turnIntervalMs).
 * Schooling species also blend in a flock heading at that same cadence.
 */
export function stepDecisions(
  fish: Fish[],
  runtimes: Map<string, FishRuntime>,
  bounds: { width: number; height: number },
  now: number,
): void {
  for (const f of fish) {
    if (f.status !== 'active') continue;
    const runtime = runtimes.get(f.id);
    if (!runtime) continue;
    if (now >= runtime.nextDecisionAt) {
      const species = SPECIES[f.speciesId];
      decideNextMove(runtime, species, TRAITS[f.traitId], bounds, now);
      if (!runtime.resting && species.schooling) {
        applySchoolingBlend(f, runtime, fish, runtimes);
      }
    }
  }
}
