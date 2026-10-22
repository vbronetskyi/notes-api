# Verification: note tags

- **Feature:** `note-tags`
- **Spec:** `specs/note-tags/spec.md` (AC-1 to AC-24, D-1 to D-12)
- **Plan:** `specs/note-tags/plan.md` (T1 to T3, all ticked)
- **Range:** `d914444..HEAD` (`3eea8db`)
- **Date:** 2026-10-22
- **Method:** I read `src/app.js`, `src/store.js`, `src/validate.js`, `README.md`, `test/note-tags.test.js`, `test/notes.test.js`, `test/helpers.js` and `.git/logs/HEAD`. I had no shell. The caller reported that `npm run check` gives 27/27 passing and that `check-trace.mjs --require-commits` is ok. The 27 matches what I counted: 25 tests in `note-tags.test.js` and 2 in `notes.test.js`.

**Verdict: PASS WITH NOTES.** Every AC is implemented and checked by a test that would fail if it broke, and D-1 to D-12 are followed in the code. The notes below are things I could not verify and one small code issue. None of them is a behaviour gap.

## Acceptance criteria

All tests are in `test/note-tags.test.js`.

| AC | Status | Evidence | Test that proves it |
|---|---|---|---|
| AC-1 | done | `src/store.js:5-6` (`tags = []`), `src/app.js:42` (`input.tags ?? []`) | "AC-1 POST without tags returns tags []" (`:10`) |
| AC-2 | done | `src/validate.js:44,18-27`, `src/app.js:42-43` | "AC-2 POST with tags [] returns tags []" (`:73`) |
| AC-3 | done | `src/validate.js:15` (Set keeps insertion order) | "AC-3 valid tags are stored in order" (`:74`) |
| AC-4 | done | `src/validate.js:10-11` (`lowerAscii`), `:15` | "AC-4 tags are lowercased" (`:75`) |
| AC-5 | done | `src/validate.js:15` | "AC-5 duplicate tags after lowercasing are removed, first kept" (`:76`) |
| AC-6 | done | `src/validate.js:25` (count taken on `new Set(lowered)`) | "AC-6 tag limit is counted after duplicates are removed" (`:78`) |
| AC-7 | done | `src/validate.js:7` (`/^[a-z0-9-]{1,20}$/`) | "AC-7 boundary tags (1 char, hyphen-only, 20 chars) are accepted" (`:81`), also checks `--` and `-a-` |
| AC-8 | done | `src/validate.js:19,44` (`Object.hasOwn`, so `null` reaches the array check) | "AC-8 non-array tags (incl. null) get 400 tags must be an array" (`:87`): string, number, boolean, `{}` and `null` |
| AC-9 | done | `src/validate.js:20` | "AC-9 non-string tag element gets 400 each tag must be a string" (`:90`): `[5]`, `[null]`, `[{}]`, `[["a"]]`, plus `["a b",5]` for D-5 ordering |
| AC-10 | done | `src/validate.js:7,21-24` | "AC-10 malformed tag gets 400 with the tag-format message" (`:93`): `""`, 21×a, 21×A, `my tag`, `" work"`, `"work "`, `"work\n"`, `a_b`, `café` |
| AC-11 | done | `src/validate.js:10-11` (no `toLowerCase`), `:7` (no `i`/`u` flag) | "AC-11 Kelvin sign is not lowercased to k and gets 400" (`:99`). I confirmed `KELVIN` at `:40` is U+212A, not ASCII `K`. |
| AC-12 | done | `src/validate.js:25` | "AC-12 more than 5 distinct tags gets 400 at most 5 tags" (`:102`) |
| AC-13 | done | `src/validate.js:20-25` (each step runs over the whole array before the count) | "AC-13 element error wins over count error" (`:105`): format case and string case |
| AC-14 | done | `src/validate.js:39-44` (title and body checks come before the tags hook) | "AC-14 title and body errors win over tag errors" (`:110`) |
| AC-15 | done | `src/app.js:40-41` (returns before `createNote`) | "AC-15 rejected tags create no note" (`:115`). The `rejected()` helper (`:43-57`) also checks list length around every rejected payload in the AC-8 to AC-14 tests. |
| AC-16 | done | `src/store.js:6,11` | "AC-16 GET /notes/:id returns the tags from POST" (`:128`) |
| AC-17 | done | `src/store.js:6,12-13`, `src/app.js:28` | "AC-17 GET /notes returns every note with a tags array" (`:21`) |
| AC-18 | done | `src/app.js:27-31`, `src/store.js:12-13` (filters the Map in insertion order) | "AC-18 ?tag=work returns exactly the tagged notes in order" (`:147`): deep-equals `[A, C]`, also with `&sort=x` |
| AC-19 | done | `src/app.js:31` (`lowerAscii(values[0])`) | "AC-19 ?tag= is lowercased before matching" (`:163`) |
| AC-20 | done | `src/store.js:13` | "AC-20 ?tag= with no match returns []" (`:177`) |
| AC-21 | done | `src/validate.js:32-34`, `src/app.js:27-30` (`getAll`, so an empty `?tag=` is one value, not "no filter") | "AC-21 invalid ?tag= value gets 400 with the tag-format message" (`:187`): `''`, `a+b`, `a%20b`, `a_b`, 21×a, `%E2%84%AA` |
| AC-22 | done | `src/validate.js:31` (repeat check runs before the value check) | "AC-22 repeated tag parameter gets 400 only one tag filter" (`:198`): `a&b`, `a&a`, `''&a` |
| AC-23 | done | `src/store.js:12-14` (the filter reads the live Map) | "AC-23 deleted note drops out of the tag filter" (`:209`) |
| AC-24 | done | `src/validate.js:15` (Set), `src/store.js:13` (`Array.includes`). No plain object is used as a lookup anywhere. | "AC-24 built-in property names behave like normal tags" (`:221`): `constructor` matches; `tostring` and `hasownproperty` return `[]` |

## Tasks

| Task | Status | Commit (from `.git/logs/HEAD`) | Evidence | Tests |
|---|---|---|---|---|
| T1 Every note carries `tags` | done | `1e1c934` "feat(notes): every note has a tags array", ticked in `95c3a38` | `src/store.js:1,5-6` | AC-1, AC-17. The `notes.test.js` round trip (`:14`) is unchanged. |
| T2 Accept, normalise and validate `tags` on POST | done | `6073022` "feat(notes): optional tags on POST /notes", ticked in `8b6b4d4` | `src/validate.js:4-27,44`, `src/app.js:4,42-43`, `README.md:7-17` | AC-2 to AC-16 (one test per AC; every input the plan lists is present) |
| T3 Filter `GET /notes` by `?tag=` | done | `1cfe1af` "feat(notes): filter GET /notes by ?tag=", ticked in `3eea8db` | `src/validate.js:29-36`, `src/store.js:12-13`, `src/app.js:26-32`, `README.md:19-25` | AC-18 to AC-24, plus "D-11 tag query ignored on other routes" (`:234`) |

The commit order is spec (`45e627f`), then plan (`b2d0003`), then T1, T2 and T3. The spec was committed before any code, and the commit hashes match the plan's traceability matrix.

## Decisions

| D | Followed | Evidence |
|---|---|---|
| D-1 valid tag | yes | `src/validate.js:7`. The regex has no flags and no `\w`, and `$` without the `m` flag rejects a trailing `\n` (tested in AC-10). |
| D-2 ASCII-only lowercasing, no trimming | yes | `src/validate.js:10-11`. Neither `toLowerCase` nor `trim` is applied to tags. |
| D-3 step order | yes | `src/validate.js:19` (1), `:20` (2), `:21` (3), `:22` (4), `:15` (5, in `normalizeTags`), `:25` (6, counted on the deduplicated set). The stored value is the deduplicated list (`src/app.js:42`). |
| D-4 limit after dedup | yes | `src/validate.js:25` |
| D-5 first failing step wins; title and body first | yes | `src/validate.js:20-25` checks each step over the whole array; `:39-44` puts title and body first |
| D-6 `null` is not missing | yes | `src/validate.js:44` uses `Object.hasOwn`, not `== null`. The `?? []` at `src/app.js:42` only runs after validation, so it never sees `null`. |
| D-7 exact messages, no echo | yes | `src/validate.js:19,20,23,25,31`. All are literals with no input interpolated. Tests assert the literals (`test/note-tags.test.js:36-39,141`). |
| D-8 decode, lowercase, validate the filter | yes | `URLSearchParams` decoding (`+` becomes a space), then `src/validate.js:32` |
| D-9 single filter; other parameters ignored | yes | `src/validate.js:31`. Only `tag` is read (`src/app.js:27`). |
| D-10 `[]` on no match; order kept | yes | `src/store.js:12-13` |
| D-11 query ignored on other routes | yes | `src/app.js:33-47` never touch `searchParams`. Tested at `test/note-tags.test.js:234`. |
| D-12 built-in property names | yes | Set and `Array.includes` only (`src/validate.js:15,25`, `src/store.js:13`) |

## Extra

Behaviour in the diff that no criterion or plan item asked for: **none.**

- `MAX_TAG_LENGTH` (`src/validate.js:5`) is exported but nothing uses it. The regex at `:7` hard-codes `{1,20}` and the message hard-codes `5` and `1-20`. The plan asked for these constants, so this is not scope creep. It does mean the constant and the regex could drift apart; the literal-message tests would catch a change to a message, but not to the constant alone.
- `src/app.js:31` lowercases the filter value a second time after `validateTagFilter` has already done so. This is harmless, and it is the wiring the plan specified.
- The README changes (`README.md:7-25`) are documentation the plan asked for, and they match the spec.

## Untested

**None.** Every AC has a named test that asserts the exact status and body, so it would fail if the behaviour broke. I checked some likely mistakes against the tests:

- Using `toLowerCase`: caught by AC-11 and the `%E2%84%AA` case in AC-21.
- Using `searchParams.get` or a truthiness check on the filter: caught by the `?tag=` case in AC-21 and by AC-22.
- Using a plain object as the set: caught by AC-24.
- Counting before dedup: caught by AC-6.
- Checking type and format in one loop: caught by the mixed case in AC-9 and by AC-13.
- Checking tags before title: caught by AC-14.
- Dropping the second lowercasing at `src/app.js:31`: caught by AC-19.

## Notes and gaps

1. **Not verified: each commit green on its own.** I had no shell, so I could not check out `1e1c934`, `6073022` and `1cfe1af` one at a time to confirm each passes `npm run check`, or that each touched only the files the plan lists. Only the final state was checked: 27/27 passing, as reported by the caller.
2. **Unused constant:** `MAX_TAG_LENGTH` (see Extra). This is optional cleanup and does not block release.
3. **Out of scope, existing code:** the tests in `test/notes.test.js` do not close the server in a `finally`, so a failing assertion leaves it open. The new tests do use `try/finally`.

---

*Addendum (orchestrator, not part of the verifier's report):* gap 1 is still open. An attempt
to check out each task commit in a temporary worktree and run `npm run check` there was
blocked by this session's permissions. Each implementer reported `npm run check` green at the
time of its own commit (T1: 4/4, T2: 19/19, T3: 27/27).
