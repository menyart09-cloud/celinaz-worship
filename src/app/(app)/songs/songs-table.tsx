"use client";

import { useMemo, useState } from "react";
import { isoToMdy } from "@/lib/dates";
import { HymnBadge, SongChip } from "../_components/song-chip";
import type { SongLibraryRow } from "@/lib/queries";

type SortKey = "hymn" | "title" | "source" | "uses";
type Sort = { key: SortKey; dir: 1 | -1 };

function Th({
  label,
  sortKey,
  width,
  sort,
  onToggle,
}: {
  label: string;
  sortKey?: SortKey;
  width?: string;
  sort: Sort;
  onToggle: (key: SortKey) => void;
}) {
  const active = sortKey && sort.key === sortKey;
  return (
    <th
      style={width ? { width } : undefined}
      className="sticky top-0 z-10 border-b border-border bg-surface-sunk p-0 text-left"
    >
      {sortKey ? (
        <button
          type="button"
          onClick={() => onToggle(sortKey)}
          className={
            "flex w-full items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold tracking-wide uppercase " +
            (active ? "text-accent-strong" : "text-text-muted hover:bg-surface-alt")
          }
        >
          {label}
          <span className={active ? "text-accent" : "invisible"}>{active && sort.dir === -1 ? "▼" : "▲"}</span>
        </button>
      ) : (
        <div className="px-3.5 py-2.5 text-xs font-bold tracking-wide text-text-muted uppercase">{label}</div>
      )}
    </th>
  );
}

export function SongsTable({ songs }: { songs: SongLibraryRow[] }) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "title", dir: 1 });

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = songs.filter(
      (s) => !f || s.title.toLowerCase().includes(f) || s.hymnNumber.toLowerCase().includes(f),
    );
    return filtered.slice().sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sort.key === "hymn") {
        av = /^\d+$/.test(a.hymnNumber) ? Number(a.hymnNumber) : -1;
        bv = /^\d+$/.test(b.hymnNumber) ? Number(b.hymnNumber) : -1;
      } else if (sort.key === "uses") {
        av = a.useCount;
        bv = b.useCount;
      } else if (sort.key === "source") {
        av = a.source;
        bv = b.source;
      } else {
        av = a.title.toLowerCase();
        bv = b.title.toLowerCase();
      }
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  }, [songs, filter, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by title or hymn #…"
        className="mb-3.5 w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm sm:max-w-xs"
      />
      <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <Th label="Hymn #" sortKey="hymn" width="80px" sort={sort} onToggle={toggleSort} />
              <Th label="Title" sortKey="title" sort={sort} onToggle={toggleSort} />
              <Th label="Source" sortKey="source" width="90px" sort={sort} onToggle={toggleSort} />
              <Th label="Usage" sortKey="uses" width="260px" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-surface-alt">
                <td className="border-t border-border px-3.5 py-2.5">
                  <HymnBadge hymnNumber={s.hymnNumber} />
                </td>
                <td className="border-t border-border px-3.5 py-2.5">
                  <SongChip hymnNumber={s.hymnNumber} title={s.title} hideBadge />
                </td>
                <td className="border-t border-border px-3.5 py-2.5">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-bold uppercase " +
                      (s.source === "hymnal"
                        ? "border border-border bg-surface-sunk text-text-muted"
                        : "border border-accent-soft-border bg-accent-soft text-accent-strong")
                    }
                  >
                    {s.source === "hymnal" ? "Hymnal" : "Comp"}
                  </span>
                </td>
                <td className="border-t border-border px-3.5 py-2.5 text-sm text-text-muted">
                  {s.useCount > 0 ? (
                    <div>
                      <div>
                        {s.useCount} {s.useCount === 1 ? "use" : "uses"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        {s.usedDates.map((d) => (
                          <span key={d} className="font-mono-tab text-xs text-text-faint">
                            {isoToMdy(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-text-faint italic">never used</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
