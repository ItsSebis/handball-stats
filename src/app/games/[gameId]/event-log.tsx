"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getInitials } from "@/lib/player-initials";
import { undoEventById, type StatEvent } from "./actions";
import { EVENT_LABELS } from "./event-labels";

export type GameEventLogEntry = {
  id: string;
  playerName: string;
  eventType: StatEvent;
  createdAt: Date;
  undone: boolean;
};

export function EventLog({ entries, closed }: { entries: GameEventLogEntry[]; closed: boolean }) {
  // A Set, not a single id: undoing row A must not re-enable row B's button while B is still in
  // flight (and vice versa) if the coach taps undo on two different rows in quick succession.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function handleUndo(id: string) {
    setError(null);
    setPendingIds((prev) => new Set(prev).add(id));
    void (async () => {
      const result = await undoEventById(id);
      if (!result.ok) {
        setError(result.reason === "already_undone" ? "Bereits rückgängig gemacht." : "Rückgängig machen fehlgeschlagen.");
      }
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    })();
  }

  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Noch keine Ereignisse erfasst.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 rounded-lg px-2 py-2 ${entry.undone ? "opacity-50" : ""}`}
        >
          <Avatar size="sm">
            <AvatarFallback>{getInitials(entry.playerName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate text-sm font-medium ${entry.undone ? "line-through" : ""}`}>
              {entry.playerName} – {EVENT_LABELS[entry.eventType]}
            </span>
            <span className="text-xs text-muted-foreground">{formatRelativeTime(entry.createdAt)}</span>
          </div>
          {entry.undone && <Badge variant="secondary">Rückgängig</Badge>}
          {!entry.undone && !closed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pendingIds.has(entry.id)}
              onClick={() => handleUndo(entry.id)}
            >
              Rückgängig
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
