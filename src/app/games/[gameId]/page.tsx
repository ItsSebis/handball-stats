import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { gameParticipations, games, playerGameStats, players, seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { isUuid } from "@/lib/uuid";
import { CloseGameForm } from "./close-game-form";
import { PlayerStatCard } from "./player-stat-card";

export default async function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const team = await getCurrentTeam();
  if (!team) redirect("/login");

  const { gameId } = await params;
  if (!isUuid(gameId)) notFound();

  const [game] = await db
    .select({
      id: games.id,
      opponentName: games.opponentName,
      date: games.date,
      ownScore: games.ownScore,
      opponentScore: games.opponentScore,
      seasonLabel: seasons.label,
    })
    .from(games)
    .innerJoin(seasons, eq(games.seasonId, seasons.id))
    .where(and(eq(games.id, gameId), eq(games.teamId, team.id)));
  if (!game) notFound();

  const isClosed = game.ownScore !== null && game.opponentScore !== null;

  const rows = await db
    .select({
      gameParticipationId: gameParticipations.id,
      name: players.name,
      type: players.type,
      shotsRegular: playerGameStats.shotsRegular,
      goalsRegular: playerGameStats.goalsRegular,
      shots7m: playerGameStats.shots7m,
      goals7m: playerGameStats.goals7m,
      shotsFacedRegular: playerGameStats.shotsFacedRegular,
      savesRegular: playerGameStats.savesRegular,
      shotsFaced7m: playerGameStats.shotsFaced7m,
      saves7m: playerGameStats.saves7m,
      twoMinPenalties: playerGameStats.twoMinPenalties,
      yellowCard: playerGameStats.yellowCard,
      redCard: playerGameStats.redCard,
    })
    .from(gameParticipations)
    .innerJoin(players, eq(gameParticipations.playerId, players.id))
    .leftJoin(playerGameStats, eq(playerGameStats.gameParticipationId, gameParticipations.id))
    .where(and(eq(gameParticipations.gameId, game.id), eq(gameParticipations.present, true)));

  const participants = rows.map((row) => ({
    gameParticipationId: row.gameParticipationId,
    name: row.name,
    type: row.type,
    counts: {
      shotsRegular: row.shotsRegular ?? 0,
      goalsRegular: row.goalsRegular ?? 0,
      shots7m: row.shots7m ?? 0,
      goals7m: row.goals7m ?? 0,
      shotsFacedRegular: row.shotsFacedRegular ?? 0,
      savesRegular: row.savesRegular ?? 0,
      shotsFaced7m: row.shotsFaced7m ?? 0,
      saves7m: row.saves7m ?? 0,
      twoMinPenalties: row.twoMinPenalties ?? 0,
      yellowCard: row.yellowCard ?? false,
      redCard: row.redCard ?? false,
    },
  }));

  const fieldPlayers = participants.filter((p) => p.type === "FIELD");
  const keepers = participants.filter((p) => p.type === "KEEPER");

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-8">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{game.opponentName}</h1>
        <p className="text-sm text-muted-foreground">
          {game.date} · {game.seasonLabel}
        </p>
        {isClosed && <p className="text-lg font-medium">Endstand: {game.ownScore}:{game.opponentScore}</p>}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="font-medium">Feldspieler</h2>
          {fieldPlayers.map((player) => (
            <PlayerStatCard key={player.gameParticipationId} {...player} closed={isClosed} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <h2 className="font-medium">Torhüter</h2>
          {keepers.map((player) => (
            <PlayerStatCard key={player.gameParticipationId} {...player} closed={isClosed} />
          ))}
        </div>
      </div>

      {!isClosed && <CloseGameForm gameId={game.id} />}
    </main>
  );
}
