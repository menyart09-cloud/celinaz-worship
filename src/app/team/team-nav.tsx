"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TeamNav() {
  const pathname = usePathname();
  const onOos = pathname.startsWith("/team/order-of-service");

  return (
    <div className="mb-4 flex gap-0.5 rounded-xl border border-border bg-surface-sunk p-1">
      <Link
        href="/team/schedule"
        className={
          "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-bold " +
          (!onOos ? "bg-surface text-accent-strong shadow-sm" : "text-text-muted")
        }
      >
        My Schedule
      </Link>
      <Link
        href="/team/order-of-service"
        className={
          "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-bold " +
          (onOos ? "bg-surface text-accent-strong shadow-sm" : "text-text-muted")
        }
      >
        Order of Service
      </Link>
    </div>
  );
}
