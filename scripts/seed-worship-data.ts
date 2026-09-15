// One-time import of the owner's historical Numbers spreadsheet (Songs For
// Service.xlsx) into the real schema. Safe to re-run: songs are upserted by
// (hymnNumber, title), services are upserted by date.
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import path from "path";
import { eq, and } from "drizzle-orm";

type SeedSong = { hymn: string | null; title: string; verses: string | null };
type SeedService = {
  date: string; // "9-13-26"
  sermon: string | null;
  scripture: string | null;
  note: string | null;
  songs: SeedSong[];
};
type CatalogEntry = { hymn: string; title: string; sheet: string };

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
  const { songs, services, serviceSongs, assigneeNames } = await import("../src/db/schema");

  const servicesData: SeedService[] = JSON.parse(
    readFileSync(path.join(__dirname, "services_seed_data.json"), "utf8"),
  );
  const catalogData: CatalogEntry[] = JSON.parse(
    readFileSync(path.join(__dirname, "catalog_seed_data.json"), "utf8"),
  );

  const songIdByKey = new Map<string, string>();
  const key = (hymn: string, title: string) => `${hymn}::${title.toLowerCase()}`;

  async function upsertSong(hymnRaw: string | null, title: string): Promise<string> {
    const hymn = hymnRaw?.trim() || "Comp";
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

  console.log(`Seeding song library from catalog (${catalogData.length} entries)...`);
  for (const entry of catalogData) {
    await upsertSong(entry.hymn, entry.title.trim());
  }

  console.log(`Seeding ${servicesData.length} historical/planned services...`);
  let servicesCreated = 0;
  let songsLinked = 0;
  for (const svc of servicesData) {
    const isoDate = toIsoDate(svc.date);

    const existingService = await db.query.services.findFirst({
      where: eq(services.date, isoDate),
    });
    const serviceId = existingService
      ? existingService.id
      : (
          await db
            .insert(services)
            .values({
              date: isoDate,
              sermon: svc.sermon,
              scripture: svc.scripture,
              note: svc.note,
            })
            .returning({ id: services.id })
        )[0].id;
    if (!existingService) servicesCreated++;

    if (existingService) continue; // don't duplicate songs on re-run

    for (let i = 0; i < svc.songs.length; i++) {
      const song = svc.songs[i];
      if (!song.title) continue;
      const songId = await upsertSong(song.hymn, song.title.trim());
      await db.insert(serviceSongs).values({
        serviceId,
        songId,
        verses: song.verses,
        position: i,
      });
      songsLinked++;
    }
  }

  console.log("Seeding starter assignee quick-picks...");
  for (const name of ["Pastor"]) {
    const existing = await db.query.assigneeNames.findFirst({ where: eq(assigneeNames.name, name) });
    if (!existing) await db.insert(assigneeNames).values({ name });
  }

  console.log(
    `Done. ${servicesCreated} services created, ${songsLinked} service-song links, ` +
      `${songIdByKey.size} distinct songs in the library.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
