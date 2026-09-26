"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services, serviceSongs } from "@/db/schema";
import { upsertSong } from "@/lib/mutations";

export type CreateServiceState = { error: string | null };

export async function createServiceAction(
  _prev: CreateServiceState,
  formData: FormData,
): Promise<CreateServiceState> {
  const date = formData.get("date");
  const sermon = String(formData.get("sermon") ?? "").trim();
  const scripture = String(formData.get("scripture") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const songsJson = String(formData.get("songs") ?? "[]");

  if (typeof date !== "string" || !date) {
    return { error: "Pick a date for this service." };
  }

  let songsInput: { hymnNumber: string; title: string; verses: string }[] = [];
  try {
    songsInput = JSON.parse(songsJson);
  } catch {
    songsInput = [];
  }

  const existing = await db.query.services.findFirst({ where: eq(services.date, date) });
  if (existing) {
    return { error: `A service already exists for ${date}. Edit it from the Service Log instead.` };
  }

  const [created] = await db
    .insert(services)
    .values({
      date,
      sermon: sermon || null,
      scripture: scripture || null,
      note: note || null,
    })
    .returning({ id: services.id });

  const cleanSongs = songsInput.filter((s) => s.title.trim());
  for (let i = 0; i < cleanSongs.length; i++) {
    const song = cleanSongs[i];
    const songId = await upsertSong(song.hymnNumber, song.title);
    await db.insert(serviceSongs).values({
      serviceId: created.id,
      songId,
      verses: song.verses.trim() || null,
      position: i,
    });
  }

  revalidatePath("/log");
  revalidatePath("/songs");
  redirect("/log");
}
