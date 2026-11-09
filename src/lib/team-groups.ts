import { eq } from "drizzle-orm";
import { db } from "@/db";
import { soundBoothRoster, teamGroupMembership, type TeamGroup } from "@/db/schema";

export type RosterWithGroups = {
  id: string;
  name: string;
  phone: string | null;
  hasPin: boolean;
  groups: TeamGroup[];
};

// The roster, Manage Members' own view of it — every person, with which
// group(s) each belongs to, regardless of whether they're actually
// scheduled anywhere yet.
export async function getRosterWithGroups(): Promise<RosterWithGroups[]> {
  const [rosterRows, groupRows] = await Promise.all([
    db.select().from(soundBoothRoster),
    db.select().from(teamGroupMembership),
  ]);
  const groupsById = new Map<string, TeamGroup[]>();
  for (const g of groupRows) {
    const list = groupsById.get(g.rosterId) ?? [];
    list.push(g.group);
    groupsById.set(g.rosterId, list);
  }
  return rosterRows
    .map((r) => ({ id: r.id, name: r.name, phone: r.phone, hasPin: !!r.pinHash, groups: groupsById.get(r.id) ?? [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// What a signed-in team member's own session can reach — this is what
// decides which tabs render for them and gates each team page server-side.
export async function getGroupsForRoster(rosterId: string): Promise<Set<TeamGroup>> {
  const rows = await db.select({ group: teamGroupMembership.group }).from(teamGroupMembership).where(eq(teamGroupMembership.rosterId, rosterId));
  return new Set(rows.map((r) => r.group));
}
