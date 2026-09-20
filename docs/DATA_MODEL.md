# Data model

Entity names and fields below are a proposal for the schema (e.g. Drizzle table definitions) — not final SQL. Keep every table exactly this small; do not add columns "for later."

## `User`
- `id`
- `email` (unique)
- `passwordHash`
- `createdAt`

One-to-one with `Team`.

## `Team`
- `id`
- `userId` → `User.id`
- `name`

## `Season`
- `id`
- `teamId` → `Team.id`
- `label` (e.g. `"2025/26"`)
- `startDate`
- `endDate`

## `Player`
- `id`
- `teamId` → `Team.id`
- `name`
- `type`: `FIELD` | `KEEPER`
- `active` (boolean) — inactive players are excluded from new-game roster selection but keep their historical stats and stay visible in past games/overviews.

## `Game`
- `id`
- `teamId` → `Team.id`
- `seasonId` → `Season.id`
- `opponentName`
- `date`
- `ownScore`
- `opponentScore`

## `GameParticipation`
- `id`
- `gameId` → `Game.id`
- `playerId` → `Player.id`
- `present` (boolean)

Only rows with `present = true` get a corresponding `PlayerGameStat`.

## `PlayerGameStat`
1:1 with a present `GameParticipation`.

- `id`
- `gameParticipationId` → `GameParticipation.id`

Field player counters:
- `shotsRegular`, `goalsRegular`
- `shots7m`, `goals7m`

Keeper counters:
- `shotsFacedRegular`, `savesRegular`
- `shotsFaced7m`, `saves7m`

Shared discipline counters (all players, per game):
- `twoMinPenalties` (int)
- `yellowCard` (boolean)
- `redCard` (boolean)

A given row only populates the counters relevant to the player's `type` (field vs. keeper) — don't force irrelevant columns to be filled.

## Derived stats — never stored

Wurfquote, 7m-Quote, Paradenquote, and 7m-Paradenquote are **always computed**, never persisted as columns. To get a value for any scope (single game, a season, or all-time), sum the relevant raw counters across every `PlayerGameStat` row in that scope, then divide. See `STATS.md` for the exact formulas.
