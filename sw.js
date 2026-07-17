/**
 * Meridian v2 — Service Worker
 *
 * Política enxuta:
 * - navigate (HTML): network-first (online pega shell novo; offline → cache)
 * - assets ?v=N e estáticos: cache-first por URL (nova versão = miss = rede)
 * - APIs externas: não intercepta
 *
 * Versão única: SHELL_VERSION (espelha ?v= no index)
 */
const SHELL_VERSION = '44';
const CACHE_VERSION = 'meridian-v2-offline-v' + SHELL_VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './css/app.css',
  './css/app.css?v=' + SHELL_VERSION,
  './css/print-report.css?v=' + SHELL_VERSION,
  './js/lib/intent.js?v=' + SHELL_VERSION,
  './js/analysis/tab-helpers.js?v=' + SHELL_VERSION,
  './js/analysis/lineup.js?v=' + SHELL_VERSION,
  './js/analysis/prompts.js?v=' + SHELL_VERSION,
  './js/analysis/normalize.js?v=' + SHELL_VERSION,
  './js/analysis/render.js?v=' + SHELL_VERSION,
  './js/export/report.js?v=' + SHELL_VERSION,
  './js/data/espn.js?v=' + SHELL_VERSION,
  './js/data/football-apis.js?v=' + SHELL_VERSION,
  './js/data/live.js?v=' + SHELL_VERSION,
  './js/data/history.js?v=' + SHELL_VERSION,
  './js/app.js?v=' + SHELL_VERSION,
  './assets/vendor/html2pdf.bundle.min.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo-aurora.png',
  './assets/wc-trophy.png',
  './assets/meridian.ico',
];

function abs(path) {
  return new URL(path, self.registration.scope).href;
}

async function precacheAll() {
  const cache = await caches.open(CACHE_VERSION);
  const base = self.registration.scope;
  await Promise.all(
    SHELL.map(async (path) => {
      const url = new URL(path, base).href;
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && res.ok) {
          await cache.put(url, res.clone());
          if (path === './index.html' || path === './') {
            await cache.put(new URL('./', base).href, res.clone());
            await cache.put(new URL('./index.html', base).href, res.clone());
          }
        }
      } catch (_) {}
    })
  );
}

async function matchCache(request) {
  const cache = await caches.open(CACHE_VERSION);
  let hit = await cache.match(request);
  if (hit) return hit;
  hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const base = self.registration.scope;
  return (
    (await cache.match(new URL('./index.html', base).href)) ||
    (await cache.match(new URL('./', base).href)) ||
    null
  );
}

function isNav(req) {
  return (
    req.mode === 'navigate' ||
    (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'))
  );
}

async function networkFirstNav(req) {
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res && res.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(req, res.clone());
      await cache.put(abs('./index.html'), res.clone());
      await cache.put(abs('./'), res.clone());
      return res;
    }
  } catch (_) {}
  const cached = await matchCache(req);
  if (cached) return cached;
  return new Response(
    '<!doctype html><meta charset=utf-8><title>Meridian v2</title>' +
      '<body style="font-family:system-ui;background:#0c1016;color:#f4efe6;padding:2rem;line-height:1.5">' +
      '<h1 style="color:#e8b44a">Offline sem cache</h1>' +
      '<p>Abra uma vez online. <a href="?resetsw=1" style="color:#e8b44a">Limpar SW</a></p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function cacheFirstAsset(req) {
  const cached = await matchCache(req);
  if (cached) {
    // revalidate in background when online
    fetch(req)
      .then(async (res) => {
        if (res && res.ok) {
          const cache = await caches.open(CACHE_VERSION);
          await cache.put(req, res.clone());
        }
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(req, res.clone());
    }
    return res;
  } catch (_) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precacheAll();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'PRECACHE') {
    event.waitUntil(
      precacheAll().then(() => {
        if (event.ports && event.ports[0])
          event.ports[0].postMessage({ ok: true, cache: CACHE_VERSION, build: SHELL_VERSION });
      })
    );
    return;
  }
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_ALL') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (isNav(req)) {
    event.respondWith(networkFirstNav(req));
    return;
  }
  event.respondWith(cacheFirstAsset(req));
});
