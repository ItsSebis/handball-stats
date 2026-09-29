import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { games, players, seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { CreateGameForm } from "./create-game-form";

export default async function GamesPage() {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  const teamSeasons = await db
    .select({ id: seasons.id, label: seasons.label })
    .from(seasons)
    .where(eq(seasons.teamId, team.id));

  const roster = await db
    .select({ id: players.id, name: players.name, type: players.type, active: players.active })
    .from(players)
    .where(eq(players.teamId, team.id));
  const activeRoster = roster.filter((player) => player.active);
  const fieldPlayers = activeRoster.filter((player) => player.type === "FIELD");
  const keepers = activeRoster.filter((player) => player.type === "KEEPER");

  const teamGames = await db
    .select({
      id: games.id,
      seasonId: games.seasonId,
      opponentName: games.opponentName,
      date: games.date,
    })
    .from(games)
    .where(eq(games.teamId, team.id))
    .orderBy(desc(games.date));

  const seasonLabelById = new Map(teamSeasons.map((season) => [season.id, season.label]));

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Spiele</h1>

      <ul className="flex w-full max-w-sm flex-col gap-1 text-sm">
        {teamGames.map((game) => (
          <li key={game.id}>
            {game.date} – {game.opponentName} ({seasonLabelById.get(game.seasonId) ?? "?"})
          </li>
        ))}
      </ul>

      {teamSeasons.length === 0 ? (
        <p className="text-sm">
          Bitte zuerst eine{" "}
          <Link href="/seasons" className="underline">
            Saison anlegen
          </Link>
          .
        </p>
      ) : fieldPlayers.length === 0 && keepers.length === 0 ? (
        <p className="text-sm">
          Bitte zuerst den{" "}
          <Link href="/roster" className="underline">
            Kader importieren
          </Link>
          .
        </p>
      ) : (
        <CreateGameForm seasons={teamSeasons} fieldPlayers={fieldPlayers} keepers={keepers} />
      )}
    </main>
  );
}
