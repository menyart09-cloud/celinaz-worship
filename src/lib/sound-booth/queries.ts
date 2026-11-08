import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { soundBoothDates, soundBoothAssignments, soundBoothAvailability, soundBoothRoster, services, type SoundBoothStatus } from "@/db/schema";
import { isoToMdy } from "@/lib/dates";
import type { SoundBoothAssignmentRow, SoundBoothDateRow, SoundBoothRosterRow } from "./helpers";

export type { SoundBoothRosterRow, SoundBoothAssignmentRow, SoundBoothDateRow, SoundBoothDateStatus } from "./helpers";
export { allUnavailable, dateStatus } from "./helpers";

// Names only, for the public /team sign-in picker — phone numbers and
// whether a PIN is set stay out of anything sent to an unauthenticated page.
export async function getSoundBoothRosterNames(): Promise<string[]> {
  const rows = await db.select({ name: soundBoothRoster.name }).from(soundBoothRoster).orderBy(asc(soundBoothRoster.name));
  return rows.map((r) => r.name);
}

export async function getSoundBoothRoster(): Promise<SoundBoothRosterRow[]> {
  const rows = await db
    .select({ id: soundBoothRoster.id, name: soundBoothRoster.name, phone: soundBoothRoster.phone, pinHash: soundBoothRoster.pinHash })
    .from(soundBoothRoster)
    .orderBy(asc(soundBoothRoster.name));
  return rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, hasPin: !!r.pinHash }));
}

// The three positions in the fixed display order, regardless of insert
// order — matches the grid's own column order (MediaShout, Sound, Live).
const POSITION_ORDER: SoundBoothAssignmentRow["position"][] = ["MediaShout", "Sound", "Live"];

export async function getSoundBoothDates(): Promise<SoundBoothDateRow[]> {
  const [dateRows, assignmentRows, availabilityRows, serviceDateRows] = await Promise.all([
    db.select().from(soundBoothDates).orderBy(asc(soundBoothDates.date)),
    db
      .select({
        dateId: soundBoothAssignments.dateId,
        position: soundBoothAssignments.position,
        rosterId: soundBoothAssignments.rosterId,
        status: soundBoothAssignments.status,
        name: soundBoothRoster.name,
      })
      .from(soundBoothAssignments)
      .leftJoin(soundBoothRoster, eq(soundBoothRoster.id, soundBoothAssignments.rosterId)),
    db
      .select({
        dateId: soundBoothAvailability.dateId,
        rosterId: soundBoothAvailability.rosterId,
        kind: soundBoothAvailability.kind,
        name: soundBoothRoster.name,
      })
      .from(soundBoothAvailability)
      .innerJoin(soundBoothRoster, eq(soundBoothRoster.id, soundBoothAvailability.rosterId)),
    db.select({ date: services.date }).from(services),
  ]);

  const serviceDates = new Set(serviceDateRows.map((r) => r.date));

  const assignmentsByDate = new Map<string, SoundBoothAssignmentRow[]>();
  for (const a of assignmentRows) {
    const list = assignmentsByDate.get(a.dateId) ?? [];
    list.push({ position: a.position, rosterId: a.rosterId, name: a.name, status: a.status });
    assignmentsByDate.set(a.dateId, list);
  }

  const availByDate = new Map<string, { available: { rosterId: string; name: string }[]; unavailable: { rosterId: string; name: string }[] }>();
  for (const a of availabilityRows) {
    const entry = availByDate.get(a.dateId) ?? { available: [], unavailable: [] };
    if (a.kind === "available") entry.available.push({ rosterId: a.rosterId, name: a.name });
    else entry.unavailable.push({ rosterId: a.rosterId, name: a.name });
    availByDate.set(a.dateId, entry);
  }

  return dateRows.map((d) => {
    const rows = assignmentsByDate.get(d.id) ?? [];
    const sortedRows = POSITION_ORDER.map(
      (pos) => rows.find((r) => r.position === pos) ?? { position: pos, rosterId: null, name: null, status: "pending" as SoundBoothStatus },
    );
    const avail = availByDate.get(d.id) ?? { available: [], unavailable: [] };
    return {
      id: d.id,
      date: d.date,
      mdy: isoToMdy(d.date),
      hasServiceLog: serviceDates.has(d.date),
      available: avail.available,
      unavailable: avail.unavailable,
      rows: sortedRows,
    };
  });
}
