# Features

Each feature below is tied directly to entities in `DATA_MODEL.md`. Build exactly this; anything not listed here belongs in `OPEN_QUESTIONS.md` until confirmed.

## 1. Bulk player import

Two separate inputs: one textarea for field players, one for keepers. Each is a newline-separated list of names. Submitting creates one `Player` row per line, with `type` set accordingly and `active = true`.

## 2. Season management

Create a `Season` (label, start/end date). New games are created within a season. A season switcher lets the coach view roster/games/stats scoped to a specific season, or all-time.

## 3. Game creation

Pick a season, enter opponent name and date. Present the active roster (field players and keepers) with a present/absent toggle per player. Submitting creates a `Game` row plus one `GameParticipation` row per roster player (present = true/false).

## 4. Live stat entry

For each present player in a `Game`, log events as they happen:
- Field players: regular shot/goal, or 7m shot/goal.
- Keepers: regular shot faced/save, or 7m shot faced/save.
- Any player: 2-minute penalty, yellow card, red card.

Live entry is action-first: the coach taps a top-level button for the event (e.g. Tor, Parade, 2-Min), then picks the player from a popup overlay filtered to eligible players (field players for field actions, keepers for keeper actions, everyone for discipline). Each logged event inserts a row into a persisted `PlayerGameStatEvent` log and increments the corresponding counter on that player's `PlayerGameStat` row (created on first event for that player in that game). Entry must work offline per the strategy in `ARCHITECTURE.md`. The coach enters the final score (`ownScore`/`opponentScore`) to close out the game.

A chronological event log (newest first) shows every event recorded this game, across all players. Any entry — not just the most recent one — can be undone independently via its own "Rückgängig" action; undone entries stay visible, marked as undone, rather than disappearing (see `DATA_MODEL.md`). A read-only per-player tally view stays available alongside the log, and is what a closed game shows in place of the action buttons.

The 2-minute/yellow/red discipline controls can be hidden from this screen via the `HIDE_DISCIPLINE_STATS` env var (see `ARCHITECTURE.md`), for a team that already tracks discipline elsewhere and wants the space for other stats instead. This only affects what's shown/enterable — it doesn't remove the underlying counters from the data model.

## 5. Team overview (account dashboard)

Graphs and tables showing, per `STATS.md`'s formulas:
- Team-wide and per-player Wurfquote, 7m-Quote (field players).
- Team-wide and per-player Paradenquote, 7m-Paradenquote (keepers).
- Trends across games within the selected season, and all-time.
- A season switcher to scope the view.

No opponent-team stats, no per-half breakdowns — keep this to what's specified in `STATS.md`.
