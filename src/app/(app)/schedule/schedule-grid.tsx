"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { allUnavailable, type SoundBoothDateRow, type SoundBoothRosterRow } from "@/lib/sound-booth/helpers";
import { assignSoundBoothPositionAction, addSoundBoothDateAction } from "@/lib/sound-booth/actions";
import type { SoundBoothPosition, SoundBoothStatus } from "@/db/schema";
import { DatePickerDropdown } from "./date-picker-dropdown";

const POSITIONS: SoundBoothPosition[] = ["MediaShout", "Sound", "Live"];

function statusDotClass(status: SoundBoothStatus) {
  if (status === "yes") return "bg-good";
  if (status === "no") return "bg-declined";
  return "bg-text-faint";
}

type OpenPopover = { dateId: string; position: SoundBoothPosition; top: number; left: number } | null;

function ReassignPopover({
  dateId,
  position,
  away,
  roster,
  top,
  left,
  onClose,
}: {
  dateId: string;
  position: SoundBoothPosition;
  away: Set<string>;
  roster: SoundBoothRosterRow[];
  top: number;
  left: number;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");

  function assign(name: string | null) {
    startTransition(async () => {
      await assignSoundBoothPositionAction(dateId, position, name);
      onClose();
    });
  }

  function addNew() {
    const name = newName.trim();
    if (!name) return;
    assign(name);
  }

  // Rendered through a portal straight onto the body, positioned in
  // viewport coordinates — the grid's horizontal-scroll wrapper forces its
  // own overflow-y to clip too (an unavoidable CSS rule once overflow-x is
  // anything but visible), so a popover nested inside it gets cut off
  // whenever it would extend past that row, which is most rows.
  return createPortal(
    <div
      data-sb-popover
      style={{ position: "fixed", top, left }}
      className="z-50 flex w-[230px] flex-col gap-1.5 rounded-xl border border-border-strong bg-surface p-1.5 shadow-lg"
    >
      <div className="flex flex-wrap gap-1.5">
        {roster.map((r) => (
          <button
            key={r.id}
            type="button"
            disabled={pending}
            onClick={() => assign(r.name)}
            className={
              "rounded-full border px-2.5 py-1 text-xs font-semibold " +
              (away.has(r.name)
                ? "border-declined bg-declined-soft text-declined"
                : "border-border-strong bg-surface-sunk text-foreground")
            }
          >
            {r.name}
            {away.has(r.name) && <span className="ml-1 text-[0.68rem] italic">away</span>}
          </button>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() => assign(null)}
          className="ml-auto rounded-full border border-dashed border-border-strong bg-transparent px-2.5 py-1 text-xs italic text-text-muted"
        >
          Leave blank
        </button>
      </div>
      <div className="flex gap-1.5 border-t border-dashed border-border pt-1.5">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNew();
            }
          }}
          placeholder="New person&#8217;s name"
          className="min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs text-foreground"
        />
        <button
          type="button"
          disabled={pending}
          onClick={addNew}
          className="flex-none rounded-full border border-accent-strong bg-accent-strong px-3 py-1 text-xs font-semibold text-white"
        >
          Add
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function ScheduleGrid({ dates, roster }: { dates: SoundBoothDateRow[]; roster: SoundBoothRosterRow[] }) {
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [newDate, setNewDate] = useState("");
  const [addPending, startAddTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPopover) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sb-popover]") && !target.closest("[data-sb-trigger]")) setOpenPopover(null);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [openPopover]);

  useEffect(() => {
    if (!openPopover) return;
    // The trigger's position in the viewport changes as soon as the grid is
    // scrolled (horizontally) or the page is scrolled (vertically) — rather
    // than tracking and repositioning, just close it, same as clicking away.
    function onScroll() {
      setOpenPopover(null);
    }
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      scrollEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openPopover]);

  function openPopoverAt(e: React.MouseEvent<HTMLButtonElement>, dateId: string, position: SoundBoothPosition) {
    if (openPopover?.dateId === dateId && openPopover.position === position) {
      setOpenPopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 230;
    const left = Math.min(rect.left, window.innerWidth - popoverWidth - 16);
    setOpenPopover({ dateId, position, top: rect.bottom + 4, left: Math.max(8, left) });
  }

  function addDate(iso: string) {
    if (!iso) return;
    startAddTransition(async () => {
      await addSoundBoothDateAction(iso);
      setNewDate("");
    });
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap gap-3.5 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-good" />
          confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-declined" />
          can&rsquo;t make it
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-text-faint" />
          no response yet
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto rounded-xl">
        <div className="w-fit rounded-xl border border-border bg-surface">
          <div
            className="grid rounded-t-xl border-b border-border bg-surface-alt text-xs font-bold tracking-wide text-text-muted uppercase"
            style={{ gridTemplateColumns: "110px 128px 84px 86px 200px" }}
          >
            <div className="px-3.5 py-2.5">Date</div>
            <div className="border-l border-border px-2.5 py-2.5">MediaShout</div>
            <div className="border-l border-border px-2.5 py-2.5">Sound</div>
            <div className="border-l border-border px-2.5 py-2.5">Live</div>
            <div className="border-l border-border px-2.5 py-2.5">Availability</div>
          </div>

          {dates.map((d) => {
            const away = allUnavailable(d);
            return (
              <div
                key={d.id}
                className="grid border-t border-border first:border-t-0"
                style={{ gridTemplateColumns: "110px 128px 84px 86px 200px" }}
              >
                <div className="flex items-center px-3.5 py-2.5 font-mono-tab font-bold text-accent-strong">{d.mdy}</div>
                {POSITIONS.map((pos) => {
                  const row = d.rows.find((r) => r.position === pos)!;
                  return (
                    <div key={pos} className="relative border-l border-border px-2.5 py-2.5">
                      {row.name ? (
                        <button
                          type="button"
                          data-sb-trigger
                          onClick={(e) => openPopoverAt(e, d.id, pos)}
                          className="-mx-1.5 -my-0.5 flex w-[calc(100%+12px)] items-center justify-between gap-2 rounded-md px-1.5 py-0.5 hover:bg-accent-soft"
                        >
                          <span className="min-w-0 truncate text-[0.92rem]">{row.name}</span>
                          <span className={"ml-0.5 h-2 w-2 flex-none rounded-full " + statusDotClass(row.status)} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-sb-trigger
                          onClick={(e) => openPopoverAt(e, d.id, pos)}
                          className={
                            "-mx-1.5 -my-0.5 block w-[calc(100%+12px)] rounded-md px-1.5 py-0.5 text-left font-sans text-[0.82rem] italic text-text-faint hover:bg-accent-soft " +
                            (d.hasServiceLog ? "bg-declined-soft" : "")
                          }
                        >
                          + assign
                        </button>
                      )}
                    </div>
                  );
                })}
                <div className="flex flex-col justify-center gap-0.5 border-l border-border px-2.5 py-2.5 text-[0.76rem]">
                  {away.length === 0 && d.available.length === 0 ? (
                    <span className="text-text-faint">&mdash;</span>
                  ) : (
                    <>
                      {away.length > 0 && (
                        <div>
                          <span className="font-bold text-declined">Unavailable:</span> {away.map((a) => a.name).join(", ")}
                        </div>
                      )}
                      {d.available.length > 0 && (
                        <div>
                          <span className="font-bold text-good">Can help:</span> {d.available.map((a) => a.name).join(", ")}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {openPopover &&
        (() => {
          const d = dates.find((x) => x.id === openPopover.dateId);
          if (!d) return null;
          const away = allUnavailable(d);
          return (
            <ReassignPopover
              dateId={openPopover.dateId}
              position={openPopover.position}
              away={new Set(away.map((a) => a.name))}
              roster={roster}
              top={openPopover.top}
              left={openPopover.left}
              onClose={() => setOpenPopover(null)}
            />
          );
        })()}

      <div className="mt-3.5 flex max-w-[360px] items-center gap-2">
        <DatePickerDropdown value={newDate} onChange={setNewDate} />
        <button
          type="button"
          disabled={addPending || !newDate}
          onClick={() => addDate(newDate)}
          className="flex-none rounded-full border border-accent-strong bg-accent-strong px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          + Add a date
        </button>
      </div>
    </div>
  );
}
