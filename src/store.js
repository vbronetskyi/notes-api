// In-memory note store. A note is { id, title, body, createdAt, tags }.
let nextId = 1;
const notes = new Map();

export function createNote({ title, body = '', tags = [] }) {
  const note = { id: String(nextId++), title, body, createdAt: new Date().toISOString(), tags };
  notes.set(note.id, note);
  return note;
}

export const getNote = (id) => notes.get(id) ?? null;
export const listNotes = (tag) =>
  [...notes.values()].filter((n) => tag === undefined || n.tags.includes(tag));
export const deleteNote = (id) => notes.delete(id);

export function resetStore() {
  notes.clear();
  nextId = 1;
}
