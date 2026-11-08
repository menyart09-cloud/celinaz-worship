// Pure types/helpers only — no `@/db` import here. A "use client" component
// (the admin grid, the team schedule view) needs these, and importing
// anything that pulls in the actual database client breaks the browser
// bundle (drizzle's node-postgres driver needs Node's `tls`/`net`, which
// don't exist client-side).
import type { SoundBoothPosition, SoundBoothStatus } from "@/db/schema";

export type SoundBoothRosterRow = {
  id: string;
  name: string;
  phone: string | null;
  hasPin: boolean;
};

export type SoundBoothAssignmentRow = {
  position: SoundBoothPosition;
  rosterId: string | null;
  name: string | null;
  status: SoundBoothStatus;
};

export type SoundBoothDateRow = {
  id: string;
  date: string;
  mdy: string;
  hasServiceLog: boolean;
  available: { rosterId: string; name: string }[];
  unavailable: { rosterId: string; name: string }[];
  rows: SoundBoothAssignmentRow[];
};

export type SoundBoothDateStatus = "planned" | "yes" | "no";

// Only a date the Service Log actually has gets a red/green verdict — the
// sound booth can be scheduled further out than that, and a date like that
// isn't short-staffed, because there's no confirmed service yet for it to
// be short-staffed for.
export function dateStatus(d: SoundBoothDateRow): SoundBoothDateStatus {
  if (!d.hasServiceLog) return "planned";
  if (d.rows.some((r) => r.status === "no" || !r.name)) return "no";
  return "yes";
}

// Anyone who declined a position they're actually on is just as "not
// available" as someone who self-reported the whole date — merged in here
// so the admin grid and every team view agree on who to call, whether or
// not that person ever tapped the separate date-level toggle.
export function allUnavailable(d: SoundBoothDateRow): { rosterId: string; name: string }[] {
  const declined = d.rows
    .filter((r) => r.rosterId && r.name && r.status === "no")
    .map((r) => ({ rosterId: r.rosterId!, name: r.name! }));
  const byId = new Map<string, { rosterId: string; name: string }>();
  for (const p of [...d.unavailable, ...declined]) byId.set(p.rosterId, p);
  return [...byId.values()];
}
