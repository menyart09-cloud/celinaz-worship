import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/sound-booth/team-session";
import { getPraiseTeamDates } from "@/lib/praise-team/queries";
import { getGroupsForRoster } from "@/lib/team-groups";
import { TeamPraiseTeam } from "./team-praise-team";
import { TeamHeader } from "../team-header";

export const dynamic = "force-dynamic";

export default async function TeamPraiseTeamPage() {
  const session = await getTeamSession();
  if (!session) redirect("/team");

  const groups = await getGroupsForRoster(session.rosterId);
  if (!groups.has("praise_team")) redirect("/team/order-of-service");

  const dates = await getPraiseTeamDates();

  return (
    <div>
      <TeamHeader name={session.name} groups={[...groups]} />
      <TeamPraiseTeam dates={dates} viewerId={session.rosterId} />
    </div>
  );
}
