import { notFound, redirect } from "next/navigation";
import { getGroupsForRoster, getRosterMemberName } from "@/lib/team-groups";

export const dynamic = "force-dynamic";

// Lands on whichever tab this person would actually land on after signing
// in for real — same priority as teamSignInAction.
export default async function PreviewRootPage({ params }: { params: Promise<{ rosterId: string }> }) {
  const { rosterId } = await params;
  const name = await getRosterMemberName(rosterId);
  if (!name) notFound();

  const groups = await getGroupsForRoster(rosterId);
  if (groups.has("sound_booth")) redirect(`/schedule/manage/preview/${rosterId}/schedule`);
  if (groups.has("praise_team")) redirect(`/schedule/manage/preview/${rosterId}/praise-team`);
  redirect(`/schedule/manage/preview/${rosterId}/order-of-service`);
}
