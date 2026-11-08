"use server";

import { redirect } from "next/navigation";
import { signInTeamMemberAction, signOutTeamMemberAction } from "@/lib/sound-booth/actions";

export async function teamSignInAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!name) return { error: "Pick who you are first." };
  const result = await signInTeamMemberAction(name, pin);
  if (!result.ok) return { error: result.error ?? "Sign-in failed." };
  redirect("/team/schedule");
}

export async function teamSignOutAction() {
  await signOutTeamMemberAction();
  redirect("/team");
}
