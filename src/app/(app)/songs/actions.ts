"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { songs, serviceSongs, oosItemSongs, oosItemExcludedSongs } from "@/db/schema";

function sourceForHymn(hymn: string): "hymnal" | "chorus" {
  return /^\d+$/.test(hymn) ? "hymnal" : "chorus";
}

// Every use of this song — Service Log, Order of Service, Search, usage
// counts — reads it by songId, so renaming the one row here is all it takes
// to fix a typo everywhere it's ever been logged.
export async function updateSongAction(songId: string, hymnNumberRaw: string, titleRaw: string) {
  const hymnNumber = hymnNumberRaw.trim();
  const title = titleRaw.trim();
  if (!title) return;

  const collision = await db.query.songs.findFirst({
    where: and(eq(songs.hymnNumber, hymnNumber), eq(songs.title, title), ne(songs.id, songId)),
  });

  if (!collision) {
    await db
      .update(songs)
      .set({ hymnNumber, title, source: sourceForHymn(hymnNumber) })
      .where(eq(songs.id, songId));
    revalidatePath("/songs");
    revalidatePath("/log");
    revalidatePath("/order-of-service");
    revalidatePath("/search");
    return;
  }

  // (hymn #, title) is unique, so renaming into text that already belongs
  // to a different song would violate that constraint — it also means
  // this rename is really un-duplicating two rows for the same song.
  // Repoint every reference onto the row that already carries the new
  // text; where a service/item already has that song logged, drop the
  // now-redundant reference instead (so nothing ends up listed twice) and
  // close the position gap it leaves behind, same as removing a song by
  // hand does. Then the duplicate row itself goes away.
  const targetId = collision.id;

  const serviceRows = await db.query.serviceSongs.findMany({ where: eq(serviceSongs.songId, songId) });
  for (const row of serviceRows) {
    const already = await db.query.serviceSongs.findFirst({
      where: and(eq(serviceSongs.serviceId, row.serviceId), eq(serviceSongs.songId, targetId)),
    });
    if (already) {
      await db.delete(serviceSongs).where(eq(serviceSongs.id, row.id));
      await db
        .update(serviceSongs)
        .set({ position: sql`${serviceSongs.position} - 1` })
        .where(and(eq(serviceSongs.serviceId, row.serviceId), gte(serviceSongs.position, row.position + 1)));
    } else {
      await db.update(serviceSongs).set({ songId: targetId }).where(eq(serviceSongs.id, row.id));
    }
  }

  const oosRows = await db.query.oosItemSongs.findMany({ where: eq(oosItemSongs.songId, songId) });
  for (const row of oosRows) {
    const already = await db.query.oosItemSongs.findFirst({
      where: and(eq(oosItemSongs.oosItemId, row.oosItemId), eq(oosItemSongs.songId, targetId)),
    });
    if (already) {
      await db.delete(oosItemSongs).where(eq(oosItemSongs.id, row.id));
      await db
        .update(oosItemSongs)
        .set({ position: sql`${oosItemSongs.position} - 1` })
        .where(and(eq(oosItemSongs.oosItemId, row.oosItemId), gte(oosItemSongs.position, row.position + 1)));
    } else {
      await db.update(oosItemSongs).set({ songId: targetId }).where(eq(oosItemSongs.id, row.id));
    }
  }

  const excludedRows = await db.query.oosItemExcludedSongs.findMany({
    where: eq(oosItemExcludedSongs.songId, songId),
  });
  for (const row of excludedRows) {
    const already = await db.query.oosItemExcludedSongs.findFirst({
      where: and(eq(oosItemExcludedSongs.oosItemId, row.oosItemId), eq(oosItemExcludedSongs.songId, targetId)),
    });
    if (already) {
      await db.delete(oosItemExcludedSongs).where(eq(oosItemExcludedSongs.id, row.id));
    } else {
      await db.update(oosItemExcludedSongs).set({ songId: targetId }).where(eq(oosItemExcludedSongs.id, row.id));
    }
  }

  await db.delete(songs).where(eq(songs.id, songId));

  revalidatePath("/songs");
  revalidatePath("/log");
  revalidatePath("/order-of-service");
  revalidatePath("/search");
}
