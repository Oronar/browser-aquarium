import type { Species } from '../domain/species';
import type { PersonalityTrait } from '../domain/personality';
import type { FishRuntime } from './types';

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Picks the fish's next target heading/speed and schedules its next decision.
 * This is the "thinking" step — it runs only once per fish per turnIntervalMs,
 * not every frame, which is what keeps the simulation cheap.
 */
export function decideNextMove(
  runtime: FishRuntime,
  species: Species,
  trait: PersonalityTrait,
  bounds: { width: number; height: number },
  now: number,
): void {
  const { steering } = trait;

  if (Math.random() < steering.restProbability) {
    runtime.resting = true;
    runtime.targetSpeed = 0;
  } else {
    runtime.resting = false;
    runtime.targetSpeed = species.baseSpeed * steering.baseSpeedMult;

    let heading =
      runtime.heading + randRange(-steering.wanderStrength, steering.wanderStrength) * Math.PI;

    const margin = steering.edgeAvoidMargin;
    const nearEdge =
      runtime.x < margin ||
      runtime.x > bounds.width - margin ||
      runtime.y < margin ||
      runtime.y > bounds.height - margin;
    if (nearEdge) {
      heading = Math.atan2(bounds.height / 2 - runtime.y, bounds.width / 2 - runtime.x);
    }

    if (species.verticalBias) {
      const [minF, maxF] = species.verticalBias;
      const minY = bounds.height * minF;
      const maxY = bounds.height * maxF;
      if (runtime.y < minY) heading = Math.PI / 2 + randRange(-0.3, 0.3);
      else if (runtime.y > maxY) heading = -Math.PI / 2 + randRange(-0.3, 0.3);
    }

    runtime.targetHeading = heading;
  }

  const [minMs, maxMs] = steering.turnIntervalMs;
  runtime.nextDecisionAt = now + randRange(minMs, maxMs);
}

export function createInitialRuntime(fishId: string, bounds: { width: number; height: number }): FishRuntime {
  return {
    fishId,
    x: randRange(bounds.width * 0.2, bounds.width * 0.8),
    y: randRange(bounds.height * 0.2, bounds.height * 0.8),
    heading: randRange(-Math.PI, Math.PI),
    targetHeading: randRange(-Math.PI, Math.PI),
    speed: 0,
    targetSpeed: 0,
    resting: false,
    nextDecisionAt: 0,
    tailPhase: Math.random() * Math.PI * 2,
  };
}
