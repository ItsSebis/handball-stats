"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recordEvent, type StatEvent } from "./actions";
import type { Participant } from "./participant";
import { PlayerPickerOverlay, type PickerEligiblePlayer } from "./player-picker-overlay";
import { Button } from "@/components/ui/button";

const FIELD_ACTIONS: { label: string; event: StatEvent }[] = [
  { label: "Tor", event: "SHOT_REGULAR_GOAL" },
  { label: "Kein Tor", event: "SHOT_REGULAR_MISS" },
  { label: "7m Tor", event: "SHOT_7M_GOAL" },
  { label: "7m Kein Tor", event: "SHOT_7M_MISS" },
];

const KEEPER_ACTIONS: { label: string; event: StatEvent }[] = [
  { label: "Parade", event: "SAVE_REGULAR" },
  { label: "Gegentor", event: "GOAL_CONCEDED_REGULAR" },
  { label: "7m Parade", event: "SAVE_7M" },
  { label: "7m Gegentor", event: "GOAL_CONCEDED_7M" },
];

const DISCIPLINE_ACTIONS: { label: string; event: StatEvent }[] = [
  { label: "2-Min", event: "TWO_MIN_PENALTY" },
  { label: "Gelb", event: "YELLOW_CARD" },
  { label: "Rot", event: "RED_CARD" },
];

type ActivePicker = { title: string; eventType: StatEvent; players: PickerEligiblePlayer[] };

function toEligible(participants: Participant[], event: StatEvent): PickerEligiblePlayer[] {
  return participants.map((p) => {
    if (event === "YELLOW_CARD") {
      return {
        gameParticipationId: p.gameParticipationId,
        name: p.name,
        disabled: p.yellowCard,
        disabledReason: p.yellowCard ? "bereits verwarnt" : undefined,
      };
    }
    if (event === "RED_CARD") {
      return {
        gameParticipationId: p.gameParticipationId,
        name: p.name,
        disabled: p.redCard,
        disabledReason: p.redCard ? "bereits vom Feld gestellt" : undefined,
      };
    }
    return { gameParticipationId: p.gameParticipationId, name: p.name };
  });
}

export function ActionButtons({
  fieldPlayers,
  keepers,
  showDiscipline,
}: {
  fieldPlayers: Participant[];
  keepers: Participant[];
  showDiscipline: boolean;
}) {
  const [activePicker, setActivePicker] = useState<ActivePicker | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openPicker(label: string, event: StatEvent, participants: Participant[]) {
    setError(null);
    setActivePicker({ title: `${label} – wer?`, eventType: event, players: toEligible(participants, event) });
  }

  function handleSelect(player: PickerEligiblePlayer) {
    if (!activePicker) return;
    const { eventType } = activePicker;
    setActivePicker(null);
    startTransition(async () => {
      const result = await recordEvent(player.gameParticipationId, eventType);
      if (!result.ok) {
        setError(
          result.reason === "no_op" ? "Ereignis war bereits erfasst." : "Ereignis konnte nicht gespeichert werden.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {fieldPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feldspieler</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {FIELD_ACTIONS.map((action) => (
              <Button
                key={action.event}
                type="button"
                variant="outline"
                disabled={isPending}
                className="h-auto py-3"
                onClick={() => openPicker(action.label, action.event, fieldPlayers)}
              >
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {keepers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Torhüter</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {KEEPER_ACTIONS.map((action) => (
              <Button
                key={action.event}
                type="button"
                variant="outline"
                disabled={isPending}
                className="h-auto py-3"
                onClick={() => openPicker(action.label, action.event, keepers)}
              >
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {showDiscipline && (
        <Card>
          <CardHeader>
            <CardTitle>Disziplin</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {DISCIPLINE_ACTIONS.map((action) => (
              <Button
                key={action.event}
                type="button"
                variant="outline"
                disabled={isPending}
                className="h-auto py-3"
                onClick={() => openPicker(action.label, action.event, [...fieldPlayers, ...keepers])}
              >
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PlayerPickerOverlay
        open={activePicker !== null}
        onOpenChange={(open) => {
          if (!open) setActivePicker(null);
        }}
        title={activePicker?.title ?? ""}
        eligiblePlayers={activePicker?.players ?? []}
        onSelect={handleSelect}
      />
    </div>
  );
}
