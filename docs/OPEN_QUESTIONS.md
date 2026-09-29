# Open questions

Explicitly deferred/undecided. Do not silently invent answers to these — ask, or leave them for a later pass, per whichever the roadmap phase calls for.

- ~~Exact chart types/library for the team overview graphs~~ — resolved for Phase 5: shadcn's chart component (`recharts` under the hood), a single line chart per player group for the game-by-game trend. ~~Exact chart-type refinement remains open for Phase 7.~~ — resolved for Phase 7: no chart-type change needed; added a labeled Y-axis (0–100%) and a legend to the existing line charts.
- ~~PWA install-prompt UX details.~~ — resolved for Phase 7: a dismissible in-app banner (`src/components/install-prompt.tsx`) triggers the native `beforeinstallprompt` flow on Chrome/Android, and shows manual "Zum Home-Bildschirm" instructions on iOS Safari (which never fires that event).
- Whether an unverified email address blocks login/dashboard access, or the confirmation email (Phase 9) is purely informational and login works regardless.
- ~~Whether a full stat-correction/edit screen is needed (Phase 7)~~ — resolved: pulled forward into Phase 4 as a persisted, per-entry-undoable event log (`PlayerGameStatEvent`, see `DATA_MODEL.md`) rather than deferred to Phase 7. Not covered by this: correcting games recorded before the event log existed (no log rows to undo for those), and anything beyond undo (e.g. editing an entry's type in place rather than undo-and-re-log).
- Whether jersey numbers are tracked alongside player names (not currently in scope — bulk import is name-only).
- Exact shot-type/position taxonomy for Phase 10, and whether it's modeled as a new per-shot entity or an extension of `PlayerGameStat`'s aggregate counters — must keep the `STATS.md` formulas intact either way.
