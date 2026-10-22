# Retro: note tags

- **Feature:** `note-tags`
- **Date:** 2026-10-22
- **Sources:** `collect-run.sh specs/note-tags` output, `git log d914444..bdcfecd`, `spec.md`,
  `plan.md`, `verification.md`

> The team's `references/retro-template.md` could not be read in this session (plugin cache
> outside the allowed read paths), so this follows the sections the skill describes.

## Numbers

| Fact | Value | Source |
|---|---|---|
| Acceptance criteria | 24 (AC-1 to AC-24) | collect-run: `criteria: 24` |
| Decisions recorded in the spec | 12 (D-1 to D-12) | `spec.md` Decisions |
| Tasks | 3, all done | collect-run: `tasks: 3 · done: 3` |
| Tests added | 25 (27 total with the 2 existing ones) | `verification.md` Method |
| Spec changelog entries | 0 | collect-run: `spec changelog:` empty |
| Wall-clock, spec commit to last commit | 9 min 8 s (02:38:42 to 02:47:50) | collect-run |
| Verifier verdict | PASS WITH NOTES | `verification.md` |

## Timeline

| Time | Commit | Step |
|---|---|---|
| 02:38:42 | `45e627f` | spec |
| 02:41:17 | `b2d0003` | plan (`check-trace`: ok, 24 criteria, 3 tasks) |
| 02:41:53 / 02:42:04 | `1e1c934` / `95c3a38` | T1 + tick |
| 02:43:08 / 02:43:35 | `6073022` / `8b6b4d4` | T2 + tick |
| 02:44:36 / 02:44:50 | `1cfe1af` / `3eea8db` | T3 + tick |
| 02:47:50 | `bdcfecd` | verification report |

## What the spec promised vs. what was delivered

- Every AC has a named test and a commit (`verification.md` Acceptance criteria table;
  `check-trace --require-commits`: "commits recorded").
- The verifier found nothing extra: "Behaviour in the diff that no criterion or plan item
  asked for: none" (`verification.md` Extra).
- The spec did not change mid-way: no changelog lines, and `spec.md` has no commits after
  `45e627f`.

## What went well, and why

- **Decisions made before the spec was written.** The requester fixed tag format, limits,
  de-dup, filter arity and the empty-result behaviour up front, and the spec-creator turned the
  remaining small choices into D-1 to D-12 rather than open questions (`spec.md` Open
  questions: "None remain"). Nothing went back from plan or implementation to the spec.
- **The plan named the likely mistakes and the test that catches each one** (`plan.md` Risks:
  `toLowerCase` and the Kelvin sign, `searchParams.get` and `?tag=`, `{}` as a set, count
  before de-dup). The verifier checked each against the tests and found all of them covered
  (`verification.md` Untested).
- **Small, layered tasks.** T1 store shape, T2 POST validation, T3 filter. Each implementer
  call took 1–2 minutes between commits (Timeline).

## What did not go well, and why

1. **Agents could not read the plugin's own references.** spec-creator, implementation-planner
   and this retro could not open `spec-template.md`, `ears.md`, `plan-template.md`,
   `stop-conditions.md` or `retro-template.md`: the plugin cache is outside the session's
   allowed read paths. The spec and plan were written from the structure in the prompts, and
   `check-trace.mjs` passed, but nobody compared section names against the real templates.
2. **"Each commit green on its own" was not verified.** The verifier has no shell, and the
   orchestrator's attempt to check out each task commit in a worktree was blocked by
   permissions (`verification.md` Notes 1 and Addendum). Only the final state (27/27) and
   each implementer's own run at commit time are on record.
3. **Two commits per task.** Each task is a code commit plus a `docs(plan): tick Tn` commit,
   because the SHA is only known after the code commit (`95c3a38`, `8b6b4d4`, `3eea8db`).
   This doubles the task commits, and `git log -1` after a task is the tick, not the task
   commit run-plan asks to check.
4. **Plan-directed code that reviewers then questioned.** The plan placed `lowerAscii` and
   `normalizeTags` in `validate.js` and had `app.js` call them (`plan.md` Module contracts).
   The architecture reviewer marked both as should-fix: CLAUDE.md describes `validate.js` as
   functions returning an error message or `null`, and the filter value is lowercased twice
   (`validate.js` and `app.js:31`). The plan also asked for `MAX_TAG_LENGTH`, which ended up
   unused (`verification.md` Extra; reviewer nit).
5. **Tests were not seen failing first for T2 and T3.** Both implementers said they wrote the
   tests with the code and did not run them against the old code. T1's tests were seen failing.

## Lessons / what to do differently

- Allow read access to `~/.claude/plugins/cache/team-ai-marketplace/**` in project settings
  (or copy the templates into the repo) so agents follow the real templates.
- Give the verifier, or the run-plan driver, a permitted way to run the verify command at
  each task commit (for example an allowed `git worktree` into the scratchpad), or drop
  "green on its own" from the verifier's checks.
- Decide whether the plan tick goes in the task commit (record the SHA in a later tick, or
  record it at verification time) to keep one commit per task.
- When a plan writes module contracts, check them against CLAUDE.md's layer descriptions.
  Here "validate.js returns an error or null" should have put normalisation helpers somewhere
  else (a small `src/tags.js`, or in the store).
- Plans should not ask for constants that nothing uses. Either build the regex from
  `MAX_TAG_LENGTH` or leave it out.
- Ask implementers to run the new tests before the code change and report that they failed.

## Follow-ups (not done in this run)

- Reviewer should-fix: move `lowerAscii` / `normalizeTags` out of `validate.js`, and keep
  filter normalisation in one place (`src/validate.js:10,15`, `src/app.js:31,42`).
- Reviewer nits: drop or use `MAX_TAG_LENGTH`; export `TAG_PATTERN` consistently or make the
  constants private; copy `tags` in `createNote`.
- Existing tests in `test/notes.test.js` don't close the server in a `finally`
  (`verification.md` Notes 3).

The project has no `INSIGHTS.md`, so these lessons are only recorded here.
