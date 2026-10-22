// Request handler: routes, JSON in and out. Kept separate from the server so tests can
// call it without opening a port.
import { createNote, deleteNote, getNote, listNotes } from './store.js';
import { lowerAscii, normalizeTags, validateNoteInput, validateTagFilter } from './validate.js';

const json = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(data === undefined ? '' : JSON.stringify(data));
};

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return undefined;
  }
}

export async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const [, resource, id] = url.pathname.split('/');
  if (resource !== 'notes') return json(res, 404, { error: 'not found' });

  if (req.method === 'GET' && !id) {
    const values = url.searchParams.getAll('tag');
    if (values.length === 0) return json(res, 200, listNotes());
    const error = validateTagFilter(values);
    if (error) return json(res, 400, { error });
    return json(res, 200, listNotes(lowerAscii(values[0])));
  }
  if (req.method === 'GET' && id) {
    const note = getNote(id);
    return note ? json(res, 200, note) : json(res, 404, { error: 'note not found' });
  }
  if (req.method === 'POST' && !id) {
    const input = await readJson(req);
    if (input === undefined) return json(res, 400, { error: 'invalid JSON' });
    const error = validateNoteInput(input);
    if (error) return json(res, 400, { error });
    const tags = normalizeTags(input.tags ?? []);
    return json(res, 201, createNote({ title: input.title.trim(), body: input.body, tags }));
  }
  if (req.method === 'DELETE' && id) {
    return deleteNote(id) ? json(res, 204) : json(res, 404, { error: 'note not found' });
  }
  return json(res, 405, { error: 'method not allowed' });
}
