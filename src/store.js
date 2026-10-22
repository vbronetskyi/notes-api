// In-memory note store. A note is { id, title, body, createdAt }.
let nextId = 1;
const notes = new Map();

export function createNote({ title, body = '' }) {
  const note = { id: String(nextId++), title, body, createdAt: new Date().toISOString() };
  notes.set(note.id, note);
  return note;
}

export const getNote = (id) => notes.get(id) ?? null;
export const listNotes = () => [...notes.values()];
export const deleteNote = (id) => notes.delete(id);

export function resetStore() {
  notes.clear();
  nextId = 1;
}
