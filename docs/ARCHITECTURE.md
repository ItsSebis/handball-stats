# Architecture

## Stack

- **Framework**: Next.js, App Router, TypeScript.
- **UI**: Tailwind CSS + shadcn/ui. Mobile-first layouts; German-language copy throughout the UI.
- **ORM**: Drizzle — proposed for its minimal footprint relative to Prisma. Flag as a recommendation; confirm before writing the first migration if this turns out to be a poor fit.
- **Database**: Neon Postgres, provisioned via the Vercel Marketplace integration (already connected to this account via the Vercel MCP/plugin).
- **Auth**: Custom email/password via Auth.js (NextAuth) Credentials provider. Own `User` table, hashed passwords (e.g. bcrypt/argon2), DB-backed sessions. No third-party auth service (Clerk/Auth0 etc.) — this was an explicit choice.
- **Hosting**: Vercel. Deploy via the connected Vercel project.

## Environment / setup needs

- Vercel project created and linked to this repo.
- Neon integration attached to the project → `DATABASE_URL` env var populated automatically.
- An Auth.js secret env var (`AUTH_SECRET` or equivalent) set in Vercel project settings.
- These are provisioned through the already-connected Vercel plugin/MCP tools — no manual dashboard steps should be needed.

## Offline / live-entry strategy

Stats need to be enterable live during a match, potentially with poor or no wifi in the gym. Because exactly one account (the coach) ever edits a given game — there is no multi-coach concurrent editing — the system does **not** need a general multi-writer offline-sync engine with conflict resolution. The minimal viable approach:

1. While a game is "in progress," all stat-entry state lives in local browser state (React state), persisted to `localStorage` or IndexedDB as a crash-safety net (so a page refresh or app kill doesn't lose in-progress data).
2. Each stat-entry action attempts to sync to the server; on failure (offline), it's queued and retried automatically once connectivity returns (a small retry queue, not a full sync framework).
3. A PWA service worker caches the app shell so the live-entry screen loads and works with no network at all.
4. There is no cross-device merge logic — the assumption is a single device/browser is used to enter a given game's stats.

This is a recommendation, not locked in — revisit if implementation reveals it's insufficient (e.g., the coach switches devices mid-game), but do not build more sync machinery than this until that need is confirmed.

## Guiding constraint

Every dependency and architectural piece here should map directly to a decision in this file. If implementation needs something not listed here (a new library, a new service), update this doc first — don't silently add it. See the "Minimal codebase" section of the root `CLAUDE.md`.
