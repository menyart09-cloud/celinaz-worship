"use client";

import { useState, useTransition } from "react";
import { isoToMdy, todayIso } from "@/lib/dates";
import { SongChip } from "../_components/song-chip";
import { updateServiceAction, type EditedSong } from "./actions";
import type { ServiceWithSongs } from "@/lib/queries";

export function ServiceRow({ service }: { service: ServiceWithSongs }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sermon, setSermon] = useState(service.sermon ?? "");
  const [scripture, setScripture] = useState(service.scripture ?? "");
  const [note, setNote] = useState(service.note ?? "");
  const [songs, setSongs] = useState<EditedSong[]>(
    service.songs.map((s) => ({ hymnNumber: s.hymnNumber, title: s.title, verses: s.verses ?? "" })),
  );

  const isFuture = service.date > todayIso();
  const isNoSongsNote = service.note && service.songs.length === 0 && !isFuture;

  function startEdit() {
    setSermon(service.sermon ?? "");
    setScripture(service.scripture ?? "");
    setNote(service.note ?? "");
    setSongs(service.songs.map((s) => ({ hymnNumber: s.hymnNumber, title: s.title, verses: s.verses ?? "" })));
    setEditing(true);
  }

  function save() {
    startTransition(async () => {
      await updateServiceAction(service.id, { sermon, scripture, note, songs });
      setEditing(false);
    });
  }

  function updateSong(i: number, field: keyof EditedSong, value: string) {
    setSongs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  return (
    <div
      className={
        "grid grid-cols-[100px_minmax(0,1.15fr)_minmax(0,1.5fr)] border-t border-border first:border-t-0 " +
        (editing ? "bg-accent-soft" : isNoSongsNote ? "bg-warn-soft" : "")
      }
    >
      <div className="flex items-start justify-between gap-1 p-3">
        <span className="font-mono-tab font-semibold text-accent-strong">
          {isoToMdy(service.date)}
          <span className="block text-xs font-normal text-text-faint">
            {"'" + service.date.slice(2, 4)}
          </span>
        </span>
        <button
          type="button"
          onClick={editing ? undefined : startEdit}
          aria-label={editing ? "Editing" : "Edit this service"}
          className={
            "flex h-7 w-7 flex-none items-center justify-center rounded border text-xs " +
            (editing
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-border-strong text-text-faint hover:border-accent hover:text-accent-strong")
          }
        >
          {editing ? "…" : "✎"}
        </button>
      </div>

      <div className="border-l border-border p-3">
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <input
              value={sermon}
              onChange={(e) => setSermon(e.target.value)}
              placeholder="Sermon title"
              className="rounded-md border border-border-strong bg-surface px-2 py-1 text-sm"
            />
            <input
              value={scripture}
              onChange={(e) => setScripture(e.target.value)}
              placeholder="Scripture (e.g. Luke 9:23-26)"
              className="font-mono-tab rounded-md border border-border-strong bg-surface px-2 py-1 text-sm"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (a cappella, no church, guest…)"
              className="rounded-md border border-border-strong bg-surface px-2 py-1 text-sm"
            />
          </div>
        ) : (
          <>
            {service.sermon && <div className="font-semibold">{service.sermon}</div>}
            {service.scripture && (
              <span className="font-mono-tab mt-1 inline-block rounded-md border border-accent-soft-border bg-accent-soft px-1.5 py-0.5 text-xs text-accent-strong">
                {service.scripture}
              </span>
            )}
            {service.note && <div className="mt-1 text-sm text-text-muted italic">{service.note}</div>}
            {!service.sermon && !service.note && <span className="text-sm text-text-faint italic">—</span>}
          </>
        )}
      </div>

      <div className="border-l border-border p-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            {songs.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                <input
                  value={s.hymnNumber}
                  onChange={(e) => updateSong(i, "hymnNumber", e.target.value)}
                  placeholder="#"
                  className="font-mono-tab w-14 flex-none rounded-md border border-border-strong bg-surface px-2 py-1 text-center text-sm"
                />
                <input
                  value={s.title}
                  onChange={(e) => updateSong(i, "title", e.target.value)}
                  placeholder="Song title"
                  list="song-title-options"
                  className="min-w-[110px] flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-sm"
                />
                <input
                  value={s.verses}
                  onChange={(e) => updateSong(i, "verses", e.target.value)}
                  placeholder="verses"
                  className="w-16 flex-none rounded-md border border-border-strong bg-surface px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setSongs((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove song"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-text-faint hover:bg-accent-soft hover:text-accent"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSongs((prev) => [...prev, { hymnNumber: "Comp", title: "", verses: "" }])}
              className="rounded-md border border-dashed border-border-strong px-3 py-1.5 text-sm font-semibold text-text-muted hover:border-accent hover:text-accent-strong"
            >
              + Add another song
            </button>
            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="rounded-md border border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : service.songs.length ? (
          <div className="flex flex-col gap-1">
            {service.songs.map((s) => (
              <div key={s.id} className="flex flex-wrap items-baseline gap-2">
                <SongChip hymnNumber={s.hymnNumber} title={s.title} />
                {s.verses && (
                  <span className="font-mono-tab flex-none rounded-full border border-border bg-surface-sunk px-2 py-0.5 text-xs text-text-muted">
                    {s.verses}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-text-faint italic">
            {isFuture ? "Nothing planned yet" : "No songs logged"}
          </span>
        )}
      </div>
    </div>
  );
}

