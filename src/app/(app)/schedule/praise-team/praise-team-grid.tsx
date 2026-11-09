"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { allPraiseTeamUnavailable, type PraiseTeamDateRow } from "@/lib/praise-team/helpers";
import { addPraiseTeamDateAction, addPraiseTeamSingerAction, removePraiseTeamSingerAction } from "@/lib/praise-team/actions";
import type { SoundBoothStatus } from "@/db/schema";
import { DatePickerDropdown } from "../date-picker-dropdown";

function statusDotClass(status: SoundBoothStatus) {
  if (status === "yes") return "bg-good";
  if (status === "no") return "bg-declined";
  return "bg-text-faint";
}

type OpenAdd = { dateId: string; top: number; left: number } | null;
type OpenRemove = { dateId: string; rosterId: string; name: string; top: number; left: number } | null;

function AddSingerPopover({
  dateId,
  roster,
  current,
  top,
  left,
  onClose,
}: {
  dateId: string;
  roster: string[];
  current: Set<string>;
  top: number;
  left: number;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");

  function add(name: string) {
    startTransition(async () => {
      await addPraiseTeamSingerAction(dateId, name);
      onClose();
    });
  }

  function addNew() {
    const name = newName.trim();
    if (!name) return;
    add(name);
  }

  const pickable = roster.filter((n) => !current.has(n));

  return createPortal(
    <div
      data-pt-popover
      style={{ position: "fixed", top, left }}
      className="z-50 flex w-[230px] flex-col gap-1.5 rounded-xl border border-border-strong bg-surface p-1.5 shadow-lg"
    >
      {pickable.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pickable.map((name) => (
            <button
              key={name}
              type="button"
              disabled={pending}
              onClick={() => add(name)}
              className="rounded-full border border-border-strong bg-surface-sunk px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 border-t border-dashed border-border pt-1.5 first:border-t-0 first:pt-0">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNew();
            }
          }}
          placeholder="New person&#8217;s name"
          className="min-w-0 flex-1 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs text-foreground"
        />
        <button
          type="button"
          disabled={pending}
          onClick={addNew}
          className="flex-none rounded-full border border-accent-strong bg-accent-strong px-3 py-1 text-xs font-semibold text-white"
        >
          Add
        </button>
      </div>
    </div>,
    document.body,
  );
}

function RemoveSingerPopover({
  dateId,
  rosterId,
  name,
  top,
  left,
  onClose,
}: {
  dateId: string;
  rosterId: string;
  name: string;
  top: number;
  left: number;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      await removePraiseTeamSingerAction(dateId, rosterId);
      onClose();
    });
  }

  return createPortal(
    <div
      data-pt-popover
      style={{ position: "fixed", top, left }}
      className="z-50 flex w-[180px] flex-col gap-1.5 rounded-xl border border-border-strong bg-surface p-1.5 shadow-lg"
    >
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="rounded-lg border border-declined bg-declined-soft px-2.5 py-1.5 text-xs font-bold text-declined"
      >
        Remove {name}
      </button>
    </div>,
    document.body,
  );
}

export function PraiseTeamGrid({ dates, roster }: { dates: PraiseTeamDateRow[]; roster: string[] }) {
  const [openAdd, setOpenAdd] = useState<OpenAdd>(null);
  const [openRemove, setOpenRemove] = useState<OpenRemove>(null);
  const [newDate, setNewDate] = useState("");
  const [addPending, startAddTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openAdd && !openRemove) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-pt-popover]") && !target.closest("[data-pt-trigger]")) {
        setOpenAdd(null);
        setOpenRemove(null);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [openAdd, openRemove]);

  useEffect(() => {
    if (!openAdd && !openRemove) return;
    function onScroll() {
      setOpenAdd(null);
      setOpenRemove(null);
    }
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      scrollEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openAdd, openRemove]);

  function openAddAt(e: React.MouseEvent<HTMLButtonElement>, dateId: string) {
    if (openAdd?.dateId === dateId) {
      setOpenAdd(null);
      return;
    }
    setOpenRemove(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 230;
    const left = Math.min(rect.left, window.innerWidth - popoverWidth - 16);
    setOpenAdd({ dateId, top: rect.bottom + 4, left: Math.max(8, left) });
  }

  function openRemoveAt(e: React.MouseEvent<HTMLButtonElement>, dateId: string, rosterId: string, name: string) {
    if (openRemove?.dateId === dateId && openRemove.rosterId === rosterId) {
      setOpenRemove(null);
      return;
    }
    setOpenAdd(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 180;
    const left = Math.min(rect.left, window.innerWidth - popoverWidth - 16);
    setOpenRemove({ dateId, rosterId, name, top: rect.bottom + 4, left: Math.max(8, left) });
  }

  function addDate(iso: string) {
    if (!iso) return;
    startAddTransition(async () => {
      await addPraiseTeamDateAction(iso);
      setNewDate("");
    });
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap gap-3.5 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-good" />
          confirmed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-declined" />
          can&rsquo;t make it
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-text-faint" />
          no response yet
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto rounded-xl">
        <div className="w-fit rounded-xl border border-border bg-surface">
          <div
            className="grid rounded-t-xl border-b border-border bg-surface-alt text-xs font-bold tracking-wide text-text-muted uppercase"
            style={{ gridTemplateColumns: "110px 320px 200px" }}
          >
            <div className="px-3.5 py-2.5">Date</div>
            <div className="border-l border-border px-2.5 py-2.5">Singers</div>
            <div className="border-l border-border px-2.5 py-2.5">Availability</div>
          </div>

          {dates.map((d) => {
            const away = allPraiseTeamUnavailable(d);
            return (
              <div key={d.id} className="grid border-t border-border first:border-t-0" style={{ gridTemplateColumns: "110px 320px 200px" }}>
                <div className="flex items-center px-3.5 py-2.5 font-mono-tab font-bold text-accent-strong">{d.mdy}</div>
                <div className="flex flex-wrap items-center gap-1.5 border-l border-border px-2.5 py-2.5">
                  {d.singers.map((s) => (
                    <button
                      key={s.rosterId}
                      type="button"
                      data-pt-trigger
                      onClick={(e) => openRemoveAt(e, d.id, s.rosterId, s.name)}
                      className="flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-sunk px-2.5 py-1 text-xs font-semibold text-foreground hover:border-accent"
                    >
                      {s.name}
                      <span className={"h-1.5 w-1.5 flex-none rounded-full " + statusDotClass(s.status)} />
                    </button>
                  ))}
                  <button
                    type="button"
                    data-pt-trigger
                    onClick={(e) => openAddAt(e, d.id)}
                    className="rounded-full border border-dashed border-border-strong bg-transparent px-2.5 py-1 text-xs italic text-text-faint hover:border-accent hover:text-accent-strong"
                  >
                    + add singer
                  </button>
                </div>
                <div className="flex flex-col justify-center gap-0.5 border-l border-border px-2.5 py-2.5 text-[0.76rem]">
                  {away.length === 0 && d.available.length === 0 ? (
                    <span className="text-text-faint">&mdash;</span>
                  ) : (
                    <>
                      {away.length > 0 && (
                        <div>
                          <span className="font-bold text-declined">Unavailable:</span> {away.map((a) => a.name).join(", ")}
                        </div>
                      )}
                      {d.available.length > 0 && (
                        <div>
                          <span className="font-bold text-good">Can help:</span> {d.available.map((a) => a.name).join(", ")}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {openAdd &&
        (() => {
          const d = dates.find((x) => x.id === openAdd.dateId);
          if (!d) return null;
          return (
            <AddSingerPopover
              dateId={openAdd.dateId}
              roster={roster}
              current={new Set(d.singers.map((s) => s.name))}
              top={openAdd.top}
              left={openAdd.left}
              onClose={() => setOpenAdd(null)}
            />
          );
        })()}

      {openRemove && (
        <RemoveSingerPopover
          dateId={openRemove.dateId}
          rosterId={openRemove.rosterId}
          name={openRemove.name}
          top={openRemove.top}
          left={openRemove.left}
          onClose={() => setOpenRemove(null)}
        />
      )}

      <div className="mt-3.5 flex max-w-[360px] items-center gap-2">
        <DatePickerDropdown value={newDate} onChange={setNewDate} />
        <button
          type="button"
          disabled={addPending || !newDate}
          onClick={() => addDate(newDate)}
          className="flex-none rounded-full border border-accent-strong bg-accent-strong px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          + Add a date
        </button>
      </div>
    </div>
  );
}
