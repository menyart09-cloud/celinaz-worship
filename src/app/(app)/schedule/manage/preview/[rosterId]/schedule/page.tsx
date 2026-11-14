import { notFound, redirect } from "next/navigation";
import { getSoundBoothDates } from "@/lib/sound-booth/queries";
import { getGroupsForRoster, getRosterMemberName } from "@/lib/team-groups";
import { TeamSchedule } from "@/app/team/schedule/team-schedule";
import { PreviewHeader } from "../preview-header";

export const dynamic = "force-dynamic";

export default async function PreviewSchedulePage({ params }: { params: Promise<{ rosterId: string }> }) {
  const { rosterId } = await params;
  const name = await getRosterMemberName(rosterId);
  if (!name) notFound();

  const groups = await getGroupsForRoster(rosterId);
  if (!groups.has("sound_booth")) redirect(`/schedule/manage/preview/${rosterId}/order-of-service`);

  const dates = await getSoundBoothDates();

  return (
    <div>
      <PreviewHeader rosterId={rosterId} name={name} groups={[...groups]} />
      <TeamSchedule dates={dates} viewerId={rosterId} readOnly />
    </div>
  );
}
