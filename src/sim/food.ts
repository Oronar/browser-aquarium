/** Ephemeral falling food particle — never persisted, rebuilt each session (like FishRuntime). */
export interface FoodParticle {
  id: string;
  x: number;
  y: number;
  vy: number;
  wobblePhase: number;
  wobbleAmplitude: number;
  /** Hunger restored to whichever fish nibbles this particle. */
  amount: number;
}

export const FOOD_PARTICLES_PER_FISH = 3;
export const FOOD_NIBBLE_RADIUS = 14;
export const FOOD_DETECT_RADIUS = 240;
/** Fish stop chasing food once this full so a few stragglers don't get endlessly hounded. */
export const FOOD_FULL_HUNGER_THRESHOLD = 95;

const FOOD_FALL_SPEED_MIN = 14;
const FOOD_FALL_SPEED_MAX = 24;
const FOOD_WOBBLE_SPEED = 1.5;
const FOOD_WOBBLE_AMPLITUDE_MIN = 6;
const FOOD_WOBBLE_AMPLITUDE_MAX = 16;
/** How far past the bottom edge a particle drifts before despawning, so it visibly exits rather than vanishing right at the edge. */
const FOOD_DESPAWN_MARGIN = 40;

let nextFoodSeq = 0;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Spawns a scattered batch of food across the top of the tank for one "Feed" action. */
export function spawnFoodBatch(
  activeFishCount: number,
  totalAmountPerFish: number,
  bounds: { width: number; height: number },
): FoodParticle[] {
  const count = Math.max(FOOD_PARTICLES_PER_FISH, activeFishCount * FOOD_PARTICLES_PER_FISH);
  const amount = totalAmountPerFish / FOOD_PARTICLES_PER_FISH;
  const particles: FoodParticle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: `food-${Date.now()}-${nextFoodSeq++}`,
      x: randRange(bounds.width * 0.1, bounds.width * 0.9),
      y: randRange(-40, 0),
      vy: randRange(FOOD_FALL_SPEED_MIN, FOOD_FALL_SPEED_MAX),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmplitude: randRange(FOOD_WOBBLE_AMPLITUDE_MIN, FOOD_WOBBLE_AMPLITUDE_MAX),
      amount,
    });
  }
  return particles;
}

/** Advances falling/wobble motion and drops particles that drifted off the bottom. */
export function stepFood(
  particles: FoodParticle[],
  dtSec: number,
  bounds: { width: number; height: number },
): FoodParticle[] {
  const despawnY = bounds.height + FOOD_DESPAWN_MARGIN;
  const next: FoodParticle[] = [];
  for (const p of particles) {
    p.wobblePhase += FOOD_WOBBLE_SPEED * dtSec;
    p.x += Math.sin(p.wobblePhase) * p.wobbleAmplitude * dtSec;
    p.x = Math.max(4, Math.min(bounds.width - 4, p.x));
    p.y += p.vy * dtSec;
    if (p.y < despawnY) next.push(p);
  }
  return next;
}

/** Nearest particle within `maxDist`, or null. Used to steer hungry fish and to detect nibbles. */
export function findNearestFood(
  x: number,
  y: number,
  particles: FoodParticle[],
  maxDist: number,
): FoodParticle | null {
  let best: FoodParticle | null = null;
  let bestDist = maxDist;
  for (const p of particles) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
