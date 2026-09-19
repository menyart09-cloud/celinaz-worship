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

export type ServiceWithSongs = {
  id: string;
  date: string;
  sermon: string | null;
  scripture: string | null;
  note: string | null;
  songs: { id: string; hymnNumber: string; title: string; verses: string | null }[];
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
    if (r.songId && r.title) {
      svc.songs.push({ id: r.songId, hymnNumber: r.hymnNumber ?? "Comp", title: r.title, verses: r.verses });
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
};

export async function getSongLibrary(): Promise<SongLibraryRow[]> {
  const rows = await db
    .select({
      id: songs.id,
      hymnNumber: songs.hymnNumber,
      title: songs.title,
      source: songs.source,
      useCount: sql<number>`count(${serviceSongs.id})`.mapWith(Number),
      lastUsed: sql<string | null>`max(${services.date})`,
    })
    .from(songs)
    .leftJoin(serviceSongs, eq(serviceSongs.songId, songs.id))
    .leftJoin(services, eq(services.id, serviceSongs.serviceId))
    .groupBy(songs.id)
    .orderBy(asc(songs.title));

  return rows;
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
  songs: { linkId: string; hymnNumber: string; title: string }[];
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
      item.songs.push({ linkId: r.linkId, hymnNumber: r.hymnNumber ?? "Comp", title: r.title });
    }
  }
  return [...byId.values()].sort((a, b) => a.position - b.position);
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

// Mirrors the trailing-colon-tolerant match used when pulling from the
// Service Log — the owner's own "Scripture:" label shouldn't need to be
// typed exactly to show up here.
function normalizeLabel(label: string): string {
  return label.replace(/:+\s*$/, "").trim().toLowerCase();
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
  if (!q) return null;
  const all = await getAllServices();
  for (let i = all.length - 1; i >= 0; i--) {
    const song = all[i].songs.find((s) => s.hymnNumber.toLowerCase() === q);
    if (song) return { service: all[i], song };
  }
  return null;
}
