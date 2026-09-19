"use client";

import { useMemo, useState } from "react";
import { isoToMdy } from "@/lib/dates";
import type { ScriptureHistoryRow } from "@/lib/queries";

type SortKey = "date" | "scripture";
type Sort = { key: SortKey; dir: 1 | -1 };

function Th({
  label,
  sortKey,
  width,
  sort,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  width?: string;
  sort: Sort;
  onToggle: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      style={width ? { width } : undefined}
      className="sticky top-0 z-10 border-b border-border bg-surface-sunk p-0 text-left"
    >
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
    </th>
  );
}

export function ScriptureTable({ rows }: { rows: ScriptureHistoryRow[] }) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "date", dir: -1 });

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = rows.filter((r) => !f || r.scripture.toLowerCase().includes(f));
    return filtered.slice().sort((a, b) => {
      const av = sort.key === "date" ? a.date : a.scripture.toLowerCase();
      const bv = sort.key === "date" ? b.date : b.scripture.toLowerCase();
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  }, [rows, filter, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === "date" ? -1 : 1 }));
  }

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by scripture…"
        className="mb-3.5 w-full rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-sm sm:max-w-xs"
      />
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted italic">
          No scriptures logged yet — they&apos;ll show up here once you type one into the Scripture
          item on an Order of Service.
        </p>
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <Th label="Date" sortKey="date" width="120px" sort={sort} onToggle={toggleSort} />
                <Th label="Scripture" sortKey="scripture" sort={sort} onToggle={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={`${r.date}-${i}`} className="hover:bg-surface-alt">
                  <td className="font-mono-tab border-t border-border px-3.5 py-2.5 font-semibold text-accent-strong">
                    {isoToMdy(r.date)}
                  </td>
                  <td className="border-t border-border px-3.5 py-2.5">{r.scripture}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
