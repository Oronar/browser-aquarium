export interface AboutModalHandle {
  open: () => void;
}

export function createAboutModal(): AboutModalHandle {
  const overlay = document.createElement('div');
  overlay.id = 'about-overlay';
  overlay.className = 'modal-overlay hidden';

  const modal = document.createElement('div');
  modal.className = 'modal';
  overlay.appendChild(modal);

  const title = document.createElement('h2');
  title.textContent = 'Digital Aquarium';
  modal.appendChild(title);

  const version = document.createElement('div');
  version.className = 'about-version';
  version.textContent = `Version ${__APP_VERSION__}`;
  modal.appendChild(version);

  const actionsRow = document.createElement('div');
  actionsRow.className = 'modal-actions';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.className = 'btn-primary';
  actionsRow.appendChild(closeBtn);
  modal.appendChild(actionsRow);

  document.body.appendChild(overlay);

  function close(): void {
    overlay.classList.add('hidden');
  }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return {
    open() {
      overlay.classList.remove('hidden');
    },
  };
}
