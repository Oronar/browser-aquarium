export interface MenuHandle {
  setStasisCount: (count: number) => void;
}

export function createMenu(handlers: {
  onFeed: () => void;
  onAddFish: () => void;
  onToggleStasisDrawer: () => void;
  onExport: () => void;
  onImport: () => void;
  onToggleFullscreen: () => void;
  onAbout: () => void;
}): MenuHandle {
  const el = document.createElement('div');
  el.id = 'menu';
  el.className = 'menu';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'menu-toggle';
  toggleBtn.textContent = '☰';
  toggleBtn.setAttribute('aria-label', 'Menu');
  el.appendChild(toggleBtn);

  const dropdown = document.createElement('div');
  dropdown.className = 'menu-dropdown hidden';
  el.appendChild(dropdown);

  function addItem(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'toolbar-btn menu-item';
    btn.addEventListener('click', () => {
      // Close first so the item's own action (e.g. opening the Stasis drawer, which sits
      // in roughly the same top-right area) isn't left underneath/behind an open dropdown.
      dropdown.classList.add('hidden');
      onClick();
    });
    dropdown.appendChild(btn);
    return btn;
  }

  addItem('Feed', handlers.onFeed);
  addItem('Add Fish', handlers.onAddFish);
  const stasisBtn = addItem('Stasis (0)', handlers.onToggleStasisDrawer);
  addItem('Export', handlers.onExport);
  addItem('Import', handlers.onImport);
  addItem('Fullscreen', handlers.onToggleFullscreen);

  const divider = document.createElement('hr');
  divider.className = 'menu-divider';
  dropdown.appendChild(divider);

  addItem('About', handlers.onAbout);

  toggleBtn.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (event) => {
    if (!el.contains(event.target as Node)) {
      dropdown.classList.add('hidden');
    }
  });

  document.body.appendChild(el);

  function setStasisCount(count: number): void {
    stasisBtn.textContent = `Stasis (${count})`;
  }
  setStasisCount(0);

  return { setStasisCount };
}
