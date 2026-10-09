"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { oosItems, oosItemSongs, oosItemExcludedSongs, assigneeNames } from "@/db/schema";
import { upsertSong } from "@/lib/mutations";
import { getOosItems, findLastOosDateBefore, getServiceByDate, type OosItemWithSongs } from "@/lib/queries";
import { normalizeLabel } from "@/lib/labels";

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

// Swaps this item's position with whichever neighbor sits at position ± 1 for
// the same date — a plain up/down reorder, no drag-and-drop needed.
export async function moveItemAction(itemId: string, direction: "up" | "down") {
  const item = await db.query.oosItems.findFirst({ where: eq(oosItems.id, itemId) });
  if (!item) return;

  const neighborPosition = item.position + (direction === "up" ? -1 : 1);
  const neighbor = await db.query.oosItems.findFirst({
    where: and(eq(oosItems.date, item.date), eq(oosItems.position, neighborPosition)),
  });
  if (!neighbor) return;

  await db.update(oosItems).set({ position: neighbor.position }).where(eq(oosItems.id, item.id));
  await db.update(oosItems).set({ position: item.position }).where(eq(oosItems.id, neighbor.id));
  revalidateOos();
}

export async function updateItemFieldAction(
  itemId: string,
  field: "label" | "assignee" | "detail",
  value: string,
) {
  const trimmed = value.trim();
  // label is NOT NULL, so a blank title is stored as "" — null would throw
  // and crash the page. The other fields are nullable.
  await db
    .update(oosItems)
    .set({ [field]: field === "label" ? trimmed : trimmed || null })
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
  const link = await db.query.oosItemSongs.findFirst({ where: eq(oosItemSongs.id, linkId) });
  await db.delete(oosItemSongs).where(eq(oosItemSongs.id, linkId));
  // Remembered so "Pull from Service Log" never brings this song back for
  // this item just because it's still logged on the service — removing a
  // song here is meant to stick, even across a later pull that's only
  // after some other, newly-logged song.
  if (link) {
    await db
      .insert(oosItemExcludedSongs)
      .values({ oosItemId: link.oosItemId, songId: link.songId })
      .onConflictDoNothing();
  }
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
  if (!service) return;

  const items = await getOosItems(date);
  const message = items.find((i) => normalizeLabel(i.label) === "message");

  if (service.songs.length) {
    // A song's own destination tag (set on Service Log) says which item it
    // belongs under — "Opening Song", "Worship", or anything else that's
    // ever been used as an item label. No tag means Worship. A tag whose
    // item doesn't exist on this particular run sheet is skipped, same as
    // it's always been skipped when there was no Opening Song item at all.
    const byNormalizedLabel = new Map<string, OosItemWithSongs>();
    for (const item of items) {
      const key = normalizeLabel(item.label);
      if (!byNormalizedLabel.has(key)) byNormalizedLabel.set(key, item);
    }

    const grouped = new Map<string, { item: OosItemWithSongs; songs: typeof service.songs }>();
    for (const song of service.songs) {
      const target = byNormalizedLabel.get(normalizeLabel(song.destination?.trim() || "Worship"));
      if (!target) continue;
      const bucket = grouped.get(target.id) ?? { item: target, songs: [] };
      bucket.songs.push(song);
      grouped.set(target.id, bucket);
    }

    if (grouped.size) {
      const excludedRows = await db.query.oosItemExcludedSongs.findMany({
        where: inArray(oosItemExcludedSongs.oosItemId, [...grouped.keys()]),
      });
      const excluded = new Set(excludedRows.map((r) => `${r.oosItemId}:${r.songId}`));

      // Adds whatever's missing rather than replacing the item's songs
      // outright — a song removed by hand must stay gone even after a
      // later pull, not get silently re-added alongside some newly-logged
      // song just because it's still sitting in the service's own log.
      for (const { item, songs } of grouped.values()) {
        const existing = new Set(item.songs.map((s) => s.songId));
        let position = item.songs.length;
        for (const song of songs) {
          const songId = await upsertSong(song.hymnNumber, song.title);
          if (existing.has(songId) || excluded.has(`${item.id}:${songId}`)) continue;
          await db.insert(oosItemSongs).values({ oosItemId: item.id, songId, position: position++ });
          existing.add(songId);
        }
      }
    }
  }
  // The pastor's scripture passage belongs with his sermon under Message —
  // the Order of Service's own "Scripture" item is a separate reading the
  // owner fills in by hand and pulling must never overwrite it.
  if (message && (service.sermon || service.scripture)) {
    const detail = [service.sermon, service.scripture].filter(Boolean).join(" — ");
    await db.update(oosItems).set({ detail }).where(eq(oosItems.id, message.id));
  }
  revalidateOos();
}
