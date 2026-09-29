import { CARD_EVENTS, COUNTER_EVENTS, isCardEvent, type StatEvent } from "./event-effects";
import type { GameEventLogEntry } from "./event-log";
import type { Participant } from "./participant";

export type QueuedRecordEvent = {
  kind: "record";
  localId: string;
  gameParticipationId: string;
  eventType: StatEvent;
  queuedAt: number;
};

// `targetId` is always a real, server-assigned event id — undoing a still-unsynced record never
// reaches this shape at all (see findPendingRecordByLocalId / the "collapse" path in use-offline-queue).
export type QueuedUndo = { kind: "undo"; localId: string; targetId: string };

export type QueuedAction = QueuedRecordEvent | QueuedUndo;

// A queued action that has been confirmed by the server but whose effect the last-known snapshot
// doesn't reflect yet (the snapshot only updates once a fresh server render reaches the client). Kept
// in memory only — on reload, a fresh snapshot fetch makes this bookkeeping unnecessary.
export type ResolvedRecordShadow = {
  kind: "record";
  realId: string;
  gameParticipationId: string;
  eventType: StatEvent;
  queuedAt: number;
};
export type ResolvedUndoShadow = { kind: "undo"; targetId: string };
export type ResolvedShadow = ResolvedRecordShadow | ResolvedUndoShadow;

export type GameSnapshot = {
  gameId: string;
  fieldPlayers: Participant[];
  keepers: Participant[];
  eventLog: GameEventLogEntry[];
};

export type MergedLogEntry = GameEventLogEntry & { pending: boolean };

export type MergedGameState = {
  fieldPlayers: Participant[];
  keepers: Participant[];
  eventLog: MergedLogEntry[];
};

// A shadow is only still needed until the snapshot itself catches up. For a record shadow that means
// its realId showing up in the snapshot's log at all; for an undo shadow, that log row must additionally
// already be marked undone (the snapshot could contain the *original* record before its later undo has
// made it through a subsequent server render).
export function pruneShadows(snapshot: GameSnapshot, shadows: ResolvedShadow[]): ResolvedShadow[] {
  return shadows.filter((shadow) => {
    if (shadow.kind === "record") {
      return !snapshot.eventLog.some((e) => e.id === shadow.realId);
    }
    return !snapshot.eventLog.some((e) => e.id === shadow.targetId && e.undone);
  });
}

export function findPendingRecordByLocalId(queue: QueuedAction[], localId: string): QueuedRecordEvent | undefined {
  return queue.find((a): a is QueuedRecordEvent => a.kind === "record" && a.localId === localId);
}

function findParticipant(
  fieldPlayers: Participant[],
  keepers: Participant[],
  gameParticipationId: string,
): Participant | undefined {
  return (
    fieldPlayers.find((p) => p.gameParticipationId === gameParticipationId) ??
    keepers.find((p) => p.gameParticipationId === gameParticipationId)
  );
}

// Mirrors actions.ts's recordEvent/undoEventById effects exactly: a counter event moves its columns
// by +1 (record) or -1 floored at 0 (undo); a card event sets its boolean true (record) or clears it
// (undo) — except an undo only clears the card if `keepCard` says another active entry of the same
// type still exists for this participation (a card can be logged, undone, and re-logged in one game).
function applyEffect(participant: Participant, eventType: StatEvent, direction: 1 | -1, keepCard: boolean): Participant {
  if (isCardEvent(eventType)) {
    if (direction === -1 && keepCard) return participant;
    const column = CARD_EVENTS[eventType];
    return { ...participant, [column]: direction === 1 };
  }
  const { columns } = COUNTER_EVENTS[eventType];
  const patch: Partial<Participant> = {};
  for (const column of columns) patch[column] = Math.max((participant[column] ?? 0) + direction, 0);
  return { ...participant, ...patch };
}

export function mergeGameState(
  snapshot: GameSnapshot,
  queue: QueuedAction[],
  shadows: ResolvedShadow[],
): MergedGameState {
  let fieldPlayers = snapshot.fieldPlayers;
  let keepers = snapshot.keepers;
  const logRows: MergedLogEntry[] = snapshot.eventLog.map((e) => ({ ...e, pending: false }));

  function replaceParticipant(next: Participant) {
    fieldPlayers = fieldPlayers.map((p) => (p.gameParticipationId === next.gameParticipationId ? next : p));
    keepers = keepers.map((p) => (p.gameParticipationId === next.gameParticipationId ? next : p));
  }

  // Chronological order: every shadow was, until just now, the front of the FIFO queue (drain only
  // ever advances strictly in order), so shadows always precede whatever's still queued. Shadows here
  // may already be reflected in `snapshot` (pruning happens where they're stored, not here) — the
  // "already reflected" / "already undone" checks below make replaying one anyway a safe no-op.
  const timeline: (ResolvedShadow | QueuedAction)[] = [...shadows, ...queue];

  for (const action of timeline) {
    if (action.kind === "record") {
      const isShadow = "realId" in action;
      const id = isShadow ? action.realId : action.localId;
      if (logRows.some((e) => e.id === id)) continue; // already reflected, nothing to replay
      const participant = findParticipant(fieldPlayers, keepers, action.gameParticipationId);
      if (!participant) continue; // defensive: participant not present in this scope
      replaceParticipant(applyEffect(participant, action.eventType, 1, false));
      logRows.unshift({
        id,
        gameParticipationId: action.gameParticipationId,
        playerName: participant.name,
        eventType: action.eventType,
        createdAt: new Date(action.queuedAt),
        undone: false,
        pending: !isShadow,
      });
      continue;
    }

    // kind === "undo"
    const targetIndex = logRows.findIndex((e) => e.id === action.targetId);
    if (targetIndex === -1 || logRows[targetIndex].undone) continue; // not found / already undone: no-op
    const target = logRows[targetIndex];
    logRows[targetIndex] = { ...target, undone: true };

    const participant = findParticipant(fieldPlayers, keepers, target.gameParticipationId);
    if (participant) {
      const otherActiveSameType = logRows.some(
        (e, i) =>
          i !== targetIndex &&
          e.eventType === target.eventType &&
          !e.undone &&
          e.gameParticipationId === target.gameParticipationId,
      );
      replaceParticipant(applyEffect(participant, target.eventType, -1, otherActiveSameType));
    }
  }

  return { fieldPlayers, keepers, eventLog: logRows };
}
