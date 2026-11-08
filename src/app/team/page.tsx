import { getSoundBoothRosterNames } from "@/lib/sound-booth/queries";
import { TeamSignIn } from "./team-sign-in";

export const dynamic = "force-dynamic";

export default async function TeamSignInPage() {
  const names = await getSoundBoothRosterNames();
  return <TeamSignIn names={names} />;
}
