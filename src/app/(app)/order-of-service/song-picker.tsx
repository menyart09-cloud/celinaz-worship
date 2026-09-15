"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { SongLibraryRow } from "@/lib/queries";
import { addSongToItemAction } from "./actions";

export function SongPickerButton({ itemId, library }: { itemId: string; library: SongLibraryRow[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const matches = library.filter((s) => s.title.toLowerCase().includes(filter.toLowerCase())).slice(0, 40);

  function pick(hymnNumber: string, title: string) {
    startTransition(async () => {
      await addSongToItemAction(itemId, hymnNumber, title);
      setOpen(false);
      setFilter("");
    });
  }

  return (
    <span className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="rounded-md border border-dashed border-border-strong px-2.5 py-1 text-xs font-semibold text-text-muted hover:border-accent hover:text-accent-strong"
      >
        + Add song
      </button>
      {open && (
        <div
          ref={popRef}
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border border-border-strong bg-surface p-2.5 shadow-lg"
        >
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search the library…"
            className="mb-2 w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm"
          />
          <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="p-1 text-sm text-text-faint italic">No matches in the library.</p>
            ) : (
              matches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s.hymnNumber, s.title)}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-soft"
                >
                  <span className="font-mono-tab text-xs text-text-muted">{s.hymnNumber}</span>
                  <span className="flex-1 truncate">{s.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </span>
  );
}
