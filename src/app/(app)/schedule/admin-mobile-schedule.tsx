"use client";

import { useMemo, useState, useTransition } from "react";
import { allUnavailable, type SoundBoothDateRow, type SoundBoothRosterRow } from "@/lib/sound-booth/helpers";
import { assignSoundBoothPositionAction, addSoundBoothDateAction } from "@/lib/sound-booth/actions";
import { todayIso } from "@/lib/dates";
import type { SoundBoothPosition, SoundBoothStatus } from "@/db/schema";
import { DatePickerDropdown } from "./date-picker-dropdown";

const POSITIONS: SoundBoothPosition[] = ["MediaShout", "Sound", "Live"];

function statusDotClass(status: SoundBoothStatus) {
  if (status === "yes") return "bg-good";
  if (status === "no") return "bg-declined";
  return "bg-text-faint";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
function firstWeekday(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// The same calendar-plus-card shape the team sees on their own phones,
// but with admin's own reassign power folded right into the card instead
// of a desktop popover — this is what /schedule renders below md, the
// wide ScheduleGrid table above it. Same session, same page, no "view
// as" or separate login: just a different layout at a different width.
export function AdminMobileSchedule({ dates, roster }: { dates: SoundBoothDateRow[]; roster: SoundBoothRosterRow[] }) {
  const today = todayIso();
  const initialIndex = useMemo(() => {
    const upcoming = dates.findIndex((d) => d.date >= today);
    return upcoming === -1 ? Math.max(0, dates.length - 1) : upcoming;
  }, [dates, today]);

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selected = dates[selectedIndex] as SoundBoothDateRow | undefined;

  const initialCal = useMemo(() => {
    const base = selected ? new Date(selected.date + "T00:00:00Z") : new Date();
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
  }, [selected]);
  const [cal, setCal] = useState(initialCal);
  const [expandedPosition, setExpandedPosition] = useState<SoundBoothPosition | null>(null);
  const [newNameDraft, setNewNameDraft] = useState("");
  const [newDate, setNewDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [addPending, startAddTransition] = useTransition();

  function goTo(index: number) {
    const d = dates[index];
    if (!d) return;
    setSelectedIndex(index);
    setExpandedPosition(null);
    setNewNameDraft("");
    const base = new Date(d.date + "T00:00:00Z");
    setCal({ year: base.getUTCFullYear(), month: base.getUTCMonth() });
  }

  function changeMonth(delta: number) {
    setCal((prev) => {
      let month = prev.month + delta;
      let year = prev.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { year, month };
    });
  }

  function toggleExpand(position: SoundBoothPosition) {
    setExpandedPosition((prev) => (prev === position ? null : position));
    setNewNameDraft("");
  }

  function assign(dateId: string, position: SoundBoothPosition, name: string | null) {
    startTransition(async () => {
      await assignSoundBoothPositionAction(dateId, position, name);
      setExpandedPosition(null);
      setNewNameDraft("");
    });
  }

  function addNew(dateId: string, position: SoundBoothPosition) {
    const name = newNameDraft.trim();
    if (!name) return;
    assign(dateId, position, name);
  }

  function addDate(iso: string) {
    if (!iso) return;
    startAddTransition(async () => {
      await addSoundBoothDateAction(iso);
      setNewDate("");
    });
  }

  const byDate = useMemo(() => new Map(dates.map((d, i) => [d.date, i])), [dates]);
  const totalDays = daysInMonth(cal.year, cal.month);
  const leadBlanks = firstWeekday(cal.year, cal.month);

  return (
    <div className="mt-4 max-w-md">
      {!selected ? (
        <p className="text-sm text-text-muted">Nothing scheduled yet — add a date below to get started.</p>
      ) : (
        <>
          <div className="mb-2.5 flex items-center justify-center gap-3.5 text-sm font-bold text-text-muted">
            <button
              type="button"
              disabled={selectedIndex === 0}
              onClick={() => goTo(selectedIndex - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface text-sm disabled:opacity-30"
            >
              &lsaquo;
            </button>
            <span className="font-mono-tab">{selected.mdy}</span>
            <button
              type="button"
              disabled={selectedIndex === dates.length - 1}
              onClick={() => goTo(selectedIndex + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface text-sm disabled:opacity-30"
            >
              &rsaquo;
            </button>
          </div>

          <div className="mb-2.5 rounded-xl border border-border-strong bg-surface px-2.5 pt-2 pb-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <button type="button" onClick={() => changeMonth(-1)} className="px-1 text-text-muted">
                &lsaquo;
              </button>
              <span className="text-sm font-bold text-accent-strong">
                {MONTH_NAMES[cal.month]} {cal.year}
              </span>
              <button type="button" onClick={() => changeMonth(1)} className="px-1 text-text-muted">
                &rsaquo;
              </button>
            </div>
            <div className="grid grid-cols-7">
              {WEEKDAY_LETTERS.map((w, i) => (
                <span key={i} className="pb-1 text-center font-mono-tab text-[0.64rem] font-bold text-text-faint">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: leadBlanks }).map((_, i) => (
                <span key={"b" + i} />
              ))}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const iso = `${cal.year}-${pad2(cal.month + 1)}-${pad2(day)}`;
                const matchIndex = byDate.get(iso);
                const hasData = matchIndex !== undefined;
                const isCurrent = matchIndex === selectedIndex;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!hasData}
                    onClick={() => hasData && goTo(matchIndex!)}
                    className={
                      "flex flex-col items-center gap-0.5 rounded-md py-1.5 font-mono-tab text-[0.82rem] " +
                      (hasData ? "cursor-pointer text-foreground hover:bg-accent-soft" : "text-text-faint") +
                      (isCurrent ? " bg-accent-soft font-bold text-accent-strong" : "")
                    }
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <AdminDateCard
            date={selected}
            expandedPosition={expandedPosition}
            newNameDraft={newNameDraft}
            onDraftChange={setNewNameDraft}
            onToggle={toggleExpand}
            onAssign={(position, name) => assign(selected.id, position, name)}
            onAddNew={(position) => addNew(selected.id, position)}
            roster={roster}
            pending={pending}
          />
        </>
      )}

      <div className="mt-3.5 flex items-center gap-2">
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

function AdminDateCard({
  date,
  expandedPosition,
  newNameDraft,
  onDraftChange,
  onToggle,
  onAssign,
  onAddNew,
  roster,
  pending,
}: {
  date: SoundBoothDateRow;
  expandedPosition: SoundBoothPosition | null;
  newNameDraft: string;
  onDraftChange: (v: string) => void;
  onToggle: (position: SoundBoothPosition) => void;
  onAssign: (position: SoundBoothPosition, name: string | null) => void;
  onAddNew: (position: SoundBoothPosition) => void;
  roster: SoundBoothRosterRow[];
  pending: boolean;
}) {
  const away = allUnavailable(date);
  const awayNames = new Set(away.map((a) => a.name));

  return (
    <div className="rounded-xl border border-border bg-surface">
      {(away.length > 0 || date.available.length > 0) && (
        <div className="flex flex-col gap-1 border-b border-border bg-surface-alt px-3 py-2.5 text-sm">
          {away.length > 0 && (
            <div>
              <span className="font-bold text-declined">Unavailable:</span> {away.map((a) => a.name).join(", ")}
            </div>
          )}
          {date.available.length > 0 && (
            <div>
              <span className="font-bold text-good">Can help:</span> {date.available.map((a) => a.name).join(", ")}
            </div>
          )}
        </div>
      )}

      {POSITIONS.map((pos) => {
        const row = date.rows.find((r) => r.position === pos)!;
        const expanded = expandedPosition === pos;
        return (
          <div key={pos} className="border-t border-border px-3 py-2.5 first:border-t-0">
            <button type="button" onClick={() => onToggle(pos)} className="flex min-h-11 w-full items-center gap-2.5 text-left">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[0.66rem] font-bold tracking-wide text-text-muted uppercase">{pos}</span>
                <span className={"text-[0.95rem] " + (row.name ? "font-bold" : "italic text-text-faint")}>{row.name || "Open"}</span>
              </div>
              <span className={"h-2 w-2 flex-none rounded-full " + statusDotClass(row.status)} />
              <span className="flex-none rounded-md border border-accent-soft-border bg-accent-soft px-1.5 py-0.5 text-[0.62rem] font-bold text-accent-strong">
                {expanded ? "tap to close" : "tap to reassign"}
              </span>
            </button>

            {expanded && (
              <div className="mt-2.5 flex flex-col gap-2 border-t border-dashed border-border-strong pt-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {roster.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={pending}
                      onClick={() => onAssign(pos, r.name)}
                      className={
                        "min-h-11 rounded-full border px-3 py-1 text-xs font-semibold " +
                        (awayNames.has(r.name)
                          ? "border-declined bg-declined-soft text-declined"
                          : "border-border-strong bg-surface-sunk text-foreground")
                      }
                    >
                      {r.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAssign(pos, null)}
                    className="min-h-11 rounded-full border border-dashed border-border-strong bg-transparent px-3 py-1 text-xs italic text-text-muted"
                  >
                    Leave blank
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newNameDraft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddNew(pos);
                      }
                    }}
                    placeholder="New person&#8217;s name"
                    className="min-h-11 min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-3 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAddNew(pos)}
                    className="min-h-11 flex-none rounded-full border border-accent-strong bg-accent-strong px-4 text-sm font-semibold text-white"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
