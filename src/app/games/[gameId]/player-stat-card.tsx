"use client";

import { useTransition } from "react";
import { recordEvent, type StatEvent } from "./actions";

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

export function PlayerStatCard({
  gameParticipationId,
  name,
  type,
  counts,
  closed,
}: {
  gameParticipationId: string;
  name: string;
  type: "FIELD" | "KEEPER";
  counts: Counts;
  closed: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function fire(event: StatEvent) {
    startTransition(() => recordEvent(gameParticipationId, event));
  }

  const disabled = closed || isPending;

  return (
    <div className="flex flex-col gap-3 rounded border p-3">
      <h3 className="font-medium">{name}</h3>

      {type === "FIELD" ? (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>Regulär</span>
              <span className="text-muted-foreground">
                {counts.goalsRegular}/{counts.shotsRegular}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={disabled} onClick={() => fire("SHOT_REGULAR_GOAL")} className={buttonClass}>
                Tor
              </button>
              <button type="button" disabled={disabled} onClick={() => fire("SHOT_REGULAR_MISS")} className={buttonClass}>
                Kein Tor
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>7m</span>
              <span className="text-muted-foreground">
                {counts.goals7m}/{counts.shots7m}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={disabled} onClick={() => fire("SHOT_7M_GOAL")} className={buttonClass}>
                Tor
              </button>
              <button type="button" disabled={disabled} onClick={() => fire("SHOT_7M_MISS")} className={buttonClass}>
                Kein Tor
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>Regulär</span>
              <span className="text-muted-foreground">
                {counts.savesRegular}/{counts.shotsFacedRegular}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={disabled} onClick={() => fire("SAVE_REGULAR")} className={buttonClass}>
                Parade
              </button>
              <button type="button" disabled={disabled} onClick={() => fire("GOAL_CONCEDED_REGULAR")} className={buttonClass}>
                Gegentor
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>7m</span>
              <span className="text-muted-foreground">
                {counts.saves7m}/{counts.shotsFaced7m}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={disabled} onClick={() => fire("SAVE_7M")} className={buttonClass}>
                Parade
              </button>
              <button type="button" disabled={disabled} onClick={() => fire("GOAL_CONCEDED_7M")} className={buttonClass}>
                Gegentor
              </button>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={disabled} onClick={() => fire("TWO_MIN_PENALTY")} className={buttonClass}>
          2-Min ({counts.twoMinPenalties})
        </button>
        <button
          type="button"
          disabled={disabled || counts.yellowCard}
          onClick={() => fire("YELLOW_CARD")}
          className={buttonClass}
        >
          Gelb{counts.yellowCard ? " ✓" : ""}
        </button>
        <button
          type="button"
          disabled={disabled || counts.redCard}
          onClick={() => fire("RED_CARD")}
          className={buttonClass}
        >
          Rot{counts.redCard ? " ✓" : ""}
        </button>
      </div>
    </div>
  );
}
