import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { gameParticipations, games, playerGameStats, players } from "@/db/schema";

// The team-overview page only ever scopes by a season or all-time — there is no per-game quote
// view (the game detail page shows raw tallies, not derived quotes).
export type StatsScope = { kind: "season"; seasonId: string } | { kind: "all" };

// Every column here is `notNull().default(0)`, so a raw sum in scope is always a plain integer —
// coalesce only matters when the scope matches zero rows at all (no GROUP BY, so SQL still returns
// one row of nulls). Casting to ::int keeps the driver from returning Postgres's bigint sum as a
// string, which it otherwise does to avoid silently truncating values too large for a JS number.
// Only the counters behind STATS.md's four quotes are summed here — FEATURES.md #5 doesn't put
// discipline counts on the team overview, so they're left out rather than computed unused.
const RAW_COUNTERS = {
  shotsRegular: sql<number>`coalesce(sum(${playerGameStats.shotsRegular}), 0)::int`,
  goalsRegular: sql<number>`coalesce(sum(${playerGameStats.goalsRegular}), 0)::int`,
  shots7m: sql<number>`coalesce(sum(${playerGameStats.shots7m}), 0)::int`,
  goals7m: sql<number>`coalesce(sum(${playerGameStats.goals7m}), 0)::int`,
  shotsFacedRegular: sql<number>`coalesce(sum(${playerGameStats.shotsFacedRegular}), 0)::int`,
  savesRegular: sql<number>`coalesce(sum(${playerGameStats.savesRegular}), 0)::int`,
  shotsFaced7m: sql<number>`coalesce(sum(${playerGameStats.shotsFaced7m}), 0)::int`,
  saves7m: sql<number>`coalesce(sum(${playerGameStats.saves7m}), 0)::int`,
};

export type RawCounters = {
  shotsRegular: number;
  goalsRegular: number;
  shots7m: number;
  goals7m: number;
  shotsFacedRegular: number;
  savesRegular: number;
  shotsFaced7m: number;
  saves7m: number;
};

function scopeCondition(teamId: string, scope: StatsScope) {
  const teamCondition = eq(games.teamId, teamId);
  if (scope.kind === "season") return and(teamCondition, eq(games.seasonId, scope.seasonId));
  return teamCondition;
}

export async function getTeamStats(teamId: string, scope: StatsScope): Promise<RawCounters> {
  const [row] = await db
    .select(RAW_COUNTERS)
    .from(playerGameStats)
    .innerJoin(gameParticipations, eq(playerGameStats.gameParticipationId, gameParticipations.id))
    .innerJoin(games, eq(gameParticipations.gameId, games.id))
    .where(scopeCondition(teamId, scope));
  return row;
}

export type PlayerStats = RawCounters & { playerId: string; name: string; type: "FIELD" | "KEEPER" };

// Starts from `gameParticipations` (not `playerGameStats`) and left-joins the stats row: a player
// who was present but never had an event recorded in scope has no `playerGameStats` row at all
// (it's only created lazily on a player's first event, see actions.ts), and should still show up
// here with zero counters — formatQuote then renders their "—" — rather than silently vanishing.
export async function getPlayerStats(teamId: string, scope: StatsScope): Promise<PlayerStats[]> {
  return db
    .select({ playerId: players.id, name: players.name, type: players.type, ...RAW_COUNTERS })
    .from(gameParticipations)
    .innerJoin(players, eq(gameParticipations.playerId, players.id))
    .innerJoin(games, eq(gameParticipations.gameId, games.id))
    .leftJoin(playerGameStats, eq(playerGameStats.gameParticipationId, gameParticipations.id))
    .where(and(eq(gameParticipations.present, true), scopeCondition(teamId, scope)))
    .groupBy(players.id, players.name, players.type)
    .orderBy(asc(players.name));
}

export type GameTrendPoint = RawCounters & { date: string };

export async function getGameTrend(teamId: string, scope: StatsScope): Promise<GameTrendPoint[]> {
  return db
    .select({ date: games.date, ...RAW_COUNTERS })
    .from(playerGameStats)
    .innerJoin(gameParticipations, eq(playerGameStats.gameParticipationId, gameParticipations.id))
    .innerJoin(games, eq(gameParticipations.gameId, games.id))
    .where(scopeCondition(teamId, scope))
    .groupBy(games.id, games.date)
    .orderBy(asc(games.date));
}

type SeasonListItem = { id: string; startDate: string; endDate: string };

// Resolves the `?seasonId=` search param into a scope: an explicit "all" or a season id that's
// actually in this team's list is honored as-is; anything else (missing, garbage, or a season id
// from another team) falls back — to the current season by today's date when the param was simply
// absent (never to a season that hasn't started yet, so the default view is never an empty future
// season — see below), or to all-time when the param was present but invalid, rather than 404ing a
// stats page over a stale link.
// `seasonsList` must be sorted newest-first by `startDate` (see stats/page.tsx) — the "most recently
// started" fallback below relies on that order rather than re-sorting.
export function resolveSeasonScope(
  seasonsList: SeasonListItem[],
  seasonIdParam: string | undefined,
): { scope: StatsScope; activeSeasonId: string } {
  if (seasonIdParam === undefined) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const current = seasonsList.find((s) => s.startDate <= todayStr && todayStr <= s.endDate);
    const mostRecentStarted = current ?? seasonsList.find((s) => s.startDate <= todayStr);
    if (!mostRecentStarted) return { scope: { kind: "all" }, activeSeasonId: "all" };
    return { scope: { kind: "season", seasonId: mostRecentStarted.id }, activeSeasonId: mostRecentStarted.id };
  }

  if (seasonsList.some((s) => s.id === seasonIdParam)) {
    return { scope: { kind: "season", seasonId: seasonIdParam }, activeSeasonId: seasonIdParam };
  }

  return { scope: { kind: "all" }, activeSeasonId: "all" };
}
