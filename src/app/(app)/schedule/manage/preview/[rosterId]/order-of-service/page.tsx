import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllOosDates, getOosItems, getOosVisibleDatesSet } from "@/lib/queries";
import { getGroupsForRoster, getRosterMemberName } from "@/lib/team-groups";
import { isoToMdy } from "@/lib/dates";
import { PreviewHeader } from "../preview-header";
import { PrintView } from "@/app/(app)/order-of-service/oos-editor";

export const dynamic = "force-dynamic";

export default async function PreviewOosPage({
  params,
  searchParams,
}: {
  params: Promise<{ rosterId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { rosterId } = await params;
  const name = await getRosterMemberName(rosterId);
  if (!name) notFound();

  const groups = await getGroupsForRoster(rosterId);
  const { date } = await searchParams;
  const visible = await getOosVisibleDatesSet();

  if (date && visible.has(date)) {
    const items = await getOosItems(date);
    return (
      <div>
        <PreviewHeader rosterId={rosterId} name={name} groups={[...groups]} />
        <Link
          href={`/schedule/manage/preview/${rosterId}/order-of-service`}
          className="mb-3 inline-block text-sm font-bold text-accent-strong"
        >
          &lsaquo; Back to Order of Service
        </Link>
        <div className="rounded-xl border border-border bg-surface p-3">
          <PrintView date={date} items={items} previewing={true} />
        </div>
      </div>
    );
  }

  const allDates = await getAllOosDates();

  return (
    <div>
      <PreviewHeader rosterId={rosterId} name={name} groups={[...groups]} />
      <div className="rounded-xl border border-border bg-surface">
        {allDates.length === 0 && <p className="p-4 text-sm text-text-muted">Nothing here yet.</p>}
        {allDates.map((d) => {
          const isVisible = visible.has(d.date);
          return (
            <div
              key={d.date}
              className={
                "flex items-center gap-3 border-t border-border p-3 text-sm first:border-t-0 " + (isVisible ? "" : "opacity-55")
              }
            >
              <span className="w-20 flex-none font-mono-tab font-bold text-accent-strong">{isoToMdy(d.date)}</span>
              <span className="flex-1 text-text-muted">Order of Service</span>
              {isVisible ? (
                <Link href={`/schedule/manage/preview/${rosterId}/order-of-service?date=${d.date}`} className="flex-none text-xs font-bold text-good">
                  view &rsaquo;
                </Link>
              ) : (
                <span className="flex-none text-xs font-bold text-text-faint italic">not shared yet</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
