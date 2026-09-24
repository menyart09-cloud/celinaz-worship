"use server";

import { mdyToIso } from "@/lib/dates";
import { searchByTitle, searchByHymn, getServiceByDate, type ServiceWithSongs } from "@/lib/queries";

export type SearchResult =
  | { kind: "empty" }
  | { kind: "title-none"; query: string }
  | {
      kind: "title-hit";
      hymnNumber: string;
      title: string;
      lastDate: string;
      count: number;
      history: { date: string; hymnNumber: string }[];
      siblings: ServiceWithSongs["songs"];
    }
  | { kind: "hymn-none"; query: string }
  | {
      kind: "hymn-hit";
      hymnNumber: string;
      title: string;
      lastDate: string;
      count: number;
      history: { date: string; hymnNumber: string }[];
      siblings: ServiceWithSongs["songs"];
    }
  | { kind: "date-none"; query: string }
  | { kind: "date-hit"; service: ServiceWithSongs };

export async function searchAction(mode: "title" | "hymn" | "date", query: string): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { kind: "empty" };

  if (mode === "title") {
    const hits = await searchByTitle(q);
    if (hits.length === 0) return { kind: "title-none", query: q };
    const last = hits[hits.length - 1];
    const siblings = last.service.songs.filter(
      (s) => !(s.hymnNumber === last.song.hymnNumber && s.title === last.song.title),
    );
    return {
      kind: "title-hit",
      hymnNumber: last.song.hymnNumber,
      title: last.song.title,
      lastDate: last.service.date,
      count: hits.length,
      history: hits
        .slice()
        .reverse()
        .map((h) => ({ date: h.service.date, hymnNumber: h.song.hymnNumber })),
      siblings,
    };
  }

  if (mode === "hymn") {
    const hits = await searchByHymn(q);
    if (hits.length === 0) return { kind: "hymn-none", query: q };
    const last = hits[hits.length - 1];
    const siblings = last.service.songs.filter(
      (s) => !(s.hymnNumber === last.song.hymnNumber && s.title === last.song.title),
    );
    return {
      kind: "hymn-hit",
      hymnNumber: last.song.hymnNumber,
      title: last.song.title,
      lastDate: last.service.date,
      count: hits.length,
      history: hits
        .slice()
        .reverse()
        .map((h) => ({ date: h.service.date, hymnNumber: h.song.hymnNumber })),
      siblings,
    };
  }

  // date
  let iso = q;
  if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(q)) iso = mdyToIso(q);
  const service = await getServiceByDate(iso);
  if (!service) return { kind: "date-none", query: q };
  return { kind: "date-hit", service };
}
