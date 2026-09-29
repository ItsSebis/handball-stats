"use server";

import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  gameParticipations,
  games,
  playerGameStatEvents,
  playerGameStats,
  players,
  statEventTypeEnum,
} from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { isUuid } from "@/lib/uuid";

export type StatEvent = (typeof statEventTypeEnum.enumValues)[number];

type CardEvent = "YELLOW_CARD" | "RED_CARD";
type CounterEvent = Exclude<StatEvent, CardEvent>;

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

type CardColumn = "yellowCard" | "redCard";

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

const CARD_EVENTS: Record<CardEvent, CardColumn> = {
  YELLOW_CARD: "yellowCard",
  RED_CARD: "redCard",
};

function isCardEvent(event: StatEvent): event is CardEvent {
  return event === "YELLOW_CARD" || event === "RED_CARD";
}

// The physical (snake_case) column name backing a playerGameStats field. Only ever called with
// keys from the fixed COUNTER_EVENTS/CARD_EVENTS maps above, never from client input.
function columnName(key: CounterColumn | CardColumn): string {
  return playerGameStats[key].name;
}

// Re-derives team/type/closed state from the DB; never trusts the client. Null if not writable now.
async function resolveWritableParticipation(gameParticipationId: string, event: StatEvent) {
  const team = await getCurrentTeam();
  if (!team) return null;
  if (!isUuid(gameParticipationId)) return null;

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
    .where(
      and(
        eq(gameParticipations.id, gameParticipationId),
        eq(gameParticipations.present, true),
        eq(games.teamId, team.id),
      ),
    );

  if (!participation) return null;
  if (participation.ownScore !== null && participation.opponentScore !== null) return null;

  const disciplineHidden = process.env.HIDE_DISCIPLINE_STATS === "true";
  if (disciplineHidden && (isCardEvent(event) || event === "TWO_MIN_PENALTY")) return null;

  if (!isCardEvent(event)) {
    // COUNTER_EVENTS is a total Record, so this only guards a bad event string from a raw client call.
    const config = COUNTER_EVENTS[event];
    if (!config) return null;
    if (config.playerType && config.playerType !== participation.playerType) return null;
  }

  return { gameId: participation.gameId };
}

export type RecordedEvent = {
  id: string;
  gameParticipationId: string;
  eventType: StatEvent;
  createdAt: Date;
  playerName: string;
};

export type RecordEventResult =
  | { ok: true; entry: RecordedEvent }
  | { ok: false; reason: "not_writable" | "no_op" };

// Inserts one persisted log row and updates the aggregate `playerGameStats` counters/booleans in a
// single statement (neon-http has no db.transaction() — see src/db/index.ts). The log insert reads
// from the upsert CTE's own RETURNING output, so a card tap that's a no-op (already true) writes no
// log row either: the two can never fall out of sync.
export async function recordEvent(gameParticipationId: string, event: StatEvent): Promise<RecordEventResult> {
  const participation = await resolveWritableParticipation(gameParticipationId, event);
  if (!participation) return { ok: false, reason: "not_writable" };

  let upsertSql: SQL;
  if (isCardEvent(event)) {
    const col = columnName(CARD_EVENTS[event]);
    upsertSql = sql`
      INSERT INTO player_game_stats (game_participation_id, ${sql.raw(col)})
      VALUES (${gameParticipationId}, true)
      ON CONFLICT (game_participation_id) DO UPDATE SET ${sql.raw(col)} = true
      WHERE player_game_stats.${sql.raw(col)} = false
      RETURNING game_participation_id
    `;
  } else {
    const { columns } = COUNTER_EVENTS[event];
    const insertCols = sql.join(
      columns.map((c) => sql.raw(columnName(c))),
      sql`, `,
    );
    const insertVals = sql.join(
      columns.map(() => sql`1`),
      sql`, `,
    );
    const updateSet = sql.join(
      columns.map((c) => {
        const name = columnName(c);
        return sql`${sql.raw(name)} = player_game_stats.${sql.raw(name)} + 1`;
      }),
      sql`, `,
    );
    upsertSql = sql`
      INSERT INTO player_game_stats (game_participation_id, ${insertCols})
      VALUES (${gameParticipationId}, ${insertVals})
      ON CONFLICT (game_participation_id) DO UPDATE SET ${updateSet}
      RETURNING game_participation_id
    `;
  }

  const result = await db.execute<{
    id: string;
    created_at: Date;
    game_participation_id: string;
    event_type: StatEvent;
    player_name: string;
  }>(sql`
    WITH upserted AS (${upsertSql}),
    log AS (
      INSERT INTO player_game_stat_events (game_participation_id, event_type)
      SELECT game_participation_id, ${event} FROM upserted
      RETURNING id, created_at, game_participation_id, event_type
    )
    SELECT log.id, log.created_at, log.game_participation_id, log.event_type, players.name AS player_name
    FROM log
    JOIN game_participations gp ON gp.id = log.game_participation_id
    JOIN players ON players.id = gp.player_id
  `);

  const row = result.rows[0];
  if (!row) return { ok: false, reason: "no_op" };

  revalidatePath(`/games/${participation.gameId}`);
  return {
    ok: true,
    entry: {
      id: row.id,
      gameParticipationId: row.game_participation_id,
      eventType: row.event_type,
      createdAt: new Date(row.created_at),
      playerName: row.player_name,
    },
  };
}

export type UndoEventResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "already_undone" | "not_writable" };

// Undoes one specific log entry by id (not just "the last tap"). Reverses exactly that entry's
// effect on the aggregate: counters decrement (floored at 0), a card boolean only clears if no
// *other* non-undone entry of the same type remains for that participation (a card can be logged,
// undone, and re-logged over a game; only the currently-active entry's undo should clear it).
export async function undoEventById(eventLogId: string): Promise<UndoEventResult> {
  const team = await getCurrentTeam();
  if (!team) return { ok: false, reason: "not_found" };
  if (!isUuid(eventLogId)) return { ok: false, reason: "not_found" };

  const [row] = await db
    .select({
      eventType: playerGameStatEvents.eventType,
      undone: playerGameStatEvents.undone,
      gameId: gameParticipations.gameId,
      ownScore: games.ownScore,
      opponentScore: games.opponentScore,
    })
    .from(playerGameStatEvents)
    .innerJoin(gameParticipations, eq(playerGameStatEvents.gameParticipationId, gameParticipations.id))
    .innerJoin(games, eq(gameParticipations.gameId, games.id))
    .where(and(eq(playerGameStatEvents.id, eventLogId), eq(games.teamId, team.id)));

  // Not-found and not-yours are deliberately indistinguishable, matching resolveWritableParticipation.
  if (!row) return { ok: false, reason: "not_found" };
  if (row.ownScore !== null && row.opponentScore !== null) return { ok: false, reason: "not_writable" };

  const disciplineHidden = process.env.HIDE_DISCIPLINE_STATS === "true";
  if (disciplineHidden && (isCardEvent(row.eventType) || row.eventType === "TWO_MIN_PENALTY")) {
    return { ok: false, reason: "not_writable" };
  }
  if (row.undone) return { ok: false, reason: "already_undone" };

  let reverseSql: SQL;
  if (isCardEvent(row.eventType)) {
    const col = columnName(CARD_EVENTS[row.eventType]);
    reverseSql = sql`
      UPDATE player_game_stats p
      SET ${sql.raw(col)} = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM player_game_stat_events e
          WHERE e.game_participation_id = flipped.game_participation_id
            AND e.event_type = ${row.eventType}
            AND e.undone = false
            AND e.id <> ${eventLogId}
        ) THEN false ELSE p.${sql.raw(col)} END
      FROM flipped
      WHERE p.game_participation_id = flipped.game_participation_id
      RETURNING p.game_participation_id
    `;
  } else {
    const { columns } = COUNTER_EVENTS[row.eventType];
    const updateSet = sql.join(
      columns.map((c) => {
        const name = columnName(c);
        return sql`${sql.raw(name)} = greatest(p.${sql.raw(name)} - 1, 0)`;
      }),
      sql`, `,
    );
    reverseSql = sql`
      UPDATE player_game_stats p
      SET ${updateSet}
      FROM flipped
      WHERE p.game_participation_id = flipped.game_participation_id
      RETURNING p.game_participation_id
    `;
  }

  // Excluding the flipped row by id (rather than relying on `undone = false` alone) matters: sibling
  // data-modifying CTEs share one snapshot and don't see each other's writes, so the NOT EXISTS check
  // above would not see this UPDATE's own `undone = true` if it re-queried by state instead of by id.
  const result = await db.execute<{ game_participation_id: string }>(sql`
    WITH flipped AS (
      UPDATE player_game_stat_events
      SET undone = true, undone_at = now()
      WHERE id = ${eventLogId} AND undone = false
      RETURNING game_participation_id
    )
    ${reverseSql}
  `);

  if (result.rows.length === 0) return { ok: false, reason: "already_undone" };

  revalidatePath(`/games/${row.gameId}`);
  return { ok: true };
}

export async function closeGame(_prevState: string | undefined, formData: FormData) {
  const team = await getCurrentTeam();
  if (!team) return "Nicht angemeldet.";

  const gameId = String(formData.get("gameId") ?? "");
  const ownScoreRaw = String(formData.get("ownScore") ?? "").trim();
  const opponentScoreRaw = String(formData.get("opponentScore") ?? "").trim();
  const ownScore = Number(ownScoreRaw);
  const opponentScore = Number(opponentScoreRaw);

  if (
    !isUuid(gameId) ||
    !ownScoreRaw ||
    !opponentScoreRaw ||
    !Number.isInteger(ownScore) ||
    !Number.isInteger(opponentScore) ||
    ownScore < 0 ||
    opponentScore < 0
  ) {
    return "Bitte gültige Endstände angeben.";
  }

  let updated;
  try {
    updated = await db
      .update(games)
      .set({ ownScore, opponentScore })
      .where(and(eq(games.id, gameId), eq(games.teamId, team.id), isNull(games.ownScore)))
      .returning({ id: games.id });
  } catch (error) {
    console.error("closeGame: failed to update game", error);
    return "Spiel konnte nicht beendet werden. Bitte erneut versuchen.";
  }

  if (updated.length === 0) {
    return "Ungültiges Spiel oder bereits beendet.";
  }

  revalidatePath(`/games/${gameId}`);
}
