import { createServer } from 'node:http';
import { handle } from './app.js';

const port = Number(process.env.PORT ?? 3000);
createServer((req, res) => {
  handle(req, res).catch(() => {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal error' }));
  });
}).listen(port, () => console.log(`notes-api on :${port}`));
