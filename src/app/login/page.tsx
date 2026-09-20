"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Anmelden</h1>
      <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="E-Mail"
          required
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Passwort"
          required
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Wird angemeldet…" : "Anmelden"}
        </button>
      </form>
      <p className="text-sm">
        Noch kein Team?{" "}
        <Link href="/signup" className="underline">
          Registrieren
        </Link>
      </p>
    </main>
  );
}
