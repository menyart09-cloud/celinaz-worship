import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { praiseTeamAvailability, praiseTeamDates, praiseTeamSingers, soundBoothRoster, teamGroupMembership } from "@/db/schema";
import { isoToMdy } from "@/lib/dates";
import type { PraiseTeamDateRow } from "./helpers";

export type { PraiseTeamDateRow, PraiseTeamSingerRow, PraiseTeamDateStatus } from "./helpers";
export { allPraiseTeamUnavailable, praiseTeamDateStatus } from "./helpers";

// Quick-pick names for the admin "add a singer" popover — just whoever's
// already in the praise_team group, same shared-roster/group-membership
// model as Sound Booth's picker. Typing a new name still works from the
// grid and grants this group's membership on the fly.
export async function getPraiseTeamRosterNames(): Promise<string[]> {
  const rows = await db
    .select({ name: soundBoothRoster.name })
    .from(teamGroupMembership)
    .innerJoin(soundBoothRoster, eq(soundBoothRoster.id, teamGroupMembership.rosterId))
    .where(eq(teamGroupMembership.group, "praise_team"))
    .orderBy(asc(soundBoothRoster.name));
  return rows.map((r) => r.name);
}

export async function getPraiseTeamDates(): Promise<PraiseTeamDateRow[]> {
  const [dateRows, singerRows, availabilityRows] = await Promise.all([
    db.select().from(praiseTeamDates).orderBy(asc(praiseTeamDates.date)),
    db
      .select({
        dateId: praiseTeamSingers.dateId,
        rosterId: praiseTeamSingers.rosterId,
        status: praiseTeamSingers.status,
        name: soundBoothRoster.name,
      })
      .from(praiseTeamSingers)
      .innerJoin(soundBoothRoster, eq(soundBoothRoster.id, praiseTeamSingers.rosterId)),
    db
      .select({
        dateId: praiseTeamAvailability.dateId,
        rosterId: praiseTeamAvailability.rosterId,
        kind: praiseTeamAvailability.kind,
        name: soundBoothRoster.name,
      })
      .from(praiseTeamAvailability)
      .innerJoin(soundBoothRoster, eq(soundBoothRoster.id, praiseTeamAvailability.rosterId)),
  ]);

  const singersByDate = new Map<string, PraiseTeamDateRow["singers"]>();
  for (const s of singerRows) {
    const list = singersByDate.get(s.dateId) ?? [];
    list.push({ rosterId: s.rosterId, name: s.name, status: s.status });
    singersByDate.set(s.dateId, list);
  }

  const availByDate = new Map<string, { available: { rosterId: string; name: string }[]; unavailable: { rosterId: string; name: string }[] }>();
  for (const a of availabilityRows) {
    const entry = availByDate.get(a.dateId) ?? { available: [], unavailable: [] };
    if (a.kind === "available") entry.available.push({ rosterId: a.rosterId, name: a.name });
    else entry.unavailable.push({ rosterId: a.rosterId, name: a.name });
    availByDate.set(a.dateId, entry);
  }

  return dateRows.map((d) => {
    const singers = (singersByDate.get(d.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    const avail = availByDate.get(d.id) ?? { available: [], unavailable: [] };
    return {
      id: d.id,
      date: d.date,
      mdy: isoToMdy(d.date),
      singers,
      available: avail.available,
      unavailable: avail.unavailable,
    };
  });
}
