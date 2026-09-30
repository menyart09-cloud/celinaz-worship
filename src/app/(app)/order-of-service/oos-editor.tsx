"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import jsPDF from "jspdf";
import { useRouter, useSearchParams } from "next/navigation";
import type { OosItemWithSongs, SongLibraryRow } from "@/lib/queries";
import { isoToMdy } from "@/lib/dates";
import { SongPickerButton } from "./song-picker";
import { HymnBadge } from "../_components/song-chip";
import {
  addItemAction,
  removeItemAction,
  moveItemAction,
  updateItemFieldAction,
  removeSongFromItemAction,
  addAssigneeNameAction,
  removeAssigneeNameAction,
  copyFromLastWeekAction,
  pullSongsFromLogAction,
} from "./actions";
import { registerFlusher } from "./pending-saves";

type Field = "label" | "assignee" | "detail";

function noopSubscribe() {
  return () => {};
}

// File-sharing via the Web Share API is a narrower, newer capability than
// text-sharing, so the "Share" option in the PDF menu only appears where
// it'll actually work — no dead button. navigator isn't available during
// SSR, so this reads as a client-only external value (useSyncExternalStore),
// same pattern NavPills already uses for sessionStorage.
function getCanShareFiles() {
  try {
    const probe = new File([""], "probe.pdf", { type: "application/pdf" });
    return Boolean(navigator.canShare?.({ files: [probe] }));
  } catch {
    return false;
  }
}

function getServerCanShareFiles() {
  return false;
}

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
  const [justCopied, setJustCopied] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const canShareFiles = useSyncExternalStore(noopSubscribe, getCanShareFiles, getServerCanShareFiles);
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pdfMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (pdfMenuRef.current?.contains(e.target as Node)) return;
      setPdfMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [pdfMenuOpen]);

  function addItem(afterItemId: string | null) {
    startTransition(() => addItemAction(date, afterItemId));
  }

  // On iOS, a home-screen-installed app runs with no Safari chrome, and
  // window.print() silently no-ops there — there's no browser UI left to host
  // the print sheet. handlePrint detects that and instead reopens this page
  // in an actual Safari tab (window.open reliably escapes standalone mode),
  // with ?autoprint=1 so the effect below fires the print dialog once it
  // loads there.
  useEffect(() => {
    if (searchParams.get("autoprint") !== "1") return;
    window.print();
    router.replace(`/order-of-service?date=${encodeURIComponent(date)}`, { scroll: false });
  }, [searchParams, date, router]);

  function handlePrint() {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      window.open(`/order-of-service?date=${encodeURIComponent(date)}&autoprint=1`, "_blank");
    } else {
      window.print();
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      // Nothing more we can do if the clipboard write itself is denied
      // (permissions, non-secure context) — the share attempt already failed
      // or never applied, so this is the last resort either way.
    }
  }

  // navigator.share hands the text to the OS's own share sheet (Messages,
  // Mail, AirDrop…) so there's nothing left to pick and paste — but it's not
  // supported everywhere (Windows has no native share target for it), so
  // browsers without it fall back to just copying the text instead.
  async function handleShare() {
    const text = buildSongsShareText(date, items);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
      } catch (err) {
        // AbortError just means the user closed the share sheet without
        // picking anything — not a failure worth falling back for.
        if ((err as Error)?.name !== "AbortError") await copyToClipboard(text);
      }
    } else {
      await copyToClipboard(text);
    }
  }

  function pdfFileName() {
    return `order-of-service-${date}.pdf`;
  }

  function handleCreatePdf() {
    setPdfBlob(buildOrderOfServicePdf(date, items));
    setPdfMenuOpen(true);
  }

  function handleDownloadPdf() {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFileName();
    a.click();
    URL.revokeObjectURL(url);
    setPdfMenuOpen(false);
  }

  async function handleSharePdf() {
    if (!pdfBlob) return;
    const file = new File([pdfBlob], pdfFileName(), { type: "application/pdf" });
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        handleDownloadPdf();
        return;
      }
    }
    setPdfMenuOpen(false);
  }

  return (
    <div>
      {previewing ? (
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPreviewing(false)}
            className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-accent"
          >
            ← Back to editing
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              🖨 Print
            </button>
            <div ref={pdfMenuRef} className="relative">
              <button
                type="button"
                onClick={handleCreatePdf}
                className="rounded-lg border border-accent bg-surface px-3 py-1.5 text-sm font-semibold text-accent-strong hover:bg-accent-soft"
              >
                📄 Create PDF
              </button>
              {pdfMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border-strong bg-surface p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="block w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-foreground hover:bg-accent-soft"
                  >
                    ⬇ Download PDF
                  </button>
                  {canShareFiles && (
                    <button
                      type="button"
                      onClick={handleSharePdf}
                      className="block w-full rounded-md px-2.5 py-2 text-left text-sm font-semibold text-foreground hover:bg-accent-soft"
                    >
                      💬 Share via Messages/Mail
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
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
              title={hasMatchingService ? undefined : "Nothing logged for this date in the Service Log yet"}
              className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-accent disabled:opacity-50"
            >
              🔄 Pull from Service Log
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
              onClick={handleShare}
              className="rounded-lg border border-accent bg-surface px-3 py-1.5 text-sm font-semibold text-accent-strong hover:bg-accent-soft"
            >
              💬 Text list
            </button>
            {justCopied && (
              <span className="no-print text-xs font-semibold text-text-faint">Copied!</span>
            )}
          </div>
          <p className="no-print mb-4 text-xs text-text-faint">
            &quot;Start from last week&quot; keeps the run sheet, clears just the songs. &quot;Pull
            from Service Log&quot; fills Opening Song &amp; Worship, plus the pastor&apos;s message
            and scripture under Message, from what&apos;s already logged for this date.
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
            {items.flatMap((item, i) => [
              <OosRow
                key={item.id}
                item={item}
                isEven={i % 2 === 1}
                assigneeNames={assigneeNames}
                library={library}
                canMoveUp={i > 0}
                canMoveDown={i < items.length - 1}
              />,
              // Sits right on the border between this item and the next (or,
              // for the last item, the bottom of the list) — floated on top
              // of both neighbors instead of living inside either one, so it
              // reads as "insert a new item here" rather than an action on
              // whichever row it happens to be drawn inside of.
              <div key={`${item.id}-insert`} className="no-print relative h-0">
                <button
                  type="button"
                  onClick={() => addItem(item.id)}
                  title="Insert a new item below this one"
                  className="absolute -top-3 left-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-surface text-text-faint shadow-sm hover:border-accent hover:text-accent-strong"
                >
                  +
                </button>
              </div>,
            ])}
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
  canMoveUp,
  canMoveDown,
}: {
  item: OosItemWithSongs;
  isEven: boolean;
  assigneeNames: string[];
  library: SongLibraryRow[];
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [label, setLabel] = useState(item.label);
  const [assignee, setAssignee] = useState(item.assignee ?? "");
  const [detail, setDetail] = useState(item.detail ?? "");
  const [, startTransition] = useTransition();
  const [inFlight, setInFlight] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const pending = inFlight > 0;

  // Edits autosave shortly after you stop typing (and instantly on blur), so
  // nothing depends on leaving the field first. Refs hold the latest text and
  // what the server last got, so flushing never reads stale state.
  const itemId = item.id;
  const initial = { label: item.label, assignee: item.assignee ?? "", detail: item.detail ?? "" };
  const latest = useRef({ ...initial });
  const saved = useRef({ ...initial });
  const timers = useRef<Partial<Record<Field, ReturnType<typeof setTimeout>>>>({});
  const chain = useRef<Promise<void>>(Promise.resolve());
  const assigneeNamesRef = useRef(assigneeNames);
  useEffect(() => {
    assigneeNamesRef.current = assigneeNames;
  }, [assigneeNames]);

  const save = useCallback(
    (field: Field): Promise<void> => {
      clearTimeout(timers.current[field]);
      delete timers.current[field];
      const value = latest.current[field];
      if (value === saved.current[field]) return chain.current;
      saved.current[field] = value;
      // Saves run one after another so an older value can't land last.
      const run = chain.current
        .then(async () => {
          await updateItemFieldAction(itemId, field, value);
        })
        .catch(() => {
          // Let the next edit (or blur) retry instead of believing it saved.
          saved.current[field] = "\u0000unsaved";
        })
        .finally(() => {
          setInFlight((n) => n - 1);
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 1500);
        });
      setInFlight((n) => n + 1);
      chain.current = run;
      return run;
    },
    [itemId],
  );

  // Only when they're done with the field: learning the name on every
  // debounced save would add "T", "To", "Tom" to the quick picks as they type.
  const commitAssignee = useCallback(async () => {
    await save("assignee");
    const name = latest.current.assignee.trim();
    if (name && !assigneeNamesRef.current.includes(name)) {
      assigneeNamesRef.current = [...assigneeNamesRef.current, name];
      await addAssigneeNameAction(name).catch(() => {});
    }
  }, [save]);

  const flush = useCallback(async () => {
    await Promise.all([save("label"), save("detail"), commitAssignee()]);
  }, [save, commitAssignee]);

  useEffect(() => {
    const unregister = registerFlusher(flush);
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      unregister();
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  // This row keeps its own id across re-renders (React reuses the same
  // instance, useState's initial value only applies once), so a field
  // changed by something OTHER than this row's own inputs — "Pull from
  // Service Log" overwriting Message's detail is the one case today — would
  // otherwise never show up here: the input would keep displaying whatever
  // was there before, even though the database already has the new value.
  // Comparing against `saved` (what WE last wrote) tells an external change
  // apart from the echo of our own save landing back through props.
  useEffect(() => {
    const incoming: Record<Field, string> = {
      label: item.label,
      assignee: item.assignee ?? "",
      detail: item.detail ?? "",
    };
    (Object.keys(incoming) as Field[]).forEach((field) => {
      const value = incoming[field];
      if (value === saved.current[field] || value === latest.current[field]) return;
      latest.current[field] = value;
      saved.current[field] = value;
      if (field === "label") setLabel(value);
      else if (field === "assignee") setAssignee(value);
      else setDetail(value);
    });
  }, [item.label, item.assignee, item.detail]);

  function edit(field: Field, value: string) {
    latest.current[field] = value;
    if (field === "label") setLabel(value);
    else if (field === "assignee") setAssignee(value);
    else setDetail(value);
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => void save(field), 600);
  }

  return (
    <div
      className={
        "flex flex-col gap-2 border-t border-border p-4 first:border-t-0 md:flex-row md:gap-3 " +
        (isEven ? "bg-surface-alt" : "")
      }
    >
      <div className="no-print flex flex-none gap-1 md:flex-col md:pt-0.5">
        <button
          type="button"
          onClick={() => startTransition(() => moveItemAction(item.id, "up"))}
          disabled={!canMoveUp}
          title="Move up"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong text-text-faint hover:border-accent hover:text-accent-strong disabled:opacity-30 disabled:hover:border-border-strong disabled:hover:text-text-faint"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => moveItemAction(item.id, "down"))}
          disabled={!canMoveDown}
          title="Move down"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong text-text-faint hover:border-accent hover:text-accent-strong disabled:opacity-30 disabled:hover:border-border-strong disabled:hover:text-text-faint"
        >
          ↓
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
            onChange={(e) => edit("label", e.target.value)}
            onBlur={() => void save("label")}
            className="min-w-[150px] flex-1 rounded-md border border-transparent px-1 py-0.5 font-bold hover:border-border-strong hover:bg-surface focus:border-border-strong focus:bg-surface focus:outline-none"
          />
          {(pending || justSaved) && (
            <span className="no-print text-xs font-semibold text-text-faint">
              {pending ? "Saving…" : "✓ Saved"}
            </span>
          )}
          <div className="flex flex-col items-start gap-1">
            <input
              value={assignee}
              onChange={(e) => edit("assignee", e.target.value)}
              onBlur={() => void commitAssignee()}
              placeholder="Assigned to…"
              className="w-40 rounded-full border border-border-strong bg-surface-sunk px-3 py-1 text-sm text-text-muted"
            />
            <div className="no-print flex flex-wrap gap-1">
              {assigneeNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      edit("assignee", name);
                      void save("assignee");
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
          onChange={(e) => edit("detail", e.target.value)}
          onBlur={() => void save("detail")}
          placeholder="Scripture reference, a note for the team…"
          className="font-mono-tab w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {item.songs.map((s) => (
            <span
              key={s.linkId}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-sunk py-1.5 pr-1 pl-1.5 text-sm"
            >
              <HymnBadge hymnNumber={s.hymnNumber} />
              <span className="font-medium">{s.title}</span>
              <button
                type="button"
                aria-label="Remove song"
                onClick={() => startTransition(() => removeSongFromItemAction(s.linkId))}
                className="no-print flex h-7 w-7 items-center justify-center rounded text-text-faint hover:bg-accent-soft hover:text-accent"
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
  if (!hymnNumber) return "";
  return hymnNumber === "Comp" ? "(comp)" : `(#${hymnNumber})`;
}

// Just the songs, not the whole run sheet — this is what actually gets
// texted to the praise team, so prayers/announcements/assignees stay out of
// it. Same "Opening Song inlines its one song" convention as PrintItem, for
// the same reason: that's the shape the owner already texts by hand.
function buildSongsShareText(date: string, items: OosItemWithSongs[]): string {
  const songItems = items.filter((item) => item.songs.length > 0);
  if (songItems.length === 0) {
    return `🎵 ${isoToMdy(date)} — no songs picked yet.`;
  }

  const lines = [`🎵 ${isoToMdy(date)} — this Sunday's songs:`];
  for (const item of songItems) {
    const label = item.label.replace(/:+\s*$/, "");
    const inlineSong = label === "Opening Song" && item.songs.length === 1 ? item.songs[0] : null;
    if (inlineSong) {
      lines.push(`${label}: ${inlineSong.title} ${songTag(inlineSong.hymnNumber)}`.trim());
    } else {
      lines.push(`${label}:`);
      item.songs.forEach((s, i) => lines.push(`${i + 1}. ${s.title} ${songTag(s.hymnNumber)}`.trim()));
    }
  }
  return lines.join("\n");
}

// Same content and line-by-line shape as PrintItem/PrintView (the full run
// sheet, not just songs — this is "the Order of Service", not the text-share
// summary), just drawn directly with jsPDF instead of relying on the
// browser's print engine. That trades away the page's actual Comic Neue
// font (jsPDF ships standard PDF fonts only; embedding a custom TTF is more
// than this needs) for a PDF that's generated instantly, client-side, with
// no server round-trip.
function buildOrderOfServicePdf(date: string, items: OosItemWithSongs[]): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 36;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  function addLine(text: string, opts: { size: number; bold?: boolean; indent?: number }) {
    const indent = opts.indent ?? 0;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size);
    const lineHeight = opts.size * 1.35;
    const wrapped = doc.splitTextToSize(text, maxWidth - indent) as string[];
    for (const line of wrapped) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin + indent, y);
      y += lineHeight;
    }
  }

  addLine(`${isoToMdy(date)} Order of Service`, { size: 20, bold: true });
  y += 8;

  if (items.length === 0) {
    addLine("Nothing here yet.", { size: 14 });
  } else {
    for (const item of items) {
      const label = item.label.replace(/:+\s*$/, "");
      const inlineSong =
        label === "Opening Song" && !item.assignee && item.songs.length === 1 ? item.songs[0] : null;
      const listSongs = inlineSong ? [] : item.songs;

      let headLine = label;
      if (item.assignee) {
        headLine += `: ${item.assignee}`;
      } else if (inlineSong) {
        headLine += `: ${inlineSong.title} ${songTag(inlineSong.hymnNumber)}`.trimEnd();
      } else if (item.detail || listSongs.length > 0) {
        headLine += ":";
      }
      addLine(headLine, { size: 14, bold: true });

      if (item.detail) addLine(`• ${item.detail}`, { size: 14, indent: 16 });
      listSongs.forEach((s, i) =>
        addLine(`${i + 1}. ${s.title} ${songTag(s.hymnNumber)}`.trimEnd(), { size: 14, indent: 16 }),
      );
      y += 10;
    }
  }

  return doc.output("blob");
}

// Plain-text run sheet: one label line per item, an optional note bullet, and
// songs either inline (a single song with no assignee, e.g. "Opening Song:
// Hosanna (comp)") or as a numbered list — matching how the owner formatted
// these by hand in Notes, not the app's card-editor look.
function PrintItem({ item }: { item: OosItemWithSongs }) {
  // Some labels already end with a colon the owner typed themselves
  // (habit from Notes) — strip it here so the line below never doubles up
  // into "Label::" when we add our own separator.
  const label = item.label.replace(/:+\s*$/, "");

  // Only "Opening Song" gets its single song inlined on the label line
  // (that's how the owner's own Notes formatted it — "Opening Song: Hosanna
  // (comp)"). Every other item, "Worship" especially, always lists its
  // songs as a numbered list, even with just one.
  const inlineSong =
    label === "Opening Song" && !item.assignee && item.songs.length === 1
      ? item.songs[0]
      : null;
  const listSongs = inlineSong ? [] : item.songs;

  let headLine = label;
  if (item.assignee) {
    headLine += `: ${item.assignee}`;
  } else if (inlineSong) {
    headLine += `: ${inlineSong.title} ${songTag(inlineSong.hymnNumber)}`;
  } else if (item.detail || listSongs.length > 0) {
    headLine += ":";
  }

  return (
    <div className="mb-3">
      <p className="text-xl">{headLine}</p>
      {item.detail && <p className="pl-4 text-xl before:mr-1.5 before:content-['•']">{item.detail}</p>}
      {listSongs.map((s, i) => (
        <p key={s.linkId} className="pl-4 text-xl">
          {i + 1}. {s.title} {songTag(s.hymnNumber)}
        </p>
      ))}
    </div>
  );
}

function PrintView({ date, items }: { date: string; items: OosItemWithSongs[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4 text-2xl font-bold">{isoToMdy(date)} Order of Service</p>
      {items.length === 0 ? (
        <p className="text-xl text-text-faint italic">Nothing here yet.</p>
      ) : (
        items.map((item) => <PrintItem key={item.id} item={item} />)
      )}
    </div>
  );
}
