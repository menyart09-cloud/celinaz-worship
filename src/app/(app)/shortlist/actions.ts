"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shortlistItems } from "@/db/schema";

export async function addShortlistItemAction(title: string, hymnNumber: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  await db.insert(shortlistItems).values({ hymnNumber: hymnNumber.trim() || "Comp", title: trimmed });
  revalidatePath("/shortlist");
}

export async function removeShortlistItemAction(id: string) {
  await db.delete(shortlistItems).where(eq(shortlistItems.id, id));
  revalidatePath("/shortlist");
}
