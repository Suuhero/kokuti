import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const root = await realpath(join(dirname(fileURLToPath(import.meta.url)), '../dist/pages'));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.zip': 'application/zip' };
const server = createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1');
    const path = decodeURIComponent(url.pathname);
    if (path.includes('\\') || path.includes(':') || path.split('/').some(part => part.startsWith('.'))) throw new Error();
    let file = join(root, path);
    if ((await stat(file)).isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(308, {location: url.pathname.split('/').at(-1) + '/' + url.search}).end(); return; }
      file = join(file, 'index.html');
    }
    file = await realpath(file);
    const rel = relative(root, file), type = mime[extname(file).toLowerCase()];
    if (!type || rel.startsWith('..' + sep) || isAbsolute(rel)) throw new Error();
    res.writeHead(200, {'Content-Type': type, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache'});
    if (req.method === 'HEAD') res.end(); else await pipeline(createReadStream(file), res);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
server.listen(8794,'127.0.0.1', () => console.log('Kokuch comparison: http://127.0.0.1:8794/compare/'));
