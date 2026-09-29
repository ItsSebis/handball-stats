"use client";

import { useState, useTransition } from "react";
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUndo(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await undoEventById(id);
      if (!result.ok) {
        setError(result.reason === "already_undone" ? "Bereits rückgängig gemacht." : "Rückgängig machen fehlgeschlagen.");
      }
      setPendingId(null);
    });
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
          {entry.undone ? (
            <Badge variant="secondary">Rückgängig</Badge>
          ) : (
            !closed && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending && pendingId === entry.id}
                onClick={() => handleUndo(entry.id)}
              >
                Rückgängig
              </Button>
            )
          )}
        </div>
      ))}
    </div>
  );
}
