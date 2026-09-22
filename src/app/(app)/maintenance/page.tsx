import { getAllServices, getAllOosDates } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const [services, oosDates] = await Promise.all([getAllServices(), getAllOosDates()]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Maintenance</h2>
        <p className="mt-0.5 text-sm text-text-muted">Backups and other upkeep tools.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-sm font-bold">Backup</h3>
        <p className="mt-1 text-sm text-text-muted">
          Download a spreadsheet snapshot of everything logged so far — {services.length}{" "}
          {services.length === 1 ? "service" : "services"} in the Service Log and {oosDates.length}{" "}
          {oosDates.length === 1 ? "run sheet" : "run sheets"} in the Order of Service — in case
          anything ever happens to the app or its host. Keep a copy somewhere safe.
        </p>
        <a
          href="/api/backup"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          ⬇ Download Backup
        </a>
      </div>
    </div>
  );
}
