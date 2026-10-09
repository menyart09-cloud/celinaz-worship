import { asc, desc, eq, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  services,
  serviceSongs,
  songs,
  shortlistItems,
  chorusItems,
  assigneeNames,
  oosItems,
  oosItemSongs,
} from "@/db/schema";
import { todayIso } from "./dates";
import { normalizeLabel } from "./labels";

export type ServiceWithSongs = {
  id: string;
  date: string;
  sermon: string | null;
  scripture: string | null;
  note: string | null;
  songs: {
    id: string;
    linkId: string;
    hymnNumber: string;
    title: string;
    verses: string | null;
    destination: string | null;
  }[];
};

export async function getAllServices(): Promise<ServiceWithSongs[]> {
  const rows = await db
    .select({
      serviceId: services.id,
      date: services.date,
      sermon: services.sermon,
      scripture: services.scripture,
      note: services.note,
      songLinkId: serviceSongs.id,
      songId: songs.id,
      hymnNumber: songs.hymnNumber,
      title: songs.title,
      verses: serviceSongs.verses,
      destination: serviceSongs.destination,
      position: serviceSongs.position,
    })
    .from(services)
    .leftJoin(serviceSongs, eq(serviceSongs.serviceId, services.id))
    .leftJoin(songs, eq(songs.id, serviceSongs.songId))
    .orderBy(asc(services.date), asc(serviceSongs.position));

  const byId = new Map<string, ServiceWithSongs>();
  for (const r of rows) {
    let svc = byId.get(r.serviceId);
    if (!svc) {
      svc = { id: r.serviceId, date: r.date, sermon: r.sermon, scripture: r.scripture, note: r.note, songs: [] };
      byId.set(r.serviceId, svc);
    }
    if (r.songId && r.title && r.songLinkId) {
      svc.songs.push({
        id: r.songId,
        linkId: r.songLinkId,
        hymnNumber: r.hymnNumber ?? "Comp",
        title: r.title,
        verses: r.verses,
        destination: r.destination,
      });
    }
  }
  return [...byId.values()];
}

export async function getUpcomingServices(): Promise<ServiceWithSongs[]> {
  const today = todayIso();
  const all = await getAllServices();
  return all.filter((s) => s.date > today);
}

export type SongLibraryRow = {
  id: string;
  hymnNumber: string;
  title: string;
  source: "hymnal" | "chorus" | "other";
  useCount: number;
  lastUsed: string | null;
  usedDates: string[]; // every date it's been sung, newest first
};

export async function getSongLibrary(): Promise<SongLibraryRow[]> {
  const rows = await db
    .select({
      id: songs.id,
      hymnNumber: songs.hymnNumber,
      title: songs.title,
      source: songs.source,
      date: services.date,
    })
    .from(songs)
    .leftJoin(serviceSongs, eq(serviceSongs.songId, songs.id))
    .leftJoin(services, eq(services.id, serviceSongs.serviceId))
    .orderBy(asc(songs.title), desc(services.date));

  const byId = new Map<string, SongLibraryRow>();
  for (const r of rows) {
    let song = byId.get(r.id);
    if (!song) {
      song = {
        id: r.id,
        hymnNumber: r.hymnNumber,
        title: r.title,
        source: r.source,
        useCount: 0,
        lastUsed: null,
        usedDates: [],
      };
      byId.set(r.id, song);
    }
    if (r.date) {
      song.usedDates.push(r.date);
      song.useCount++;
      if (!song.lastUsed) song.lastUsed = r.date;
    }
  }
  return [...byId.values()];
}

export async function getShortlist() {
  return db.select().from(shortlistItems).orderBy(desc(shortlistItems.createdAt));
}

export async function getChoruses() {
  return db.select().from(chorusItems).orderBy(desc(chorusItems.createdAt));
}

export async function getAssigneeNames() {
  const rows = await db.select().from(assigneeNames).orderBy(asc(assigneeNames.name));
  return rows.map((r) => r.name);
}

export async function getServiceByDate(iso: string) {
  const all = await getAllServices();
  return all.find((s) => s.date === iso) ?? null;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Every distinct Order of Service item header ever typed, for the Service
// Log's "where does this song go" picker — ordered to read like a run
// sheet, earliest-typical-item first, so the list itself says roughly
// where in the service each header falls instead of being an arbitrary
// jumble. "Typical" is each header's median position on the dates it's
// been used, as a fraction of that date's item count (so a date with more
// or fewer items than usual doesn't skew it). Grows on its own: type a new
// item label on any Order of Service and it shows up here next time, no
// separate list to maintain.
export async function getKnownOosHeaders(): Promise<string[]> {
  const rows = await db.select({ label: oosItems.label, date: oosItems.date, position: oosItems.position }).from(oosItems);

  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byDate.get(r.date);
    if (list) list.push(r);
    else byDate.set(r.date, [r]);
  }

  const byKey = new Map<string, { display: string; lastUsed: string; relPositions: number[] }>();
  for (const dateRows of byDate.values()) {
    // Ranked by position within the date rather than using `position`
    // itself — removing an item doesn't renumber what's left, so raw
    // position values can have gaps that'd throw the fraction off.
    const ranked = [...dateRows].sort((a, b) => a.position - b.position);
    const total = ranked.length;
    ranked.forEach((r, rank) => {
      const display = r.label.split(":")[0].trim();
      if (!display) return;
      const key = normalizeLabel(display);
      const relPosition = total > 1 ? rank / (total - 1) : 0;

      let entry = byKey.get(key);
      if (!entry) {
        entry = { display, lastUsed: r.date, relPositions: [] };
        byKey.set(key, entry);
      }
      entry.relPositions.push(relPosition);
      // Keep the most recently typed exact casing for display.
      if (r.date >= entry.lastUsed) {
        entry.display = display;
        entry.lastUsed = r.date;
      }
    });
  }

  // A header used only once or twice can coincidentally land at the exact
  // same median as a well-established one (e.g. anything that happened to
  // open or close the service that one time ties "Pre-Service" at 0) — more
  // occurrences is a more reliable read on where something typically goes,
  // so it wins ties instead of crowding out the real pattern.
  const headers = [...byKey.values()]
    .map((e) => ({ display: e.display, typicalPosition: median(e.relPositions), uses: e.relPositions.length }))
    .sort((a, b) => a.typicalPosition - b.typicalPosition || b.uses - a.uses)
    .map((e) => e.display);

  return headers.includes("Worship") ? headers : [...headers, "Worship"];
}

export async function searchByTitle(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getAllServices();
  const hits: { service: ServiceWithSongs; song: ServiceWithSongs["songs"][number] }[] = [];
  for (const service of all) {
    for (const song of service.songs) {
      if (song.title.toLowerCase().includes(q)) hits.push({ service, song });
    }
  }
  return hits;
}

export type OosItemWithSongs = {
  id: string;
  label: string;
  assignee: string | null;
  detail: string | null;
  position: number;
  songs: { linkId: string; songId: string; hymnNumber: string; title: string }[];
};

export async function getOosItems(date: string): Promise<OosItemWithSongs[]> {
  const rows = await db
    .select({
      id: oosItems.id,
      label: oosItems.label,
      assignee: oosItems.assignee,
      detail: oosItems.detail,
      position: oosItems.position,
      linkId: oosItemSongs.id,
      songId: songs.id,
      hymnNumber: songs.hymnNumber,
      title: songs.title,
      songPosition: oosItemSongs.position,
    })
    .from(oosItems)
    .leftJoin(oosItemSongs, eq(oosItemSongs.oosItemId, oosItems.id))
    .leftJoin(songs, eq(songs.id, oosItemSongs.songId))
    .where(eq(oosItems.date, date))
    .orderBy(asc(oosItems.position), asc(oosItemSongs.position));

  const byId = new Map<string, OosItemWithSongs>();
  for (const r of rows) {
    let item = byId.get(r.id);
    if (!item) {
      item = { id: r.id, label: r.label, assignee: r.assignee, detail: r.detail, position: r.position, songs: [] };
      byId.set(r.id, item);
    }
    if (r.linkId && r.songId && r.title) {
      item.songs.push({ linkId: r.linkId, songId: r.songId, hymnNumber: r.hymnNumber ?? "Comp", title: r.title });
    }
  }
  return [...byId.values()].sort((a, b) => a.position - b.position);
}

export type OosBackupRow = {
  date: string;
  label: string;
  assignee: string | null;
  detail: string | null;
  position: number;
  songs: { hymnNumber: string; title: string }[];
};

export async function getAllOosItemsForBackup(): Promise<OosBackupRow[]> {
  const rows = await db
    .select({
      itemId: oosItems.id,
      date: oosItems.date,
      label: oosItems.label,
      assignee: oosItems.assignee,
      detail: oosItems.detail,
      position: oosItems.position,
      songId: songs.id,
      hymnNumber: songs.hymnNumber,
      title: songs.title,
      songPosition: oosItemSongs.position,
    })
    .from(oosItems)
    .leftJoin(oosItemSongs, eq(oosItemSongs.oosItemId, oosItems.id))
    .leftJoin(songs, eq(songs.id, oosItemSongs.songId))
    .orderBy(asc(oosItems.date), asc(oosItems.position), asc(oosItemSongs.position));

  const byId = new Map<string, OosBackupRow>();
  for (const r of rows) {
    let item = byId.get(r.itemId);
    if (!item) {
      item = { date: r.date, label: r.label, assignee: r.assignee, detail: r.detail, position: r.position, songs: [] };
      byId.set(r.itemId, item);
    }
    if (r.songId && r.title) {
      item.songs.push({ hymnNumber: r.hymnNumber ?? "Comp", title: r.title });
    }
  }
  return [...byId.values()].sort((a, b) => (a.date === b.date ? a.position - b.position : a.date < b.date ? -1 : 1));
}

export type OosLogEntry = { date: string; itemCount: number; songCount: number };

export async function getAllOosDates(): Promise<OosLogEntry[]> {
  const rows = await db
    .select({
      date: oosItems.date,
      itemCount: sql<number>`count(distinct ${oosItems.id})`.mapWith(Number),
      songCount: sql<number>`count(${oosItemSongs.id})`.mapWith(Number),
    })
    .from(oosItems)
    .leftJoin(oosItemSongs, eq(oosItemSongs.oosItemId, oosItems.id))
    .groupBy(oosItems.date)
    .orderBy(desc(oosItems.date));
  return rows;
}

export type ScriptureHistoryRow = { date: string; scripture: string };

export async function getScriptureHistory(): Promise<ScriptureHistoryRow[]> {
  const rows = await db
    .select({ date: oosItems.date, label: oosItems.label, detail: oosItems.detail })
    .from(oosItems)
    .where(isNotNull(oosItems.detail))
    .orderBy(desc(oosItems.date));

  return rows
    .filter((r) => normalizeLabel(r.label) === "scripture" && r.detail?.trim())
    .map((r) => ({ date: r.date, scripture: r.detail!.trim() }));
}

export async function findLastOosDateBefore(date: string): Promise<string | null> {
  const rows = await db
    .selectDistinct({ date: oosItems.date })
    .from(oosItems)
    .where(lt(oosItems.date, date))
    .orderBy(desc(oosItems.date))
    .limit(1);
  return rows[0]?.date ?? null;
}

export async function searchByHymn(hymnNumber: string) {
  const q = hymnNumber.trim().toLowerCase();
  if (!q) return [];
  const all = await getAllServices();
  const hits: { service: ServiceWithSongs; song: ServiceWithSongs["songs"][number] }[] = [];
  for (const service of all) {
    const song = service.songs.find((s) => s.hymnNumber.toLowerCase() === q);
    if (song) hits.push({ service, song });
  }
  return hits;
}
