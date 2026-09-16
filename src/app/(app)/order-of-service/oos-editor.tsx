"use client";

import { useState, useTransition } from "react";
import type { OosItemWithSongs, SongLibraryRow } from "@/lib/queries";
import { isoToMdy } from "@/lib/dates";
import { SongPickerButton } from "./song-picker";
import {
  addItemAction,
  removeItemAction,
  updateItemFieldAction,
  removeSongFromItemAction,
  addAssigneeNameAction,
  removeAssigneeNameAction,
  copyFromLastWeekAction,
  pullSongsFromLogAction,
} from "./actions";

export function OosEditor({
  date,
  items,
  assigneeNames,
  library,
  hasMatchingService,
}: {
  date: string;
  items: OosItemWithSongs[];
  assigneeNames: string[];
  library: SongLibraryRow[];
  hasMatchingService: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [previewing, setPreviewing] = useState(false);

  function addItem(afterItemId: string | null) {
    startTransition(() => addItemAction(date, afterItemId));
  }

  return (
    <div>
      {previewing ? (
        <div className="no-print mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPreviewing(false)}
            className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-accent"
          >
            ← Back to editing
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            🖨 Print
          </button>
        </div>
      ) : (
        <div className="print:hidden">
          <div className="no-print mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => startTransition(() => copyFromLastWeekAction(date))}
              disabled={pending}
              className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-accent"
            >
              ↺ Start from last week
            </button>
            <button
              type="button"
              onClick={() => startTransition(() => pullSongsFromLogAction(date))}
              disabled={pending || !hasMatchingService}
              className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-accent disabled:opacity-50"
            >
              🔄 Pull songs from Service Log
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setPreviewing(true)}
              className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-accent"
            >
              👁 Preview
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              🖨 Print
            </button>
          </div>
          <p className="no-print mb-4 text-xs text-text-faint">
            &quot;Start from last week&quot; keeps the run sheet, clears just the songs. &quot;Pull
            songs&quot; fills Opening Song &amp; Worship from what&apos;s already logged for this
            date.
          </p>

          <div className="no-print mb-3">
            <button
              type="button"
              onClick={() => addItem(null)}
              className="w-full rounded-lg border border-dashed border-border-strong px-3 py-2 text-sm font-semibold text-text-muted hover:border-accent hover:text-accent-strong"
            >
              + Add item at top
            </button>
          </div>

          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-border-strong p-6 text-center text-sm text-text-faint italic">
              Nothing here yet — try &quot;Start from last week&quot; to bring in your usual run
              sheet.
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {items.map((item, i) => (
              <OosRow
                key={item.id}
                item={item}
                isEven={i % 2 === 1}
                assigneeNames={assigneeNames}
                library={library}
                onAddBelow={() => addItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* The run sheet as it actually prints: plain text, no boxes — matches the
          owner's Mac Notes format. Shown on screen only while previewing;
          `print:block` makes it (and only it) visible when actually printing,
          regardless of whether Preview was opened first. */}
      <div className={(previewing ? "block " : "hidden ") + "print:block"}>
        <PrintView date={date} items={items} />
      </div>
    </div>
  );
}

function OosRow({
  item,
  isEven,
  assigneeNames,
  library,
  onAddBelow,
}: {
  item: OosItemWithSongs;
  isEven: boolean;
  assigneeNames: string[];
  library: SongLibraryRow[];
  onAddBelow: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [assignee, setAssignee] = useState(item.assignee ?? "");
  const [detail, setDetail] = useState(item.detail ?? "");
  const [, startTransition] = useTransition();

  function commitAssignee(value: string) {
    startTransition(() => updateItemFieldAction(item.id, "assignee", value));
    const trimmed = value.trim();
    if (trimmed && !assigneeNames.includes(trimmed)) {
      startTransition(() => addAssigneeNameAction(trimmed));
    }
  }

  return (
    <div className={"flex gap-3 border-t border-border p-4 first:border-t-0 " + (isEven ? "bg-surface-alt" : "")}>
      <div className="no-print flex flex-none flex-col gap-1 pt-0.5">
        <button
          type="button"
          onClick={onAddBelow}
          title="Insert a new item below this one"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong text-text-faint hover:border-accent hover:text-accent-strong"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => removeItemAction(item.id))}
          title="Remove this item"
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-faint hover:bg-accent-soft hover:text-accent"
        >
          ✕
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => startTransition(() => updateItemFieldAction(item.id, "label", label))}
            className="min-w-[150px] flex-1 rounded-md border border-transparent px-1 py-0.5 font-bold hover:border-border-strong hover:bg-surface focus:border-border-strong focus:bg-surface focus:outline-none"
          />
          <div className="flex flex-col items-start gap-1">
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              onBlur={() => commitAssignee(assignee)}
              placeholder="Assigned to…"
              className="w-40 rounded-full border border-border-strong bg-surface-sunk px-3 py-1 text-sm text-text-muted"
            />
            <div className="no-print flex flex-wrap gap-1">
              {assigneeNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignee(name);
                      startTransition(() => updateItemFieldAction(item.id, "assignee", name));
                    }}
                    className="rounded-full border border-dashed border-border-strong px-1.5 py-0.5 text-[0.65rem] text-text-faint hover:border-accent hover:text-accent-strong"
                  >
                    {name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${name} from quick picks`}
                    onClick={() => startTransition(() => removeAssigneeNameAction(name))}
                    className="text-[0.6rem] text-text-faint hover:text-accent"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          onBlur={() => startTransition(() => updateItemFieldAction(item.id, "detail", detail))}
          placeholder="Scripture reference, a note for the team…"
          className="font-mono-tab w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {item.songs.map((s) => (
            <span
              key={s.linkId}
              className="flex items-center gap-1.5 rounded-lg border border-accent-soft-border bg-accent-soft py-1.5 pr-1 pl-1.5 text-sm"
            >
              <span className="font-mono-tab rounded bg-surface px-1.5 py-0.5 text-xs text-text-muted">
                {s.hymnNumber}
              </span>
              <span className="font-medium text-accent-strong">{s.title}</span>
              <button
                type="button"
                aria-label="Remove song"
                onClick={() => startTransition(() => removeSongFromItemAction(s.linkId))}
                className="no-print flex h-7 w-7 items-center justify-center rounded text-accent-strong opacity-60 hover:bg-black/10 hover:opacity-100"
              >
                ✕
              </button>
            </span>
          ))}
          <span className="no-print">
            <SongPickerButton itemId={item.id} library={library} />
          </span>
        </div>
      </div>
    </div>
  );
}

function songTag(hymnNumber: string): string {
  return hymnNumber === "Comp" ? "(comp)" : `(#${hymnNumber})`;
}

// Plain-text run sheet: one label line per item, an optional note bullet, and
// songs either inline (a single song with no assignee, e.g. "Opening Song:
// Hosanna (comp)") or as a numbered list — matching how the owner formatted
// these by hand in Notes, not the app's card-editor look.
function PrintItem({ item }: { item: OosItemWithSongs }) {
  const inlineSong = !item.assignee && item.songs.length === 1 ? item.songs[0] : null;
  const listSongs = inlineSong ? [] : item.songs;

  let headLine = item.label;
  if (item.assignee) {
    headLine += `: ${item.assignee}`;
  } else if (inlineSong) {
    headLine += `: ${inlineSong.title} ${songTag(inlineSong.hymnNumber)}`;
  } else if (item.detail || listSongs.length > 0) {
    headLine += ":";
  }

  return (
    <div className="mb-3">
      <p className="text-base">{headLine}</p>
      {item.detail && <p className="pl-4 text-base before:mr-1.5 before:content-['•']">{item.detail}</p>}
      {listSongs.map((s, i) => (
        <p key={s.linkId} className="pl-4 text-base">
          {i + 1}. {s.title} {songTag(s.hymnNumber)}
        </p>
      ))}
    </div>
  );
}

function PrintView({ date, items }: { date: string; items: OosItemWithSongs[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-lg font-bold">{isoToMdy(date)} Order of Service</p>
      {items.length === 0 ? (
        <p className="text-base text-text-faint italic">Nothing here yet.</p>
      ) : (
        items.map((item) => <PrintItem key={item.id} item={item} />)
      )}
    </div>
  );
}
