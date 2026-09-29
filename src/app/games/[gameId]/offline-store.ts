import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { QueuedAction } from "./offline-merge";

const DB_NAME = "handball-stats-offline";
const DB_VERSION = 1;

// `seq` is always present on a row read back from the store (IndexedDB assigns it on insert) — it's
// only absent on the object we hand to `add`, which is why `enqueue` below needs a cast.
type QueueRow = QueuedAction & { gameId: string; seq: number };

interface OfflineDB extends DBSchema {
  queue: { key: number; value: QueueRow; indexes: { byGameId: string } };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDb(): Promise<IDBPDatabase<OfflineDB>> {
  dbPromise ??= openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const queueStore = db.createObjectStore("queue", { keyPath: "seq", autoIncrement: true });
      queueStore.createIndex("byGameId", "gameId");
    },
  });
  return dbPromise;
}

function toQueuedAction(row: QueueRow): QueuedAction {
  if (row.kind === "record") {
    return {
      kind: "record",
      localId: row.localId,
      gameParticipationId: row.gameParticipationId,
      eventType: row.eventType,
      queuedAt: row.queuedAt,
    };
  }
  return { kind: "undo", localId: row.localId, targetId: row.targetId };
}

// The auto-incrementing `seq` key is what gives the queue its FIFO ordering for free — getAll/
// getAllFromIndex both return rows in ascending key order.
export async function getQueue(gameId: string): Promise<QueuedAction[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex("queue", "byGameId", gameId);
  return rows.map(toQueuedAction);
}

export async function enqueue(gameId: string, action: QueuedAction): Promise<void> {
  const db = await getDb();
  await db.add("queue", { ...action, gameId } as QueueRow);
}

// Removes a single action by its own localId (the caller's queue-shaped array, not the IDB seq key).
export async function removeQueuedAction(gameId: string, localId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("queue", "readwrite");
  const rows = await tx.store.index("byGameId").getAll(gameId);
  const match = rows.find((r) => r.localId === localId);
  if (match) await tx.store.delete(match.seq);
  await tx.done;
}

export async function clearQueue(gameId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("queue", "readwrite");
  const rows = await tx.store.index("byGameId").getAll(gameId);
  await Promise.all(rows.map((r) => tx.store.delete(r.seq)));
  await tx.done;
}
