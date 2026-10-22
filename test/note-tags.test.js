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

const FMT = 'tag must be 1-20 characters of a-z, 0-9 and -';
const STR = 'each tag must be a string';
const ARR = 'tags must be an array';
const MANY = 'a note can have at most 5 tags';
const KELVIN = 'K';

/** Every payload must get 400 with `message` and create no note (AC-15). */
async function rejected(payloads, message) {
  const app = await start();
  try {
    for (const payload of payloads) {
      const before = (await (await fetch(`${app.url}/notes`)).json()).length;
      const res = await post(app, payload);
      assert.equal(res.status, 400, JSON.stringify(payload));
      assert.deepEqual(await res.json(), { error: message }, JSON.stringify(payload));
      const after = (await (await fetch(`${app.url}/notes`)).json()).length;
      assert.equal(after, before, 'note created for ' + JSON.stringify(payload));
    }
  } finally {
    await app.close();
  }
}

async function accepted(tags, expected) {
  const app = await start();
  try {
    const res = await post(app, { title: 't', tags });
    assert.equal(res.status, 201);
    assert.deepEqual((await res.json()).tags, expected);
  } finally {
    await app.close();
  }
}

const withTags = (list) => list.map((tags) => ({ title: 't', tags }));
const withTag = (list) => list.map((tag) => ({ title: 't', tags: [tag] }));

test('AC-2 POST with tags [] returns tags []', () => accepted([], []));
test('AC-3 valid tags are stored in order', () => accepted(['work', '2026-q4'], ['work', '2026-q4']));
test('AC-4 tags are lowercased', () => accepted(['Work', 'URGENT'], ['work', 'urgent']));
test('AC-5 duplicate tags after lowercasing are removed, first kept', () =>
  accepted(['work', 'Work', 'home', 'work'], ['work', 'home']));
test('AC-6 tag limit is counted after duplicates are removed', () =>
  accepted(['a', 'A', 'b', 'c', 'd', 'e'], ['a', 'b', 'c', 'd', 'e']));

test('AC-7 boundary tags (1 char, hyphen-only, 20 chars) are accepted', async () => {
  const long = 'a'.repeat(20);
  await accepted(['-', 'x', long], ['-', 'x', long]);
  await accepted(['--', '-a-'], ['--', '-a-']);
});

test('AC-8 non-array tags (incl. null) get 400 tags must be an array', () =>
  rejected(withTags(['work', 5, true, {}, null]), ARR));

test('AC-9 non-string tag element gets 400 each tag must be a string', () =>
  rejected(withTags([[5], [null], [{}], [['a']], ['a b', 5]]), STR));

test('AC-10 malformed tag gets 400 with the tag-format message', () =>
  rejected(
    withTag(['', 'a'.repeat(21), 'A'.repeat(21), 'my tag', ' work', 'work ', 'work\n', 'a_b', 'café']),
    FMT,
  ));

test('AC-11 Kelvin sign is not lowercased to k and gets 400', () =>
  rejected(withTag([KELVIN, KELVIN + 'ey']), FMT));

test('AC-12 more than 5 distinct tags gets 400 at most 5 tags', () =>
  rejected(withTags([['a', 'b', 'c', 'd', 'e', 'f']]), MANY));

test('AC-13 element error wins over count error', async () => {
  await rejected(withTags([['a', 'b', 'c', 'd', 'e', 'f', 'a_b']]), FMT);
  await rejected(withTags([['a', 'b', 'c', 'd', 'e', 'f', 7]]), STR);
});

test('AC-14 title and body errors win over tag errors', async () => {
  await rejected([{ title: '', tags: null }], 'title is required');
  await rejected([{ title: 't', body: 5, tags: [5] }], 'body must be a string');
});

test('AC-15 rejected tags create no note', async () => {
  const app = await start();
  try {
    await post(app, { title: 'keep' });
    for (const tags of [null, [5], ['a_b'], ['a', 'b', 'c', 'd', 'e', 'f']]) {
      assert.equal((await post(app, { title: 't', tags })).status, 400);
    }
    assert.equal((await (await fetch(`${app.url}/notes`)).json()).length, 1);
  } finally {
    await app.close();
  }
});

test('AC-16 GET /notes/:id returns the tags from POST', async () => {
  const app = await start();
  try {
    const made = await (await post(app, { title: 't', tags: ['Work', 'home', 'work'] })).json();
    const res = await fetch(`${app.url}/notes/${made.id}`);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).tags, made.tags);
    assert.deepEqual(made.tags, ['work', 'home']);
  } finally {
    await app.close();
  }
});
