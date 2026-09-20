"use client";

import { useActionState } from "react";
import { importPlayers } from "./actions";

export function ImportPlayersForm() {
  const [error, formAction, pending] = useActionState(importPlayers, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Feldspieler (ein Name pro Zeile)
        <textarea
          name="fieldPlayers"
          rows={6}
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Torhüter (ein Name pro Zeile)
        <textarea name="keepers" rows={6} className="rounded border px-3 py-2" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Wird importiert…" : "Importieren"}
      </button>
    </form>
  );
}
