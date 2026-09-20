"use client";

import { useActionState } from "react";
import { createSeason } from "./actions";

export function CreateSeasonForm() {
  const [error, formAction, pending] = useActionState(createSeason, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input
        name="label"
        type="text"
        placeholder="Bezeichnung (z.B. 2025/26)"
        required
        className="rounded border px-3 py-2"
      />
      <label className="flex flex-col gap-1 text-sm">
        Start
        <input name="startDate" type="date" required className="rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Ende
        <input name="endDate" type="date" required className="rounded border px-3 py-2" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Wird erstellt…" : "Saison erstellen"}
      </button>
    </form>
  );
}
