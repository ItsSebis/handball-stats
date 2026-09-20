# Roadmap

Build order. Each phase is a **major, working milestone** the next phase builds on top of — not a flat feature checklist. Do not start a phase's schema/UI until the previous phase's milestone is actually working. Do not build ahead of the current phase "for later."

## Phase 0 — Scaffolding

- Next.js app (App Router, TypeScript) created.
- Tailwind + shadcn/ui wired up.
- Repo linked to the Vercel project; Neon DB attached (empty, no schema yet).
- **Milestone**: the app deploys to a Vercel preview URL and renders a blank shell.

## Phase 1 — Auth foundation

- Schema: `User`, `Team`.
- Auth.js Credentials provider: signup, login, logout, DB-backed sessions.
- A protected dashboard route (empty besides auth-gating).
- **Milestone**: a coach can sign up, log in, and land on an empty, auth-gated team dashboard.

## Phase 2 — Roster management

- Schema: `Season`, `Player`.
- Season creation UI.
- Bulk player import (two newline-list textareas → field players / keepers, per `FEATURES.md` #1).
- **Milestone**: a coach can create a season and import a full roster split into keepers and field players.

## Phase 3 — Game setup

- Schema: `Game`, `GameParticipation`.
- "Create game" flow: season, opponent name, date, present/absent picker over the active roster (per `FEATURES.md` #3).
- **Milestone**: a coach can create a game for the current season and mark who's present.

## Phase 4 — Live stat entry (online)

- Schema: `PlayerGameStat`.
- Per-player stat entry UI: regular/7m shots+goals (field players), regular/7m shots-faced+saves (keepers), 2-min/yellow/red (per `FEATURES.md` #4).
- Closing a game with the final score.
- No offline handling yet — assume connectivity.
- **Milestone**: a coach can fully record and close out a real game's stats while online.

## Phase 5 — Derived stats & team overview

- Wurfquote / 7m-Quote / Paradenquote / 7m-Paradenquote computed per game, per season, and all-time, exactly per `STATS.md`.
- Team overview page: graphs + tables, season switcher (per `FEATURES.md` #5).
- **Milestone**: recording a game immediately shows up in the team overview's trends and tables — the full stats loop is closed end-to-end.

## Phase 6 — Offline-capable live entry

- PWA service worker (app-shell caching).
- Local persistence (localStorage/IndexedDB) of in-progress game entry.
- Batched/retried sync to the server per the strategy in `ARCHITECTURE.md`.
- **Milestone**: a coach can record a full game in the gym with no connectivity and have it sync correctly once back online.

## Phase 7 — Deferred polish

Only after phases 0–6 are solid and in real use. Resolve items from `OPEN_QUESTIONS.md` as they become actually relevant — not preemptively:
- Password-reset flow.
- Chart-type refinement.
- Install-prompt UX.
- Stat-entry correction/undo.
- Any other item from `OPEN_QUESTIONS.md` the user raises.
