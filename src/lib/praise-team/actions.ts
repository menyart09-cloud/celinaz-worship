"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { praiseTeamAvailability, praiseTeamDates, praiseTeamSingers, type SoundBoothAvailabilityKind, type SoundBoothStatus } from "@/db/schema";
import { getTeamSession } from "@/lib/sound-booth/team-session";
import { upsertRosterByName } from "@/lib/team-roster";

function revalidatePraiseTeam() {
  revalidatePath("/schedule/praise-team");
  revalidatePath("/schedule/manage");
  revalidatePath("/team/praise-team");
}

export async function addPraiseTeamDateAction(iso: string) {
  const date = iso.trim();
  await db.insert(praiseTeamDates).values({ date }).onConflictDoNothing();
  revalidatePraiseTeam();
}

// Admin-side — add someone (existing or brand new name) to a date's
// singers list. No fixed slots to assign into, so this only ever adds.
export async function addPraiseTeamSingerAction(dateId: string, name: string) {
  const rosterId = await upsertRosterByName(name, "praise_team");
  await db.insert(praiseTeamSingers).values({ dateId, rosterId }).onConflictDoNothing();
  revalidatePraiseTeam();
}

export async function removePraiseTeamSingerAction(dateId: string, rosterId: string) {
  await db.delete(praiseTeamSingers).where(and(eq(praiseTeamSingers.dateId, dateId), eq(praiseTeamSingers.rosterId, rosterId)));
  revalidatePraiseTeam();
}

// Team-side confirm — only ever the signed-in person's own row, same
// ownership check as setOwnSoundBoothStatusAction.
export async function setOwnPraiseTeamStatusAction(dateId: string, status: SoundBoothStatus) {
  const session = await getTeamSession();
  if (!session) throw new Error("Not signed in");
  const [row] = await db
    .select()
    .from(praiseTeamSingers)
    .where(and(eq(praiseTeamSingers.dateId, dateId), eq(praiseTeamSingers.rosterId, session.rosterId)));
  if (!row) throw new Error("Not your assignment");
  await db.update(praiseTeamSingers).set({ status, updatedAt: new Date() }).where(eq(praiseTeamSingers.id, row.id));
  revalidatePraiseTeam();
}

// Same "I can help" / "I'm unavailable" date-level self-report as Sound
// Booth's availability toggle — always the signed-in person's own row.
export async function setOwnPraiseTeamAvailabilityAction(dateId: string, kind: SoundBoothAvailabilityKind) {
  const session = await getTeamSession();
  if (!session) throw new Error("Not signed in");
  const [existing] = await db
    .select()
    .from(praiseTeamAvailability)
    .where(and(eq(praiseTeamAvailability.dateId, dateId), eq(praiseTeamAvailability.rosterId, session.rosterId)));

  if (existing?.kind === kind) {
    await db.delete(praiseTeamAvailability).where(eq(praiseTeamAvailability.id, existing.id));
  } else if (existing) {
    await db.update(praiseTeamAvailability).set({ kind }).where(eq(praiseTeamAvailability.id, existing.id));
  } else {
    await db.insert(praiseTeamAvailability).values({ dateId, rosterId: session.rosterId, kind });
  }
  revalidatePraiseTeam();
}
