import type { Fish } from '../state/schema';
import { SPECIES } from '../domain/species';
import { TRAITS } from '../domain/personality';
import { happiness } from '../state/decay';

export interface FishDetailPanelHandle {
  open: (fish: Fish) => void;
  refresh: (fish: Fish) => void;
  hide: () => void;
  isOpenFor: (fishId: string) => boolean;
}

export interface FishDetailPanelHandlers {
  onRename: (fishId: string, name: string) => void;
  onStasis: (fishId: string) => void;
}

function formatAge(birthDateIso: string, now: number): string {
  const ms = now - new Date(birthDateIso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'less than an hour old';
  if (hours < 24) return hours === 1 ? '1 hour old' : `${hours} hours old`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day old' : `${days} days old`;
}

export function createFishDetailPanel(handlers: FishDetailPanelHandlers): FishDetailPanelHandle {
  const el = document.createElement('div');
  el.id = 'fish-detail-panel';
  el.className = 'panel hidden';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close');
  el.appendChild(closeBtn);

  const nameInput = document.createElement('input');
  nameInput.className = 'fish-name-input';
  nameInput.maxLength = 40;
  el.appendChild(nameInput);

  const speciesEl = document.createElement('div');
  speciesEl.className = 'fish-species';
  el.appendChild(speciesEl);

  const ageEl = document.createElement('div');
  ageEl.className = 'fish-age';
  el.appendChild(ageEl);

  const traitEl = document.createElement('div');
  traitEl.className = 'fish-trait';
  el.appendChild(traitEl);

  const statsEl = document.createElement('div');
  statsEl.className = 'fish-stats';
  el.appendChild(statsEl);

  const stasisBtn = document.createElement('button');
  stasisBtn.textContent = 'Move to Stasis';
  stasisBtn.className = 'btn-secondary btn-small';
  el.appendChild(stasisBtn);

  document.body.appendChild(el);

  let currentFishId: string | null = null;

  function hide(): void {
    el.classList.add('hidden');
    currentFishId = null;
  }

  function render(fish: Fish): void {
    const species = SPECIES[fish.speciesId];
    const trait = TRAITS[fish.traitId];
    const now = Date.now();
    const happy = happiness(fish, fish.hunger, now);

    if (document.activeElement !== nameInput) nameInput.value = fish.name;
    speciesEl.textContent = species.label;
    ageEl.textContent = formatAge(fish.birthDate, now);
    traitEl.textContent = `${trait.label} — ${trait.description}`;
    statsEl.textContent = `Hunger: ${Math.round(fish.hunger)} · Happiness: ${Math.round(happy)}`;
  }

  nameInput.addEventListener('change', () => {
    const name = nameInput.value.trim();
    if (currentFishId && name) handlers.onRename(currentFishId, name);
  });

  stasisBtn.addEventListener('click', () => {
    if (currentFishId) handlers.onStasis(currentFishId);
    hide();
  });

  closeBtn.addEventListener('click', hide);

  return {
    open(fish: Fish) {
      currentFishId = fish.id;
      render(fish);
      el.classList.remove('hidden');
    },
    refresh(fish: Fish) {
      if (currentFishId === fish.id) render(fish);
    },
    hide,
    isOpenFor(fishId: string) {
      return currentFishId === fishId;
    },
  };
}
