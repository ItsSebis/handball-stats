"use client";

import { useActionState } from "react";
import { closeGame } from "./actions";

export function CloseGameForm({ gameId }: { gameId: string }) {
  const [error, formAction, pending] = useActionState(closeGame, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="gameId" value={gameId} />
      <div className="flex items-center gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Eigene Tore
          <input
            name="ownScore"
            type="number"
            min={0}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Gegner Tore
          <input
            name="opponentScore"
            type="number"
            min={0}
            required
            className="rounded border px-3 py-2"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Wird beendet…" : "Spiel beenden"}
      </button>
    </form>
  );
}
