"use client";

import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getInitials } from "@/lib/player-initials";

export type PickerEligiblePlayer = {
  gameParticipationId: string;
  name: string;
  disabledReason?: string;
};

export function PlayerPickerOverlay({
  open,
  onOpenChange,
  title,
  eligiblePlayers,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eligiblePlayers: PickerEligiblePlayer[];
  onSelect: (player: PickerEligiblePlayer) => void;
}) {
  // Synchronous guard (not state) so a fast double-tap on the same player can't fire onSelect twice
  // before React schedules a re-render. Reset on every open (not in onOpenChange): Base UI only calls
  // onOpenChange for a user-driven close (backdrop tap, swipe, Escape) — not when this component's
  // *controlled* `open` prop flips from false to true from the parent — so resetting there would leave
  // the guard permanently tripped after the very first pick across this component's whole lifetime.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (open) submittedRef.current = false;
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex-row items-center justify-between">
          <DrawerTitle>{title}</DrawerTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </DrawerHeader>
        <div className="flex flex-col gap-1 overflow-y-auto p-4 pt-2">
          {eligiblePlayers.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Keine Spieler verfügbar.</p>
          )}
          {eligiblePlayers.map((player) => (
            <button
              key={player.gameParticipationId}
              type="button"
              disabled={!!player.disabledReason}
              onClick={() => {
                if (submittedRef.current) return;
                submittedRef.current = true;
                onSelect(player);
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <Avatar size="sm">
                <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{player.name}</span>
                {player.disabledReason && (
                  <span className="truncate text-xs text-muted-foreground">{player.disabledReason}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
