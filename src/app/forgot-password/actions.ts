"use server";

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createAuthToken } from "@/lib/auth-token";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE = "Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail zum Zurücksetzen verschickt.";

export async function requestPasswordReset(_prevState: string | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      const token = await createAuthToken(user.id, "PASSWORD_RESET");
      // Deferred to after the response is sent: the Resend network round-trip is by far the
      // slowest step here, and awaiting it only on the "account exists" branch would otherwise
      // let a response-time difference reveal whether the address has an account.
      after(() => sendPasswordResetEmail(user.email, token));
    }
  } catch (error) {
    console.error("requestPasswordReset: failed to process reset request", error);
  }

  // Always the same message, whether or not the account exists (and regardless of any error
  // above), so this can't be used to enumerate which email addresses have accounts.
  return GENERIC_MESSAGE;
}
