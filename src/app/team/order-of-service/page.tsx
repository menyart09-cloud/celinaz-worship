import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/sound-booth/team-session";
import { getAllOosDates, getOosItems, getOosVisibleDatesSet } from "@/lib/queries";
import { isoToMdy } from "@/lib/dates";
import { TeamHeader } from "../team-header";
import { PrintView } from "../../(app)/order-of-service/oos-editor";

export const dynamic = "force-dynamic";

export default async function TeamOosPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await getTeamSession();
  if (!session) redirect("/team");

  const { date } = await searchParams;
  const visible = await getOosVisibleDatesSet();

  // The query param is never trusted on its own — a date only actually
  // renders once it's confirmed to be in the visible set, same server-side
  // check whether someone clicked a real link or just typed a guess.
  if (date) {
    if (!visible.has(date)) redirect("/team/order-of-service");
    const items = await getOosItems(date);
    return (
      <div>
        <TeamHeader name={session.name} />
        <Link href="/team/order-of-service" className="mb-3 inline-block text-sm font-bold text-accent-strong">
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
      <TeamHeader name={session.name} />
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
                <Link href={`/team/order-of-service?date=${d.date}`} className="flex-none text-xs font-bold text-good">
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
