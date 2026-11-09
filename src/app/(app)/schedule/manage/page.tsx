import { getRosterWithGroups } from "@/lib/team-groups";
import { ManageRoster } from "./manage-roster";

export const dynamic = "force-dynamic";

export default async function ScheduleManagePage() {
  const roster = await getRosterWithGroups();

  return (
    <div>
      <h2 className="text-lg font-bold">Manage Members</h2>
      <p className="mt-0.5 max-w-2xl text-sm text-text-muted">
        Choose a PIN for each person yourself (plenty of folks just use their birthday), save their
        number once, then &ldquo;Text it&rdquo; hands off to whatever texting app is already set up on
        this device — everything already filled in, no retyping, no copy/paste. Sound Booth and
        Praise Team checkboxes decide which schedule(s) show up on their phone once they sign in.
      </p>
      <ManageRoster roster={roster} />
    </div>
  );
}
