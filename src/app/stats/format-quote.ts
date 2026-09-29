import type { RawCounters } from "./queries";

export type QuoteKey = "wurfquote" | "quote7m" | "paradenquote" | "quote7mParaden";

// The single place STATS.md's four formulas are defined — every display site (cards, table, chart)
// reads from this instead of re-spelling out which raw counters back each quote.
export const QUOTES: Record<QuoteKey, { label: string; made: keyof RawCounters; attempts: keyof RawCounters }> = {
  wurfquote: { label: "Wurfquote", made: "goalsRegular", attempts: "shotsRegular" },
  quote7m: { label: "7m-Quote", made: "goals7m", attempts: "shots7m" },
  paradenquote: { label: "Paradenquote", made: "savesRegular", attempts: "shotsFacedRegular" },
  quote7mParaden: { label: "7m-Paradenquote", made: "saves7m", attempts: "shotsFaced7m" },
};

export function computeQuote(made: number, attempts: number): number | null {
  return attempts > 0 ? made / attempts : null;
}

export function toPercent(quote: number | null): number | null {
  return quote === null ? null : Math.round(quote * 100);
}

export function formatQuote(quote: number | null): string {
  const percent = toPercent(quote);
  return percent === null ? "—" : `${percent}%`;
}
