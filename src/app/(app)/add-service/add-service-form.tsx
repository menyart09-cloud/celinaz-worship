"use client";

import { useActionState, useState } from "react";
import { SundayDatePicker } from "./date-picker";
import { createServiceAction, type CreateServiceState } from "./actions";

type SongDraft = { hymnNumber: string; title: string; verses: string };

const initialState: CreateServiceState = { error: null };

export function AddServiceForm() {
  const [state, formAction, pending] = useActionState(createServiceAction, initialState);
  const [songs, setSongs] = useState<SongDraft[]>([{ hymnNumber: "Comp", title: "", verses: "" }]);

  function updateSong(i: number, field: keyof SongDraft, value: string) {
    setSongs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function moveSong(i: number, direction: "up" | "down") {
    const target = direction === "up" ? i - 1 : i + 1;
    setSongs((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }

  return (
    <form action={formAction} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <input type="hidden" name="songs" value={JSON.stringify(songs)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wide text-text-muted uppercase">
            Date
          </label>
          <SundayDatePicker name="date" />
        </div>
        <div>
          <label htmlFor="sermon" className="mb-1 block text-xs font-bold tracking-wide text-text-muted uppercase">
            Sermon
          </label>
          <input
            id="sermon"
            name="sermon"
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="scripture" className="mb-1 block text-xs font-bold tracking-wide text-text-muted uppercase">
            Scripture
          </label>
          <input
            id="scripture"
            name="scripture"
            className="font-mono-tab w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="note" className="mb-1 block text-xs font-bold tracking-wide text-text-muted uppercase">
            Note <span className="font-normal normal-case text-text-faint">(a cappella, guest speaker, no church…)</span>
          </label>
          <input
            id="note"
            name="note"
            placeholder="e.g. Communion Sunday"
            className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-bold">Setlist</h3>
        <div className="flex flex-col gap-2">
          {songs.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[56px_minmax(0,1fr)_64px_24px_36px] items-center gap-1.5 sm:grid-cols-[74px_minmax(0,1fr)_110px_24px_36px] sm:gap-2"
            >
              <input
                value={s.hymnNumber}
                onChange={(e) => updateSong(i, "hymnNumber", e.target.value)}
                placeholder="#"
                className="font-mono-tab min-w-0 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-center text-sm"
              />
              <input
                value={s.title}
                onChange={(e) => updateSong(i, "title", e.target.value)}
                placeholder="Song title"
                list="song-title-options"
                className="min-w-0 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm"
              />
              <input
                value={s.verses}
                onChange={(e) => updateSong(i, "verses", e.target.value)}
                placeholder="verses"
                className="min-w-0 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm"
              />
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveSong(i, "up")}
                  disabled={i === 0}
                  aria-label="Move song up"
                  className="flex h-4 w-6 items-center justify-center text-xs text-text-faint hover:text-accent-strong disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveSong(i, "down")}
                  disabled={i === songs.length - 1}
                  aria-label="Move song down"
                  className="flex h-4 w-6 items-center justify-center text-xs text-text-faint hover:text-accent-strong disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSongs((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove song"
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-faint hover:bg-accent-soft hover:text-accent"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSongs((prev) => [...prev, { hymnNumber: "Comp", title: "", verses: "" }])}
          className="mt-3 w-full rounded-md border border-dashed border-border-strong px-3 py-2 text-sm font-semibold text-text-muted hover:border-accent hover:text-accent-strong"
        >
          + Add another song
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Service"}
        </button>
      </div>
    </form>
  );
}
