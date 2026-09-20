"use server";

import { db } from "@/db";
import { teams, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/auth";

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

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ email, passwordHash }).returning();
      await tx.insert(teams).values({ userId: user.id, name: teamName });
    });
  } catch {
    return "Diese E-Mail-Adresse wird bereits verwendet.";
  }

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}
