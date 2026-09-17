"use client";

import { useMemo, useState } from "react";
import { ServiceRow } from "./service-row";
import type { ServiceWithSongs } from "@/lib/queries";

export function ServiceLogList({ servicesList }: { servicesList: ServiceWithSongs[] }) {
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const sorted = useMemo(
    () =>
      servicesList
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * sortDir),
    [servicesList, sortDir],
  );

  return (
    <div>
      <div className="sticky top-[92px] z-20 grid grid-cols-[100px_minmax(0,1.15fr)_minmax(0,1.5fr)] rounded-t-lg border border-border bg-surface-sunk text-xs font-bold tracking-wide text-text-muted uppercase">
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
      <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
        {sorted.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
