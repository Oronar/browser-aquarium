import type { PersistedState } from '../state/schema';
import { isValidPersistedState } from '../state/persistence';

export function exportState(state: PersistedState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `digital-aquarium-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function triggerImport(
  onImported: (state: PersistedState) => void,
  onError: (message: string) => void,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.style.display = 'none';

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) {
      input.remove();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isValidPersistedState(parsed)) {
          throw new Error('That file is not a valid Digital Aquarium export.');
        }
        onImported(parsed);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to import file.');
      } finally {
        input.remove();
      }
    };
    reader.onerror = () => {
      onError('Failed to read the selected file.');
      input.remove();
    };
    reader.readAsText(file);
  });

  document.body.appendChild(input);
  input.click();
}
