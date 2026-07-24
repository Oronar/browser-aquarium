import { SPECIES, SPECIES_IDS, type SpeciesId } from '../domain/species';
import { TRAITS, TRAIT_IDS, type TraitId } from '../domain/personality';
import { randomizeTraits } from '../domain/fish';

export interface AddFishModalHandle {
  open: () => void;
}

function labeled(labelText: string, input: HTMLElement): HTMLLabelElement {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const span = document.createElement('span');
  span.textContent = labelText;
  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}

export function createAddFishModal(
  onAdd: (opts: { name: string; speciesId: SpeciesId; traitId: TraitId }) => void,
): AddFishModalHandle {
  const overlay = document.createElement('div');
  overlay.id = 'add-fish-overlay';
  overlay.className = 'modal-overlay hidden';

  const modal = document.createElement('div');
  modal.className = 'modal';
  overlay.appendChild(modal);

  const title = document.createElement('h2');
  title.textContent = 'Add a Fish';
  modal.appendChild(title);

  const modeRow = document.createElement('div');
  modeRow.className = 'mode-row';
  const manualBtn = document.createElement('button');
  manualBtn.textContent = 'Manual';
  manualBtn.className = 'mode-btn';
  const randomBtn = document.createElement('button');
  randomBtn.textContent = 'Random';
  randomBtn.className = 'mode-btn';
  modeRow.appendChild(manualBtn);
  modeRow.appendChild(randomBtn);
  modal.appendChild(modeRow);

  const speciesSelect = document.createElement('select');
  for (const id of SPECIES_IDS) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = SPECIES[id].label;
    speciesSelect.appendChild(opt);
  }
  const speciesField = labeled('Species', speciesSelect);
  modal.appendChild(speciesField);

  const traitSelect = document.createElement('select');
  for (const id of TRAIT_IDS) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = TRAITS[id].label;
    traitSelect.appendChild(opt);
  }
  const traitField = labeled('Personality', traitSelect);
  modal.appendChild(traitField);

  const rolledEl = document.createElement('div');
  rolledEl.className = 'rolled-result hidden';
  modal.appendChild(rolledEl);

  const rerollBtn = document.createElement('button');
  rerollBtn.textContent = 'Reroll';
  rerollBtn.className = 'toolbar-btn hidden';
  modal.appendChild(rerollBtn);

  const nameInput = document.createElement('input');
  nameInput.placeholder = 'Name your fish';
  nameInput.maxLength = 40;
  modal.appendChild(labeled('Name', nameInput));

  const actionsRow = document.createElement('div');
  actionsRow.className = 'modal-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn-secondary';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add';
  addBtn.className = 'btn-primary';
  actionsRow.appendChild(cancelBtn);
  actionsRow.appendChild(addBtn);
  modal.appendChild(actionsRow);

  document.body.appendChild(overlay);

  let mode: 'manual' | 'random' = 'manual';
  let rolled: { speciesId: SpeciesId; traitId: TraitId } | null = null;

  function reroll(): void {
    rolled = randomizeTraits();
    rolledEl.textContent = `${SPECIES[rolled.speciesId].label} — ${TRAITS[rolled.traitId].label}`;
  }

  function setMode(next: 'manual' | 'random'): void {
    mode = next;
    manualBtn.classList.toggle('active', next === 'manual');
    randomBtn.classList.toggle('active', next === 'random');
    speciesField.classList.toggle('hidden', next === 'random');
    traitField.classList.toggle('hidden', next === 'random');
    rolledEl.classList.toggle('hidden', next !== 'random');
    rerollBtn.classList.toggle('hidden', next !== 'random');
    if (next === 'random') reroll();
  }

  manualBtn.addEventListener('click', () => setMode('manual'));
  randomBtn.addEventListener('click', () => setMode('random'));
  rerollBtn.addEventListener('click', reroll);

  function close(): void {
    overlay.classList.add('hidden');
  }
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    const speciesId = mode === 'manual' ? (speciesSelect.value as SpeciesId) : rolled!.speciesId;
    const traitId = mode === 'manual' ? (traitSelect.value as TraitId) : rolled!.traitId;
    onAdd({ name, speciesId, traitId });
    close();
  });

  return {
    open() {
      nameInput.value = '';
      setMode('manual');
      overlay.classList.remove('hidden');
      nameInput.focus();
    },
  };
}
