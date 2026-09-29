// The stats schema doesn't segregate columns by player type (a FIELD row's keeper columns just stay
// zero, and vice versa) — this mirrors that shape rather than splitting into two near-identical types.
export type Participant = {
  gameParticipationId: string;
  name: string;
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
