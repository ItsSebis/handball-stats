"use client";

import { useActionState, useState } from "react";
import { resetPassword } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, formAction, pending] = useActionState(resetPassword, undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input
        name="newPassword"
        type="password"
        placeholder="Neues Passwort"
        minLength={8}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="rounded border px-3 py-2"
      />
      <input
        type="password"
        placeholder="Passwort bestätigen"
        minLength={8}
        required
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        className="rounded border px-3 py-2"
      />
      {mismatch && <p className="text-sm text-red-600">Passwörter stimmen nicht überein.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || mismatch || password.length < 8}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Wird gespeichert…" : "Passwort speichern"}
      </button>
    </form>
  );
}
