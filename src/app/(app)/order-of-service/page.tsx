import Link from "next/link";
import {
  getAllServices,
  getOosItems,
  getAssigneeNames,
  getSongLibrary,
  getServiceByDate,
} from "@/lib/queries";
import { todayIso } from "@/lib/dates";
import { OosEditor } from "./oos-editor";
import { DateSwitcher } from "./date-switcher";

export const dynamic = "force-dynamic";

async function resolveDefaultDate(): Promise<string> {
  const today = todayIso();
  const all = await getAllServices();
  const nextUpcoming = all.find((s) => s.date >= today);
  return nextUpcoming?.date ?? today;
}

export default async function OrderOfServicePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? (await resolveDefaultDate());

  const [items, assigneeNames, library, service] = await Promise.all([
    getOosItems(date),
    getAssigneeNames(),
    getSongLibrary(),
    getServiceByDate(date),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Order of Service</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            A working template — the run sheet stays mostly the same week to week. Pull that
            Sunday&apos;s songs straight from the Service Log instead of retyping them.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <Link
            href="/order-of-service/log"
            className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold text-text-muted hover:border-accent"
          >
            History
          </Link>
          <DateSwitcher date={date} />
        </div>
      </div>
      <p className="print:block mb-4 hidden text-sm font-semibold">{date}</p>

      <OosEditor
        date={date}
        items={items}
        assigneeNames={assigneeNames}
        library={library}
        hasMatchingService={Boolean(service?.songs.length)}
      />
    </div>
  );
}
