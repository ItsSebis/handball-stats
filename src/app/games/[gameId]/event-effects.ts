import type { statEventTypeEnum } from "@/db/schema";

export type StatEvent = (typeof statEventTypeEnum.enumValues)[number];

type CardEvent = "YELLOW_CARD" | "RED_CARD";
type CounterEvent = Exclude<StatEvent, CardEvent>;

export type CounterColumn =
  | "shotsRegular"
  | "goalsRegular"
  | "shots7m"
  | "goals7m"
  | "shotsFacedRegular"
  | "savesRegular"
  | "shotsFaced7m"
  | "saves7m"
  | "twoMinPenalties";

export type CardColumn = "yellowCard" | "redCard";

// The single source of truth for which columns each event touches — shared by the server actions
// (actions.ts) and the client-side offline optimistic mirror (offline-merge.ts), so the two can never
// silently drift apart on what a given StatEvent means.
export const COUNTER_EVENTS: Record<
  CounterEvent,
  { playerType: "FIELD" | "KEEPER" | null; columns: CounterColumn[] }
> = {
  SHOT_REGULAR_GOAL: { playerType: "FIELD", columns: ["shotsRegular", "goalsRegular"] },
  SHOT_REGULAR_MISS: { playerType: "FIELD", columns: ["shotsRegular"] },
  SHOT_7M_GOAL: { playerType: "FIELD", columns: ["shots7m", "goals7m"] },
  SHOT_7M_MISS: { playerType: "FIELD", columns: ["shots7m"] },
  SAVE_REGULAR: { playerType: "KEEPER", columns: ["shotsFacedRegular", "savesRegular"] },
  GOAL_CONCEDED_REGULAR: { playerType: "KEEPER", columns: ["shotsFacedRegular"] },
  SAVE_7M: { playerType: "KEEPER", columns: ["shotsFaced7m", "saves7m"] },
  GOAL_CONCEDED_7M: { playerType: "KEEPER", columns: ["shotsFaced7m"] },
  TWO_MIN_PENALTY: { playerType: null, columns: ["twoMinPenalties"] },
};

export const CARD_EVENTS: Record<CardEvent, CardColumn> = {
  YELLOW_CARD: "yellowCard",
  RED_CARD: "redCard",
};

export function isCardEvent(event: StatEvent): event is CardEvent {
  return event === "YELLOW_CARD" || event === "RED_CARD";
}
