import type { Fish, PersistedState } from './schema';
import { TRAITS } from '../domain/personality';

/** Full hunger (100) decays to empty (0) over 24h of real time if the fish is never fed. */
export const BASE_HUNGER_DECAY_PER_HOUR = 100 / 24;

/** Below this, rendering should shift toward "sluggish/duller" — never a failed state. */
export const LOW_STAT_THRESHOLD = 30;

export const FEED_HUNGER_BOOST = 40;

const HAPPINESS_WOBBLE_PERIOD_MS = 25 * 60 * 1000;

export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Hunger is a closed-form function of elapsed real time, not a per-tick simulation —
 * catching up after the app was closed for months is one subtraction, not a replay loop.
 */
export function liveHunger(fish: Fish, lastSavedAtMs: number, nowMs: number): number {
  if (fish.status === 'stasis') return fish.hunger;
  const hoursElapsed = Math.max(0, (nowMs - lastSavedAtMs) / 3_600_000);
  const rate = BASE_HUNGER_DECAY_PER_HOUR * TRAITS[fish.traitId].hungerDecayMult;
  return clamp(0, 100, fish.hunger - rate * hoursElapsed);
}

/**
 * Happiness is never persisted: it's a pure function of live hunger plus a slow,
 * deterministic per-fish sine wobble (seeded by fish id, no stored jitter/RNG),
 * so mood ebbs and flows without extra state or its own catch-up logic.
 */
export function happiness(fish: Fish, liveHungerValue: number, nowMs: number): number {
  const phase = hashSeed(fish.id);
  const wobble = 50 + 50 * Math.sin(phase + nowMs / HAPPINESS_WOBBLE_PERIOD_MS);
  const traitOffset = TRAITS[fish.traitId].happinessBaselineOffset;
  return clamp(0, 100, 0.7 * liveHungerValue + 0.3 * wobble + traitOffset);
}

/** Applies catch-up decay to all active fish, returning a fresh checkpoint as of `now`. */
export function catchUpState(state: PersistedState, now: Date = new Date()): PersistedState {
  const nowMs = now.getTime();
  const lastSavedAtMs = new Date(state.lastSavedAt).getTime();
  const fish = state.fish.map((f) => ({
    ...f,
    hunger: liveHunger(f, lastSavedAtMs, nowMs),
  }));
  return { ...state, lastSavedAt: now.toISOString(), fish };
}

/**
 * Applies one nibble's worth of hunger to a single fish, clamped to 100.
 * The Owner-facing feed action (FR-16) is still global — it drops food for the whole
 * tank — but delivery happens gradually as each fish swims up and eats, not as an
 * instant flat boost.
 */
export function feedFish(state: PersistedState, fishId: string, amount: number): PersistedState {
  const fish = state.fish.map((f) =>
    f.id === fishId ? { ...f, hunger: clamp(0, 100, f.hunger + amount) } : f,
  );
  return { ...state, fish };
}
