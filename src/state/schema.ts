import type { SpeciesId } from '../domain/species';
import type { TraitId } from '../domain/personality';

export type FishId = string;
export type FishStatus = 'active' | 'stasis';

export interface Fish {
  id: FishId;
  name: string;
  speciesId: SpeciesId;
  traitId: TraitId;
  birthDate: string; // ISO 8601
  status: FishStatus;
  /** Hunger 0-100, a snapshot valid as of PersistedState.lastSavedAt. */
  hunger: number;
  createdAt: string; // ISO 8601
}

export const CURRENT_SCHEMA_VERSION = 1 as const;

export interface PersistedStateV1 {
  schemaVersion: 1;
  lastSavedAt: string; // ISO 8601
  fish: Fish[];
}

export type PersistedState = PersistedStateV1;
