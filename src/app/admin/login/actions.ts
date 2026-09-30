"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";

export async function adminLogin(_prevState: string | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  const validCredentials = user && (await verifyPassword(password, user.passwordHash));

  if (!validCredentials) {
    return "E-Mail-Adresse oder Passwort ist falsch.";
  }
  if (user.role !== "ADMIN") {
    return "Kein Admin-Konto.";
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-Mail-Adresse oder Passwort ist falsch.";
    }
    throw error;
  }
}
