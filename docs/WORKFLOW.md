# Workflow

Follow this loop for any non-trivial feature or phase of work (see `docs/ROADMAP.md`), rather than implementing ad-hoc directly on the main branch:

1. **Plan first.** Enter plan mode (or otherwise produce a written plan) before writing code. Ground the plan in things actually read from the codebase — file paths, existing patterns, real constraints — not assumptions about what's probably there. If the scope or interpretation of the request is genuinely ambiguous in a way that changes the size or shape of the work, ask; otherwise research the answer instead of asking.

2. **Self-review the plan** with as much objective/automated checking as feasible (does it compile in principle, does it contradict an existing design decision, does it duplicate something that already exists) before presenting it for approval. Minimize back-and-forth — don't just ask "is this ok?" without having already checked what can be checked.

3. **Isolate the implementation** in a dedicated git worktree and branch, so the main branch stays untouched and reviewable until the work is ready to merge.

4. **Use a review hierarchy, not self-certification.** After implementing, run at least two independent review passes over the diff:
   - **Correctness and performance first** — an adversarial review looking for real bugs (logic errors, edge cases, unsafe assumptions, race conditions), not style. Reproduce suspected bugs before fixing them, and re-measure after fixing to confirm the fix actually worked.
   - **Cleanliness and simplification second** — duplicated logic that should be shared (or over-abstracted logic that should be inlined), dead code, stale or self-contradictory comments, naming and style consistency with the surrounding codebase. Correctness takes precedence when the two trade off.
   Prefer independent reviewers (a fresh subagent with no memory of *why* the code was written, not the same context that wrote it) — code that looks obviously correct to its own author is exactly the code most likely to hide a bug from that same author.

5. **Run full automated verification** after every round of fixes: the complete test suite, linter, and formatter for every language/toolchain touched — not just the tests for the specific thing that changed. Nothing gets called "done" on the basis of a partial test run.

6. **Manually verify the feature actually works**, end to end, not just that its tests pass: drive the real UI in a browser for user-facing changes, or run the real CLI/binary for headless changes. Automated tests check that code does what the tests assume it should; manual verification checks that the tests assumed the right thing.

7. **Merge back to the mainline branch**, then verify the merge landed cleanly (status is clean, log looks right, verification still passes on the mainline branch after merging — a clean merge can still combine two individually-fine pieces of work into something broken).

8. **Commit and push.**
