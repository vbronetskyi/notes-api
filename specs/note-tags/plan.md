# Plan: note tags

- **Feature:** `note-tags`
- **Spec:** [spec.md](spec.md) (AC-1 to AC-24, D-1 to D-12)
- **Status:** ready for implementation
- **Date:** 2026-10-22

## Goal

A note can be created with up to 5 normalised tags. Every note in every response has a
`tags` array, and `GET /notes?tag=<tag>` returns only the notes that have that tag.

## Non-goals

Everything listed under the spec's Non-goals. That includes: no tag editing, no
multi-tag filter, no tag listing, no limit on body size or raw array length, and no
change to the title and body rules or their messages.

## Contract and schema changes

No migrations. The store is in-memory and holds no notes from before this feature.

**HTTP contract (additive):**

| Surface | Before | After |
|---|---|---|
| Note object (in `POST /notes` 201, `GET /notes`, `GET /notes/:id`) | `{ id, title, body, createdAt }` | `{ id, title, body, createdAt, tags: string[] }`. `tags` is always present and is `[]` when the note has none. |
| `POST /notes` body | `{ title, body? }` | `{ title, body?, tags? }`. `tags` is optional, and a missing key means `[]`. A `null` value is rejected (D-6). |
| `GET /notes` query | ignored | `tag` (one value) filters the list. Every other parameter is still ignored (D-9). |
| `GET /notes/:id`, `POST /notes`, `DELETE /notes/:id` query | ignored | still ignored (D-11) |
| New `400` messages (exact, D-7) | none | `tags must be an array`, `each tag must be a string`, `tag must be 1-20 characters of a-z, 0-9 and -`, `a note can have at most 5 tags`, `only one tag filter is allowed` |

**Module contracts (internal):**

- `src/validate.js` (all input rules live here, per CLAUDE.md):
  - `MAX_TAGS = 5`, `MAX_TAG_LENGTH = 20`, and a tag pattern `/^[a-z0-9-]{1,20}$/`. The
    pattern has no `i` flag, no `u` flag and no `\w`.
  - `lowerAscii(s: string): string` maps only `A`-`Z` to `a`-`z` (D-2), for example
    `s.replace(/[A-Z]/g, …)`. It must **not** use `toLowerCase` or `toLocaleLowerCase`.
  - `normalizeTags(tags: string[]): string[]` lowercases with `lowerAscii`, then removes
    duplicates and keeps the first position of each (D-3 steps 3 and 5). It uses a `Set`,
    never a plain object (D-12).
  - `validateTags(tags: unknown): string | null` runs D-3 steps 1, 2, 4 and 6, in that
    order. Each step runs over the **whole array** before the next step starts (D-5).
  - `validateNoteInput(input)` keeps its existing title and body checks unchanged. After
    them, when `Object.hasOwn(input, 'tags')` is true, it returns `validateTags(input.tags)`.
  - `validateTagFilter(values: string[]): string | null` takes the result of
    `url.searchParams.getAll('tag')`. If there is more than one value, it returns
    `only one tag filter is allowed`. If there is exactly one, it lowercases it with
    `lowerAscii` and checks it against the tag pattern (D-8, D-9).
- `src/store.js`:
  - `createNote({ title, body = '', tags = [] })` stores `tags` on the note.
  - `listNotes(tag?: string)` returns all notes when `tag` is `undefined`. Otherwise it
    returns the notes whose `tags.includes(tag)`, in insertion order.
- `src/app.js`: `POST /notes` passes `normalizeTags(input.tags ?? [])` to `createNote`.
  `GET /notes` calls `getAll('tag')`. If that returns no values, the list is unfiltered.
  Otherwise the handler runs `validateTagFilter` and then calls
  `listNotes(lowerAscii(values[0]))`. Other routes do not read the query string.

**Planning assumption (spec-consistent, not a new decision):** D-9 says any request where
`tag` appears more than once gets `only one tag filter is allowed`. So the repeat check
comes before the value check. For example, `?tag=&tag=a` gets the D-9 message, not the
D-1 message.

## Tasks

Each task is one commit, is green on its own, and runs `npm run check`. All new tests go
in a new file, `test/note-tags.test.js`. It runs over real HTTP through `start()` from
`test/helpers.js`, with `beforeEach(() => resetStore())` as in `test/notes.test.js`.
Every test name starts with the AC IDs it proves. Tests assert the exact D-7 strings as
literals, not imported constants, so that a change to a message fails the tests.

- [x] T1 Every note carries `tags` (store layer): `createNote` defaults `tags` to `[]` and every response includes it → AC-1, AC-17 → test/note-tags.test.js: "AC-1 POST without tags returns tags []", "AC-17 GET /notes returns every note with a tags array"
  - Files: `src/store.js` (the `tags = []` default, and the shape comment), `test/note-tags.test.js` (new).
  - The AC-17 test creates 2 notes and asserts the list length is 2 and that `Array.isArray(n.tags)` holds for each note.
  - The existing `test/notes.test.js` round-trip `deepEqual` must still pass unchanged.
  - Commit: `feat(notes): every note has a tags array`

- [x] T2 Accept, normalise and validate `tags` on `POST /notes` (validation layer plus wiring) → AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16 → test/note-tags.test.js: "AC-2 …" through "AC-16 …" (one test per AC, names in the matrix)
  - Files: `src/validate.js` (`lowerAscii`, `normalizeTags`, `validateTags`, constants, and the hook in `validateNoteInput`), `src/app.js` (pass `normalizeTags(input.tags ?? [])` to `createNote`), `README.md` (document `tags` on `POST /notes` and on the note shape), `test/note-tags.test.js`.
  - Test inputs (minimum):
    - AC-7: `["-", "x", "a".repeat(20)]`, plus `["--", "-a-"]`.
    - AC-8: `"work"`, `5`, `true`, `{}` and `null`.
    - AC-9: `[5]`, `[null]`, `[{}]` and `[["a"]]`. Also `["a b", 5]`, which must return the string message because D-3 step 2 runs before step 4.
    - AC-10: `""`, `"a".repeat(21)`, `"A".repeat(21)`, `"my tag"`, `" work"`, `"work "`, `"work\n"`, `"a_b"` and `"café"`.
    - AC-11: `"K"` and `"Key"` (Kelvin sign).
    - AC-12: `["a","b","c","d","e","f"]`.
    - AC-13: `["a","b","c","d","e","f","a_b"]`, which must return the format message, and `["a","b","c","d","e","f",7]`, which must return the string message.
    - AC-14: an invalid title with `tags: null` must return `title is required`. A non-string body with `tags: [5]` must return `body must be a string`.
    - AC-15: after every rejected request above, `GET /notes` has the same length.
    - AC-16: `GET /notes/:id` `tags` deep-equals the `tags` returned by `POST`.
  - Commit: `feat(notes): optional tags on POST /notes`

- [ ] T3 Filter `GET /notes` by `?tag=` (validation, store and HTTP layers) → AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, AC-24 → test/note-tags.test.js: "AC-18 …" through "AC-24 …" (one test per AC, names in the matrix), plus regression test "D-11 tag query ignored on other routes"
  - Files: `src/validate.js` (`validateTagFilter`), `src/store.js` (`listNotes(tag?)`), `src/app.js` (read `getAll('tag')` on `GET /notes` only), `README.md` (document `?tag=`), `test/note-tags.test.js`.
  - Test inputs (minimum):
    - AC-18: notes A `["work"]`, B `["home"]` and C `["home","work"]`. `?tag=work` must return exactly `[A, C]` in creation order, and `?tag=work&sort=x` must return the same.
    - AC-19: `?tag=WORK` and `?tag=Work` must equal `?tag=work`.
    - AC-20: `?tag=nothing` must return `[]`.
    - AC-21: `?tag=`, `?tag=a+b`, `?tag=a%20b`, `?tag=a_b`, `?tag=` + `"a".repeat(21)` and `?tag=%E2%84%AA` (Kelvin sign) must each return 400 with the D-1 message.
    - AC-22: `?tag=a&tag=b`, `?tag=a&tag=a` and `?tag=&tag=a` must each return 400 with `only one tag filter is allowed`.
    - AC-23: create a note tagged `work`, delete it, then `?tag=work` must not include it.
    - AC-24: a note created with `["constructor"]` must be returned by `?tag=constructor`. `?tag=tostring` and `?tag=hasownproperty` must return `[]`.
    - D-11: `GET /notes/:id?tag=a&tag=b` must return 200 with the note. `POST /notes?tag=` must return 201. `DELETE /notes/:id?tag=a_b` must return 204.
  - Commit: `feat(notes): filter GET /notes by ?tag=`

The README changes are folded into T2 and T3 instead of being a separate task, so that
every task has an AC and a test.

## Traceability matrix

All tests are in `test/note-tags.test.js`.

| AC | tasks | tests | commit |
|---|---|---|---|
| AC-1 | T1 | "AC-1 POST without tags returns tags []" | 1e1c934 |
| AC-2 | T2 | "AC-2 POST with tags [] returns tags []" | 6073022 |
| AC-3 | T2 | "AC-3 valid tags are stored in order" | 6073022 |
| AC-4 | T2 | "AC-4 tags are lowercased" | 6073022 |
| AC-5 | T2 | "AC-5 duplicate tags after lowercasing are removed, first kept" | 6073022 |
| AC-6 | T2 | "AC-6 tag limit is counted after duplicates are removed" | 6073022 |
| AC-7 | T2 | "AC-7 boundary tags (1 char, hyphen-only, 20 chars) are accepted" | 6073022 |
| AC-8 | T2 | "AC-8 non-array tags (incl. null) get 400 tags must be an array" | 6073022 |
| AC-9 | T2 | "AC-9 non-string tag element gets 400 each tag must be a string" | 6073022 |
| AC-10 | T2 | "AC-10 malformed tag gets 400 with the tag-format message" | 6073022 |
| AC-11 | T2 | "AC-11 Kelvin sign is not lowercased to k and gets 400" | 6073022 |
| AC-12 | T2 | "AC-12 more than 5 distinct tags gets 400 at most 5 tags" | 6073022 |
| AC-13 | T2 | "AC-13 element error wins over count error" | 6073022 |
| AC-14 | T2 | "AC-14 title and body errors win over tag errors" | 6073022 |
| AC-15 | T2 | "AC-15 rejected tags create no note" | 6073022 |
| AC-16 | T2 | "AC-16 GET /notes/:id returns the tags from POST" | 6073022 |
| AC-17 | T1 | "AC-17 GET /notes returns every note with a tags array" | 1e1c934 |
| AC-18 | T3 | "AC-18 ?tag=work returns exactly the tagged notes in order" | |
| AC-19 | T3 | "AC-19 ?tag= is lowercased before matching" | |
| AC-20 | T3 | "AC-20 ?tag= with no match returns []" | |
| AC-21 | T3 | "AC-21 invalid ?tag= value gets 400 with the tag-format message" | |
| AC-22 | T3 | "AC-22 repeated tag parameter gets 400 only one tag filter" | |
| AC-23 | T3 | "AC-23 deleted note drops out of the tag filter" | |
| AC-24 | T3 | "AC-24 built-in property names behave like normal tags" | |

## Risks

| Risk | What breaks | How a reviewer notices |
|---|---|---|
| `toLowerCase()`/`toLocaleLowerCase()` used instead of ASCII-only lowercasing, or the tag regex given an `i` or `u` flag | The Kelvin sign (U+212A) becomes `k` and is accepted (D-2) | The AC-11 test and the `%E2%84%AA` case in AC-21 fail. In review, look for `toLowerCase` in `validate.js`. |
| `\w` or a hand-written character class instead of `[a-z0-9-]` | `_` or other characters are accepted | The `a_b` cases in AC-10 and AC-21 fail |
| One loop per element that checks type and format together | `["a b", 5]` reports the format message instead of the string message (D-5) | The AC-9 mixed case and the AC-13 cases fail |
| Count checked before duplicates are removed | `["a","A","b","c","d","e"]` is rejected | The AC-6 test fails |
| Duplicates removed or filter matched with a plain object (`{}`/`in`) | `constructor`, `tostring` and similar names collide with built-in properties | The AC-24 test fails. In review, look for `{}` used as a set. |
| `searchParams.get('tag')` or a truthiness check `if (tag)` | `?tag=` is treated as "no filter" and returns 200 with every note, and repeated `tag` is not detected | The `?tag=` case in AC-21 and the AC-22 tests fail |
| `input.tags == null` treated as "missing" | `"tags": null` is accepted as no tags (D-6) | The `null` case in AC-8 fails |
| Tag check runs before the title and body checks | The wrong message when both are invalid (D-5) | The AC-14 test fails |
| Query parsing added to routes other than `GET /notes` | `?tag=` changes behaviour on `GET /notes/:id`, `POST` or `DELETE` (D-11) | The D-11 regression test fails |
| A new `tags` field on every note | Strict clients that reject unknown fields might break. The change is additive, and the existing round-trip test still passes. | `test/notes.test.js` stays green. The README documents the field. |
| No limit on the raw `tags` array length | A very large array costs CPU before duplicates are removed. This is accepted by the spec (Non-goals), so it is not a regression. | A reviewer should not flag it as a defect. Request-size limits are a separate concern. |

## Verification

Run after every task and again before handing over to verification:

```bash
npm run check    # syntax check of src/*.js + all node:test suites
```

Traceability (plan gate now, and with `--require-commits` before verification):

```bash
node /Users/volodymyrbronetskyi/.claude/plugins/cache/team-ai-marketplace/sdd-engineering/1.1.0/skills/sdd-method/scripts/check-trace.mjs specs/note-tags
node /Users/volodymyrbronetskyi/.claude/plugins/cache/team-ai-marketplace/sdd-engineering/1.1.0/skills/sdd-method/scripts/check-trace.mjs specs/note-tags --require-commits
```
