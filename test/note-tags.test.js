import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { start } from './helpers.js';
import { resetStore } from '../src/store.js';

beforeEach(() => resetStore());

const post = (app, payload) => fetch(`${app.url}/notes`, { method: 'POST', body: JSON.stringify(payload) });

test('AC-1 POST without tags returns tags []', async () => {
  const app = await start();
  try {
    const res = await post(app, { title: 'Buy milk' });
    assert.equal(res.status, 201);
    assert.deepEqual((await res.json()).tags, []);
  } finally {
    await app.close();
  }
});

test('AC-17 GET /notes returns every note with a tags array', async () => {
  const app = await start();
  try {
    await post(app, { title: 'one' });
    await post(app, { title: 'two' });
    const res = await fetch(`${app.url}/notes`);
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.equal(list.length, 2);
    for (const n of list) assert.ok(Array.isArray(n.tags));
  } finally {
    await app.close();
  }
});
