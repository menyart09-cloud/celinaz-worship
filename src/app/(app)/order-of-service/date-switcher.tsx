"use client";

import { useRouter } from "next/navigation";
import { flushAllSaves } from "./pending-saves";

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function DateSwitcher({ date }: { date: string }) {
  const router = useRouter();

  // Wait for every row's pending edit to reach the server first — navigating
  // mid-save is what used to throw away whatever was just typed.
  async function goTo(next: string) {
    await flushAllSaves();
    router.push(`/order-of-service?date=${next}`);
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
        onChange={(e) => {
          if (e.target.value) void goTo(e.target.value);
        }}
        className="font-mono-tab rounded-full border border-accent-soft-border bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-strong"
      />
      <button type="button" title="Next week" onClick={() => goTo(shiftDays(date, 7))} className={arrow}>
        ›
      </button>
    </div>
  );
}
