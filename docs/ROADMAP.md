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

- Schema: `PlayerGameStat`, `PlayerGameStatEvent`.
- Live stat entry UI: tap a top-level action button (Tor/Kein Tor/7m Tor/7m Kein Tor for field players; Parade/Gegentor/7m Parade/7m Gegentor for keepers; 2-min/yellow/red discipline) then pick the player from a popup, per `FEATURES.md` #4.
- Per-entry undo via a persisted, timestamped event log (`PlayerGameStatEvent`) spanning the whole game — pulls forward Phase 7's deferred full correction screen; see `DATA_MODEL.md`/`OPEN_QUESTIONS.md`.
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
- Chart-type refinement.
- Install-prompt UX.
- Any other item from `OPEN_QUESTIONS.md` the user raises.

## Phase 8 — Admin tooling

- Schema: `role` on `User` (`COACH` | `ADMIN`, per `DATA_MODEL.md`).
- Separate admin login (same Credentials-based auth, gated by `role = ADMIN`).
- Admin dashboard: list coach accounts, edit a user's details, reset a user's password directly (admin sets a new password; no email flow).
- **Milestone**: an admin can log in separately from any coach, see all coach accounts, and edit a user's details or reset their password directly, as a support fallback.

## Phase 9 — Transactional email (Resend)

- Schema: `AuthToken` (per `DATA_MODEL.md`), `emailVerifiedAt` on `User`.
- Resend integration (`RESEND_API_KEY`, domain already verified by the account owner).
- Signup sends a confirmation email with a verification link.
- "Forgot password" flow: coach requests a reset email, follows a single-use link, sets a new password.
- **Milestone**: a coach receives a real confirmation email on signup, and can self-serve a password reset by email without the admin's help — the admin-driven reset from Phase 8 remains as a fallback.

## Phase 10 — Site-wide design rework, home page, settings, game delete/reopen

Only after Phase 9 is solid and in real use. The live game view (`games/[gameId]`) and the stats page are the app's most visually developed screens — shared `PageHeader`, shadcn `Table`/`Card`/`Badge`/`Button`/`AlertDialog`. Everything else (dashboard, roster, seasons, the games list, and every auth page including the two Phase 9 just added) is still plain `<ul>`/`<li>` lists or hand-rolled `<input>`/`<button>` markup. This phase brings the rest of the app up to that same visual language, and adds the account/game-management pieces a coach is missing:

- Visual rework of dashboard, roster, seasons, games list, login, signup, forgot-password, reset-password, and admin login to use the established shadcn primitives instead of plain markup. Adding `input`/`label` (`npx shadcn add`) will likely be needed for the auth pages — record that in `ARCHITECTURE.md` when it happens, per the root `CLAUDE.md`'s "check ARCHITECTURE.md before adding a dependency" rule.
- Home page (`dashboard`) redesign, replacing today's bare nav-link list with an at-a-glance overview:
  - An all-time leaderboard (top scorers by goals, top keepers by saves) — reuses the existing all-time aggregate query (`stats/queries.ts`'s `getPlayerStats`), no new aggregation logic needed.
  - The most recent game's result and per-player goals/saves tally, picked by `date` (not insertion order/id) — mirrors the ordering the games list page already uses.
  - Season/roster/games navigation stays reachable from here, just no longer as the entire page.
- Settings page: self-service password change and email change while signed in (distinct from Phase 9's forgot-password reset flow, which is for a locked-out coach). Exact behavior for email change — whether it requires confirming the current password, and whether it takes effect immediately (informational re-verify, matching Phase 9's decision) or only once the new address is confirmed — is undecided; see `OPEN_QUESTIONS.md`.
- Game delete, with an `AlertDialog` confirmation (same pattern as the existing close-game confirmation). A game's participations/stats/event log all cascade-delete already (`onDelete: "cascade"` throughout `src/db/schema.ts`) — no schema change needed.
- Game reopen: a closed game (`ownScore`/`opponentScore` both set) currently can never be edited again. Add a `reopenGame` action (clears both scores, symmetric to the existing `closeGame`) and a reopen control on a closed game's page. The existing close-game confirmation's copy ("kann nicht rückgängig gemacht werden") needs updating once this ships, since closing is no longer actually irreversible.
- **Milestone**: every page shares one consistent visual language, the home page surfaces real at-a-glance stats instead of a bare nav list, and a coach can change their password/email and delete or reopen a game, all from the UI.

## Phase 11 — Detailed shot-type tracking

- Extend live stat entry (Phase 4) beyond a plain goal/miss per attempt to also capture *how* the shot was taken: e.g. Durchbruch (breakthrough), Sprungwurf/Rückraum, Außen (wing), Kreis (pivot/6m), über die Abwehr (over the defense), 6m frei (ohne Gegnereinwirkung), Schlagwurf, Gegenstoß/Tempogegenstoß — a starting list; finalize the exact taxonomy when this phase is planned (see `OPEN_QUESTIONS.md`).
- Applies symmetrically to keepers: a save/goal-conceded should also record which shot type it was against, not just field players' attempts.
- **Milestone**: a coach can tag each recorded shot with its type, and later see stats broken down by shot type instead of only an aggregate goal/miss ratio.

## Phase 12 — Multi-account switcher

- Let one browser hold more than one authenticated session at once (e.g. someone who coaches two separate teams under two separate accounts, or an admin who also has their own coach account) and switch which account is active via a UI switcher, without a full logout/login cycle each time.
- This is a session/UX convenience, not multi-team support — each account still manages exactly one team, per `OVERVIEW.md`'s non-goals; a switcher just avoids re-entering credentials to move between accounts already logged into.
- Schema: none anticipated. Exact mechanism (e.g. multiple session cookies vs. a server-side session list) is undecided — see `OPEN_QUESTIONS.md`.
- **Milestone**: a user can be logged in to two or more accounts simultaneously in the same browser and switch the active one from a UI switcher without re-authenticating.
