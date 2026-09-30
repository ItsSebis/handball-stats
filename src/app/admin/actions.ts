"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/password";

const UNIQUE_VIOLATION = "23505";

export async function updateCoach(_prevState: string | undefined, formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) return "Nicht angemeldet.";

  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "COACH";

  if (!email.includes("@")) return "Bitte eine gültige E-Mail-Adresse angeben.";

  try {
    const [updated] = await db
      .update(users)
      .set({ email, role })
      .where(and(eq(users.id, userId), eq(users.role, "COACH")))
      .returning({ id: users.id });
    if (!updated) return "Konto nicht gefunden.";
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    if (cause?.code === UNIQUE_VIOLATION) {
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    }
    console.error("updateCoach: failed to update user", error);
    return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  }

  revalidatePath("/admin");
}

export async function resetCoachPassword(_prevState: string | undefined, formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) return "Nicht angemeldet.";

  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) return "Passwort muss mindestens 8 Zeichen haben.";

  const passwordHash = await hashPassword(newPassword);

  try {
    const [updated] = await db
      .update(users)
      .set({ passwordHash })
      .where(and(eq(users.id, userId), eq(users.role, "COACH")))
      .returning({ id: users.id });
    if (!updated) return "Konto nicht gefunden.";
  } catch (error) {
    console.error("resetCoachPassword: failed to update password", error);
    return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  }
}
