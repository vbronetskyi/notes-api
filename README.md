# notes-api

A tiny notes HTTP API (Node 22, no dependencies). `npm start`, then
`POST /notes {"title": "...", "body": "..."}`, `GET /notes`, `GET /notes/:id`,
`DELETE /notes/:id`. `npm run check` runs the tests.

## Tags

`POST /notes` accepts an optional `"tags"` array: `{"title": "...", "tags": ["work", "2026-q4"]}`.
Every note in every response has a `tags` array (`[]` when it has none), so a note is
`{ id, title, body, createdAt, tags }`.

- A tag is 1-20 characters of `a-z`, `0-9` and `-`. `A-Z` is lowercased first (ASCII only);
  whitespace is not trimmed and non-ASCII characters are rejected.
- Duplicates are removed (first one kept), then at most 5 tags are allowed.
- `"tags": null` or any non-array is a `400`, as is a non-string element or an invalid tag.
  A missing `tags` key means no tags.

It also serves as the second project for
[team-ai-marketplace](https://github.com/vbronetskyi/team-ai-marketplace): the branch
`try/team-marketplace` installs the team's plugins here and runs a short spec-driven
workflow with them.
