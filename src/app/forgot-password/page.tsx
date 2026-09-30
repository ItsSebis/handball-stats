"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [message, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Passwort vergessen</h1>
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="E-Mail"
          required
          className="rounded border px-3 py-2"
        />
        {message && <p className="text-sm">{message}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Wird gesendet…" : "Link zum Zurücksetzen senden"}
        </button>
      </form>
      <p className="text-sm">
        <Link href="/login" className="underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </main>
  );
}
