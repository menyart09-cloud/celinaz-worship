import { notFound, redirect } from "next/navigation";
import { getPraiseTeamDates } from "@/lib/praise-team/queries";
import { getGroupsForRoster, getRosterMemberName } from "@/lib/team-groups";
import { TeamPraiseTeam } from "@/app/team/praise-team/team-praise-team";
import { PreviewHeader } from "../preview-header";

export const dynamic = "force-dynamic";

export default async function PreviewPraiseTeamPage({ params }: { params: Promise<{ rosterId: string }> }) {
  const { rosterId } = await params;
  const name = await getRosterMemberName(rosterId);
  if (!name) notFound();

  const groups = await getGroupsForRoster(rosterId);
  if (!groups.has("praise_team")) redirect(`/schedule/manage/preview/${rosterId}/order-of-service`);

  const dates = await getPraiseTeamDates();

  return (
    <div>
      <PreviewHeader rosterId={rosterId} name={name} groups={[...groups]} />
      <TeamPraiseTeam dates={dates} viewerId={rosterId} readOnly />
    </div>
  );
}
