"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type ChangePasswordState = { error: string | null; success: boolean };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You're not signed in.", success: false };
  }

  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof newPassword !== "string" || typeof confirmPassword !== "string") {
    return { error: "Something went wrong. Please try again.", success: false };
  }

  if (newPassword.length < 8) {
    return { error: "New password needs to be at least 8 characters.", success: false };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match.", success: false };
  }

  // Being signed in at all is the proof needed here -- this exists
  // specifically for "I don't remember my password," so it can't also
  // require that password.
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, session.user.id));

  return { error: null, success: true };
}
