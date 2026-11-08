import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/sound-booth/team-session";
import { getSoundBoothDates } from "@/lib/sound-booth/queries";
import { TeamSchedule } from "./team-schedule";
import { teamSignOutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function TeamSchedulePage() {
  const session = await getTeamSession();
  if (!session) redirect("/team");

  const dates = await getSoundBoothDates();

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-text-muted">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent-strong text-[0.66rem] font-bold text-white">
          {session.name[0]}
        </span>
        Signed in as {session.name}
        <form action={teamSignOutAction} className="ml-auto">
          <button type="submit" className="text-xs font-semibold text-text-muted underline decoration-dotted underline-offset-2">
            Sign out
          </button>
        </form>
      </div>
      <TeamSchedule dates={dates} viewerId={session.rosterId} />
    </div>
  );
}
