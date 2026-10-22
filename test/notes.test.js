import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { start } from './helpers.js';
import { resetStore } from '../src/store.js';

beforeEach(() => resetStore());

test('creates, reads, lists and deletes a note', async () => {
  const app = await start();
  const created = await fetch(`${app.url}/notes`, { method: 'POST', body: JSON.stringify({ title: ' Buy milk ', body: '2 l' }) });
  assert.equal(created.status, 201);
  const note = await created.json();
  assert.equal(note.title, 'Buy milk');
  assert.deepEqual(await (await fetch(`${app.url}/notes/${note.id}`)).json(), note);
  assert.equal((await (await fetch(`${app.url}/notes`)).json()).length, 1);
  assert.equal((await fetch(`${app.url}/notes/${note.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${app.url}/notes/${note.id}`)).status, 404);
  await app.close();
});

test('rejects a missing title, a long title and invalid JSON with 400', async () => {
  const app = await start();
  const post = (body) => fetch(`${app.url}/notes`, { method: 'POST', body });
  assert.equal((await post(JSON.stringify({ body: 'x' }))).status, 400);
  assert.equal((await post(JSON.stringify({ title: 'x'.repeat(121) }))).status, 400);
  assert.equal((await post('{nope')).status, 400);
  await app.close();
});
