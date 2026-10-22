# Spec: note tags

- **Feature:** `note-tags`
- **Status:** draft, ready for planning
- **Date:** 2026-10-22

## Summary

A note can carry up to 5 tags. `POST /notes` accepts an optional `"tags"` array, and
`GET /notes?tag=<tag>` returns only the notes that have that tag. Every note in every
response has a `tags` array. Notes created without tags have `"tags": []`.

## Context (what exists today)

- `POST /notes` takes `{ "title", "body"? }`, checks it, and returns `201` with
  `{ id, title, body, createdAt }`. Bad input returns `400 { "error": "<message>" }`.
- `GET /notes` returns every note in creation order. `GET /notes/:id` returns one note or `404`.
  `DELETE /notes/:id` returns `204` or `404`.
- Today the API ignores query strings. The store is in-memory, so it holds no notes from
  before this feature.
- Project conventions (`CLAUDE.md`): input rules live with the existing validation rules,
  errors use the JSON `{ "error" }` shape, and a stack trace never reaches the client.

## Decisions

| # | Decision |
|---|---|
| D-1 | A **valid tag** is 1 to 20 characters, and each character is `a`-`z`, `0`-`9` or `-`. Hyphens can appear anywhere, so `-`, `--` and `-a-` are valid. Nothing else counts. |
| D-2 | **Lowercasing** maps only the 26 ASCII letters `A`-`Z` to `a`-`z`. All other characters stay as they are, so characters such as `É` or the Kelvin sign `U+212A` still fail D-1. Whitespace is not trimmed, so `" work"` is invalid. |
| D-3 | Each `tags` input goes through these steps in this order: (1) check that `tags` is an array, (2) check that each element is a string, (3) lowercase each element (D-2), (4) check each lowercased element against D-1, (5) remove duplicates, keeping the first occurrence and its position, (6) check the count. Whatever remains after step 5 is stored and returned. |
| D-4 | The **limit of 5 tags** is checked after duplicates are removed. So `["a","A","b","c","d","e"]` is accepted and stored as 5 tags. |
| D-5 | When a `tags` input breaks more than one rule, only the first failing step of D-3 is reported. Steps 2 to 4 check elements in array order. The note's existing title and body rules run before any tag rule, so an invalid title is reported before an invalid tag. |
| D-6 | `"tags": null` counts as "not an array" and gets a `400`. Only a missing `tags` key means "no tags". |
| D-7 | Error messages are exact strings: `"tags must be an array"`, `"each tag must be a string"`, `"tag must be 1-20 characters of a-z, 0-9 and -"`, `"a note can have at most 5 tags"`, `"only one tag filter is allowed"`. Messages never echo the client's input. |
| D-8 | The `?tag=` filter takes one tag. Its value is URL-decoded as usual, then lowercased (D-2), then checked against D-1. An **invalid filter value** gets a `400` with the D-1 message. This includes an empty `?tag=` and a value that decodes to a space, such as `?tag=a+b`. |
| D-9 | If `tag` appears more than once in the query string, the request gets `400 "only one tag filter is allowed"`. Other query parameters on `GET /notes` are still ignored. |
| D-10 | A tag filter that matches no note gets `200` with `[]`. Filtered results keep the same order as unfiltered `GET /notes`. |
| D-11 | A `?tag=` query string on `GET /notes/:id`, `POST /notes` or `DELETE /notes/:id` is ignored. These requests behave the same with or without it. |
| D-12 | A tag that matches a built-in object property name, such as `constructor` or `tostring`, behaves like any other tag. |

## Scope

In scope:

- An optional `tags` field on `POST /notes`, checked and normalised as in D-1 to D-7.
- A `tags` array on every note returned by `POST /notes`, `GET /notes` and `GET /notes/:id`.
- Single-tag filtering on `GET /notes` through `?tag=`.

## Non-goals

- Changing a note's tags after creation. There is no `PUT` or `PATCH` endpoint, and this feature does not add one.
- Filtering by several tags, with either AND or OR.
- An endpoint that lists all tags or counts notes per tag.
- Keeping the original casing of tags for display.
- Tags that contain non-ASCII characters, spaces or underscores.
- Keeping tags across a restart. The store stays in-memory.
- A size limit on the request body, or on the raw length of the `tags` array before duplicates are removed. Request-size limits are a separate concern.
- Changing the existing title and body rules, or their error messages.

## Untrusted inputs

| Input | Source | Rules that apply |
|---|---|---|
| `tags` field in the `POST /notes` JSON body: its type, each element's type, and each element's content | HTTP client | D-1 to D-7, AC-7 to AC-14 |
| `tag` query parameter on `GET /notes`: its value (URL-decoded) and how many times it appears | HTTP client | D-8, D-9, AC-18 to AC-22 |
| The rest of the query string on any `/notes` route | HTTP client | Ignored (D-9, D-11) |

## Acceptance criteria

EARS tags: `[ubiquitous]`, `[event]` (WHEN), `[state]` (WHILE), `[unwanted]` (IF ... THEN),
`[optional]` (WHERE). "Valid note" means a body that passes the existing title and body rules.

### Creating notes with tags

- **AC-1 [event]** WHEN a client sends `POST /notes` with a valid note that has no `tags` key, the API shall respond `201` with a note whose `tags` is `[]`.
- **AC-2 [event]** WHEN a client sends `POST /notes` with a valid note and `"tags": []`, the API shall respond `201` with a note whose `tags` is `[]`.
- **AC-3 [event]** WHEN a client sends `POST /notes` with a valid note and `"tags": ["work", "2026-q4"]`, the API shall respond `201` with `tags` equal to `["work", "2026-q4"]`, in that order.
- **AC-4 [event]** WHEN a client sends `POST /notes` with `"tags": ["Work", "URGENT"]`, the API shall respond `201` with `tags` equal to `["work", "urgent"]`.
- **AC-5 [event]** WHEN a client sends `POST /notes` with `"tags": ["work", "Work", "home", "work"]`, the API shall respond `201` with `tags` equal to `["work", "home"]`.
- **AC-6 [event]** WHEN a client sends `POST /notes` with `"tags": ["a", "A", "b", "c", "d", "e"]` (6 elements, 5 distinct after lowercasing), the API shall respond `201` with `tags` equal to `["a", "b", "c", "d", "e"]`.
- **AC-7 [event]** WHEN a client sends `POST /notes` with `"tags": ["-", "x", "<20 times 'a'>"]`, meaning a 1-character tag, a hyphen-only tag and a 20-character tag, the API shall respond `201` and store all three.

### Rejecting bad tags

- **AC-8 [unwanted]** IF `tags` is present and is not an array (string, number, boolean, object or `null`), THEN the API shall respond `400` with `{ "error": "tags must be an array" }`.
- **AC-9 [unwanted]** IF any element of `tags` is not a string (for example `5`, `null`, `{}` or `["a"]`), THEN the API shall respond `400` with `{ "error": "each tag must be a string" }`.
- **AC-10 [unwanted]** IF any element of `tags`, after lowercasing, is empty, longer than 20 characters, or contains a character other than `a`-`z`, `0`-`9` and `-` (for example `""`, 21 × `a`, `"my tag"`, `" work"`, `"a_b"`, `"café"`), THEN the API shall respond `400` with `{ "error": "tag must be 1-20 characters of a-z, 0-9 and -" }`.
- **AC-11 [unwanted]** IF an element of `tags` contains a non-ASCII character that a full Unicode lowercase would turn into `a`-`z` (for example `"K"`, the Kelvin sign), THEN the API shall respond `400` with the same tag-format message as AC-10.
- **AC-12 [unwanted]** IF `tags` holds more than 5 distinct values after lowercasing (for example `["a","b","c","d","e","f"]`), THEN the API shall respond `400` with `{ "error": "a note can have at most 5 tags" }`.
- **AC-13 [unwanted]** IF `tags` holds more than 5 distinct values and also an element that breaks AC-9 or AC-10, THEN the API shall respond `400` with the message for that element, not the count message.
- **AC-14 [unwanted]** IF a `POST /notes` body has an invalid title and also invalid `tags`, THEN the API shall respond `400` with the existing title error message.
- **AC-15 [unwanted]** IF `POST /notes` is rejected with `400` because of `tags`, THEN the API shall not create a note, so the length of `GET /notes` stays the same.

### Reading notes

- **AC-16 [event]** WHEN a client sends `GET /notes/:id` for a note created with tags, the API shall respond `200` with a body whose `tags` equals the `tags` returned by the `POST` that created it.
- **AC-17 [event]** WHEN a client sends `GET /notes` with no `tag` parameter, the API shall respond `200` with every note, each one having a `tags` array.

### Filtering by tag

- **AC-18 [event]** WHEN a client sends `GET /notes?tag=work`, the API shall respond `200` with exactly the notes whose `tags` include `"work"`, in the same order as in unfiltered `GET /notes`.
- **AC-19 [event]** WHEN a client sends `GET /notes?tag=WORK`, the API shall respond `200` with the same notes as `GET /notes?tag=work`.
- **AC-20 [event]** WHEN a client sends `GET /notes?tag=<valid tag>` and no note has that tag, the API shall respond `200` with `[]`.
- **AC-21 [unwanted]** IF the `tag` value on `GET /notes`, after URL-decoding and lowercasing, is not a valid tag (for example `?tag=`, `?tag=a+b`, `?tag=a_b`, or 21 × `a`), THEN the API shall respond `400` with `{ "error": "tag must be 1-20 characters of a-z, 0-9 and -" }`.
- **AC-22 [unwanted]** IF the `tag` parameter appears more than once on `GET /notes` (for example `?tag=a&tag=b`), THEN the API shall respond `400` with `{ "error": "only one tag filter is allowed" }`.
- **AC-23 [event]** WHEN a note with tag `"work"` is deleted, `GET /notes?tag=work` shall no longer include it.
- **AC-24 [event]** WHEN a note is created with `"tags": ["constructor"]`, `GET /notes?tag=constructor` shall return that note, and `GET /notes?tag=tostring` shall return `[]`.

## Edge cases (and where they are covered)

| Case | Covered by |
|---|---|
| `tags` missing or `[]` | AC-1, AC-2 |
| `tags: null` | AC-8 (D-6) |
| Mixed case, and duplicates after lowercasing | AC-4, AC-5 |
| More than 5 elements but at most 5 distinct | AC-6 (D-4) |
| Length boundaries (1, 20, 21), hyphen-only tag | AC-7, AC-10 |
| Leading or trailing whitespace, non-ASCII, Unicode case-folding tricks | AC-10, AC-11 |
| Several errors in one request | AC-13, AC-14 (D-5) |
| Empty, invalid or repeated `?tag=` | AC-21, AC-22 |
| Filter after delete | AC-23 |
| Tag names that match built-in property names | AC-24 (D-12) |
| `?tag=` on routes other than `GET /notes` | D-11 (no behaviour change) |

## Open questions

None remain. The requester made every decision, and the remaining details are recorded
as D-1 to D-12 above.
