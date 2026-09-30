import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameParticipations, games, playerGameStats, players, seasons } from "@/db/schema";
import type { Participant } from "./[gameId]/participant";

export type GameTally = { fieldPlayers: Participant[]; keepers: Participant[] };

// NOT team-scoped — callers must independently verify the game belongs to the current team
// before calling this. Callers: games/[gameId]/page.tsx (its own team-scoped lookup above its
// call site) and dashboard/page.tsx (via getMostRecentGame(team.id) below).
export async function getGameTally(gameId: string): Promise<GameTally> {
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
    .where(and(eq(gameParticipations.gameId, gameId), eq(gameParticipations.present, true)));

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

  return {
    fieldPlayers: participants.filter((p) => p.type === "FIELD"),
    keepers: participants.filter((p) => p.type === "KEEPER"),
  };
}

export type MostRecentGame = {
  id: string;
  opponentName: string;
  date: string;
  seasonLabel: string;
  ownScore: number | null;
  opponentScore: number | null;
};

// Used by the Phase 10 home page dashboard widget (dashboard/page.tsx, Task 5).
export async function getMostRecentGame(teamId: string): Promise<MostRecentGame | null> {
  const [game] = await db
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
    .where(eq(games.teamId, teamId))
    .orderBy(desc(games.date))
    .limit(1);

  return game ?? null;
}
