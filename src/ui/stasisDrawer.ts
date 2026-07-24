import type { Fish } from '../state/schema';
import { SPECIES } from '../domain/species';

export interface StasisDrawerHandle {
  toggle: () => void;
  refresh: (stasisFish: Fish[]) => void;
  isOpen: () => boolean;
}

export function createStasisDrawer(handlers: {
  onRevive: (fishId: string) => void;
  onDeletePermanently: (fishId: string) => void;
}): StasisDrawerHandle {
  const el = document.createElement('div');
  el.id = 'stasis-drawer';
  el.className = 'panel drawer hidden';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => el.classList.add('hidden'));
  el.appendChild(closeBtn);

  const title = document.createElement('h2');
  title.textContent = 'Stasis';
  el.appendChild(title);

  const list = document.createElement('div');
  list.className = 'stasis-list';
  el.appendChild(list);

  document.body.appendChild(el);

  function render(stasisFish: Fish[]): void {
    list.innerHTML = '';
    if (stasisFish.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'stasis-empty';
      empty.textContent = 'No fish in stasis.';
      list.appendChild(empty);
      return;
    }
    for (const fish of stasisFish) {
      const row = document.createElement('div');
      row.className = 'stasis-row';

      const info = document.createElement('div');
      info.className = 'stasis-row-info';
      info.textContent = `${fish.name} (${SPECIES[fish.speciesId].label})`;
      row.appendChild(info);

      const reviveBtn = document.createElement('button');
      reviveBtn.textContent = 'Revive';
      reviveBtn.className = 'btn-primary btn-small';
      reviveBtn.addEventListener('click', () => handlers.onRevive(fish.id));
      row.appendChild(reviveBtn);

      const deleteLink = document.createElement('button');
      deleteLink.textContent = 'Delete permanently';
      deleteLink.className = 'buried-delete-link';
      deleteLink.addEventListener('click', () => {
        if (window.confirm(`Permanently delete ${fish.name}? This cannot be undone.`)) {
          handlers.onDeletePermanently(fish.id);
        }
      });
      row.appendChild(deleteLink);

      list.appendChild(row);
    }
  }

  return {
    toggle() {
      el.classList.toggle('hidden');
    },
    refresh: render,
    isOpen() {
      return !el.classList.contains('hidden');
    },
  };
}
