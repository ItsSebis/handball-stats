# Stats

All four headline stats are **computed on read**, never stored (see `DATA_MODEL.md`). For any scope (a single game, a season, or all-time), sum the relevant raw counters across every `PlayerGameStat` row in that scope, then divide — never average per-game percentages.

## Field players

- **Wurfquote** (shot/scoring quote, regular play) = `sum(goalsRegular) / sum(shotsRegular)`
- **7m-Quote** (penalty-throw scoring quote) = `sum(goals7m) / sum(shots7m)`

## Keepers

- **Paradenquote** (save quote, regular play) = `sum(savesRegular) / sum(shotsFacedRegular)`
- **7m-Paradenquote** (penalty-throw save quote) = `sum(saves7m) / sum(shotsFaced7m)`

## Scope / views

- **Per game**: game detail view — one game's `PlayerGameStat` rows only.
- **Per season**: season overview — all games in that `Season`.
- **All-time**: team overview — every game the team has ever played.

Guard against division by zero (0 shots/shots-faced in scope) by displaying "—" or "no data" rather than `NaN`/`Infinity` — a player with zero attempts in scope has no quote to show.

## Discipline counters

`twoMinPenalties`, `yellowCard`, `redCard` are simple sums/counts over the scope — no derived formula, just totals (e.g. "3× 2-minute penalties this season").
