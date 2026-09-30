"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { flushAllSaves } from "./pending-saves";

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function DateSwitcher({ date }: { date: string }) {
  const router = useRouter();
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Wait for every row's pending edit to reach the server first — navigating
  // mid-save is what used to throw away whatever was just typed.
  async function goTo(next: string) {
    await flushAllSaves();
    router.push(`/order-of-service?date=${next}`);
  }

  // The native date input fires onChange after every keystroke, not just when
  // a full date has been typed — retyping the year one digit at a time fires
  // it with "0001-10-04", then "0008-10-04", each a real, valid date. Without
  // this debounce every one of those navigates the page away before the year
  // is finished, landing on a stray date whose run sheet is empty — which is
  // what made it look like the current week's work had been deleted. Only
  // the value still standing 400ms after typing stops actually navigates.
  function onDateInputChange(next: string) {
    if (!next) return;
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => void goTo(next), 400);
  }

  const arrow =
    "rounded-full border border-accent-soft-border bg-accent-soft px-2.5 py-1.5 text-sm font-semibold text-accent-strong hover:border-accent";

  return (
    <div className="flex items-center gap-1">
      <button type="button" title="Previous week" onClick={() => goTo(shiftDays(date, -7))} className={arrow}>
        ‹
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => onDateInputChange(e.target.value)}
        className="font-mono-tab rounded-full border border-accent-soft-border bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-strong"
      />
      <button type="button" title="Next week" onClick={() => goTo(shiftDays(date, 7))} className={arrow}>
        ›
      </button>
    </div>
  );
}
