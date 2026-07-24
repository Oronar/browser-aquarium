import { loadState, saveState } from './state/persistence';
import { catchUpState, feedFish } from './state/decay';
import { startTank } from './render/canvas';
import { pickFishAt } from './render/hitTest';
import { createFishDetailPanel } from './ui/fishDetailPanel';
import { createMenu } from './ui/menu';
import { createAboutModal } from './ui/aboutModal';
import { createAddFishModal } from './ui/addFishModal';
import { createStasisDrawer } from './ui/stasisDrawer';
import { exportState, triggerImport } from './ui/exportImport';
import { createFish, renameFish, setFishStatus } from './domain/fish';

const RECHECKPOINT_INTERVAL_MS = 60_000;

const app = document.querySelector<HTMLDivElement>('#app')!;

const canvas = document.createElement('canvas');
canvas.id = 'tank-canvas';
app.appendChild(canvas);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Catch up hunger decay for whatever real time elapsed since the last save
// (including time the app was closed), then checkpoint immediately.
const state = catchUpState(loadState());
saveState(state);

const tank = startTank(canvas, () => state.fish, (fishId, amount) => {
  state.fish = feedFish(state, fishId, amount).fish;
  persist();
});

function persist(): void {
  saveState(state);
}

function refreshStasisUI(): void {
  const stasisFish = state.fish.filter((f) => f.status === 'stasis');
  menu.setStasisCount(stasisFish.length);
  stasisDrawer.refresh(stasisFish);
}

const panel = createFishDetailPanel({
  onRename(fishId, name) {
    const idx = state.fish.findIndex((f) => f.id === fishId);
    if (idx === -1) return;
    state.fish[idx] = renameFish(state.fish[idx], name);
    persist();
  },
  onStasis(fishId) {
    const idx = state.fish.findIndex((f) => f.id === fishId);
    if (idx === -1) return;
    state.fish[idx] = setFishStatus(state.fish[idx], 'stasis');
    persist();
    refreshStasisUI();
  },
});

const addFishModal = createAddFishModal(({ name, speciesId, traitId }) => {
  state.fish.push(createFish({ name, speciesId, traitId }));
  persist();
});

const stasisDrawer = createStasisDrawer({
  onRevive(fishId) {
    const idx = state.fish.findIndex((f) => f.id === fishId);
    if (idx === -1) return;
    state.fish[idx] = setFishStatus(state.fish[idx], 'active');
    persist();
    refreshStasisUI();
  },
  onDeletePermanently(fishId) {
    state.fish = state.fish.filter((f) => f.id !== fishId);
    persist();
    refreshStasisUI();
  },
});

const aboutModal = createAboutModal();

const menu = createMenu({
  onFeed() {
    tank.spawnFood();
  },
  onAddFish() {
    addFishModal.open();
  },
  onToggleStasisDrawer() {
    refreshStasisUI();
    stasisDrawer.toggle();
  },
  onExport() {
    exportState(state);
  },
  onImport() {
    triggerImport(
      (imported) => {
        Object.assign(state, catchUpState(imported));
        persist();
        panel.hide();
        refreshStasisUI();
      },
      (message) => {
        window.alert(message);
      },
    );
  },
  onToggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        window.alert('Fullscreen was blocked by the browser.');
      });
    }
  },
  onAbout() {
    aboutModal.open();
  },
});

refreshStasisUI();

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const fish = pickFishAt(x, y, state.fish, tank.getRuntimes());
  if (fish) panel.open(fish);
});

// Keep the open detail panel's stats live while the Owner is looking at it.
setInterval(() => {
  for (const fish of state.fish) {
    if (panel.isOpenFor(fish.id)) panel.refresh(fish);
  }
}, 1000);

// Hunger must keep decaying over real time during a live session too, not
// just be caught up once at boot — re-checkpoint periodically, and flush
// immediately when the tab is hidden or about to close so as little of that
// window as possible is lost (NFR-4: no data loss across sleep/wake, etc.).
function checkpointNow(): void {
  Object.assign(state, catchUpState(state));
  persist();
}
setInterval(checkpointNow, RECHECKPOINT_INTERVAL_MS);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) checkpointNow();
});
window.addEventListener('pagehide', checkpointNow);

// Exposed for manual devtools inspection and automated verification during development.
Object.assign(window as unknown as Record<string, unknown>, {
  __aquariumState: state,
  __tankHandle: tank,
});
