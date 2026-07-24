import type { Fish, FishStatus } from '../state/schema';
import { SPECIES_IDS, type SpeciesId } from './species';
import { TRAIT_IDS, type TraitId } from './personality';

export interface CreateFishOptions {
  name: string;
  speciesId: SpeciesId;
  traitId: TraitId;
}

export function createFish(opts: CreateFishOptions): Fish {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: opts.name,
    speciesId: opts.speciesId,
    traitId: opts.traitId,
    birthDate: now,
    status: 'active',
    hunger: 100,
    createdAt: now,
  };
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomizeTraits(): { speciesId: SpeciesId; traitId: TraitId } {
  return {
    speciesId: pickRandom(SPECIES_IDS),
    traitId: pickRandom(TRAIT_IDS),
  };
}

export function renameFish(fish: Fish, name: string): Fish {
  return { ...fish, name };
}

export function setFishStatus(fish: Fish, status: FishStatus): Fish {
  return { ...fish, status };
}
