import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOrderHandler } from '../api/order.js';
const root = fileURLToPath(new URL('../', import.meta.url));
// Local development is deliberately offline: no real Telegram credentials or calls.
const order = createOrderHandler({ env: {} });
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (pathname === '/api/order') return order(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (!file.startsWith(root) || relative.startsWith('.') || /^(api|tests|scripts|docs)\//.test(relative) || relative.endsWith('.json')) { res.writeHead(404); return res.end(); }
  try { const data = await fs.readFile(file); res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(req.method === 'HEAD' ? undefined : data); }
  catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`http://localhost:${server.address().port} (offline API; no Telegram messages)`));
