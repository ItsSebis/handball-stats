# Overview

A mobile-first web app for tracking handball statistics for a single team. A coach manages their team's roster, records per-game stats for each player, and reviews trends over a season and over time. The UI is in German; this documentation is in English for implementation purposes.

## Core loop

1. Coach signs up / logs in.
2. Coach creates a season and imports the roster (split into field players and keepers).
3. Coach creates a game, marks who is present/absent.
4. Coach records live stats during the game (shots/goals, shots faced/saves, cards/penalties).
5. Coach reviews the team overview: Wurfquote, Paradenquote, 7m-quotes, trends, per-player and team-wide.

## Non-goals (current scope)

These are explicitly out of scope unless the user asks for them later — do not build toward them speculatively:

- No multi-team or club support (one account manages exactly one team).
- No tracking of the opposing team's own stats/roster.
- No live spectator/public view of a game in progress.
- No multi-coach collaboration on the same team (single account per team).
- No push notifications.
- No password-reset flow yet (see `OPEN_QUESTIONS.md`).

See `DATA_MODEL.md` for entities, `FEATURES.md` for feature specs, `STATS.md` for the exact stat formulas, `ARCHITECTURE.md` for the technical stack, and `ROADMAP.md` for build order.
