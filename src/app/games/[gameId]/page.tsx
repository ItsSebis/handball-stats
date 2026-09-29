import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { gameParticipations, games, playerGameStatEvents, playerGameStats, players, seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { isUuid } from "@/lib/uuid";
import { CloseGameForm } from "./close-game-form";
import { EventLog, type GameEventLogEntry } from "./event-log";
import { LiveGameView } from "./live-game-view";
import type { Participant } from "./participant";
import { TallyTable } from "./tally-table";

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

  const participants: (Participant & { type: "FIELD" | "KEEPER" })[] = rows.map((row) => ({
    gameParticipationId: row.gameParticipationId,
    name: row.name,
    type: row.type,
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
  }));

  const fieldPlayers = participants.filter((p) => p.type === "FIELD");
  const keepers = participants.filter((p) => p.type === "KEEPER");
  const showDiscipline = process.env.HIDE_DISCIPLINE_STATS !== "true";

  const eventLogRows = await db
    .select({
      id: playerGameStatEvents.id,
      eventType: playerGameStatEvents.eventType,
      undone: playerGameStatEvents.undone,
      createdAt: playerGameStatEvents.createdAt,
      playerName: players.name,
    })
    .from(playerGameStatEvents)
    .innerJoin(gameParticipations, eq(playerGameStatEvents.gameParticipationId, gameParticipations.id))
    .innerJoin(players, eq(gameParticipations.playerId, players.id))
    .where(eq(gameParticipations.gameId, game.id))
    .orderBy(desc(playerGameStatEvents.createdAt));

  const eventLog: GameEventLogEntry[] = eventLogRows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    undone: row.undone,
    createdAt: row.createdAt,
    playerName: row.playerName,
  }));

  return (
    <main className="flex min-h-screen flex-col items-center">
      <PageHeader
        title={game.opponentName}
        description={`${game.date} · ${game.seasonLabel}`}
        backHref="/games"
        actions={isClosed ? <Badge>{`${game.ownScore}:${game.opponentScore}`}</Badge> : undefined}
      />

      <div className="flex w-full flex-1 flex-col items-center gap-6 px-4 py-4">
        {isClosed ? (
          <div className="flex w-full max-w-sm flex-col gap-6">
            <TallyTable fieldPlayers={fieldPlayers} keepers={keepers} showDiscipline={showDiscipline} />
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Verlauf anzeigen</summary>
              <div className="mt-2">
                <EventLog entries={eventLog} closed />
              </div>
            </details>
          </div>
        ) : (
          <>
            <LiveGameView
              fieldPlayers={fieldPlayers}
              keepers={keepers}
              showDiscipline={showDiscipline}
              eventLog={eventLog}
            />
            <CloseGameForm gameId={game.id} />
          </>
        )}
      </div>
    </main>
  );
}
