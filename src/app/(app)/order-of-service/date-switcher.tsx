"use client";

import { useRouter } from "next/navigation";

export function DateSwitcher({ date }: { date: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      value={date}
      onChange={(e) => {
        if (e.target.value) router.push(`/order-of-service?date=${e.target.value}`);
      }}
      className="font-mono-tab rounded-full border border-accent-soft-border bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent-strong"
    />
  );
}
