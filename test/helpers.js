import { createServer } from 'node:http';
import { handle } from '../src/app.js';

/** Start the app on a random port; returns { url, close }. */
export async function start() {
  const server = createServer((req, res) => void handle(req, res));
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}
