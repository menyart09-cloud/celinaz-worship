import { getPraiseTeamDates, getPraiseTeamRosterNames } from "@/lib/praise-team/queries";
import { PraiseTeamGrid } from "./praise-team-grid";

export const dynamic = "force-dynamic";

export default async function PraiseTeamPage() {
  const [dates, roster] = await Promise.all([getPraiseTeamDates(), getPraiseTeamRosterNames()]);

  return (
    <div>
      <h2 className="text-lg font-bold">Praise Team</h2>
      <p className="mt-0.5 max-w-2xl text-sm text-text-muted">
        Add a date, then add whoever&rsquo;s singing — there&rsquo;s no fixed slots like Sound Booth, just
        a list of singers for each date. Click a name to remove them.
      </p>
      <PraiseTeamGrid dates={dates} roster={roster} />
    </div>
  );
}
