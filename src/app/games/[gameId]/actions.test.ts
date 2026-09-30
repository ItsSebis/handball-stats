import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { gameParticipations, games, playerGameStatEvents, playerGameStats } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { testDb, testPool } from "@/test/db";
import { createGameFixture } from "@/test/game-fixture";
import { deleteGame, recordEvent, reopenGame, undoEventById } from "./actions";

vi.mock("@/db", async () => {
  const { testDb } = await import("@/test/db");
  return { db: testDb };
});

vi.mock("@/lib/team", () => ({
  getCurrentTeam: vi.fn(),
}));

// revalidatePath requires a live Next.js request context that doesn't exist under vitest; these
// tests are about the SQL/undo logic, not Next's cache invalidation, so it's mocked out.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// deleteGame calls redirect() on success, which throws under next/navigation's real implementation;
// mocked here the same way src/app/reset-password/actions.test.ts mocks it.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

afterAll(async () => {
  await testPool.end();
});

beforeEach(() => {
  delete process.env.HIDE_DISCIPLINE_STATS;
  vi.mocked(redirect).mockClear();
});

async function getStatsRow(gameParticipationId: string) {
  const [row] = await testDb
    .select()
    .from(playerGameStats)
    .where(eq(playerGameStats.gameParticipationId, gameParticipationId));
  return row;
}

async function getLogEntries(gameParticipationId: string) {
  return testDb
    .select()
    .from(playerGameStatEvents)
    .where(eq(playerGameStatEvents.gameParticipationId, gameParticipationId));
}

describe("recordEvent / undoEventById", () => {
  it("records a counter event and undoes it", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const result = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    const statsAfterRecord = await getStatsRow(fixture.fieldParticipationId);
    expect(statsAfterRecord?.shotsRegular).toBe(1);
    expect(statsAfterRecord?.goalsRegular).toBe(1);

    const undo = await undoEventById(result.id);
    expect(undo).toEqual({ ok: true });

    const stats = await getStatsRow(fixture.fieldParticipationId);
    expect(stats?.shotsRegular).toBe(0);
    expect(stats?.goalsRegular).toBe(0);
  });

  it("records and undoes a keeper save", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const result = await recordEvent(fixture.keeperParticipationId, "SAVE_REGULAR");
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    const stats = await getStatsRow(fixture.keeperParticipationId);
    expect(stats?.shotsFacedRegular).toBe(1);
    expect(stats?.savesRegular).toBe(1);

    expect(await undoEventById(result.id)).toEqual({ ok: true });
    const statsAfterUndo = await getStatsRow(fixture.keeperParticipationId);
    expect(statsAfterUndo?.shotsFacedRegular).toBe(0);
    expect(statsAfterUndo?.savesRegular).toBe(0);
  });

  it("undoes a non-latest entry independently, leaving later entries' effects intact", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const first = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL");
    const second = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_MISS");
    if (!first.ok || !second.ok) throw new Error("unreachable");

    const undoFirst = await undoEventById(first.id);
    expect(undoFirst).toEqual({ ok: true });

    const stats = await getStatsRow(fixture.fieldParticipationId);
    // First event (goal) reversed: shotsRegular -1, goalsRegular -1. Second event (miss) still applied: shotsRegular +1.
    expect(stats?.shotsRegular).toBe(1);
    expect(stats?.goalsRegular).toBe(0);
  });

  it("double-undo of the same entry is idempotent", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const recorded = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL");
    if (!recorded.ok) throw new Error("unreachable");

    const firstUndo = await undoEventById(recorded.id);
    const secondUndo = await undoEventById(recorded.id);
    expect(firstUndo).toEqual({ ok: true });
    expect(secondUndo).toEqual({ ok: false, reason: "already_undone" });
  });

  it("a card tap that's already active is a no-op and writes no extra log row", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const first = await recordEvent(fixture.fieldParticipationId, "YELLOW_CARD");
    expect(first.ok).toBe(true);

    const second = await recordEvent(fixture.fieldParticipationId, "YELLOW_CARD");
    expect(second).toEqual({ ok: false, reason: "no_op" });

    const log = await getLogEntries(fixture.fieldParticipationId);
    expect(log.filter((e) => e.eventType === "YELLOW_CARD")).toHaveLength(1);
  });

  it("card log -> undo -> re-log -> undoing the stale old entry is a no-op and leaves the boolean set", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const first = await recordEvent(fixture.fieldParticipationId, "YELLOW_CARD");
    if (!first.ok) throw new Error("unreachable");
    expect(await undoEventById(first.id)).toEqual({ ok: true });

    const second = await recordEvent(fixture.fieldParticipationId, "YELLOW_CARD");
    if (!second.ok) throw new Error("unreachable");

    // Undoing the OLD (already-undone) entry again must be a no-op, and must not clear the boolean
    // that the second, still-active entry is now responsible for.
    expect(await undoEventById(first.id)).toEqual({ ok: false, reason: "already_undone" });

    const stats = await getStatsRow(fixture.fieldParticipationId);
    expect(stats?.yellowCard).toBe(true);

    // Undoing the currently-active entry does clear it.
    expect(await undoEventById(second.id)).toEqual({ ok: true });
    const statsAfter = await getStatsRow(fixture.fieldParticipationId);
    expect(statsAfter?.yellowCard).toBe(false);
  });

  it("rejects record and undo once the game is closed", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const recorded = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL");
    if (!recorded.ok) throw new Error("unreachable");

    await testDb.update(games).set({ ownScore: 10, opponentScore: 5 }).where(eq(games.id, fixture.game.id));

    expect(await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL")).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(await undoEventById(recorded.id)).toEqual({ ok: false, reason: "closed" });
  });

  it("HIDE_DISCIPLINE_STATS blocks recording and undoing card/2-min events", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const recorded = await recordEvent(fixture.fieldParticipationId, "TWO_MIN_PENALTY");
    if (!recorded.ok) throw new Error("unreachable");

    process.env.HIDE_DISCIPLINE_STATS = "true";

    expect(await recordEvent(fixture.fieldParticipationId, "YELLOW_CARD")).toEqual({
      ok: false,
      reason: "not_writable",
    });
    expect(await undoEventById(recorded.id)).toEqual({ ok: false, reason: "not_writable" });
  });

  it("rejects a counter event logged against the wrong player type", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    // SAVE_REGULAR is a keeper-only event; the fixture's field participation must be rejected.
    expect(await recordEvent(fixture.fieldParticipationId, "SAVE_REGULAR")).toEqual({
      ok: false,
      reason: "not_writable",
    });
  });
});

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("reopenGame", () => {
  it("clears both scores and lets recordEvent succeed again afterward", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    await testDb.update(games).set({ ownScore: 10, opponentScore: 5 }).where(eq(games.id, fixture.game.id));

    const result = await reopenGame(undefined, formData({ gameId: fixture.game.id }));
    expect(result).toBeUndefined();

    const [reopened] = await testDb.select().from(games).where(eq(games.id, fixture.game.id));
    expect(reopened?.ownScore).toBeNull();
    expect(reopened?.opponentScore).toBeNull();

    // The real regression risk: blockedReason() derives write-blocking purely from ownScore/
    // opponentScore being null, so reopening must re-enable recordEvent with zero extra plumbing.
    const recorded = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL");
    expect(recorded.ok).toBe(true);
  });

  it("rejects reopening a game that was never closed and makes no DB change", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const result = await reopenGame(undefined, formData({ gameId: fixture.game.id }));
    expect(result).toBe("Ungültiges Spiel oder bereits offen.");

    const [unchanged] = await testDb.select().from(games).where(eq(games.id, fixture.game.id));
    expect(unchanged?.ownScore).toBeNull();
    expect(unchanged?.opponentScore).toBeNull();
  });
});

describe("deleteGame", () => {
  it("deletes the game and cascades to participations, stats, and the event log", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const recorded = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL");
    if (!recorded.ok) throw new Error("unreachable");

    const result = await deleteGame(undefined, formData({ gameId: fixture.game.id }));
    expect(result).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith("/games");

    const [remainingGame] = await testDb.select().from(games).where(eq(games.id, fixture.game.id));
    expect(remainingGame).toBeUndefined();

    const remainingParticipations = await testDb
      .select()
      .from(gameParticipations)
      .where(eq(gameParticipations.gameId, fixture.game.id));
    expect(remainingParticipations).toHaveLength(0);

    const remainingStats = await testDb
      .select()
      .from(playerGameStats)
      .where(eq(playerGameStats.gameParticipationId, fixture.fieldParticipationId));
    expect(remainingStats).toHaveLength(0);

    const remainingEvents = await testDb
      .select()
      .from(playerGameStatEvents)
      .where(eq(playerGameStatEvents.gameParticipationId, fixture.fieldParticipationId));
    expect(remainingEvents).toHaveLength(0);
  });

  it("rejects a game belonging to a different team and leaves all rows untouched", async () => {
    const fixture = await createGameFixture();
    const otherFixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(otherFixture.team);

    const result = await deleteGame(undefined, formData({ gameId: fixture.game.id }));
    expect(result).toBe("Ungültiges Spiel.");
    expect(redirect).not.toHaveBeenCalled();

    const [stillThere] = await testDb.select().from(games).where(eq(games.id, fixture.game.id));
    expect(stillThere).toBeDefined();
  });

  it("rejects a nonexistent gameId and leaves all rows untouched", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const result = await deleteGame(undefined, formData({ gameId: "00000000-0000-0000-0000-000000000000" }));
    expect(result).toBe("Ungültiges Spiel.");
    expect(redirect).not.toHaveBeenCalled();

    const [stillThere] = await testDb.select().from(games).where(eq(games.id, fixture.game.id));
    expect(stillThere).toBeDefined();
  });
});
