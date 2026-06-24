import http from 'http';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { pipeline } from 'stream/promises';
import path from 'path';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const ROOT = path.resolve(process.cwd(), 'html');
const DIST_ROOT = path.resolve(process.cwd(), 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const isUnderRoot = (filePath, root) => {
  const relative = path.relative(root, filePath);
  return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
};

const resolveFilePath = (pathname) => {
  if (pathname === '/') {
    return path.join(ROOT, 'index.html');
  }
  if (pathname.startsWith('/dist/')) {
    const subPath = pathname.slice('/dist/'.length);
    return path.join(DIST_ROOT, path.normalize(subPath));
  }
  return path.join(ROOT, path.normalize(pathname));
};

const resolveRoot = (pathname) => (pathname.startsWith('/dist/') ? DIST_ROOT : ROOT);

const serveFile = async (filePath, res) => {
  const stats = await stat(filePath).catch(() => null);
  if (!stats?.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  await pipeline(createReadStream(filePath), res);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const { pathname } = url;
    const filePath = resolveFilePath(pathname);
    const root = resolveRoot(pathname);

    if (!isUnderRoot(filePath, root)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    await serveFile(filePath, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
