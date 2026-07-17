/**
 * Meridian v2 — Service Worker
 * ------------------------------------------
 * - Navegação e assets versionados (?v=): NETWORK FIRST quando online
 *   (corrige “ficar preso” em shell antigo após deploy).
 * - Offline: cai no cache (PWA sem Node).
 * - APIs externas (Anthropic, ESPN…): rede normal, sem interceptar.
 */
const CACHE_VERSION = 'meridian-v2-offline-v28';
const APP_BUILD = '42'; // espelha ?v= do shell — cliente pode comparar

// Arquivos do app (relativos ao scope do SW)
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './css/app.css',
  './css/app.css?v=42',
  './js/app.js',
  './js/lib/intent.js?v=42',
  './js/analysis/tab-helpers.js?v=42',
  './js/analysis/lineup.js?v=42',
  './js/analysis/prompts.js?v=42',
  './js/analysis/render.js?v=42',
  './js/export/report.js?v=42',
  './js/data/espn.js?v=42',
  './js/data/live.js?v=42',
  './js/app.js?v=42',
  './css/print-report.css?v=42',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo-aurora.png',
  './assets/wc-trophy.png',
  './assets/meridian.ico'
];

function abs(path) {
  return new URL(path, self.registration.scope).href;
}

async function precacheAll() {
  const cache = await caches.open(CACHE_VERSION);
  const base = self.registration.scope;
  await Promise.all(SHELL.map(async (path) => {
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
    } catch (_) { /* offline durante install parcial — ignora */ }
  }));
}

async function matchShell(request) {
  const cache = await caches.open(CACHE_VERSION);
  let hit = await cache.match(request);
  if (hit) return hit;
  hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const base = self.registration.scope;
  return (
    (await cache.match(new URL('./index.html', base).href)) ||
    (await cache.match(new URL('./', base).href)) ||
    (await cache.match(abs('./index.html'))) ||
    null
  );
}

function isNav(req) {
  return req.mode === 'navigate' ||
    (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));
}

/** Assets versionados (?v=N) ou index — preferir rede para não ficar em shell velho. */
function preferNetwork(url) {
  if (url.searchParams.has('v')) return true;
  const p = url.pathname || '';
  if (/\/(index\.html)?$/.test(p) || p.endsWith('/sw.js')) return true;
  if (/\.(html|js|css|webmanifest|json)$/i.test(p)) return true;
  return false;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res && res.ok) {
      try { await cache.put(req, res.clone()); } catch (_) {}
      // index: também sob aliases de navegação
      try {
        const u = new URL(req.url);
        if (isNav(req) || /index\.html$/i.test(u.pathname) || u.pathname.endsWith('/')) {
          await cache.put(abs('./index.html'), res.clone());
          await cache.put(abs('./'), res.clone());
        }
      } catch (_) {}
      return res;
    }
  } catch (_) { /* offline */ }
  const cached = await matchShell(req);
  if (cached) return cached;
  return new Response('', { status: 504, statusText: 'Offline' });
}

async function cacheFirst(req) {
  const cached = await matchShell(req);
  if (cached) {
    // revalida em background
    fetch(req).then(async (res) => {
      if (res && res.ok) {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(req, res.clone());
      }
    }).catch(() => {});
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
  event.waitUntil((async () => {
    await precacheAll();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Avisa abas abertas que o SW novo assumiu (cliente pode recarregar 1x)
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => {
      try { c.postMessage({ type: 'SW_ACTIVATED', cache: CACHE_VERSION, build: APP_BUILD }); } catch (_) {}
    });
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'PRECACHE') {
    event.waitUntil(precacheAll().then(() => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true, cache: CACHE_VERSION, build: APP_BUILD });
    }));
    return;
  }
  if (data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ cache: CACHE_VERSION, build: APP_BUILD });
    }
    return;
  }
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_ALL') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // APIs / CDNs externos: não intercepta
  if (url.origin !== self.location.origin) return;

  // Navegação + shell versionado: NETWORK FIRST (online) → cache (offline)
  if (isNav(req) || preferNetwork(url)) {
    event.respondWith((async () => {
      if (isNav(req)) {
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
        const cached = await matchShell(req);
        if (cached) return cached;
        // Offline sem cache
        const origin = self.registration && self.registration.scope
          ? self.registration.scope
          : './';
        return new Response(
          '<!doctype html><meta charset=utf-8><title>Meridian v2</title>' +
          '<body style="font-family:system-ui;background:#0c1016;color:#f4efe6;padding:2rem;max-width:36rem;line-height:1.5">' +
          '<h1 style="color:#e8b44a">Cache ainda vazio</h1>' +
          '<p>Abra o app <b>uma vez online</b> (GitHub Pages ou servidor local) para gravar o shell no cache.</p>' +
          '<ul><li>Local: <code>Iniciar Meridian v2.bat</code> → <code>http://127.0.0.1:3457/</code></li>' +
          '<li>Pages: recarregue esta URL com rede</li></ul>' +
          '<p><a href="?resetsw=1" style="color:#e8b44a">Limpar SW e tentar de novo</a></p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      return networkFirst(req);
    })());
    return;
  }

  // Imagens / ícones: cache first
  event.respondWith(cacheFirst(req));
});
