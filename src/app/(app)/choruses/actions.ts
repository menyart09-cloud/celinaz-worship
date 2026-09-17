"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chorusItems } from "@/db/schema";

export async function addChorusItemAction(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  await db.insert(chorusItems).values({ hymnNumber: "Comp", title: trimmed });
  revalidatePath("/choruses");
}

export async function removeChorusItemAction(id: string) {
  await db.delete(chorusItems).where(eq(chorusItems.id, id));
  revalidatePath("/choruses");
}
