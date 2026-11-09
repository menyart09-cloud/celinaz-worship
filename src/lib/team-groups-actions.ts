"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { teamGroupMembership, type TeamGroup } from "@/db/schema";
import { addRosterMember } from "@/lib/team-roster";

function revalidateAll() {
  revalidatePath("/schedule/manage");
  revalidatePath("/team/schedule");
  revalidatePath("/team/praise-team");
}

export async function addRosterMemberAction(name: string) {
  await addRosterMember(name);
  revalidateAll();
}

export async function setGroupMembershipAction(rosterId: string, group: TeamGroup, enabled: boolean) {
  if (enabled) {
    await db.insert(teamGroupMembership).values({ rosterId, group }).onConflictDoNothing();
  } else {
    await db.delete(teamGroupMembership).where(and(eq(teamGroupMembership.rosterId, rosterId), eq(teamGroupMembership.group, group)));
  }
  revalidateAll();
}
