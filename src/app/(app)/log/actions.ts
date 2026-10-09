"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services, serviceSongs } from "@/db/schema";
import { upsertSong } from "@/lib/mutations";

export type EditedSong = { hymnNumber: string; title: string; verses: string; destination: string };

export async function updateServiceAction(
  serviceId: string,
  data: { sermon: string; scripture: string; note: string; songs: EditedSong[] },
) {
  await db
    .update(services)
    .set({
      sermon: data.sermon.trim() || null,
      scripture: data.scripture.trim() || null,
      note: data.note.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(services.id, serviceId));

  await db.delete(serviceSongs).where(eq(serviceSongs.serviceId, serviceId));

  const cleanSongs = data.songs.filter((s) => s.title.trim());
  for (let i = 0; i < cleanSongs.length; i++) {
    const song = cleanSongs[i];
    const songId = await upsertSong(song.hymnNumber, song.title);
    await db.insert(serviceSongs).values({
      serviceId,
      songId,
      verses: song.verses.trim() || null,
      destination: song.destination.trim() || null,
      position: i,
    });
  }

  revalidatePath("/log");
  revalidatePath("/order-of-service");
  revalidatePath("/songs");
  revalidatePath("/search");
}

// A song's destination can be set straight from the read-only Service Log
// row — no need to open the full edit form just to say where it belongs on
// the run sheet.
export async function setSongDestinationAction(serviceSongId: string, destination: string) {
  await db
    .update(serviceSongs)
    .set({ destination: destination.trim() || null })
    .where(eq(serviceSongs.id, serviceSongId));
  revalidatePath("/log");
  revalidatePath("/order-of-service");
}
