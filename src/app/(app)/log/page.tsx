import Link from "next/link";
import { getAllServices, getSongLibrary } from "@/lib/queries";
import { ServiceRow } from "./service-row";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const [servicesList, library] = await Promise.all([getAllServices(), getSongLibrary()]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Service Log</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Every Sunday, oldest to newest — scroll instead of flipping week to week. Click any
            song to drop it into an upcoming service.
          </p>
        </div>
        <Link
          href="/add-service"
          className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          + New Service
        </Link>
      </div>

      <datalist id="song-title-options">
        {library.map((s) => (
          <option key={s.id} value={s.title} />
        ))}
      </datalist>

      <div className="sticky top-[92px] z-20 grid grid-cols-[100px_1.15fr_1.5fr] rounded-t-lg border border-border bg-surface-sunk text-xs font-bold tracking-wide text-text-muted uppercase">
        <div className="p-2.5">Date</div>
        <div className="border-l border-border p-2.5">Sermon &amp; Scripture</div>
        <div className="border-l border-border p-2.5">Setlist</div>
      </div>
      <div className="overflow-hidden rounded-b-lg border border-t-0 border-border">
        {servicesList.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
