"use client";

import { useMemo, useState } from "react";
import { ServiceRow } from "./service-row";
import type { ServiceWithSongs } from "@/lib/queries";

export function ServiceLogList({
  servicesList,
  knownHeaders,
}: {
  servicesList: ServiceWithSongs[];
  knownHeaders: string[];
}) {
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const sorted = useMemo(
    () =>
      servicesList
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * sortDir),
    [servicesList, sortDir],
  );

  return (
    <div>
      {/* Mobile: a stacked card per service has no columns to label, so the
          grid header below is desktop-only — this is just the sort toggle. */}
      <button
        type="button"
        onClick={() => setSortDir((d) => (d === 1 ? -1 : 1))}
        className="mb-2 flex items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-bold tracking-wide text-text-muted uppercase md:hidden"
      >
        Date
        <span className={sortDir === 1 ? "text-accent" : "text-accent rotate-180"}>▲</span>
      </button>

      <div
        className="sticky z-20 hidden grid-cols-[100px_minmax(0,1.15fr)_minmax(0,1.5fr)] rounded-t-lg border border-border bg-surface-sunk text-xs font-bold tracking-wide text-text-muted uppercase md:grid"
        style={{ top: "var(--app-header-height, 92px)" }}
      >
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 1 ? -1 : 1))}
          className="flex items-center gap-1 p-2.5 text-left hover:bg-surface-alt"
        >
          Date
          <span className={sortDir === 1 ? "text-accent" : "text-accent rotate-180"}>▲</span>
        </button>
        <div className="border-l border-border p-2.5">Sermon &amp; Scripture</div>
        <div className="border-l border-border p-2.5">Setlist</div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border md:rounded-t-none md:border-t-0">
        {sorted.map((service) => (
          <ServiceRow key={service.id} service={service} knownHeaders={knownHeaders} />
        ))}
      </div>
    </div>
  );
}
