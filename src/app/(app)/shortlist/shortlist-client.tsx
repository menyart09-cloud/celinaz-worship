"use client";

import { useState, useTransition } from "react";
import { SongChip } from "../_components/song-chip";
import { addShortlistItemAction, removeShortlistItemAction } from "./actions";

type Item = { id: string; hymnNumber: string; title: string };

export function ShortlistClient({ items }: { items: Item[] }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!value.trim()) return;
    startTransition(async () => {
      await addShortlistItemAction(value);
      setValue("");
    });
  }

  return (
    <div>
      <div className="mb-3.5 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. Way Maker"
          className="flex-1 rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={pending}
          className="rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
        >
          + Add idea
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-faint italic">
            No songs on your shortlist yet — add one above.
          </p>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className={"flex items-center justify-between gap-2 border-t border-border p-3 first:border-t-0 " + (i % 2 === 1 ? "bg-surface-alt" : "")}
            >
              <SongChip hymnNumber={item.hymnNumber} title={item.title} />
              <button
                type="button"
                onClick={() => startTransition(() => removeShortlistItemAction(item.id))}
                aria-label="Remove from shortlist"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-text-faint hover:bg-accent-soft hover:text-accent"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
