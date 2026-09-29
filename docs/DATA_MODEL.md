# Data model

Entity names and fields below are a proposal for the schema (e.g. Drizzle table definitions) — not final SQL. Keep every table exactly this small; do not add columns "for later."

## `User`
- `id`
- `email` (unique)
- `passwordHash`
- `role`: `COACH` | `ADMIN` (default `COACH`)
- `emailVerifiedAt` (nullable timestamp)
- `createdAt`

One-to-one with `Team` for `COACH` users. `ADMIN` users have no `Team`.

## `AuthToken`
- `id`
- `userId` → `User.id`
- `type`: `EMAIL_VERIFICATION` | `PASSWORD_RESET`
- `token` (unique, random)
- `expiresAt`
- `usedAt` (nullable)

Single-use link token backing both the signup confirmation email and the self-service password-reset email (Phase 9).

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

## `PlayerGameStatEvent`
Append-only log of every recorded/undone stat event, scoped to a `GameParticipation` (one player, one game).

- `id`
- `gameParticipationId` → `GameParticipation.id`
- `eventType`: the same event-type set used for live entry (`SHOT_REGULAR_GOAL` | `SHOT_REGULAR_MISS` | `SHOT_7M_GOAL` | `SHOT_7M_MISS` | `SAVE_REGULAR` | `GOAL_CONCEDED_REGULAR` | `SAVE_7M` | `GOAL_CONCEDED_7M` | `TWO_MIN_PENALTY` | `YELLOW_CARD` | `RED_CARD`)
- `undone` (boolean, default `false`) — soft-delete marker; undone rows are kept for audit, never hard-deleted
- `undoneAt` (nullable timestamp)
- `createdAt`

`PlayerGameStat`'s counters/booleans are maintained in lockstep with this log's non-undone rows: recording an event inserts one log row and applies its counter/boolean effect in the same statement, and undoing a specific log row (by id, not just "the last one") reverses exactly that entry's effect. A card boolean (`yellowCard`/`redCard`) only clears when no other non-undone entry of that type remains for the participation — a card can be logged, undone, and re-logged multiple times over a game. The aggregate table is still what every `STATS.md` formula reads; this table exists to make undo precise and auditable, not to replace the aggregate.

Games recorded before this table existed have no `PlayerGameStatEvent` rows — their `PlayerGameStat` totals stand alone and cannot be corrected via per-entry undo.

## Derived stats — never stored

Wurfquote, 7m-Quote, Paradenquote, and 7m-Paradenquote are **always computed**, never persisted as columns. To get a value for any scope (single game, a season, or all-time), sum the relevant raw counters across every `PlayerGameStat` row in that scope, then divide. See `STATS.md` for the exact formulas.
