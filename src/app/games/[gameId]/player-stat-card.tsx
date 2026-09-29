"use client";

import { useState, useTransition } from "react";
import { recordEvent, undoEvent, type StatEvent } from "./actions";

type Counts = {
  shotsRegular: number;
  goalsRegular: number;
  shots7m: number;
  goals7m: number;
  shotsFacedRegular: number;
  savesRegular: number;
  shotsFaced7m: number;
  saves7m: number;
  twoMinPenalties: number;
  yellowCard: boolean;
  redCard: boolean;
};

const buttonClass = "rounded border px-3 py-3 text-sm disabled:opacity-50";

const EVENT_LABELS: Record<StatEvent, string> = {
  SHOT_REGULAR_GOAL: "Tor (Regulär)",
  SHOT_REGULAR_MISS: "Kein Tor (Regulär)",
  SHOT_7M_GOAL: "Tor (7m)",
  SHOT_7M_MISS: "Kein Tor (7m)",
  SAVE_REGULAR: "Parade (Regulär)",
  GOAL_CONCEDED_REGULAR: "Gegentor (Regulär)",
  SAVE_7M: "Parade (7m)",
  GOAL_CONCEDED_7M: "Gegentor (7m)",
  TWO_MIN_PENALTY: "2-Min",
  YELLOW_CARD: "Gelbe Karte",
  RED_CARD: "Rote Karte",
};

function ShotSection({
  label,
  made,
  total,
  hit,
  miss,
  disabled,
  onRecord,
}: {
  label: string;
  made: number;
  total: number;
  hit: { label: string; event: StatEvent };
  miss: { label: string; event: StatEvent };
  disabled: boolean;
  onRecord: (event: StatEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {made}/{total}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={disabled} onClick={() => onRecord(hit.event)} className={buttonClass}>
          {hit.label}
        </button>
        <button type="button" disabled={disabled} onClick={() => onRecord(miss.event)} className={buttonClass}>
          {miss.label}
        </button>
      </div>
    </div>
  );
}

export function PlayerStatCard({
  gameParticipationId,
  name,
  type,
  counts,
  closed,
  showDiscipline,
}: {
  gameParticipationId: string;
  name: string;
  type: "FIELD" | "KEEPER";
  counts: Counts;
  closed: boolean;
  showDiscipline: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<StatEvent | null>(null);

  function handleEvent(event: StatEvent) {
    setError(null);
    startTransition(async () => {
      try {
        await recordEvent(gameParticipationId, event);
        setLastEvent(event);
      } catch (err) {
        console.error("recordEvent failed", err);
        setError("Ereignis konnte nicht gespeichert werden.");
      }
    });
  }

  function handleUndo() {
    if (!lastEvent) return;
    setError(null);
    startTransition(async () => {
      try {
        await undoEvent(gameParticipationId, lastEvent);
        setLastEvent(null);
      } catch (err) {
        console.error("undoEvent failed", err);
        setError("Rückgängig machen fehlgeschlagen.");
      }
    });
  }

  const disabled = closed || isPending;

  return (
    <div className="flex flex-col gap-3 rounded border p-3">
      <h3 className="font-medium">{name}</h3>

      {type === "FIELD" ? (
        <>
          <ShotSection
            label="Regulär"
            made={counts.goalsRegular}
            total={counts.shotsRegular}
            hit={{ label: "Tor", event: "SHOT_REGULAR_GOAL" }}
            miss={{ label: "Kein Tor", event: "SHOT_REGULAR_MISS" }}
            disabled={disabled}
            onRecord={handleEvent}
          />
          <ShotSection
            label="7m"
            made={counts.goals7m}
            total={counts.shots7m}
            hit={{ label: "Tor", event: "SHOT_7M_GOAL" }}
            miss={{ label: "Kein Tor", event: "SHOT_7M_MISS" }}
            disabled={disabled}
            onRecord={handleEvent}
          />
        </>
      ) : (
        <>
          <ShotSection
            label="Regulär"
            made={counts.savesRegular}
            total={counts.shotsFacedRegular}
            hit={{ label: "Parade", event: "SAVE_REGULAR" }}
            miss={{ label: "Gegentor", event: "GOAL_CONCEDED_REGULAR" }}
            disabled={disabled}
            onRecord={handleEvent}
          />
          <ShotSection
            label="7m"
            made={counts.saves7m}
            total={counts.shotsFaced7m}
            hit={{ label: "Parade", event: "SAVE_7M" }}
            miss={{ label: "Gegentor", event: "GOAL_CONCEDED_7M" }}
            disabled={disabled}
            onRecord={handleEvent}
          />
        </>
      )}

      {showDiscipline && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" disabled={disabled} onClick={() => handleEvent("TWO_MIN_PENALTY")} className={buttonClass}>
            2-Min ({counts.twoMinPenalties})
          </button>
          <button
            type="button"
            disabled={disabled || counts.yellowCard}
            onClick={() => handleEvent("YELLOW_CARD")}
            className={buttonClass}
          >
            Gelb{counts.yellowCard ? " ✓" : ""}
          </button>
          <button
            type="button"
            disabled={disabled || counts.redCard}
            onClick={() => handleEvent("RED_CARD")}
            className={buttonClass}
          >
            Rot{counts.redCard ? " ✓" : ""}
          </button>
        </div>
      )}

      {lastEvent && (
        <button type="button" disabled={disabled} onClick={handleUndo} className="text-left text-sm underline disabled:opacity-50">
          Rückgängig: {EVENT_LABELS[lastEvent]}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
