"use client";

import { useMemo, useState, useTransition } from "react";
import { SongChip } from "../_components/song-chip";
import { addShortlistItemAction, removeShortlistItemAction } from "./actions";

type Item = { id: string; hymnNumber: string; title: string; createdAt: string };

type SortKey = "added" | "title" | "hymn";
type Sort = { key: SortKey; dir: 1 | -1 };

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "added", label: "Recently Added" },
  { key: "hymn", label: "Hymn #" },
];

export function ShortlistClient({ items }: { items: Item[] }) {
  const [hymnNumber, setHymnNumber] = useState("");
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<Sort>({ key: "added", dir: -1 });

  function add() {
    if (!value.trim()) return;
    startTransition(async () => {
      await addShortlistItemAction(value, hymnNumber);
      setValue("");
      setHymnNumber("");
    });
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  const sortedItems = useMemo(() => {
    return items.slice().sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sort.key === "added") {
        av = a.createdAt;
        bv = b.createdAt;
      } else if (sort.key === "hymn") {
        av = /^\d+$/.test(a.hymnNumber) ? Number(a.hymnNumber) : -1;
        bv = /^\d+$/.test(b.hymnNumber) ? Number(b.hymnNumber) : -1;
      } else {
        av = a.title.toLowerCase();
        bv = b.title.toLowerCase();
      }
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  }, [items, sort]);

  return (
    <div>
      <div className="mb-3.5 flex gap-2">
        <input
          value={hymnNumber}
          onChange={(e) => setHymnNumber(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="#"
          title="Hymn # (leave blank for a chorus)"
          className="font-mono-tab w-16 flex-none rounded-lg border border-border-strong bg-surface px-2 py-2.5 text-center text-sm"
        />
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

      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs font-bold tracking-wide text-text-muted uppercase">
        <span>Sort:</span>
        {SORT_OPTIONS.map((opt) => {
          const active = sort.key === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggleSort(opt.key)}
              className={
                "flex items-center gap-1 rounded-full border px-2.5 py-1 " +
                (active
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border-strong text-text-muted hover:border-accent")
              }
            >
              {opt.label}
              <span className={active ? "text-accent" : "invisible"}>
                {active && sort.dir === -1 ? "▼" : "▲"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {sortedItems.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-faint italic">
            No songs on your shortlist yet — add one above.
          </p>
        ) : (
          sortedItems.map((item, i) => (
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
