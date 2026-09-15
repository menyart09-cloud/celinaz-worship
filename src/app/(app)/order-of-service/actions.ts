"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { oosItems, oosItemSongs, assigneeNames } from "@/db/schema";
import { upsertSong } from "@/lib/mutations";
import { getOosItems, findLastOosDateBefore, getServiceByDate } from "@/lib/queries";

const STARTER_TEMPLATE = [
  "Announcements Slides",
  "Countdown",
  "Call to Worship",
  "Opening Song",
  "Greet",
  "Welcome & Announcements",
  "Children Dismissed",
  "Scripture",
  "Worship",
  "Pastoral Prayer",
  "Message",
  "Dismissal",
];

function revalidateOos() {
  revalidatePath("/order-of-service");
}

// Inserts a new blank item right after `afterItemId` (or at the very top when
// null), shifting everything after it down by one position — so adding a row
// never requires walking it into place one arrow-click at a time.
export async function addItemAction(date: string, afterItemId: string | null) {
  const items = await getOosItems(date);
  const afterPosition = afterItemId ? (items.find((i) => i.id === afterItemId)?.position ?? -1) : -1;

  await db
    .update(oosItems)
    .set({ position: sql`${oosItems.position} + 1` })
    .where(and(eq(oosItems.date, date), gte(oosItems.position, afterPosition + 1)));

  await db.insert(oosItems).values({
    date,
    label: "New Item",
    position: afterPosition + 1,
  });

  revalidateOos();
}

export async function removeItemAction(itemId: string) {
  await db.delete(oosItems).where(eq(oosItems.id, itemId));
  revalidateOos();
}

export async function updateItemFieldAction(
  itemId: string,
  field: "label" | "assignee" | "detail",
  value: string,
) {
  await db
    .update(oosItems)
    .set({ [field]: value.trim() || null })
    .where(eq(oosItems.id, itemId));
  revalidateOos();
}

export async function addSongToItemAction(itemId: string, hymnNumber: string, title: string) {
  const songId = await upsertSong(hymnNumber, title);
  const existing = await db.query.oosItemSongs.findMany({ where: eq(oosItemSongs.oosItemId, itemId) });
  await db.insert(oosItemSongs).values({ oosItemId: itemId, songId, position: existing.length });
  revalidateOos();
}

export async function removeSongFromItemAction(linkId: string) {
  await db.delete(oosItemSongs).where(eq(oosItemSongs.id, linkId));
  revalidateOos();
}

export async function addAssigneeNameAction(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = await db.query.assigneeNames.findFirst({ where: eq(assigneeNames.name, trimmed) });
  if (!existing) await db.insert(assigneeNames).values({ name: trimmed });
  revalidateOos();
}

export async function removeAssigneeNameAction(name: string) {
  await db.delete(assigneeNames).where(eq(assigneeNames.name, name));
  revalidateOos();
}

export async function copyFromLastWeekAction(date: string) {
  const lastDate = await findLastOosDateBefore(date);
  const sourceItems = lastDate ? await getOosItems(lastDate) : null;
  const labels = sourceItems && sourceItems.length ? sourceItems.map((i) => ({ ...i })) : null;

  await db.delete(oosItems).where(eq(oosItems.date, date));

  const template = labels ?? STARTER_TEMPLATE.map((label, position) => ({ label, assignee: null, detail: null, position }));
  for (let i = 0; i < template.length; i++) {
    const t = template[i] as { label: string; assignee?: string | null; detail?: string | null };
    await db.insert(oosItems).values({
      date,
      label: t.label,
      assignee: t.assignee ?? null,
      detail: t.detail ?? null,
      position: i,
    });
  }
  revalidateOos();
}

export async function pullSongsFromLogAction(date: string) {
  const service = await getServiceByDate(date);
  if (!service || !service.songs.length) return;

  const items = await getOosItems(date);
  const opening = items.find((i) => i.label === "Opening Song");
  const worship = items.find((i) => i.label === "Worship");

  if (opening) {
    await db.delete(oosItemSongs).where(eq(oosItemSongs.oosItemId, opening.id));
    const [first] = service.songs;
    const songId = await upsertSong(first.hymnNumber, first.title);
    await db.insert(oosItemSongs).values({ oosItemId: opening.id, songId, position: 0 });
  }
  if (worship) {
    await db.delete(oosItemSongs).where(eq(oosItemSongs.oosItemId, worship.id));
    const rest = service.songs.slice(1);
    for (let i = 0; i < rest.length; i++) {
      const songId = await upsertSong(rest[i].hymnNumber, rest[i].title);
      await db.insert(oosItemSongs).values({ oosItemId: worship.id, songId, position: i });
    }
  }
  revalidateOos();
}
