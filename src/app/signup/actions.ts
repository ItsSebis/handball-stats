"use server";

import { eq } from "drizzle-orm";
import { signIn } from "@/auth";
import { db } from "@/db";
import { teams, users } from "@/db/schema";
import { createAuthToken } from "@/lib/auth-token";
import { sendVerificationEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";

const UNIQUE_VIOLATION = "23505";

export async function signup(_prevState: string | undefined, formData: FormData) {
  const teamName = String(formData.get("teamName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!teamName || !email.includes("@") || password.length < 8) {
    return "Bitte Teamname, gültige E-Mail-Adresse und ein Passwort mit mindestens 8 Zeichen angeben.";
  }

  const passwordHash = await hashPassword(password);

  // drizzle-orm/neon-http does not support db.transaction(); insert
  // sequentially and roll back the user manually if the team insert fails.
  let userId: string;
  try {
    const [user] = await db.insert(users).values({ email, passwordHash }).returning();
    userId = user.id;
  } catch (error) {
    // drizzle-orm wraps the driver's NeonDbError in a DrizzleQueryError,
    // putting the actual Postgres error (with .code) on `.cause`.
    const cause = (error as { cause?: { code?: string } }).cause;
    if (cause?.code === UNIQUE_VIOLATION) {
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    }
    console.error("signup: failed to insert user", error);
    return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  }

  try {
    await db.insert(teams).values({ userId, name: teamName });
  } catch (error) {
    console.error("signup: failed to insert team, rolling back user", error);
    await db.delete(users).where(eq(users.id, userId));
    return "Team konnte nicht erstellt werden. Bitte erneut versuchen.";
  }

  // Best-effort: verification is informational only (see docs/OPEN_QUESTIONS.md), so a failure
  // to create the token shouldn't stop the new coach from being signed in. sendVerificationEmail
  // itself never throws (see src/lib/email.ts), so this only ever guards createAuthToken.
  try {
    const verificationToken = await createAuthToken(userId, "EMAIL_VERIFICATION");
    await sendVerificationEmail(email, verificationToken);
  } catch (error) {
    console.error("signup: failed to issue verification token", error);
  }

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}
