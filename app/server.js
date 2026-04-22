const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ENTRY_FILE = 'book.html';
const ROOT_PATH = path.resolve(__dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

function resolveRequestPath(reqUrl) {
  const rawUrlPath = (reqUrl || '/').split('?')[0];
  const decodedPath = decodeURIComponent(rawUrlPath);
  const relativePath = decodedPath === '/' ? ENTRY_FILE : decodedPath.replace(/^\/+/, '');
  const resolvedPath = path.resolve(ROOT_PATH, relativePath);

  if (resolvedPath !== ROOT_PATH && !resolvedPath.startsWith(`${ROOT_PATH}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

function isSpaRoute(filePath) {
  return path.extname(filePath) === '';
}

const server = http.createServer((req, res) => {
  let filePath;
  try {
    filePath = resolveRequestPath(req.url);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!isSpaRoute(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      fs.readFile(path.join(ROOT_PATH, ENTRY_FILE), (entryErr, html) => {
        if (entryErr) {
          res.writeHead(500);
          res.end('Server Error');
          return;
        }

        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(html);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`BookScan running on port ${PORT}`);
});
