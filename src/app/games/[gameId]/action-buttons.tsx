"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recordEvent, type StatEvent } from "./actions";
import type { Participant } from "./participant";
import { PlayerPickerOverlay, type PickerEligiblePlayer } from "./player-picker-overlay";

type Action = { label: string; event: StatEvent };

const FIELD_ACTIONS: Action[] = [
  { label: "Tor", event: "SHOT_REGULAR_GOAL" },
  { label: "Kein Tor", event: "SHOT_REGULAR_MISS" },
  { label: "7m Tor", event: "SHOT_7M_GOAL" },
  { label: "7m Kein Tor", event: "SHOT_7M_MISS" },
];

const KEEPER_ACTIONS: Action[] = [
  { label: "Parade", event: "SAVE_REGULAR" },
  { label: "Gegentor", event: "GOAL_CONCEDED_REGULAR" },
  { label: "7m Parade", event: "SAVE_7M" },
  { label: "7m Gegentor", event: "GOAL_CONCEDED_7M" },
];

const DISCIPLINE_ACTIONS: Action[] = [
  { label: "2-Min", event: "TWO_MIN_PENALTY" },
  { label: "Gelb", event: "YELLOW_CARD" },
  { label: "Rot", event: "RED_CARD" },
];

// Only YELLOW_CARD/RED_CARD exclude a player who already has that card; every other event has no
// exclusion rule, hence the lookup rather than a branch per event.
const CARD_ALREADY_SET: Partial<Record<StatEvent, { has: (p: Participant) => boolean; reason: string }>> = {
  YELLOW_CARD: { has: (p) => p.yellowCard, reason: "bereits verwarnt" },
  RED_CARD: { has: (p) => p.redCard, reason: "bereits vom Feld gestellt" },
};

type ActivePicker = { title: string; eventType: StatEvent; players: PickerEligiblePlayer[] };

function toEligible(participants: Participant[], event: StatEvent): PickerEligiblePlayer[] {
  const cardRule = CARD_ALREADY_SET[event];
  return participants.map((p) => ({
    gameParticipationId: p.gameParticipationId,
    name: p.name,
    disabledReason: cardRule?.has(p) ? cardRule.reason : undefined,
  }));
}

function ActionGroup({
  title,
  actions,
  participants,
  columns,
  disabled,
  onPick,
}: {
  title: string;
  actions: Action[];
  participants: Participant[];
  columns: 2 | 3;
  disabled: boolean;
  onPick: (label: string, event: StatEvent, participants: Participant[]) => void;
}) {
  if (participants.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={columns === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
        {actions.map((action) => (
          <Button
            key={action.event}
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-auto py-3"
            onClick={() => onPick(action.label, action.event, participants)}
          >
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
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
      <ActionGroup
        title="Feldspieler"
        actions={FIELD_ACTIONS}
        participants={fieldPlayers}
        columns={2}
        disabled={isPending}
        onPick={openPicker}
      />
      <ActionGroup
        title="Torhüter"
        actions={KEEPER_ACTIONS}
        participants={keepers}
        columns={2}
        disabled={isPending}
        onPick={openPicker}
      />
      {showDiscipline && (
        <ActionGroup
          title="Disziplin"
          actions={DISCIPLINE_ACTIONS}
          participants={[...fieldPlayers, ...keepers]}
          columns={3}
          disabled={isPending}
          onPick={openPicker}
        />
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
