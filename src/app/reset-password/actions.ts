"use server";

import { redirect } from "next/navigation";
import { resetPasswordWithToken } from "@/lib/auth-token";
import { hashPassword } from "@/lib/password";

export async function resetPassword(_prevState: string | undefined, formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) return "Passwort muss mindestens 8 Zeichen haben.";

  const passwordHash = await hashPassword(newPassword);
  const ok = await resetPasswordWithToken(token, passwordHash);
  if (!ok) return "Link ungültig oder abgelaufen.";

  redirect("/login");
}
