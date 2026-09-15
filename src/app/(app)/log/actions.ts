"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services, serviceSongs } from "@/db/schema";
import { upsertSong } from "@/lib/mutations";

export type EditedSong = { hymnNumber: string; title: string; verses: string };

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
    const songId = await upsertSong(song.hymnNumber || "Comp", song.title);
    await db.insert(serviceSongs).values({
      serviceId,
      songId,
      verses: song.verses.trim() || null,
      position: i,
    });
  }

  revalidatePath("/log");
  revalidatePath("/order-of-service");
  revalidatePath("/songs");
  revalidatePath("/search");
}
