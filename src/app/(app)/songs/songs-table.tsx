"use client";

import { useMemo, useState, useTransition } from "react";
import { isoToMdy } from "@/lib/dates";
import { HymnBadge, SongChip } from "../_components/song-chip";
import { updateSongAction } from "./actions";
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
      style={{ ...(width ? { width } : undefined), top: "var(--app-header-height, 92px)" }}
      className="sticky z-20 border-b border-border bg-surface-sunk p-0 text-left"
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
      {/* Mobile: a 4-column table doesn't fit — a sort pill row plus a card
          per song replaces it below md. */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs font-bold tracking-wide text-text-muted uppercase md:hidden">
        <span>Sort:</span>
        {(
          [
            { key: "hymn", label: "Hymn #" },
            { key: "title", label: "Title" },
            { key: "source", label: "Source" },
            { key: "uses", label: "Usage" },
          ] as { key: SortKey; label: string }[]
        ).map((opt) => {
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
              <span className={active ? "text-accent" : "invisible"}>{active && sort.dir === -1 ? "▼" : "▲"}</span>
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface md:hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-faint italic">No songs match.</p>
        ) : (
          rows.map((s, i) => <SongRow key={s.id} song={s} bordered={i > 0} variant="mobile" />)
        )}
      </div>

      {/* Desktop: unchanged table. No overflow-hidden here on purpose — it
          breaks position:sticky on the <th> below even without actually
          clipping anything. */}
      <div className="hidden rounded-xl border border-border md:block">
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
              <SongRow key={s.id} song={s} bordered variant="desktop" />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SongRow({
  song,
  bordered,
  variant,
}: {
  song: SongLibraryRow;
  bordered: boolean;
  variant: "mobile" | "desktop";
}) {
  const [editing, setEditing] = useState(false);
  const [hymnNumber, setHymnNumber] = useState(song.hymnNumber);
  const [title, setTitle] = useState(song.title);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setHymnNumber(song.hymnNumber);
    setTitle(song.title);
    setEditing(true);
  }

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await updateSongAction(song.id, hymnNumber, title);
      setEditing(false);
    });
  }

  const editFields = (
    <>
      <input
        value={hymnNumber}
        onChange={(e) => setHymnNumber(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="#"
        title="Hymn # (leave blank for a chorus)"
        className="font-mono-tab w-16 flex-none rounded-md border border-border-strong bg-surface px-2 py-1.5 text-center text-sm"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="flex-none rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="flex-none rounded-md border border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </>
  );

  if (variant === "mobile") {
    if (editing) {
      return (
        <div className={"flex items-center gap-2 bg-accent-soft p-3 " + (bordered ? "border-t border-border" : "")}>
          {editFields}
        </div>
      );
    }
    return (
      <div className={"flex items-start justify-between gap-2 p-3 " + (bordered ? "border-t border-border" : "")}>
        <div>
          {/* The hymn/Comp badge on the chip itself already says what the
              desktop table's separate Source column spells out — no need
              to repeat "Comp" twice right next to each other. */}
          <SongChip hymnNumber={song.hymnNumber} title={song.title} />
          <div className="mt-1 text-xs text-text-muted">
            {song.useCount > 0 ? (
              <>
                {song.useCount} {song.useCount === 1 ? "use" : "uses"} ·{" "}
                {song.usedDates.map((d, di) => (
                  <span key={d} className="font-mono-tab">
                    {di > 0 ? " " : ""}
                    {isoToMdy(d)}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-text-faint italic">never used</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={startEdit}
          aria-label={`Edit ${song.title}`}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-text-faint hover:bg-accent-soft hover:text-accent-strong"
        >
          ✎
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <tr className="bg-accent-soft">
        <td className="border-t border-border px-3.5 py-2.5" colSpan={4}>
          <div className="flex items-center gap-2">{editFields}</div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-surface-alt">
      <td className="border-t border-border px-3.5 py-2.5">
        <HymnBadge hymnNumber={song.hymnNumber} />
      </td>
      <td className="border-t border-border px-3.5 py-2.5">
        <div className="flex items-center gap-1">
          <SongChip hymnNumber={song.hymnNumber} title={song.title} hideBadge />
          <button
            type="button"
            onClick={startEdit}
            aria-label={`Edit ${song.title}`}
            className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-text-faint hover:bg-accent-soft hover:text-accent-strong"
          >
            ✎
          </button>
        </div>
      </td>
      <td className="border-t border-border px-3.5 py-2.5">
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-bold uppercase " +
            (song.source === "hymnal"
              ? "border border-border bg-surface-sunk text-text-muted"
              : "border border-accent-soft-border bg-accent-soft text-accent-strong")
          }
        >
          {song.source === "hymnal" ? "Hymnal" : "Comp"}
        </span>
      </td>
      <td className="border-t border-border px-3.5 py-2.5 text-sm text-text-muted">
        {song.useCount > 0 ? (
          <div>
            <div>
              {song.useCount} {song.useCount === 1 ? "use" : "uses"}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {song.usedDates.map((d) => (
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
  );
}
