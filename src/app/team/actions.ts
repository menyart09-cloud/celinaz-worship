"use server";

import { redirect } from "next/navigation";
import { signInTeamMemberAction, signOutTeamMemberAction } from "@/lib/sound-booth/actions";
import { getTeamSession } from "@/lib/sound-booth/team-session";
import { getGroupsForRoster } from "@/lib/team-groups";

export async function teamSignInAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!name) return { error: "Pick who you are first." };
  const result = await signInTeamMemberAction(name, pin);
  if (!result.ok) return { error: result.error ?? "Sign-in failed." };

  // Land on whichever schedule this person actually belongs to — someone
  // on Praise Team only should never land on an empty Sound Booth view.
  const session = await getTeamSession();
  const groups = session ? await getGroupsForRoster(session.rosterId) : new Set();
  if (groups.has("sound_booth")) redirect("/team/schedule");
  if (groups.has("praise_team")) redirect("/team/praise-team");
  redirect("/team/order-of-service");
}

export async function teamSignOutAction() {
  await signOutTeamMemberAction();
  redirect("/team");
}
