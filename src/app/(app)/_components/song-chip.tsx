"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { isoToMdy } from "@/lib/dates";
import { addSongToServiceAction, getUpcomingServicesAction } from "./song-actions";
import type { ServiceWithSongs } from "@/lib/queries";

export function HymnBadge({ hymnNumber }: { hymnNumber: string }) {
  const isComp = hymnNumber === "Comp";
  return (
    <span
      className={
        "font-mono-tab min-w-[2.4em] flex-none rounded px-1.5 py-0.5 text-center text-xs font-semibold " +
        (isComp
          ? "border border-accent-soft-border bg-accent-soft text-accent-strong"
          : "border border-border bg-surface-sunk text-text-muted")
      }
    >
      {hymnNumber}
    </span>
  );
}

export function SongChip({
  hymnNumber,
  title,
  hideBadge,
}: {
  hymnNumber: string;
  title: string;
  hideBadge?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<ServiceWithSongs[] | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
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
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!upcoming) {
      const list = await getUpcomingServicesAction();
      setUpcoming(list);
    }
  }

  function pick(serviceId: string) {
    startTransition(async () => {
      await addSongToServiceAction(serviceId, hymnNumber, title);
      setAddedTo((prev) => new Set(prev).add(serviceId));
      setTimeout(() => setOpen(false), 650);
    });
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="-mx-1 inline-flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-accent-soft"
      >
        {!hideBadge && <HymnBadge hymnNumber={hymnNumber} />}
        <span className="font-medium">{title}</span>
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border border-border-strong bg-surface p-3 shadow-lg"
        >
          <div className="mb-2 border-b border-border pb-2">
            <div className="text-[0.68rem] font-bold tracking-wide text-text-muted uppercase">
              Add to a future service
            </div>
            <div className="font-bold">{title}</div>
          </div>
          {upcoming === null ? (
            <p className="p-1 text-sm text-text-faint italic">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="p-1 text-sm text-text-faint italic">
              No upcoming services yet — add one first.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {upcoming.map((s) => {
                const added = addedTo.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={added || pending}
                    onClick={() => pick(s.id)}
                    className={
                      "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm " +
                      (added ? "bg-good-soft text-good" : "hover:bg-accent-soft")
                    }
                  >
                    <span className="font-mono-tab font-semibold text-accent-strong">
                      {isoToMdy(s.date)}
                    </span>
                    <span className="truncate text-text-muted">{s.sermon || s.note || ""}</span>
                    {added && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
