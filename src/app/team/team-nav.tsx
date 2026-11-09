"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TeamGroup } from "@/db/schema";

export function TeamNav({ groups }: { groups: TeamGroup[] }) {
  const pathname = usePathname();

  const tabs = [
    groups.includes("sound_booth") ? { href: "/team/schedule", label: "My Sound Booth", match: "/team/schedule" } : null,
    groups.includes("praise_team") ? { href: "/team/praise-team", label: "My Praise Team", match: "/team/praise-team" } : null,
    { href: "/team/order-of-service", label: "Order of Service", match: "/team/order-of-service" },
  ].filter((t): t is { href: string; label: string; match: string } => t !== null);

  return (
    <div className="mb-4 flex gap-0.5 rounded-xl border border-border bg-surface-sunk p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.match}
          href={tab.href}
          className={
            "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-bold " +
            (pathname.startsWith(tab.match) ? "bg-surface text-accent-strong shadow-sm" : "text-text-muted")
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
