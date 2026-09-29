import { describe, expect, it } from "vitest";
import type { GameEventLogEntry } from "./event-log";
import {
  findPendingRecordByLocalId,
  mergeGameState,
  pruneShadows,
  type GameSnapshot,
  type QueuedAction,
  type ResolvedShadow,
} from "./offline-merge";
import type { Participant } from "./participant";

function participant(overrides: Partial<Participant> = {}): Participant {
  return {
    gameParticipationId: "p1",
    name: "Alex",
    shotsRegular: 0,
    goalsRegular: 0,
    shots7m: 0,
    goals7m: 0,
    shotsFacedRegular: 0,
    savesRegular: 0,
    shotsFaced7m: 0,
    saves7m: 0,
    twoMinPenalties: 0,
    yellowCard: false,
    redCard: false,
    ...overrides,
  };
}

function snapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    gameId: "g1",
    fieldPlayers: [participant()],
    keepers: [],
    eventLog: [],
    ...overrides,
  };
}

describe("mergeGameState", () => {
  it("applies a queued record optimistically: counters bump and a pending log row appears", () => {
    const queue: QueuedAction[] = [
      { kind: "record", localId: "local-1", gameParticipationId: "p1", eventType: "SHOT_REGULAR_GOAL", queuedAt: 1 },
    ];

    const merged = mergeGameState(snapshot(), queue, []);

    expect(merged.fieldPlayers[0]).toMatchObject({ shotsRegular: 1, goalsRegular: 1 });
    expect(merged.eventLog).toHaveLength(1);
    expect(merged.eventLog[0]).toMatchObject({ id: "local-1", eventType: "SHOT_REGULAR_GOAL", pending: true });
  });

  it("undoes a resolved (already-synced) entry: counters decrement and the row flips undone", () => {
    const existing: GameEventLogEntry = {
      id: "real-1",
      gameParticipationId: "p1",
      playerName: "Alex",
      eventType: "SHOT_REGULAR_GOAL",
      createdAt: new Date(0),
      undone: false,
    };
    const base = snapshot({
      fieldPlayers: [participant({ shotsRegular: 1, goalsRegular: 1 })],
      eventLog: [existing],
    });
    const queue: QueuedAction[] = [{ kind: "undo", localId: "local-2", targetId: "real-1" }];

    const merged = mergeGameState(base, queue, []);

    expect(merged.fieldPlayers[0]).toMatchObject({ shotsRegular: 0, goalsRegular: 0 });
    expect(merged.eventLog.find((e) => e.id === "real-1")).toMatchObject({ undone: true });
  });

  it("counters never go below zero on undo", () => {
    const existing: GameEventLogEntry = {
      id: "real-1",
      gameParticipationId: "p1",
      playerName: "Alex",
      eventType: "SHOT_REGULAR_MISS",
      createdAt: new Date(0),
      undone: false,
    };
    // Simulate a snapshot that's already inconsistent with the log (defensive case) by starting at 0.
    const base = snapshot({ fieldPlayers: [participant({ shotsRegular: 0 })], eventLog: [existing] });
    const queue: QueuedAction[] = [{ kind: "undo", localId: "local-2", targetId: "real-1" }];

    const merged = mergeGameState(base, queue, []);

    expect(merged.fieldPlayers[0].shotsRegular).toBe(0);
  });

  it("findPendingRecordByLocalId finds a still-unsynced record so undo can collapse locally", () => {
    const queue: QueuedAction[] = [
      { kind: "record", localId: "local-1", gameParticipationId: "p1", eventType: "YELLOW_CARD", queuedAt: 1 },
    ];

    expect(findPendingRecordByLocalId(queue, "local-1")).toMatchObject({ eventType: "YELLOW_CARD" });
    expect(findPendingRecordByLocalId(queue, "does-not-exist")).toBeUndefined();
  });

  it("a card logged, collapsed (undo of a still-pending record), then re-logged ends with exactly one active card", () => {
    // Step 1: tap "Gelb" -> queued.
    let queue: QueuedAction[] = [
      { kind: "record", localId: "local-1", gameParticipationId: "p1", eventType: "YELLOW_CARD", queuedAt: 1 },
    ];
    // Step 2: undo tapped before it ever synced -> the hook finds it via findPendingRecordByLocalId and
    // removes it directly; no "undo" action is ever enqueued for a local-only id.
    expect(findPendingRecordByLocalId(queue, "local-1")).toBeDefined();
    queue = queue.filter((a) => !(a.kind === "record" && a.localId === "local-1"));
    // Step 3: tap "Gelb" again -> a fresh queued record.
    queue = [
      ...queue,
      { kind: "record", localId: "local-2", gameParticipationId: "p1", eventType: "YELLOW_CARD", queuedAt: 2 },
    ];

    const merged = mergeGameState(snapshot(), queue, []);

    expect(merged.fieldPlayers[0].yellowCard).toBe(true);
    expect(merged.eventLog).toHaveLength(1);
    expect(merged.eventLog[0]).toMatchObject({ id: "local-2", pending: true });
  });

  it("clears a card only when no other active entry of the same type remains for that participation", () => {
    const first: GameEventLogEntry = {
      id: "real-1",
      gameParticipationId: "p1",
      playerName: "Alex",
      eventType: "YELLOW_CARD",
      createdAt: new Date(0),
      undone: false,
    };
    const second: GameEventLogEntry = {
      id: "real-2",
      gameParticipationId: "p1",
      playerName: "Alex",
      eventType: "YELLOW_CARD",
      createdAt: new Date(1),
      undone: false,
    };
    const base = snapshot({
      fieldPlayers: [participant({ yellowCard: true })],
      eventLog: [second, first],
    });

    // Undo only the first of two active yellow-card entries for the same player: the card must stay set.
    const merged = mergeGameState(base, [{ kind: "undo", localId: "local-1", targetId: "real-1" }], []);
    expect(merged.fieldPlayers[0].yellowCard).toBe(true);

    // Undo the second (now the only remaining active) entry too: the card clears.
    const mergedBoth = mergeGameState(
      base,
      [
        { kind: "undo", localId: "local-1", targetId: "real-1" },
        { kind: "undo", localId: "local-2", targetId: "real-2" },
      ],
      [],
    );
    expect(mergedBoth.fieldPlayers[0].yellowCard).toBe(false);
  });
});

describe("pruneShadows", () => {
  it("drops a record shadow once its real id shows up in a fresh snapshot", () => {
    const shadow: ResolvedShadow = {
      kind: "record",
      realId: "real-1",
      gameParticipationId: "p1",
      eventType: "SHOT_REGULAR_GOAL",
      queuedAt: 1,
    };
    const fresh = snapshot({
      eventLog: [
        {
          id: "real-1",
          gameParticipationId: "p1",
          playerName: "Alex",
          eventType: "SHOT_REGULAR_GOAL",
          createdAt: new Date(1),
          undone: false,
        },
      ],
    });

    expect(pruneShadows(fresh, [shadow])).toHaveLength(0);
  });

  it("keeps an undo shadow until the target row is marked undone in the fresh snapshot", () => {
    const shadow: ResolvedShadow = { kind: "undo", targetId: "real-1" };
    const notYetUndone = snapshot({
      eventLog: [
        {
          id: "real-1",
          gameParticipationId: "p1",
          playerName: "Alex",
          eventType: "SHOT_REGULAR_GOAL",
          createdAt: new Date(0),
          undone: false,
        },
      ],
    });
    const nowUndone = snapshot({
      eventLog: [{ ...notYetUndone.eventLog[0], undone: true }],
    });

    expect(pruneShadows(notYetUndone, [shadow])).toHaveLength(1);
    expect(pruneShadows(nowUndone, [shadow])).toHaveLength(0);
  });
});
