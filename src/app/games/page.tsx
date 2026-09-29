import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
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

  const activeRoster = await db
    .select({ id: players.id, name: players.name, type: players.type })
    .from(players)
    .where(and(eq(players.teamId, team.id), eq(players.active, true)));
  const fieldPlayers = activeRoster.filter((player) => player.type === "FIELD");
  const keepers = activeRoster.filter((player) => player.type === "KEEPER");

  const teamGames = await db
    .select({
      id: games.id,
      opponentName: games.opponentName,
      date: games.date,
      seasonLabel: seasons.label,
      ownScore: games.ownScore,
      opponentScore: games.opponentScore,
    })
    .from(games)
    .innerJoin(seasons, eq(games.seasonId, seasons.id))
    .where(eq(games.teamId, team.id))
    .orderBy(desc(games.date));

  let content;
  if (teamSeasons.length === 0) {
    content = (
      <p className="text-sm">
        Bitte zuerst eine{" "}
        <Link href="/seasons" className="underline">
          Saison anlegen
        </Link>
        .
      </p>
    );
  } else if (activeRoster.length === 0) {
    content = (
      <p className="text-sm">
        Bitte zuerst den{" "}
        <Link href="/roster" className="underline">
          Kader importieren
        </Link>
        .
      </p>
    );
  } else {
    content = <CreateGameForm seasons={teamSeasons} fieldPlayers={fieldPlayers} keepers={keepers} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader title="Spiele" backHref="/dashboard" />

      <div className="flex w-full flex-col items-center gap-8 px-4 py-8">
        <ul className="flex w-full max-w-sm flex-col gap-1 text-sm">
          {teamGames.map((game) => (
            <li key={game.id}>
              <Link href={`/games/${game.id}`} className="underline">
                {game.date} – {game.opponentName} ({game.seasonLabel})
                {game.ownScore !== null && game.opponentScore !== null && ` – ${game.ownScore}:${game.opponentScore}`}
              </Link>
            </li>
          ))}
        </ul>

        {content}
      </div>
    </main>
  );
}
