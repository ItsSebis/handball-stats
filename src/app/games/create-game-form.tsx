"use client";

import { useActionState } from "react";
import { createGame } from "./actions";

type Season = { id: string; label: string };
type Player = { id: string; name: string };

function PlayerChecklist({ title, players }: { title: string; players: Player[] }) {
  return (
    <div>
      <h2 className="font-medium">{title}</h2>
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            <label className="flex items-center gap-3 py-2">
              <input type="checkbox" name={`present_${player.id}`} defaultChecked className="h-5 w-5" />
              {player.name}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CreateGameForm({
  seasons,
  fieldPlayers,
  keepers,
}: {
  seasons: Season[];
  fieldPlayers: Player[];
  keepers: Player[];
}) {
  const [error, formAction, pending] = useActionState(createGame, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Saison
        <select name="seasonId" required className="rounded border px-3 py-2">
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Gegner
        <input name="opponentName" type="text" required className="rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Datum
        <input name="date" type="date" required className="rounded border px-3 py-2" />
      </label>

      <div className="flex flex-col gap-4 text-sm">
        <PlayerChecklist title="Feldspieler" players={fieldPlayers} />
        <PlayerChecklist title="Torhüter" players={keepers} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Wird erstellt…" : "Spiel erstellen"}
      </button>
    </form>
  );
}
