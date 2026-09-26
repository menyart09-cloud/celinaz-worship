"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { isoToMdy } from "@/lib/dates";
import { addSongToServiceAction, getUpcomingServicesAction } from "./song-actions";
import type { ServiceWithSongs } from "@/lib/queries";

const POPOVER_WIDTH = 256; // w-64
const VIEWPORT_MARGIN = 8;

// Every list this renders in (Song Library's scrolling table, Choruses,
// Shortlist, Service Log) clips absolutely-positioned children with
// overflow-hidden/auto, cutting the popover off. Positioning it in a portal,
// fixed to the viewport from the button's own rect, sidesteps every one of
// those ancestors at once instead of loosening each container's overflow.
//
// maxHeight caps the popover to however much room is actually left in that
// direction, rather than letting a long "upcoming services" list just run
// off the bottom of the screen with no way to reach the rest of it — the
// list inside scrolls once it hits that cap.
function computePosition(btn: HTMLElement) {
  const rect = btn.getBoundingClientRect();
  let left = rect.left;
  if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
    left = window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN;
  }
  left = Math.max(VIEWPORT_MARGIN, left);

  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

  return openUpward
    ? { left, bottom: window.innerHeight - rect.top + 4, top: undefined, maxHeight: spaceAbove - 4 }
    : { left, top: rect.bottom + 4, bottom: undefined, maxHeight: spaceBelow - 4 };
}

export function HymnBadge({ hymnNumber }: { hymnNumber: string }) {
  if (!hymnNumber) return null;
  const isComp = hymnNumber === "Comp";
  return (
    <span
      className={
        "font-mono-tab min-w-[2.4em] flex-none rounded px-1.5 py-0.5 text-center text-xs font-semibold " +
        (isComp
          ? "border border-accent-soft-border bg-accent-soft text-accent-strong"
          : "border border-border bg-surface-sunk text-text-muted")
      }
    >
      {hymnNumber}
    </span>
  );
}

export function SongChip({
  hymnNumber,
  title,
  hideBadge,
}: {
  hymnNumber: string;
  title: string;
  hideBadge?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<
    { left: number; top?: number; bottom?: number; maxHeight: number } | null
  >(null);
  const [upcoming, setUpcoming] = useState<ServiceWithSongs[] | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // A scrolling ancestor moving the button out from under a viewport-fixed
    // popover would leave it floating over the wrong row — simplest fix is
    // to just close it, same as clicking away. But the popover's own
    // services list scrolls internally, and that scroll event bubbles up
    // to this same capture-phase listener — closing on that would make the
    // list impossible to scroll at all, so it's excluded.
    function onScroll(e: Event) {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (btnRef.current) setPosition(computePosition(btnRef.current));
    setOpen(true);
    if (!upcoming) {
      const list = await getUpcomingServicesAction();
      setUpcoming(list);
    }
  }

  function pick(serviceId: string) {
    startTransition(async () => {
      await addSongToServiceAction(serviceId, hymnNumber, title);
      setAddedTo((prev) => new Set(prev).add(serviceId));
      setTimeout(() => setOpen(false), 650);
    });
  }

  return (
    <span className="inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="-mx-1 inline-flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-accent-soft"
      >
        {!hideBadge && <HymnBadge hymnNumber={hymnNumber} />}
        <span className="font-medium">{title}</span>
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
            className="z-50 flex w-64 flex-col rounded-xl border border-border-strong bg-surface p-3 shadow-lg"
          >
            <div className="mb-2 flex-none border-b border-border pb-2">
              <div className="text-[0.68rem] font-bold tracking-wide text-text-muted uppercase">
                Add to a future service
              </div>
              <div className="font-bold">{title}</div>
            </div>
            {upcoming === null ? (
              <p className="p-1 text-sm text-text-faint italic">Loading…</p>
            ) : upcoming.length === 0 ? (
              <p className="p-1 text-sm text-text-faint italic">
                No upcoming services yet — add one first.
              </p>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {upcoming.map((s) => {
                  const added = addedTo.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={added || pending}
                      onClick={() => pick(s.id)}
                      className={
                        "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm " +
                        (added ? "bg-good-soft text-good" : "hover:bg-accent-soft")
                      }
                    >
                      <span className="font-mono-tab font-semibold text-accent-strong">
                        {isoToMdy(s.date)}
                      </span>
                      <span className="truncate text-text-muted">{s.sermon || s.note || ""}</span>
                      {added && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
