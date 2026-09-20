@AGENTS.md

# handball-stats

Mobile-first handball statistics tracker for a single team, hosted on Vercel. Full product spec lives in `docs/`:

- `docs/OVERVIEW.md` — product summary and explicit non-goals.
- `docs/DATA_MODEL.md` — entities and fields.
- `docs/ARCHITECTURE.md` — tech stack and hosting/env setup.
- `docs/STATS.md` — exact formulas for Wurfquote, 7m-Quote, Paradenquote, 7m-Paradenquote.
- `docs/FEATURES.md` — feature-by-feature spec.
- `docs/ROADMAP.md` — phased build order; work through phases in order.
- `docs/OPEN_QUESTIONS.md` — explicitly deferred decisions; don't silently resolve these yourself.
- `docs/WORKFLOW.md` — the plan → worktree → implement → review → verify → merge → push loop to follow for every roadmap phase.

## Minimal codebase

Build exactly what the current spec in `docs/` requires — nothing more.

- No speculative abstractions, no "for future use" code paths, no unused config or feature flags.
- Before adding a dependency, check `docs/ARCHITECTURE.md`. If it's not the stack decision recorded there, don't add it without updating that doc first.
- When a requirement is ambiguous or not covered by `docs/`, stop and ask rather than guessing or expanding scope.
- Prefer deleting or simplifying over accumulating optional code paths.
- Don't implement ahead of the current `docs/ROADMAP.md` phase "for later" — each phase should only contain what its milestone needs.
