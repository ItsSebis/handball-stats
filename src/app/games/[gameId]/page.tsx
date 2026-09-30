import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { gameParticipations, games, playerGameStatEvents, players, seasons } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { isUuid } from "@/lib/uuid";
import { getGameTally } from "../queries";
import { TallyTable } from "../tally-table";
import { CloseGameForm } from "./close-game-form";
import { EventLog, type GameEventLogEntry } from "./event-log";
import { LiveGameView } from "./live-game-view";

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

  const { fieldPlayers, keepers } = await getGameTally(game.id);
  const showDiscipline = process.env.HIDE_DISCIPLINE_STATS !== "true";

  const eventLog: GameEventLogEntry[] = await db
    .select({
      id: playerGameStatEvents.id,
      gameParticipationId: playerGameStatEvents.gameParticipationId,
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
                <EventLog entries={eventLog} />
              </div>
            </details>
          </div>
        ) : (
          <>
            <LiveGameView
              gameId={game.id}
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
