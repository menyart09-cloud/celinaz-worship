"use client";

import { useMemo, useState, useTransition } from "react";
import { allPraiseTeamUnavailable, type PraiseTeamDateRow } from "@/lib/praise-team/helpers";
import { addPraiseTeamDateAction, addPraiseTeamSingerAction, removePraiseTeamSingerAction } from "@/lib/praise-team/actions";
import { todayIso } from "@/lib/dates";
import type { SoundBoothStatus } from "@/db/schema";
import { DatePickerDropdown } from "../date-picker-dropdown";

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

// Same calendar-plus-card shape as the team's own /team/praise-team, with
// add/remove singer folded into the card — /schedule/praise-team renders
// this below md, the wide PraiseTeamGrid table above it.
export function AdminMobilePraiseTeam({ dates, roster }: { dates: PraiseTeamDateRow[]; roster: string[] }) {
  const today = todayIso();
  const initialIndex = useMemo(() => {
    const upcoming = dates.findIndex((d) => d.date >= today);
    return upcoming === -1 ? Math.max(0, dates.length - 1) : upcoming;
  }, [dates, today]);

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selected = dates[selectedIndex] as PraiseTeamDateRow | undefined;

  const initialCal = useMemo(() => {
    const base = selected ? new Date(selected.date + "T00:00:00Z") : new Date();
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
  }, [selected]);
  const [cal, setCal] = useState(initialCal);
  const [expandedSinger, setExpandedSinger] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newNameDraft, setNewNameDraft] = useState("");
  const [newDate, setNewDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [addPending, startAddTransition] = useTransition();

  function goTo(index: number) {
    const d = dates[index];
    if (!d) return;
    setSelectedIndex(index);
    setExpandedSinger(null);
    setAddOpen(false);
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

  function toggleSinger(name: string) {
    setExpandedSinger((prev) => (prev === name ? null : name));
    setAddOpen(false);
  }

  function toggleAdd() {
    setAddOpen((prev) => !prev);
    setExpandedSinger(null);
    setNewNameDraft("");
  }

  function removeSinger(dateId: string, rosterId: string) {
    startTransition(async () => {
      await removePraiseTeamSingerAction(dateId, rosterId);
      setExpandedSinger(null);
    });
  }

  function addSinger(dateId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addPraiseTeamSingerAction(dateId, trimmed);
      setAddOpen(false);
      setNewNameDraft("");
    });
  }

  function addDate(iso: string) {
    if (!iso) return;
    startAddTransition(async () => {
      await addPraiseTeamDateAction(iso);
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

          <AdminSingersCard
            date={selected}
            expandedSinger={expandedSinger}
            addOpen={addOpen}
            newNameDraft={newNameDraft}
            onDraftChange={setNewNameDraft}
            onToggleSinger={toggleSinger}
            onToggleAdd={toggleAdd}
            onRemove={(rosterId) => removeSinger(selected.id, rosterId)}
            onAdd={(name) => addSinger(selected.id, name)}
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

function AdminSingersCard({
  date,
  expandedSinger,
  addOpen,
  newNameDraft,
  onDraftChange,
  onToggleSinger,
  onToggleAdd,
  onRemove,
  onAdd,
  roster,
  pending,
}: {
  date: PraiseTeamDateRow;
  expandedSinger: string | null;
  addOpen: boolean;
  newNameDraft: string;
  onDraftChange: (v: string) => void;
  onToggleSinger: (name: string) => void;
  onToggleAdd: () => void;
  onRemove: (rosterId: string) => void;
  onAdd: (name: string) => void;
  roster: string[];
  pending: boolean;
}) {
  const away = allPraiseTeamUnavailable(date);
  const already = new Set(date.singers.map((s) => s.name));
  const pickable = roster.filter((n) => !already.has(n));

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

      {date.singers.length === 0 && (
        <p className="px-3 py-3 text-sm text-text-faint italic">Nobody&rsquo;s been added to sing this date yet.</p>
      )}

      {date.singers.map((s) => {
        const expanded = expandedSinger === s.name;
        return (
          <div key={s.rosterId} className="border-t border-border px-3 py-2.5 first:border-t-0">
            <button type="button" onClick={() => onToggleSinger(s.name)} className="flex min-h-11 w-full items-center gap-2.5 text-left">
              <span className="min-w-0 flex-1 truncate text-[0.95rem]">{s.name}</span>
              <span className={"h-2 w-2 flex-none rounded-full " + statusDotClass(s.status)} />
              <span className="flex-none rounded-md border border-accent-soft-border bg-accent-soft px-1.5 py-0.5 text-[0.62rem] font-bold text-accent-strong">
                {expanded ? "tap to close" : "tap to remove"}
              </span>
            </button>
            {expanded && (
              <div className="mt-2.5 border-t border-dashed border-border-strong pt-2.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRemove(s.rosterId)}
                  className="min-h-11 rounded-lg border border-declined bg-declined-soft px-4 text-sm font-bold text-declined"
                >
                  Remove {s.name}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-border px-3 py-2.5">
        <button type="button" onClick={onToggleAdd} className="flex min-h-11 w-full items-center gap-2.5 text-left">
          <span className="flex-1 text-sm italic text-text-faint">+ add singer</span>
          <span className="flex-none rounded-md border border-accent-soft-border bg-accent-soft px-1.5 py-0.5 text-[0.62rem] font-bold text-accent-strong">
            {addOpen ? "tap to close" : "tap to add"}
          </span>
        </button>
        {addOpen && (
          <div className="mt-2.5 flex flex-col gap-2 border-t border-dashed border-border-strong pt-2.5">
            {pickable.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pickable.map((name) => (
                  <button
                    key={name}
                    type="button"
                    disabled={pending}
                    onClick={() => onAdd(name)}
                    className="min-h-11 rounded-full border border-border-strong bg-surface-sunk px-3 py-1 text-xs font-semibold text-foreground"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newNameDraft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAdd(newNameDraft);
                  }
                }}
                placeholder="New person&#8217;s name"
                className="min-h-11 min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-3 text-sm text-foreground"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => onAdd(newNameDraft)}
                className="min-h-11 flex-none rounded-full border border-accent-strong bg-accent-strong px-4 text-sm font-semibold text-white"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
