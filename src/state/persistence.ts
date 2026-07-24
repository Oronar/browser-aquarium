import type { PersistedState } from './schema';
import { CURRENT_SCHEMA_VERSION } from './schema';
import { createFish, randomizeTraits } from '../domain/fish';

const STORAGE_KEY = 'digitalAquarium.state.v1';
const CORRUPT_BACKUP_KEY = 'digitalAquarium.state.v1.corrupt-backup';

const STARTER_NAMES = ['Bubbles', 'Finn', 'Pearl'];

function seedStarterFish(): PersistedState {
  const fish = STARTER_NAMES.map((name) => {
    const { speciesId, traitId } = randomizeTraits();
    return createFish({ name, speciesId, traitId });
  });
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastSavedAt: new Date().toISOString(),
    fish,
  };
}

export function isValidPersistedState(data: unknown): data is PersistedState {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.schemaVersion === CURRENT_SCHEMA_VERSION &&
    typeof d.lastSavedAt === 'string' &&
    Array.isArray(d.fish)
  );
}

export function loadState(): PersistedState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedStarterFish();

  try {
    const parsed = JSON.parse(raw);
    if (!isValidPersistedState(parsed)) throw new Error('Persisted state failed schema validation');
    return parsed;
  } catch (err) {
    console.error('Aquarium state was corrupt; backing it up and starting fresh.', err);
    localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    return seedStarterFish();
  }
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
