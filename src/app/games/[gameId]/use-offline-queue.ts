"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordEvent, undoEventById } from "./actions";
import type { StatEvent } from "./event-effects";
import type { GameEventLogEntry } from "./event-log";
import {
  findPendingRecordByLocalId,
  mergeGameState,
  pruneShadows,
  type GameSnapshot,
  type MergedLogEntry,
  type QueuedAction,
  type ResolvedShadow,
} from "./offline-merge";
import * as store from "./offline-store";
import type { Participant } from "./participant";

// Purely a UI signal (flips the "offline" banner on) — the underlying server call is never abandoned
// or retried while still in flight, so this can't cause a duplicate send (see `drain` below).
const OFFLINE_BANNER_DELAY_MS = 8000;
const RETRY_INTERVAL_MS = 15000;

export type OfflineQueueState = {
  fieldPlayers: Participant[];
  keepers: Participant[];
  eventLog: MergedLogEntry[];
  isOffline: boolean;
  pendingCount: number;
  closedElsewhere: boolean;
  syncingId: string | null;
  recordEventOptimistic: (gameParticipationId: string, eventType: StatEvent) => void;
  undoEventOptimistic: (id: string) => void;
};

export function useOfflineQueue(
  gameId: string,
  fieldPlayers: Participant[],
  keepers: Participant[],
  eventLog: GameEventLogEntry[],
): OfflineQueueState {
  // Always the current server props: this render's props came from a live DB query (or, offline, from
  // Serwist's cached copy of the last such query), so they're never staler than anything IndexedDB
  // could hold — nothing to store or hydrate here. Only the *queue* (not-yet-synced local intent)
  // needs to survive a reload, via the hydration effect below.
  const snapshot: GameSnapshot = { gameId, fieldPlayers, keepers, eventLog };

  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [shadows, setShadows] = useState<ResolvedShadow[]>([]);
  // Always starts false, matching the server-rendered HTML (no `navigator` there) — reading
  // `navigator.onLine` for the initial value instead would make the client's first hydration pass
  // diverge from the server markup whenever the page happens to load while actually offline. From here
  // on, `isOffline` is driven entirely by real signals: the `online`/`offline` window events below, and
  // the drain loop's own call outcomes (a real network probe is more reliable than `navigator.onLine`,
  // which is known to false-positive on some networks — see the drain loop's comments).
  const [isOffline, setIsOffline] = useState(false);
  const [closedElsewhere, setClosedElsewhere] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // A shadow whose effect `eventLog` (the freshest piece of the snapshot) already reflects can be
  // dropped. This adjusts state during render rather than in an effect — see "Adjusting state when a
  // prop changes" in the React docs — since `eventLog` is a new array on every fresh server render.
  const [prevEventLog, setPrevEventLog] = useState(eventLog);
  if (prevEventLog !== eventLog) {
    setPrevEventLog(eventLog);
    setShadows((prev) => pruneShadows(snapshot, prev));
  }

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Only one action is ever in flight to the server at a time (the front of the queue) — this ref is
  // the single-flight guard, so `drain()` never starts a second call for the same or a later item
  // while the first is still pending. `syncingId` state mirrors it purely for rendering.
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const storedQueue = await store.getQueue(gameId);
      if (!cancelled) setQueue(storedQueue);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const dequeue = useCallback(
    async (localId: string) => {
      await store.removeQueuedAction(gameId, localId);
      setQueue((prev) => prev.filter((a) => a.localId !== localId));
    },
    [gameId],
  );

  // Shared by both the record and undo paths: a "closed" game dooms every later queued action too, so
  // the whole remaining queue is dropped at once. Any other rejection (session gone, wrong player
  // type, already-undone, ...) is specific to this one action — drop just it and keep going.
  const finishFailure = useCallback(
    async (next: QueuedAction, reason: string) => {
      if (reason === "closed") {
        await store.clearQueue(gameId);
        setQueue([]);
        setClosedElsewhere(true);
        return;
      }
      console.warn("offline queue: dropping unrecoverable action", next, reason);
      await dequeue(next.localId);
    },
    [gameId, dequeue],
  );

  // `drain` calls itself once an item finishes, to move on to whatever's now at the front of the
  // queue. It does so through this ref (rather than closing over its own `useCallback` binding
  // directly) so the call site never needs to reference `drain` before it's declared.
  const drainRef = useRef<() => void>(() => {});

  const drain = useCallback(() => {
    if (inFlight.current !== null) return;
    // Claimed synchronously, before the queue is even read: two triggers firing back to back (e.g. an
    // `online` event alongside the queue-length effect) must not both pass the guard above during the
    // `await` below and each pick up the same front item.
    inFlight.current = "pending-lookup";

    void (async () => {
      // Read from IndexedDB, not React state: `dequeue`'s `setQueue` update isn't reflected in
      // `queueRef.current` until the sync effect runs after the next commit, but this can run again
      // (via the recursive `drainRef.current()` call below) before that commit ever happens — reading
      // React state here would re-process the very item `dequeue` just removed.
      const queueNow = await store.getQueue(gameId);
      const next = queueNow[0];
      if (!next) {
        inFlight.current = null;
        return;
      }

      inFlight.current = next.localId;
      setSyncingId(next.localId);
      const bannerTimer = setTimeout(() => setIsOffline(true), OFFLINE_BANNER_DELAY_MS);

      // `inFlight` (the single-flight guard) is only released once this item's full lifecycle — the
      // network call AND the local dequeue/shadow bookkeeping that follows a definitive answer — is
      // done. Releasing it any earlier would let a concurrent trigger (e.g. an `online` event firing
      // mid-bookkeeping) start the next item's network call before this one has finished updating state.
      function release() {
        clearTimeout(bannerTimer);
        inFlight.current = null;
        setSyncingId(null);
      }

      if (next.kind === "record") {
        recordEvent(next.gameParticipationId, next.eventType).then(
          async (result) => {
            clearTimeout(bannerTimer);
            setIsOffline(false);
            if (result.ok) {
              await dequeue(next.localId);
              setShadows((prev) => [
                ...prev,
                {
                  kind: "record",
                  realId: result.id,
                  gameParticipationId: next.gameParticipationId,
                  eventType: next.eventType,
                  queuedAt: next.queuedAt,
                },
              ]);
            } else {
              await finishFailure(next, result.reason);
            }
            release();
            drainRef.current();
          },
          () => {
            // Network failure: the call never reached the server (or we'll never know if it did), so
            // the item stays queued for the next trigger. Never re-issued while `inFlight` matched it.
            release();
            setIsOffline(true);
          },
        );
      } else {
        undoEventById(next.targetId).then(
          async (result) => {
            clearTimeout(bannerTimer);
            setIsOffline(false);
            if (result.ok) {
              await dequeue(next.localId);
              setShadows((prev) => [...prev, { kind: "undo", targetId: next.targetId }]);
            } else {
              await finishFailure(next, result.reason);
            }
            release();
            drainRef.current();
          },
          () => {
            release();
            setIsOffline(true);
          },
        );
      }
    })();
  }, [gameId, dequeue, finishFailure]);

  useEffect(() => {
    drainRef.current = drain;
  }, [drain]);

  useEffect(() => {
    if (queue.length > 0) drain();
  }, [queue.length, drain]);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      drain();
    }
    function handleOffline() {
      setIsOffline(true);
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") drain();
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [drain]);

  // A slow-poll fallback for a backgrounded tab, where the `online` event and a throttled interval
  // may both be unreliable — only runs while there's actually something to retry.
  useEffect(() => {
    if (queue.length === 0) return;
    const interval = setInterval(drain, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [queue.length, drain]);

  const recordEventOptimistic = useCallback(
    (gameParticipationId: string, eventType: StatEvent) => {
      const action: QueuedAction = {
        kind: "record",
        localId: `local-${crypto.randomUUID()}`,
        gameParticipationId,
        eventType,
        queuedAt: Date.now(),
      };
      void store.enqueue(gameId, action);
      setQueue((prev) => [...prev, action]);
    },
    [gameId],
  );

  const undoEventOptimistic = useCallback(
    (id: string) => {
      if (id === inFlight.current) return; // already sent to the server; wait for it to settle
      const pendingRecord = findPendingRecordByLocalId(queueRef.current, id);
      if (pendingRecord) {
        // Undoing a tap that never synced: collapse locally, never contact the server with an id it
        // has never seen.
        void dequeue(pendingRecord.localId);
        return;
      }
      const action: QueuedAction = { kind: "undo", localId: `local-${crypto.randomUUID()}`, targetId: id };
      void store.enqueue(gameId, action);
      setQueue((prev) => [...prev, action]);
    },
    [gameId, dequeue],
  );

  const merged = mergeGameState(snapshot, queue, shadows);

  return {
    fieldPlayers: merged.fieldPlayers,
    keepers: merged.keepers,
    eventLog: merged.eventLog,
    isOffline,
    pendingCount: queue.length,
    closedElsewhere,
    syncingId,
    recordEventOptimistic,
    undoEventOptimistic,
  };
}
