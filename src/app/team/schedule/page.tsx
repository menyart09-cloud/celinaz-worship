import { redirect } from "next/navigation";
import { getTeamSession } from "@/lib/sound-booth/team-session";
import { getSoundBoothDates } from "@/lib/sound-booth/queries";
import { TeamSchedule } from "./team-schedule";
import { TeamHeader } from "../team-header";

export const dynamic = "force-dynamic";

export default async function TeamSchedulePage() {
  const session = await getTeamSession();
  if (!session) redirect("/team");

  const dates = await getSoundBoothDates();

  return (
    <div>
      <TeamHeader name={session.name} />
      <TeamSchedule dates={dates} viewerId={session.rosterId} />
    </div>
  );
}
