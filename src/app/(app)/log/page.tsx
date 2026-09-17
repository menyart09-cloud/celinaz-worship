import Link from "next/link";
import { getAllServices, getSongLibrary } from "@/lib/queries";
import { ServiceLogList } from "./service-log-list";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const [servicesList, library] = await Promise.all([getAllServices(), getSongLibrary()]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Service Log</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Every Sunday — click Date to flip the order, scroll instead of paging week to week.
            Click any song to drop it into an upcoming service.
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

      <ServiceLogList servicesList={servicesList} />
    </div>
  );
}
