import { getSoundBoothDates, getSoundBoothRoster } from "@/lib/sound-booth/queries";
import { ScheduleGrid } from "./schedule-grid";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [dates, roster] = await Promise.all([getSoundBoothDates(), getSoundBoothRoster()]);

  return (
    <div>
      <h2 className="text-lg font-bold">Sound Booth</h2>
      <p className="mt-0.5 max-w-2xl text-sm text-text-muted">
        Click any cell to assign, reassign, leave it blank, or add someone new to the roster — the
        column on the right shows anyone who&rsquo;s said they can help or that they&rsquo;re unavailable.
      </p>
      <ScheduleGrid dates={dates} roster={roster} />
    </div>
  );
}
