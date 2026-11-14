"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TeamGroup } from "@/db/schema";

// Same tab logic as the real team-nav.tsx, just rooted under the admin
// preview path instead of /team — whichever groups this person actually
// belongs to is what decides which tabs show here too.
export function PreviewNav({ rosterId, groups }: { rosterId: string; groups: TeamGroup[] }) {
  const pathname = usePathname();
  const base = `/schedule/manage/preview/${rosterId}`;

  const tabs = [
    groups.includes("sound_booth") ? { href: `${base}/schedule`, label: "Sound Booth", match: `${base}/schedule` } : null,
    groups.includes("praise_team") ? { href: `${base}/praise-team`, label: "Praise Team", match: `${base}/praise-team` } : null,
    { href: `${base}/order-of-service`, label: "Order of Service", match: `${base}/order-of-service` },
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
