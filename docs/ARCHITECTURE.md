# Architecture

## Stack

- **Framework**: Next.js, App Router, TypeScript.
- **UI**: Tailwind CSS + shadcn/ui. Mobile-first layouts; German-language copy throughout the UI.
- **ORM**: Drizzle (adopted in Phase 1: `drizzle-orm` + `drizzle-kit`, using the `@neondatabase/serverless` driver via `drizzle-orm/neon-http`).
- **Database**: Neon Postgres. Production is provisioned via the Vercel Marketplace integration (already connected to this account via the Vercel MCP/plugin). Local development uses a separate Neon project created through the Neon CLI's Claimable flow (`neon claim create`, no login required) until the account owner attaches the production one — same Drizzle schema/migrations apply to either; they are just different physical databases, as dev and prod normally are.
- **Auth**: Custom email/password via Auth.js (NextAuth v5) Credentials provider, **JWT session strategy**. Auth.js's Credentials provider structurally requires JWT sessions — it throws at runtime if you configure `session: { strategy: "database" }` with only a Credentials provider (database sessions are for other provider types via an adapter). This does not weaken the "DB for login" intent: the `User` table with hashed passwords is still the actual source of truth; the JWT session cookie is just a signed pointer to it, not where account data lives. No Auth.js adapter package is needed for Credentials-only + JWT — the `authorize()` callback queries our own `User` table directly via Drizzle. Password hashing uses Node's built-in `crypto.scrypt` (no external hashing dependency). No third-party auth service (Clerk/Auth0 etc.) — this was an explicit choice.
- **Hosting**: Vercel. Deploy via the connected Vercel project.

## Environment / setup needs

- Vercel project created and linked to this repo.
- Neon integration attached to the project → `DATABASE_URL` env var populated automatically.
- An Auth.js secret env var (`AUTH_SECRET` or equivalent) set in Vercel project settings.
- **Correction learned in Phase 0**: the connected Vercel MCP/plugin token is deliberately restricted from two things — linking a Vercel project to a GitHub repo (the GitHub App authorization is an interactive consent step) and installing/accepting terms for a Marketplace integration like Neon (a billing-consent step). Both need to be done once by the account owner, via the Vercel dashboard or an authenticated `vercel` CLI session — not automatable from here. Everything else (project creation, env vars, deployments once Git is linked) works through the MCP tools.

## Offline / live-entry strategy

Stats need to be enterable live during a match, potentially with poor or no wifi in the gym. Because exactly one account (the coach) ever edits a given game — there is no multi-coach concurrent editing — the system does **not** need a general multi-writer offline-sync engine with conflict resolution. The minimal viable approach:

1. While a game is "in progress," all stat-entry state lives in local browser state (React state), persisted to `localStorage` or IndexedDB as a crash-safety net (so a page refresh or app kill doesn't lose in-progress data).
2. Each stat-entry action attempts to sync to the server; on failure (offline), it's queued and retried automatically once connectivity returns (a small retry queue, not a full sync framework).
3. A PWA service worker caches the app shell so the live-entry screen loads and works with no network at all.
4. There is no cross-device merge logic — the assumption is a single device/browser is used to enter a given game's stats.

This is a recommendation, not locked in — revisit if implementation reveals it's insufficient (e.g., the coach switches devices mid-game), but do not build more sync machinery than this until that need is confirmed.

## Guiding constraint

Every dependency and architectural piece here should map directly to a decision in this file. If implementation needs something not listed here (a new library, a new service), update this doc first — don't silently add it. See the "Minimal codebase" section of the root `CLAUDE.md`.
