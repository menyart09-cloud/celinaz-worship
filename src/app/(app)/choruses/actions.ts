"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chorusItems } from "@/db/schema";

export async function addChorusItemAction(title: string, hymnNumber: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  // Most items on this list genuinely have no hymnal number, so leaving the
  // field blank still means "Comp" (played from the computer) — but a real
  // number typed in overrides that.
  await db.insert(chorusItems).values({ hymnNumber: hymnNumber.trim() || "Comp", title: trimmed });
  revalidatePath("/choruses");
}

export async function removeChorusItemAction(id: string) {
  await db.delete(chorusItems).where(eq(chorusItems.id, id));
  revalidatePath("/choruses");
}
