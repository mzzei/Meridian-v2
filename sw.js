/**
 * Meridian v2 — Service Worker OFFLINE-FIRST
 * ------------------------------------------
 * Depois de UMA abertura com o servidor (para instalar/atualizar o cache),
 * o app instalado no Edge abre SEM o Node local.
 *
 * - Shell (HTML/CSS/JS/ícones): cache primeiro
 * - APIs externas (Anthropic, ESPN…): rede normal, sem interceptar
 */
const CACHE_VERSION = 'meridian-v2-offline-v25';

// Arquivos do app (relativos ao scope do SW)
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './css/app.css',
  './css/app.css?v=40',
  './js/app.js',
  './js/lib/intent.js?v=40','./js/analysis/tab-helpers.js?v=40','./js/analysis/lineup.js?v=40','./js/analysis/prompts.js?v=40','./js/export/report.js?v=40','./js/app.js?v=40','./css/print-report.css?v=40',
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
        // Garante match de navegação em "/" e "/index.html"
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
  // match exato
  let hit = await cache.match(request);
  if (hit) return hit;
  // ignora query string (css?v=40 vs css?v=40)
  hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  // fallbacks de HTML
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
  })());
});

// Página pede re-cache (quando servidor está no ar)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRECACHE') {
    event.waitUntil(precacheAll().then(() => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true, cache: CACHE_VERSION });
    }));
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // APIs / CDNs externos: não intercepta (Anthropic, ESPN, fonts Google…)
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app): CACHE FIRST — não precisa do Node
  if (isNav(req)) {
    event.respondWith((async () => {
      const cached = await matchShell(req);
      if (cached) {
        // tenta atualizar em background se o servidor estiver no ar
        event.waitUntil(
          fetch(req).then(async (res) => {
            if (res && res.ok) {
              const cache = await caches.open(CACHE_VERSION);
              await cache.put(req, res.clone());
              await cache.put(abs('./index.html'), res.clone());
              await cache.put(abs('./'), res.clone());
            }
          }).catch(() => {})
        );
        return cached;
      }
      // Sem cache ainda: precisa de rede (primeira vez / cache limpo)
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_VERSION);
          await cache.put(req, res.clone());
          await cache.put(abs('./index.html'), res.clone());
        }
        return res;
      } catch (_) {
        return new Response(
          '<!doctype html><meta charset=utf-8><title>Meridian v2</title>' +
          '<body style="font-family:system-ui;background:#0c1016;color:#f4efe6;padding:2rem;max-width:36rem;line-height:1.5">' +
          '<h1 style="color:#e8b44a">Cache ainda vazio</h1>' +
          '<p>Abra <b>uma vez</b> com o servidor ligado para gravar o app no Edge:</p>' +
          '<ol><li><code>Iniciar Meridian v2.bat</code></li>' +
          '<li>Abra <code>http://127.0.0.1:3457/</code></li>' +
          '<li>Depois pode fechar o servidor e usar o app instalado</li></ol>' +
          '<p><a href="/" style="color:#e8b44a">Tentar de novo</a></p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Assets locais: CACHE FIRST
  event.respondWith((async () => {
    const cached = await matchShell(req);
    if (cached) {
      event.waitUntil(
        fetch(req).then(async (res) => {
          if (res && res.ok) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(req, res.clone());
          }
        }).catch(() => {})
      );
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
  })());
});
