"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getInitials } from "@/lib/player-initials";
import type { StatEvent } from "./event-effects";
import { EVENT_LABELS } from "./event-labels";

export type GameEventLogEntry = {
  id: string;
  gameParticipationId: string;
  playerName: string;
  eventType: StatEvent;
  createdAt: Date;
  undone: boolean;
  pending?: boolean;
};

export function EventLog({
  entries,
  onUndo,
  syncingId,
}: {
  entries: GameEventLogEntry[];
  // No `closed` flag: a closed game simply passes no onUndo, and the button hides itself.
  onUndo?: (id: string) => void;
  // The one entry currently in flight to the server — its own record hasn't resolved yet, so an undo
  // tapped now would have no real id to target. Hidden rather than merely disabled so it's clear the
  // tap wouldn't do anything, not just that it's briefly busy.
  syncingId?: string | null;
}) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Noch keine Ereignisse erfasst.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
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
          {entry.pending && <Badge variant="secondary">Wird synchronisiert</Badge>}
          {entry.undone && <Badge variant="secondary">Rückgängig</Badge>}
          {!entry.undone && onUndo && entry.id !== syncingId && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onUndo(entry.id)}>
              Rückgängig
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
