// Meridian v2 — servidor estático local (porta 3457).
// ---------------------------------------------------------------------------
// ISTO NÃO É O MERIDIAN ORIGINAL (v1 / Copa / porta 3456).
// Meridian v2 ainda SEM git: verdade = arquivos desta pasta (+ backup D:). Ver ISOLAMENTO.md.
// Node assíncrono: tolerante a concorrência e desconexão do cliente.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;               // serve a própria pasta do projeto
// Meridian v2: 3457 | Original (outra pasta): 3456 — NUNCA misturar
const PORT = Number(process.env.PORT) || 3457;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  res.on('error', () => {});           // cliente desconectou → ignora, não derruba
  req.on('error', () => {});
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    const filePath = path.join(ROOT, path.normalize(urlPath));
    // Segurança: bloqueia traversal para fora da raiz.
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Forbidden');
    }
    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found: ' + urlPath);
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => { try { res.destroy(); } catch (_) {} });
      stream.pipe(res);
    });
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('500'); } catch (_) {}
  }
});

server.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') { console.error('Porta ' + PORT + ' já em uso.'); process.exit(1); }
  console.error('Erro do servidor:', (e && e.message) || e);
});

// Nada (exceção síncrona OU promessa rejeitada) deve matar o servidor de dev.
process.on('uncaughtException', (e) => console.error('uncaught:', (e && e.message) || e));
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', (e && e.message) || e));

server.listen(PORT, HOST, () => {
  console.log('Meridian v2: http://' + HOST + ':' + PORT + '/  (raiz: ' + ROOT + ')');
});
