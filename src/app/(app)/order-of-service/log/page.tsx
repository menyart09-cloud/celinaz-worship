import Link from "next/link";
import { getAllOosDates } from "@/lib/queries";
import { isoToMdy, isSunday } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function OosLogPage() {
  const dates = await getAllOosDates();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Order of Service History</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Every run sheet you&apos;ve saved, most recent first. Click a date to open it.
          </p>
        </div>
        <Link
          href="/order-of-service"
          className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold text-text-muted hover:border-accent"
        >
          Back to Order of Service
        </Link>
      </div>

      {dates.length === 0 ? (
        <p className="text-sm text-text-muted italic">No order of service has been saved yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {dates.map((entry, i) => (
            <Link
              key={entry.date}
              href={`/order-of-service?date=${entry.date}`}
              className={
                "flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-surface-alt " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <span className="font-mono-tab font-semibold">
                {isoToMdy(entry.date)}
                {!isSunday(entry.date) && (
                  <span className="ml-1.5 text-xs font-normal text-text-muted">(not a Sunday)</span>
                )}
              </span>
              <span className="text-text-muted">
                {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"} · {entry.songCount}{" "}
                {entry.songCount === 1 ? "song" : "songs"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
