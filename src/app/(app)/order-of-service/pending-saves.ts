// Every Order of Service row autosaves as you type, but a save can still be
// waiting on its debounce timer or in flight when something navigates away
// (the date picker, the History link). Rows register a flusher here so those
// callers can `await flushAllSaves()` first and never drop an edit.
const flushers = new Set<() => Promise<void>>();

export function registerFlusher(fn: () => Promise<void>): () => void {
  flushers.add(fn);
  return () => {
    flushers.delete(fn);
  };
}

export async function flushAllSaves(): Promise<void> {
  await Promise.all([...flushers].map((fn) => fn()));
}
