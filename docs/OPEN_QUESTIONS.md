# Open questions

Explicitly deferred/undecided. Do not silently invent answers to these — ask, or leave them for a later pass, per whichever the roadmap phase calls for.

- Exact chart types/library for the team overview graphs.
- PWA install-prompt UX details.
- Whether an unverified email address blocks login/dashboard access, or the confirmation email (Phase 9) is purely informational and login works regardless.
- Whether a full stat-correction/edit screen is needed (Phase 7), beyond the per-player "undo last event" already shipped in Phase 4 (reverts only the single most recent tap for that player, in the current page session — no history across reloads, no editing an arbitrary earlier entry).
- Whether jersey numbers are tracked alongside player names (not currently in scope — bulk import is name-only).
- Exact shot-type/position taxonomy for Phase 10, and whether it's modeled as a new per-shot entity or an extension of `PlayerGameStat`'s aggregate counters — must keep the `STATS.md` formulas intact either way.
