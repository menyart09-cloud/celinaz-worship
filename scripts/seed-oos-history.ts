// One-time import of the owner's historical Order of Service run sheets
// (exported from Mac Notes as Markdown, transcribed by hand into
// oos_notes_seed_data.json). Safe to re-run: a date is skipped entirely if
// it already has any oos_items rows, so it never clobbers something the
// owner has since edited in the app.
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import path from "path";
import { eq, and } from "drizzle-orm";

type SeedSong = { hymn: string; title: string };
type SeedItem = {
  label: string;
  assignee: string | null;
  detail: string | null;
  songs: SeedSong[];
};
type SeedDate = { date: string; items: SeedItem[] };

function toIsoDate(mdy: string): string {
  const [m, d, y] = mdy.split("-").map(Number);
  const year = 2000 + y;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function sourceForHymn(hymn: string): "hymnal" | "chorus" {
  return /^\d+$/.test(hymn) ? "hymnal" : "chorus";
}

async function main() {
  const { db } = await import("../src/db");
  const { songs, oosItems, oosItemSongs } = await import("../src/db/schema");

  const dates: SeedDate[] = JSON.parse(
    readFileSync(path.join(__dirname, "oos_notes_seed_data.json"), "utf8"),
  );

  const songIdByKey = new Map<string, string>();
  const key = (hymn: string, title: string) => `${hymn}::${title.toLowerCase()}`;

  async function upsertSong(hymnRaw: string, title: string): Promise<string> {
    const hymn = hymnRaw.trim() || "Comp";
    const k = key(hymn, title);
    const cached = songIdByKey.get(k);
    if (cached) return cached;

    const existing = await db.query.songs.findFirst({
      where: and(eq(songs.hymnNumber, hymn), eq(songs.title, title)),
    });
    if (existing) {
      songIdByKey.set(k, existing.id);
      return existing.id;
    }

    const [created] = await db
      .insert(songs)
      .values({ hymnNumber: hymn, title, source: sourceForHymn(hymn) })
      .returning({ id: songs.id });
    songIdByKey.set(k, created.id);
    return created.id;
  }

  console.log(`Seeding Order of Service history (${dates.length} dates)...`);
  let datesImported = 0;
  let itemsCreated = 0;
  let songLinksCreated = 0;

  for (const entry of dates) {
    const isoDate = toIsoDate(entry.date);

    const existing = await db.query.oosItems.findFirst({ where: eq(oosItems.date, isoDate) });
    if (existing) continue; // already has items for this date — don't touch it

    for (let i = 0; i < entry.items.length; i++) {
      const it = entry.items[i];
      const [createdItem] = await db
        .insert(oosItems)
        .values({
          date: isoDate,
          label: it.label,
          assignee: it.assignee,
          detail: it.detail,
          position: i,
        })
        .returning({ id: oosItems.id });
      itemsCreated++;

      for (let j = 0; j < it.songs.length; j++) {
        const songId = await upsertSong(it.songs[j].hymn, it.songs[j].title);
        await db.insert(oosItemSongs).values({ oosItemId: createdItem.id, songId, position: j });
        songLinksCreated++;
      }
    }
    datesImported++;
  }

  console.log(
    `Done. ${datesImported} dates imported, ${itemsCreated} run-sheet items created, ` +
      `${songLinksCreated} song links created.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
