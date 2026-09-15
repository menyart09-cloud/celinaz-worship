"use client";

import { useEffect, useRef, useState } from "react";
import { todayIso } from "@/lib/dates";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function SundayDatePicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const start = value ? new Date(value + "T00:00:00") : new Date();
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const today = todayIso();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  function nav(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  }

  function pick(day: number) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setValue(iso);
    setOpen(false);
  }

  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="font-mono-tab flex w-full items-center justify-between rounded-md border border-border-strong bg-surface px-3 py-2 text-left text-sm"
      >
        {value || "Pick a Sunday…"}
        <span aria-hidden>📅</span>
      </button>
      <p className="mt-1 text-xs text-text-faint">Only Sundays are selectable</p>

      {open && (
        <div
          ref={popRef}
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border border-border-strong bg-surface p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-border-strong text-text-muted hover:border-accent hover:text-accent-strong"
            >
              ‹
            </button>
            <span className="text-sm font-bold">{monthLabel}</span>
            <button
              type="button"
              onClick={() => nav(1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-border-strong text-text-muted hover:border-accent hover:text-accent-strong"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-[0.62rem] font-bold text-text-faint">
                {w}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dow = new Date(year, month, day).getDay();
              const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSunday = dow === 0;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!isSunday}
                  onClick={() => pick(day)}
                  className={
                    "font-mono-tab rounded py-1 text-sm " +
                    (!isSunday
                      ? "cursor-default text-text-faint"
                      : iso === value
                        ? "bg-accent text-white"
                        : iso === today
                          ? "text-foreground ring-1 ring-accent"
                          : "text-foreground hover:bg-accent-soft hover:text-accent-strong")
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-border pt-2 text-xs text-text-faint">
            Services run on Sundays only
          </p>
        </div>
      )}
    </div>
  );
}
