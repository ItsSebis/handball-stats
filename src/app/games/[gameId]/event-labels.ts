import type { StatEvent } from "./event-effects";

export const EVENT_LABELS: Record<StatEvent, string> = {
  SHOT_REGULAR_GOAL: "Tor (Regulär)",
  SHOT_REGULAR_MISS: "Kein Tor (Regulär)",
  SHOT_7M_GOAL: "Tor (7m)",
  SHOT_7M_MISS: "Kein Tor (7m)",
  SAVE_REGULAR: "Parade (Regulär)",
  GOAL_CONCEDED_REGULAR: "Gegentor (Regulär)",
  SAVE_7M: "Parade (7m)",
  GOAL_CONCEDED_7M: "Gegentor (7m)",
  TWO_MIN_PENALTY: "2-Minuten-Strafe",
  YELLOW_CARD: "Gelbe Karte",
  RED_CARD: "Rote Karte",
};
