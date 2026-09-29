"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { gameParticipations, games, playerGameStats, players } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";

type CounterEvent =
  | "SHOT_REGULAR_GOAL"
  | "SHOT_REGULAR_MISS"
  | "SHOT_7M_GOAL"
  | "SHOT_7M_MISS"
  | "SAVE_REGULAR"
  | "GOAL_CONCEDED_REGULAR"
  | "SAVE_7M"
  | "GOAL_CONCEDED_7M"
  | "TWO_MIN_PENALTY";

type CardEvent = "YELLOW_CARD" | "RED_CARD";

export type StatEvent = CounterEvent | CardEvent;

type CounterColumn =
  | "shotsRegular"
  | "goalsRegular"
  | "shots7m"
  | "goals7m"
  | "shotsFacedRegular"
  | "savesRegular"
  | "shotsFaced7m"
  | "saves7m"
  | "twoMinPenalties";

const COUNTER_EVENTS: Record<
  CounterEvent,
  { playerType: "FIELD" | "KEEPER" | null; columns: CounterColumn[] }
> = {
  SHOT_REGULAR_GOAL: { playerType: "FIELD", columns: ["shotsRegular", "goalsRegular"] },
  SHOT_REGULAR_MISS: { playerType: "FIELD", columns: ["shotsRegular"] },
  SHOT_7M_GOAL: { playerType: "FIELD", columns: ["shots7m", "goals7m"] },
  SHOT_7M_MISS: { playerType: "FIELD", columns: ["shots7m"] },
  SAVE_REGULAR: { playerType: "KEEPER", columns: ["shotsFacedRegular", "savesRegular"] },
  GOAL_CONCEDED_REGULAR: { playerType: "KEEPER", columns: ["shotsFacedRegular"] },
  SAVE_7M: { playerType: "KEEPER", columns: ["shotsFaced7m", "saves7m"] },
  GOAL_CONCEDED_7M: { playerType: "KEEPER", columns: ["shotsFaced7m"] },
  TWO_MIN_PENALTY: { playerType: null, columns: ["twoMinPenalties"] },
};

const CARD_EVENTS: Record<CardEvent, "yellowCard" | "redCard"> = {
  YELLOW_CARD: "yellowCard",
  RED_CARD: "redCard",
};

function isCardEvent(event: StatEvent): event is CardEvent {
  return event === "YELLOW_CARD" || event === "RED_CARD";
}

export async function recordEvent(gameParticipationId: string, event: StatEvent) {
  const team = await getCurrentTeam();
  if (!team) return;

  const [participation] = await db
    .select({
      gameId: gameParticipations.gameId,
      playerType: players.type,
      ownScore: games.ownScore,
      opponentScore: games.opponentScore,
    })
    .from(gameParticipations)
    .innerJoin(games, eq(gameParticipations.gameId, games.id))
    .innerJoin(players, eq(gameParticipations.playerId, players.id))
    .where(and(eq(gameParticipations.id, gameParticipationId), eq(games.teamId, team.id)));

  if (!participation) return;
  if (participation.ownScore !== null && participation.opponentScore !== null) return;

  if (isCardEvent(event)) {
    const column = CARD_EVENTS[event];
    await db
      .insert(playerGameStats)
      .values({ gameParticipationId, [column]: true })
      .onConflictDoUpdate({
        target: playerGameStats.gameParticipationId,
        set: { [column]: true },
      });
  } else {
    const { playerType, columns } = COUNTER_EVENTS[event];
    if (playerType && playerType !== participation.playerType) return;

    const insertValues = Object.fromEntries(columns.map((column) => [column, 1]));
    const updateSet = Object.fromEntries(
      columns.map((column) => [column, sql`${playerGameStats[column]} + 1`]),
    );
    await db
      .insert(playerGameStats)
      .values({ gameParticipationId, ...insertValues })
      .onConflictDoUpdate({ target: playerGameStats.gameParticipationId, set: updateSet });
  }

  revalidatePath(`/games/${participation.gameId}`);
}

export async function closeGame(_prevState: string | undefined, formData: FormData) {
  const team = await getCurrentTeam();
  if (!team) return "Nicht angemeldet.";

  const gameId = String(formData.get("gameId") ?? "");
  const ownScoreRaw = String(formData.get("ownScore") ?? "");
  const opponentScoreRaw = String(formData.get("opponentScore") ?? "");
  const ownScore = Number(ownScoreRaw);
  const opponentScore = Number(opponentScoreRaw);

  if (
    !gameId ||
    !ownScoreRaw ||
    !opponentScoreRaw ||
    !Number.isInteger(ownScore) ||
    !Number.isInteger(opponentScore) ||
    ownScore < 0 ||
    opponentScore < 0
  ) {
    return "Bitte gültige Endstände angeben.";
  }

  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.teamId, team.id)));
  if (!game) return "Ungültiges Spiel.";

  try {
    await db.update(games).set({ ownScore, opponentScore }).where(eq(games.id, gameId));
  } catch (error) {
    console.error("closeGame: failed to update game", error);
    return "Spiel konnte nicht beendet werden. Bitte erneut versuchen.";
  }

  revalidatePath(`/games/${gameId}`);
}
