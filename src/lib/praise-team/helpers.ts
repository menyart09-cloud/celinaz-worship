// Pure types/helpers only — no `@/db` import here, same reason as
// sound-booth/helpers.ts: a "use client" component needs these without
// pulling the database driver into the browser bundle.
import type { SoundBoothStatus } from "@/db/schema";

export type PraiseTeamSingerRow = {
  rosterId: string;
  name: string;
  status: SoundBoothStatus;
};

export type PraiseTeamDateRow = {
  id: string;
  date: string;
  mdy: string;
  singers: PraiseTeamSingerRow[];
  available: { rosterId: string; name: string }[];
  unavailable: { rosterId: string; name: string }[];
};

export type PraiseTeamDateStatus = "pending" | "yes" | "no";

// Unlike Sound Booth, there's no fixed slot count to judge "short-staffed"
// against — a date with nobody signed up yet just reads as pending, not red.
export function praiseTeamDateStatus(d: PraiseTeamDateRow): PraiseTeamDateStatus {
  if (d.singers.length === 0) return "pending";
  if (d.singers.some((s) => s.status === "no")) return "no";
  if (d.singers.every((s) => s.status === "yes")) return "yes";
  return "pending";
}

// Same merge as Sound Booth's allUnavailable: someone who declined their own
// singing slot is just as "away" as someone who tapped the date-level
// unavailable toggle, whether or not they're actually on the singers list.
export function allPraiseTeamUnavailable(d: PraiseTeamDateRow): { rosterId: string; name: string }[] {
  const declined = d.singers.filter((s) => s.status === "no").map((s) => ({ rosterId: s.rosterId, name: s.name }));
  const byId = new Map<string, { rosterId: string; name: string }>();
  for (const p of [...d.unavailable, ...declined]) byId.set(p.rosterId, p);
  return [...byId.values()];
}
