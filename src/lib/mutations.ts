import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { songs } from "@/db/schema";

function sourceForHymn(hymn: string): "hymnal" | "chorus" {
  return /^\d+$/.test(hymn) ? "hymnal" : "chorus";
}

// Server-only helper (not a Server Action itself) shared by every mutation
// that needs a song id from a hymn#/title pair — upserts by (hymnNumber, title).
export async function upsertSong(hymnNumberRaw: string, titleRaw: string): Promise<string> {
  const hymnNumber = hymnNumberRaw.trim();
  const title = titleRaw.trim();

  const existing = await db.query.songs.findFirst({
    where: and(eq(songs.hymnNumber, hymnNumber), eq(songs.title, title)),
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(songs)
    .values({ hymnNumber, title, source: sourceForHymn(hymnNumber) })
    .returning({ id: songs.id });
  return created.id;
}
