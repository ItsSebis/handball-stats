import { Resend } from "resend";

const FROM_ADDRESS = "stats@mail.sebis.net";

function getBaseUrl(): string {
  // VERCEL_PROJECT_PRODUCTION_URL is the stable production domain; VERCEL_URL is the individual
  // deployment's URL, which for Preview/other non-production deployments can sit behind Vercel's
  // Authentication wall and isn't reachable by an email recipient.
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (host) return `https://${host}`;
  return "http://localhost:3000";
}

// Both send functions are best-effort: a Resend outage (or a missing RESEND_API_KEY, e.g. in
// local dev) shouldn't break signup or a password-reset request, so the client is created lazily
// here (the SDK throws synchronously in its constructor if the key is empty) and every failure —
// thrown or returned as `{ error }` by the SDK, which does not throw on API-level failures — is
// caught and logged, never allowed to propagate.
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) console.error("sendEmail: Resend API error", error);
  } catch (error) {
    console.error("sendEmail: failed to send", error);
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${getBaseUrl()}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Bestätige deine E-Mail-Adresse",
    `<p>Willkommen bei Handball Stats! Bitte bestätige deine E-Mail-Adresse:</p><p><a href="${link}">${link}</a></p>`,
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${getBaseUrl()}/reset-password?token=${token}`;
  await sendEmail(
    to,
    "Passwort zurücksetzen",
    `<p>Du hast angefordert, dein Passwort zurückzusetzen. Der Link ist eine Stunde gültig:</p><p><a href="${link}">${link}</a></p><p>Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>`,
  );
}
