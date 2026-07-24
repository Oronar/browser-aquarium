import type { Fish } from '../state/schema';
import { SPECIES } from '../domain/species';
import { stepDecisions } from '../sim/simLoop';
import { createInitialRuntime } from '../sim/steering';
import type { FishRuntime } from '../sim/types';
import {
  spawnFoodBatch,
  stepFood,
  findNearestFood,
  FOOD_DETECT_RADIUS,
  FOOD_NIBBLE_RADIUS,
  FOOD_FULL_HUNGER_THRESHOLD,
  type FoodParticle,
} from '../sim/food';
import { drawFish, drawFoodParticle } from './shapes';
import { drawDecorations } from './decorations';
import { happiness, LOW_STAT_THRESHOLD, FEED_HUNGER_BOOST, clamp } from '../state/decay';

const TARGET_FPS = 30;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const HEADING_LERP = 0.08;
const SPEED_LERP = 0.08;
const TAIL_WAG_SPEED = 6;
const FLOOR_SPEED_MULT_MIN = 0.5;
const FLOOR_SATURATION_MIN = 0.4;
const FLOOR_LIVELINESS_MIN = 0.4;

function floorLerp(min: number, statValue: number): number {
  return min + (1 - min) * clamp(0, 1, statValue / LOW_STAT_THRESHOLD);
}

export interface TankHandle {
  stop: () => void;
  getRuntimes: () => Map<string, FishRuntime>;
  /** Cumulative render() call count — exposed for perf verification (effective FPS = delta over time). */
  getRenderCount: () => number;
  /** Drops a scattered batch of food into the tank for the Feed action (FR-16). */
  spawnFood: () => void;
}

function angleLerp(current: number, target: number, t: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

/**
 * Drives the tank's simulation + render loop. `getFish` is called each tick so callers can mutate
 * state freely. `onFoodEaten` fires when a fish nibbles a particle, so the caller can persist the
 * resulting hunger change against the real (non-runtime) Fish record.
 */
export function startTank(
  canvas: HTMLCanvasElement,
  getFish: () => Fish[],
  onFoodEaten: (fishId: string, amount: number) => void,
): TankHandle {
  const ctx = canvas.getContext('2d')!;
  const runtimes = new Map<string, FishRuntime>();
  let foodParticles: FoodParticle[] = [];
  let lastFrameTime = performance.now();
  let lastTickTime = lastFrameTime;
  let rafId = 0;
  let running = true;
  let renderCount = 0;

  function bounds() {
    return { width: canvas.width, height: canvas.height };
  }

  function syncRuntimes() {
    const fish = getFish();
    const activeIds = new Set(fish.filter((f) => f.status === 'active').map((f) => f.id));
    for (const id of [...runtimes.keys()]) {
      if (!activeIds.has(id)) runtimes.delete(id);
    }
    for (const f of fish) {
      if (f.status === 'active' && !runtimes.has(f.id)) {
        runtimes.set(f.id, createInitialRuntime(f.id, bounds()));
      }
    }
  }

  function tick(now: number, dtSec: number) {
    syncRuntimes();
    const fish = getFish();
    const b = bounds();
    stepDecisions(fish, runtimes, b, now);
    foodParticles = stepFood(foodParticles, dtSec, b);
    const wallNow = Date.now();

    for (const f of fish) {
      if (f.status !== 'active') continue;
      const runtime = runtimes.get(f.id);
      if (!runtime) continue;

      // Visible happiness floor (FR-14): low happiness slows movement, never stops it.
      const happy = happiness(f, f.hunger, wallNow);
      const speedMult = happy >= LOW_STAT_THRESHOLD ? 1 : floorLerp(FLOOR_SPEED_MULT_MIN, happy);

      // Hungry fish home in on the nearest food particle in range, overriding normal wandering
      // until they reach it or it drifts out of range/gets eaten by someone else.
      const targetFood =
        f.hunger < FOOD_FULL_HUNGER_THRESHOLD
          ? findNearestFood(runtime.x, runtime.y, foodParticles, FOOD_DETECT_RADIUS)
          : null;

      let targetHeading = runtime.targetHeading;
      let targetSpeed = runtime.targetSpeed * speedMult;
      if (targetFood) {
        targetHeading = Math.atan2(targetFood.y - runtime.y, targetFood.x - runtime.x);
        targetSpeed = Math.max(targetSpeed, SPECIES[f.speciesId].baseSpeed * 0.85 * speedMult);
      }

      runtime.heading = angleLerp(runtime.heading, targetHeading, HEADING_LERP);
      runtime.speed += (targetSpeed - runtime.speed) * SPEED_LERP;

      runtime.x += Math.cos(runtime.heading) * runtime.speed * dtSec;
      runtime.y += Math.sin(runtime.heading) * runtime.speed * dtSec;
      runtime.x = Math.max(0, Math.min(b.width, runtime.x));
      runtime.y = Math.max(0, Math.min(b.height, runtime.y));

      if (targetFood && Math.hypot(targetFood.x - runtime.x, targetFood.y - runtime.y) <= FOOD_NIBBLE_RADIUS) {
        foodParticles = foodParticles.filter((p) => p.id !== targetFood.id);
        onFoodEaten(f.id, targetFood.amount);
      }

      const baseSpeed = SPECIES[f.speciesId].baseSpeed;
      const speedRatio = baseSpeed > 0 ? runtime.speed / baseSpeed : 0;
      runtime.tailPhase += TAIL_WAG_SPEED * (0.4 + speedRatio) * dtSec;
    }
  }

  function render() {
    renderCount++;
    const b = bounds();
    const wallNow = Date.now();

    ctx.fillStyle = '#0a2a3d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawDecorations(ctx, b, wallNow);

    for (const particle of foodParticles) {
      drawFoodParticle(ctx, particle);
    }

    for (const f of getFish()) {
      if (f.status !== 'active') continue;
      const runtime = runtimes.get(f.id);
      if (!runtime) continue;

      // Visible hunger floor (FR-14): low hunger desaturates color, never terminal.
      const saturationMult =
        f.hunger >= LOW_STAT_THRESHOLD ? 1 : floorLerp(FLOOR_SATURATION_MIN, f.hunger);
      const happy = happiness(f, f.hunger, wallNow);
      const liveliness = happy >= LOW_STAT_THRESHOLD ? 1 : floorLerp(FLOOR_LIVELINESS_MIN, happy);

      drawFish(ctx, runtime, SPECIES[f.speciesId], { saturationMult, liveliness });
    }
  }

  function frame(now: number) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    if (now - lastFrameTime < FRAME_INTERVAL_MS) return;
    const dtSec = Math.min(0.1, (now - lastTickTime) / 1000);
    lastFrameTime = now;
    lastTickTime = now;
    tick(now, dtSec);
    render();
  }

  function handleVisibility() {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (running && !rafId) {
      lastFrameTime = performance.now();
      lastTickTime = lastFrameTime;
      // Resuming after being hidden: pick fresh headings now rather than
      // lurching toward a target chosen long ago.
      for (const runtime of runtimes.values()) runtime.nextDecisionAt = 0;
      rafId = requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', handleVisibility);
  syncRuntimes();
  rafId = requestAnimationFrame(frame);

  return {
    stop: () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
    },
    getRuntimes: () => runtimes,
    getRenderCount: () => renderCount,
    spawnFood: () => {
      const activeCount = getFish().filter((f) => f.status === 'active').length;
      foodParticles = [...foodParticles, ...spawnFoodBatch(activeCount, FEED_HUNGER_BOOST, bounds())];
    },
  };
}
