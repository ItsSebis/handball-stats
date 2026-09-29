import { randomUUID } from "node:crypto";
import { gameParticipations, games, players, seasons, teams, users } from "@/db/schema";
import { testDb } from "./db";

export async function createGameFixture() {
  const [user] = await testDb
    .insert(users)
    .values({ email: `${randomUUID()}@example.test`, passwordHash: "unused" })
    .returning();

  const [team] = await testDb.insert(teams).values({ userId: user!.id, name: "Test Team" }).returning();

  const [season] = await testDb
    .insert(seasons)
    .values({ teamId: team!.id, label: "2025/26", startDate: "2025-08-01", endDate: "2026-06-30" })
    .returning();

  const [game] = await testDb
    .insert(games)
    .values({ teamId: team!.id, seasonId: season!.id, opponentName: "Test Opponent", date: "2026-01-15" })
    .returning();

  const [fieldPlayer] = await testDb
    .insert(players)
    .values({ teamId: team!.id, name: "Field Player", type: "FIELD" })
    .returning();
  const [keeper] = await testDb
    .insert(players)
    .values({ teamId: team!.id, name: "Keeper Player", type: "KEEPER" })
    .returning();

  const [fieldParticipation] = await testDb
    .insert(gameParticipations)
    .values({ gameId: game!.id, playerId: fieldPlayer!.id, present: true })
    .returning();
  const [keeperParticipation] = await testDb
    .insert(gameParticipations)
    .values({ gameId: game!.id, playerId: keeper!.id, present: true })
    .returning();

  return {
    team: team!,
    game: game!,
    fieldParticipationId: fieldParticipation!.id,
    keeperParticipationId: keeperParticipation!.id,
  };
}
