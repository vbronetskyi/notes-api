// Request validation. Returns an error message, or null when the input is fine.
export const MAX_TITLE = 120;
export const MAX_BODY = 10_000;

export function validateNoteInput(input) {
  if (!input || typeof input !== 'object') return 'body must be a JSON object';
  if (typeof input.title !== 'string' || input.title.trim() === '') return 'title is required';
  if (input.title.length > MAX_TITLE) return `title is longer than ${MAX_TITLE} characters`;
  if (input.body !== undefined && typeof input.body !== 'string') return 'body must be a string';
  if ((input.body ?? '').length > MAX_BODY) return `body is longer than ${MAX_BODY} characters`;
  return null;
}
