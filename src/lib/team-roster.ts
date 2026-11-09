import { db } from "@/db";
import { soundBoothRoster, teamGroupMembership, type TeamGroup } from "@/db/schema";

// A name already on the roster (any casing) is reused, not duplicated —
// typing a name that already exists just assigns that same person. Used by
// both Sound Booth and Praise Team's "assign/add" flows, which is why it
// also grants the calling group's membership: if you can be put on a
// date's grid, you should be able to see and confirm it on your own phone
// without someone separately remembering to check a box for you.
export async function upsertRosterByName(name: string, group: TeamGroup): Promise<string> {
  const rosterId = await findOrCreateRosterId(name);
  await db.insert(teamGroupMembership).values({ rosterId, group }).onConflictDoNothing();
  return rosterId;
}

async function findOrCreateRosterId(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await db.select().from(soundBoothRoster);
  const match = existing.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
  if (match) return match.id;
  const [row] = await db.insert(soundBoothRoster).values({ name: trimmed }).returning();
  return row.id;
}

// Manage Members' own "Add" button — adds the person to the shared roster
// with no group membership at all; the admin ticks Sound Booth/Praise Team
// boxes afterward to decide what they can actually see.
export async function addRosterMember(name: string): Promise<string> {
  return findOrCreateRosterId(name);
}
