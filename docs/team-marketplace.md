# team-ai-marketplace in this project

This branch installs the team's plugins from
[team-ai-marketplace](https://github.com/vbronetskyi/team-ai-marketplace) into a project that
has nothing to do with DevDigest, and runs one short spec-driven workflow with them.

## Install

```
$ claude plugin marketplace add vbronetskyi/team-ai-marketplace
✔ Successfully added marketplace: team-ai-marketplace (declared in user settings)
$ claude plugin install sdd-engineering@team-ai-marketplace --scope project
✔ Successfully installed plugin: sdd-engineering@team-ai-marketplace (scope: project) (+ 3 dependencies: engineering-paved-path, research-tools, architecture-review)
$ claude plugin list
  ❯ architecture-review@team-ai-marketplace     Version: 1.0.0-5a5367b567cf   Scope: project   ✔ enabled
  ❯ engineering-paved-path@team-ai-marketplace  Version: 1.0.0-5a5367b567cf   Scope: project   ✔ enabled
  ❯ research-tools@team-ai-marketplace          Version: 1.0.0-5a5367b567cf   Scope: project   ✔ enabled
  ❯ sdd-engineering@team-ai-marketplace         Version: 1.1.0                Scope: project   ✔ enabled
```

Only `sdd-engineering` was installed by hand. The three dependencies came with it, and
`1.0.0-5a5367b567cf` shows they were resolved from the marketplace's git tags
(`<plugin>--v1.0.0`, commit `5a5367b`) against the `^1.0.0` ranges in its `plugin.json`.

[`.claude/settings.json`](../.claude/settings.json) declares the marketplace and enables
all four plugins, so anyone who opens the project and trusts the folder is offered the same
set. It also allows reading the plugin cache, see Findings.

## A short SDD run

One headless session (`claude -p … --permission-mode acceptEdits --max-budget-usd 12`) was
asked to build "note tags" (an optional `tags` array on `POST /notes`, `GET /notes?tag=`)
with the plugin's own components. Its init event listed `sdd-engineering 1.1.0`,
`engineering-paved-path 1.0.0`, `research-tools 1.0.0`, `architecture-review 1.0.0` and the
agents under their namespaces. What it called, in order:

| Step | Component | Result |
|---|---|---|
| method | skill `sdd-engineering:sdd-method` | the workflow and the trace check |
| spec | agent `sdd-engineering:spec-creator` | [spec.md](../specs/note-tags/spec.md), 24 EARS criteria, tagged (1.1.0) — `45e627f` |
| plan | agent `sdd-engineering:implementation-planner` | [plan.md](../specs/note-tags/plan.md), 3 tasks, trace check ok — `b2d0003` |
| implement | skill `sdd-engineering:run-plan` → agent `sdd-engineering:implementer` × 3 | `1e1c934`, `6073022`, `1cfe1af`, each with its plan tick |
| review | agent `architecture-review:architecture-reviewer` | no blockers; 2 should-fix, 3 nits |
| verify | agent `sdd-engineering:plan-verifier` | [verification.md](../specs/note-tags/verification.md): PASS WITH NOTES — `bdcfecd` |
| retro | skill `sdd-engineering:workflow-retro` | [retro.md](../specs/note-tags/retro.md) — `87d70ac` |

12 minutes, $3.26. After the run: `npm run check` 27/27 tests (2 before the feature), and
`check-trace.mjs specs/note-tags --require-commits`: "24 criteria, 3 tasks, commits
recorded".

## Findings

- **The agents could not read the plugin's own templates in a headless run.** Rules and
  templates live in the plugin cache (`~/.claude/plugins/cache/…`), outside the project,
  and `claude -p` does not prompt for reads there. The spec and plan followed the structure
  from the prompt instead. Fixed for this project with `"permissions": { "allow":
  ["Read(~/.claude/plugins/**)"] }` in `.claude/settings.json`; the marketplace README now
  says so for headless and CI use.
- The reviewer's should-fix items (tag normalization helpers sit in `validate.js`, which
  the project's `CLAUDE.md` describes as returning only an error or `null`; the `?tag=`
  value is lowercased twice) were left as follow-ups in `retro.md`, as a real team would
  take them into the next change rather than into the verified one.
- Each task produced two commits (the code, then the plan tick with its SHA), because a
  commit cannot contain its own SHA.
