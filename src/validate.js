// Request validation. Returns an error message, or null when the input is fine.
export const MAX_TITLE = 120;
export const MAX_BODY = 10_000;
export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 20;
// No `i` or `u` flag and no `\w`: only a-z, 0-9 and "-" are valid (D-1).
const TAG_PATTERN = /^[a-z0-9-]{1,20}$/;

// Maps only A-Z to a-z (D-2). toLowerCase would turn the Kelvin sign into "k".
export const lowerAscii = (s) =>
  s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

// Lowercase, then drop duplicates keeping the first position (D-3 steps 3 and 5).
// A Set, never a plain object, so names like "constructor" are ordinary (D-12).
export const normalizeTags = (tags) => [...new Set(tags.map(lowerAscii))];

// D-3 steps 1, 2, 4, 6. Each step runs over the whole array before the next (D-5).
export function validateTags(tags) {
  if (!Array.isArray(tags)) return 'tags must be an array';
  if (!tags.every((t) => typeof t === 'string')) return 'each tag must be a string';
  const lowered = tags.map(lowerAscii);
  if (!lowered.every((t) => TAG_PATTERN.test(t))) {
    return 'tag must be 1-20 characters of a-z, 0-9 and -';
  }
  if (new Set(lowered).size > MAX_TAGS) return 'a note can have at most 5 tags';
  return null;
}

export function validateNoteInput(input) {
  if (!input || typeof input !== 'object') return 'body must be a JSON object';
  if (typeof input.title !== 'string' || input.title.trim() === '') return 'title is required';
  if (input.title.length > MAX_TITLE) return `title is longer than ${MAX_TITLE} characters`;
  if (input.body !== undefined && typeof input.body !== 'string') return 'body must be a string';
  if ((input.body ?? '').length > MAX_BODY) return `body is longer than ${MAX_BODY} characters`;
  if (Object.hasOwn(input, 'tags')) return validateTags(input.tags);
  return null;
}
