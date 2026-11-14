import Link from "next/link";
import type { TeamGroup } from "@/db/schema";
import { PreviewNav } from "./preview-nav";

// Admin-only — shows exactly what this person's phone would show, read
// only. Never mistaken for a real sign-in: no "sign out," a plain banner
// explaining what this is and a way back to Manage Members instead.
export function PreviewHeader({ rosterId, name, groups }: { rosterId: string; name: string; groups: TeamGroup[] }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-accent-strong bg-accent-soft px-3 py-2 text-sm text-accent-strong">
        <span className="font-bold">Previewing as {name}</span>
        <span className="text-text-muted">— view only, nothing you tap here is saved</span>
        <Link href="/schedule/manage" className="ml-auto flex-none text-xs font-bold underline decoration-dotted underline-offset-2">
          &lsaquo; Manage Members
        </Link>
      </div>
      <PreviewNav rosterId={rosterId} groups={groups} />
    </div>
  );
}
