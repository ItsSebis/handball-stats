import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { games, playerGameStatEvents, playerGameStats } from "@/db/schema";
import { getCurrentTeam } from "@/lib/team";
import { testDb, testPool } from "@/test/db";
import { createGameFixture } from "@/test/game-fixture";
import { recordEvent, undoEventById } from "./actions";

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

afterAll(async () => {
  await testPool.end();
});

beforeEach(() => {
  delete process.env.HIDE_DISCIPLINE_STATS;
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
    expect(result.entry.eventType).toBe("SHOT_REGULAR_GOAL");
    expect(result.entry.playerName).toBe("Field Player");

    const undo = await undoEventById(result.entry.id);
    expect(undo).toEqual({ ok: true });

    const stats = await getStatsRow(fixture.fieldParticipationId);
    expect(stats?.shotsRegular).toBe(0);
    expect(stats?.goalsRegular).toBe(0);
  });

  it("undoes a non-latest entry independently, leaving later entries' effects intact", async () => {
    const fixture = await createGameFixture();
    vi.mocked(getCurrentTeam).mockResolvedValue(fixture.team);

    const first = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_GOAL");
    const second = await recordEvent(fixture.fieldParticipationId, "SHOT_REGULAR_MISS");
    if (!first.ok || !second.ok) throw new Error("unreachable");

    const undoFirst = await undoEventById(first.entry.id);
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

    const firstUndo = await undoEventById(recorded.entry.id);
    const secondUndo = await undoEventById(recorded.entry.id);
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
    expect(await undoEventById(first.entry.id)).toEqual({ ok: true });

    const second = await recordEvent(fixture.fieldParticipationId, "YELLOW_CARD");
    if (!second.ok) throw new Error("unreachable");

    // Undoing the OLD (already-undone) entry again must be a no-op, and must not clear the boolean
    // that the second, still-active entry is now responsible for.
    expect(await undoEventById(first.entry.id)).toEqual({ ok: false, reason: "already_undone" });

    const stats = await getStatsRow(fixture.fieldParticipationId);
    expect(stats?.yellowCard).toBe(true);

    // Undoing the currently-active entry does clear it.
    expect(await undoEventById(second.entry.id)).toEqual({ ok: true });
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
      reason: "not_writable",
    });
    expect(await undoEventById(recorded.entry.id)).toEqual({ ok: false, reason: "not_writable" });
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
    expect(await undoEventById(recorded.entry.id)).toEqual({ ok: false, reason: "not_writable" });
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
