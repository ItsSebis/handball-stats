"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createAuthToken } from "@/lib/auth-token";
import { sendEmailChangeConfirmation } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";

const UNIQUE_VIOLATION = "23505";

export async function changePassword(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user) return "Nicht angemeldet.";

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) return "Passwort muss mindestens 8 Zeichen haben.";

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id));
  if (!user) return "Nicht angemeldet.";

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return "Aktuelles Passwort ist falsch.";

  const passwordHash = await hashPassword(newPassword);

  try {
    await db.update(users).set({ passwordHash }).where(eq(users.id, session.user.id));
  } catch (error) {
    console.error("changePassword: failed to update password", error);
    return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  }
}

export async function changeEmail(_prevState: string | undefined, formData: FormData) {
  const session = await auth();
  if (!session?.user) return "Nicht angemeldet.";

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newEmail = String(formData.get("newEmail") ?? "")
    .trim()
    .toLowerCase();

  if (!newEmail.includes("@")) return "Bitte eine gültige E-Mail-Adresse angeben.";

  const [user] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id));
  if (!user) return "Nicht angemeldet.";

  if (newEmail === user.email) return "Das ist bereits deine E-Mail-Adresse.";

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return "Aktuelles Passwort ist falsch.";

  try {
    await db
      .update(users)
      .set({ email: newEmail, emailVerifiedAt: null })
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    if (cause?.code === UNIQUE_VIOLATION) {
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    }
    console.error("changeEmail: failed to update email", error);
    return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  }

  revalidatePath("/settings");

  // Best-effort, same as signup's verification email (see docs/OPEN_QUESTIONS.md): the email
  // change has already been applied above, so a failure here shouldn't undo it or block the user.
  try {
    const token = await createAuthToken(session.user.id, "EMAIL_VERIFICATION");
    after(() => sendEmailChangeConfirmation(newEmail, token));
  } catch (error) {
    console.error("changeEmail: failed to issue confirmation token", error);
  }
}
