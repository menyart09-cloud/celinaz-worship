"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { SongLibraryRow } from "@/lib/queries";
import { addSongToItemAction } from "./actions";

const POPOVER_WIDTH = 256; // w-64
const VIEWPORT_MARGIN = 8;

// Same fix as SongChip's popover: the items list this renders in is
// overflow-hidden (for its rounded corners), which clips an
// absolutely-positioned popover whenever it opens near the bottom of the
// list — portaling it to the viewport with JS-computed position sidesteps
// that entirely.
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

export function SongPickerButton({ itemId, library }: { itemId: string; library: SongLibraryRow[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<
    { left: number; top?: number; bottom?: number; maxHeight: number } | null
  >(null);
  const [filter, setFilter] = useState("");
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
    function onScroll(e: Event) {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    // The search input's autofocus can trigger the browser's own
    // scroll-into-view synchronously on open, which this listener would
    // otherwise read as an outside scroll and immediately close on — arming
    // it a tick later lets that settle first without losing real closes.
    const armScrollClose = setTimeout(() => window.addEventListener("scroll", onScroll, true), 0);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      clearTimeout(armScrollClose);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const matches = library.filter((s) => s.title.toLowerCase().includes(filter.toLowerCase())).slice(0, 40);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (btnRef.current) setPosition(computePosition(btnRef.current));
    setOpen(true);
  }

  function pick(hymnNumber: string, title: string) {
    startTransition(async () => {
      await addSongToItemAction(itemId, hymnNumber, title);
      setOpen(false);
      setFilter("");
    });
  }

  return (
    <span className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={pending}
        className="rounded-md border border-dashed border-border-strong px-2.5 py-1 text-xs font-semibold text-text-muted hover:border-accent hover:text-accent-strong"
      >
        + Add song
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
            className="z-50 flex w-64 flex-col rounded-xl border border-border-strong bg-surface p-2.5 shadow-lg"
          >
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search the library…"
              className="mb-2 w-full flex-none rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm"
            />
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="p-1 text-sm text-text-faint italic">No matches in the library.</p>
              ) : (
                matches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pick(s.hymnNumber, s.title)}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-soft"
                  >
                    <span className="font-mono-tab text-xs text-text-muted">{s.hymnNumber}</span>
                    <span className="flex-1 truncate">{s.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
