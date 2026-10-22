# notes-api

A tiny notes HTTP API (Node 22, no dependencies). `npm start`, then
`POST /notes {"title": "...", "body": "..."}`, `GET /notes`, `GET /notes/:id`,
`DELETE /notes/:id`. `npm run check` runs the tests.

It also serves as the second project for
[team-ai-marketplace](https://github.com/vbronetskyi/team-ai-marketplace): the branch
`try/team-marketplace` installs the team's plugins here and runs a short spec-driven
workflow with them.
