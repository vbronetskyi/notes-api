# notes-api

A tiny notes HTTP API: Node 22, ES modules, `node:http`, no runtime dependencies, an
in-memory store. Tests use `node:test` and start the app on a random port.

## Layout

- `src/app.js` — routing and HTTP: parse, validate, call the store, answer JSON.
- `src/validate.js` — input rules, pure functions returning an error message or `null`.
- `src/store.js` — the in-memory store; the only place that holds notes.
- `src/server.js` — process entry point, nothing else.
- `test/*.test.js` — behaviour tests over real HTTP (`test/helpers.js` starts the app).

## Conventions

- No dependencies unless there is no reasonable way without one.
- Errors are JSON `{ "error": "<message>" }` with a 4xx status for bad input, 404 for an
  unknown id, 405 for a wrong method. Never leak a stack trace.
- Validation lives in `validate.js`, not inline in handlers.
- Specs and plans for features live in `specs/<feature>/`.

## Verify

```bash
npm run check    # syntax check + all tests
```
