"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function login(_prevState: string | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-Mail-Adresse oder Passwort ist falsch.";
    }
    throw error;
  }
}
