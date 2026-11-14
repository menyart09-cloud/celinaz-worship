"use client";

import { useMemo, useState, useTransition } from "react";
import { allUnavailable, dateStatus, type SoundBoothDateRow } from "@/lib/sound-booth/helpers";
import { setOwnSoundBoothAvailabilityAction, setOwnSoundBoothStatusAction } from "@/lib/sound-booth/actions";
import { todayIso } from "@/lib/dates";
import type { SoundBoothStatus } from "@/db/schema";

function statusLabel(s: SoundBoothStatus) {
  return s === "yes" ? "Confirmed" : s === "no" ? "Can't make it" : "No response yet";
}

function pillClass(s: SoundBoothStatus) {
  if (s === "yes") return "bg-good-soft text-good";
  if (s === "no") return "bg-declined-soft text-declined";
  return "border border-dashed border-border-strong text-text-faint";
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

export function TeamSchedule({ dates, viewerId }: { dates: SoundBoothDateRow[]; viewerId: string }) {
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

  function goTo(index: number) {
    const d = dates[index];
    if (!d) return;
    setSelectedIndex(index);
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

  const byDate = useMemo(() => new Map(dates.map((d, i) => [d.date, i])), [dates]);
  const totalDays = daysInMonth(cal.year, cal.month);
  const leadBlanks = firstWeekday(cal.year, cal.month);

  if (!selected) {
    return <p className="text-sm text-text-muted">Nothing scheduled yet — check back once a date&rsquo;s on the books.</p>;
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-center gap-3.5 text-sm font-bold text-text-muted">
        <button
          type="button"
          disabled={selectedIndex === 0}
          onClick={() => goTo(selectedIndex - 1)}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-surface text-sm disabled:opacity-30"
        >
          &lsaquo;
        </button>
        <span className="font-mono-tab">{selected.mdy}</span>
        <button
          type="button"
          disabled={selectedIndex === dates.length - 1}
          onClick={() => goTo(selectedIndex + 1)}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-surface text-sm disabled:opacity-30"
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
            const status = hasData ? dateStatus(dates[matchIndex!]) : null;
            return (
              <button
                key={day}
                type="button"
                disabled={!hasData}
                onClick={() => hasData && goTo(matchIndex!)}
                className={
                  "flex flex-col items-center gap-0.5 rounded-md py-1 font-mono-tab text-[0.82rem] " +
                  (hasData ? "cursor-pointer text-foreground hover:bg-accent-soft" : "text-text-faint") +
                  (isCurrent ? " bg-accent-soft font-bold text-accent-strong" : "")
                }
              >
                <span>{day}</span>
                <span
                  className={
                    "h-1.5 w-1.5 rounded-full " +
                    (status === "yes"
                      ? "bg-good"
                      : status === "no"
                        ? "bg-declined"
                        : status === "planned"
                          ? "border border-accent-strong"
                          : "bg-transparent")
                  }
                />
              </button>
            );
          })}
        </div>
      </div>

      <DateCard date={selected} viewerId={viewerId} />
    </div>
  );
}

function DateCard({ date, viewerId }: { date: SoundBoothDateRow; viewerId: string }) {
  const [pending, startTransition] = useTransition();
  const away = allUnavailable(date);
  const iAmAvailable = date.available.some((a) => a.rosterId === viewerId);
  const iAmAway = away.some((a) => a.rosterId === viewerId);
  const otherAvailable = date.available.filter((a) => a.rosterId !== viewerId);
  const otherAway = away.filter((a) => a.rosterId !== viewerId);

  function setAvailability(kind: "available" | "unavailable") {
    startTransition(async () => {
      await setOwnSoundBoothAvailabilityAction(date.id, kind);
    });
  }

  function setStatus(position: SoundBoothDateRow["rows"][number]["position"], status: SoundBoothStatus) {
    startTransition(async () => {
      await setOwnSoundBoothStatusAction(date.id, position, status);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-1.5 border-b border-border bg-surface-alt px-3 py-2.5">
        {(otherAway.length > 0 || otherAvailable.length > 0) && (
          <div className="text-sm">
            {otherAway.length > 0 && (
              <div>
                <span className="font-bold text-declined">Unavailable:</span> {otherAway.map((a) => a.name).join(", ")}
              </div>
            )}
            {otherAvailable.length > 0 && (
              <div>
                <span className="font-bold text-good">Willing to help:</span> {otherAvailable.map((a) => a.name).join(", ")}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => setAvailability("available")}
            className={
              "rounded-full border px-3 py-1.5 text-sm font-bold " +
              (iAmAvailable ? "border-good bg-good text-white" : "border-border-strong bg-surface text-text-muted")
            }
          >
            {iAmAvailable ? "✓ I can help" : "I can help"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setAvailability("unavailable")}
            className={
              "rounded-full border px-3 py-1.5 text-sm font-bold " +
              (iAmAway ? "border-declined bg-declined text-white" : "border-border-strong bg-surface text-text-muted")
            }
          >
            {iAmAway ? "✓ I'm unavailable" : "I'm unavailable"}
          </button>
        </div>
      </div>

      {date.rows.map((row) => {
        const isMine = row.rosterId === viewerId;
        return (
          <div key={row.position} className={"flex items-center justify-between gap-2 px-3 py-2 " + (isMine ? "bg-accent-soft" : "")}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={"text-[0.66rem] font-bold tracking-wide uppercase " + (isMine ? "text-accent-strong" : "text-text-muted")}>
                {row.position}
              </span>
              <span className={isMine ? "text-[0.95rem] font-bold" : "text-[0.95rem]"}>
                {row.name ? (isMine ? `${row.name} (you)` : row.name) : "Open"}
              </span>
            </div>
            {isMine ? (
              <div className="flex flex-none gap-1.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus(row.position, "yes")}
                  className={
                    "rounded-full border px-2.5 py-1 text-xs font-bold " +
                    (row.status === "yes" ? "border-good bg-good text-white" : "border-border-strong bg-surface text-text-muted")
                  }
                >
                  Yes
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus(row.position, "no")}
                  className={
                    "rounded-full border px-2.5 py-1 text-xs font-bold " +
                    (row.status === "no" ? "border-declined bg-declined text-white" : "border-border-strong bg-surface text-text-muted")
                  }
                >
                  No
                </button>
              </div>
            ) : (
              <span className={"flex-none rounded-full px-2.5 py-0.5 text-xs font-bold " + pillClass(row.status)}>
                {row.name ? statusLabel(row.status) : "Unassigned"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
