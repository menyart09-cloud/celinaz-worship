"use server";

import { revalidatePath } from "next/cache";
import bcryptjs from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  soundBoothDates,
  soundBoothAssignments,
  soundBoothAvailability,
  soundBoothRoster,
  type SoundBoothPosition,
  type SoundBoothStatus,
  type SoundBoothAvailabilityKind,
} from "@/db/schema";
import { mdyToIso } from "@/lib/dates";
import { getTeamSession, setTeamSession, clearTeamSession } from "./team-session";

const POSITIONS: SoundBoothPosition[] = ["MediaShout", "Sound", "Live"];

function revalidateSchedule() {
  revalidatePath("/schedule");
  revalidatePath("/schedule/manage");
  revalidatePath("/team/schedule");
}

// A name already on the roster (any casing) is reused, not duplicated —
// typing a name that already exists just assigns that same person.
async function upsertRosterByName(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await db.select().from(soundBoothRoster);
  const match = existing.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
  if (match) return match.id;
  const [row] = await db.insert(soundBoothRoster).values({ name: trimmed }).returning();
  return row.id;
}

export async function addSoundBoothDateAction(mdy: string) {
  const date = mdyToIso(mdy.trim());
  const [row] = await db.insert(soundBoothDates).values({ date }).onConflictDoNothing().returning();
  const dateId = row?.id ?? (await db.select().from(soundBoothDates).where(eq(soundBoothDates.date, date)))[0]?.id;
  if (dateId) {
    for (const position of POSITIONS) {
      await db.insert(soundBoothAssignments).values({ dateId, position }).onConflictDoNothing();
    }
  }
  revalidateSchedule();
}

// Admin-side reassign — can set anyone to any position, including a brand
// new name typed into the picker.
export async function assignSoundBoothPositionAction(dateId: string, position: SoundBoothPosition, name: string | null) {
  const rosterId = name ? await upsertRosterByName(name) : null;
  await db
    .update(soundBoothAssignments)
    .set({ rosterId, status: "pending", updatedAt: new Date() })
    .where(and(eq(soundBoothAssignments.dateId, dateId), eq(soundBoothAssignments.position, position)));
  revalidateSchedule();
}

// Team-side confirm — only ever the signed-in person's own row. The check
// against the session's rosterId is what actually enforces "each member can
// only change themselves," not anything in the UI.
export async function setOwnSoundBoothStatusAction(dateId: string, position: SoundBoothPosition, status: SoundBoothStatus) {
  const session = await getTeamSession();
  if (!session) throw new Error("Not signed in");
  const [row] = await db
    .select()
    .from(soundBoothAssignments)
    .where(and(eq(soundBoothAssignments.dateId, dateId), eq(soundBoothAssignments.position, position)));
  if (!row || row.rosterId !== session.rosterId) throw new Error("Not your assignment");
  await db
    .update(soundBoothAssignments)
    .set({ status, updatedAt: new Date() })
    .where(eq(soundBoothAssignments.id, row.id));
  revalidateSchedule();
}

// "I can help" / "I'm unavailable" are opposite answers to the same
// question for a given date and person — setting one clears the other, and
// tapping the active one again clears it back to no answer. Always the
// signed-in person's own row; there's no admin or anyone-else variant.
export async function setOwnSoundBoothAvailabilityAction(dateId: string, kind: SoundBoothAvailabilityKind) {
  const session = await getTeamSession();
  if (!session) throw new Error("Not signed in");
  const [existing] = await db
    .select()
    .from(soundBoothAvailability)
    .where(and(eq(soundBoothAvailability.dateId, dateId), eq(soundBoothAvailability.rosterId, session.rosterId)));

  if (existing?.kind === kind) {
    await db.delete(soundBoothAvailability).where(eq(soundBoothAvailability.id, existing.id));
  } else if (existing) {
    await db.update(soundBoothAvailability).set({ kind }).where(eq(soundBoothAvailability.id, existing.id));
  } else {
    await db.insert(soundBoothAvailability).values({ dateId, rosterId: session.rosterId, kind });
  }
  revalidateSchedule();
}

// ---- Manage Members (admin only) ----

export async function addSoundBoothRosterMemberAction(name: string) {
  await upsertRosterByName(name);
  revalidateSchedule();
}

export async function setSoundBoothPinAction(rosterId: string, pin: string) {
  const pinHash = await bcryptjs.hash(pin.trim(), 10);
  await db.update(soundBoothRoster).set({ pinHash }).where(eq(soundBoothRoster.id, rosterId));
  revalidateSchedule();
}

export async function setSoundBoothPhoneAction(rosterId: string, phone: string) {
  await db
    .update(soundBoothRoster)
    .set({ phone: phone.trim() || null })
    .where(eq(soundBoothRoster.id, rosterId));
  revalidateSchedule();
}

// ---- Team sign-in / sign-out ----

export async function signInTeamMemberAction(name: string, pin: string): Promise<{ ok: boolean; error?: string }> {
  const [member] = await db.select().from(soundBoothRoster).where(eq(soundBoothRoster.name, name));
  if (!member || !member.pinHash) return { ok: false, error: "No PIN set up for that name yet." };
  const valid = await bcryptjs.compare(pin.trim(), member.pinHash);
  if (!valid) return { ok: false, error: "That PIN didn't match." };
  await setTeamSession({ rosterId: member.id, name: member.name });
  return { ok: true };
}

export async function signOutTeamMemberAction() {
  await clearTeamSession();
}
