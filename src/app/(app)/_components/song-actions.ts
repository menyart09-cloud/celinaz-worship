"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { serviceSongs } from "@/db/schema";
import { getUpcomingServices } from "@/lib/queries";
import { upsertSong } from "@/lib/mutations";

export async function getUpcomingServicesAction() {
  return getUpcomingServices();
}

export async function addSongToServiceAction(
  serviceId: string,
  hymnNumber: string,
  title: string,
) {
  const songId = await upsertSong(hymnNumber, title);

  const already = await db.query.serviceSongs.findFirst({
    where: (t, { and, eq }) => and(eq(t.serviceId, serviceId), eq(t.songId, songId)),
  });
  if (!already) {
    const existingCount = await db.query.serviceSongs.findMany({
      where: (t, { eq }) => eq(t.serviceId, serviceId),
    });
    await db.insert(serviceSongs).values({
      serviceId,
      songId,
      verses: null,
      position: existingCount.length,
    });
  }

  revalidatePath("/log");
  revalidatePath("/order-of-service");
  revalidatePath("/songs");
  revalidatePath("/search");
}
