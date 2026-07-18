/**
 * Meridian v2 — Cloudflare Worker (proxy CORS)
 * ------------------------------------------
 *   1. Anthropic   →  {worker}/v1/*        →  https://api.anthropic.com/v1/*
 *   2. API-Football→  {worker}/af/*        →  https://v3.football.api-sports.io/*
 *   3. FPL (EPL)   →  {worker}/fpl/*       →  https://fantasy.premierleague.com/api/*
 *   4. football-data.org → {worker}/fd/*   →  https://api.football-data.org/v4/*
 *
 * Segurança (shell 67):
 *   - Allowlist de Origin (browser). Sem Origin (curl/ops) continua permitido.
 *   - Secret ALLOWED_ORIGINS (CSV) amplia a lista default.
 *   - ALLOW_NULL_ORIGIN=1 permite Origin: null (file://) — off por padrão.
 *
 * Secrets: AF_KEY, FD_KEY, (opcional) ANTHROPIC_KEY, ALLOWED_ORIGINS, ALLOW_NULL_ORIGIN
 * Nome do Worker: meridian-v2-proxy — NUNCA meridian-proxy (v1).
 */

/** Origens default (Origin = scheme+host+port, sem path). */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://mzzei.github.io',
  'http://localhost:3457',
  'http://127.0.0.1:3457',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
];

function parseAllowedOrigins(env) {
  const extra = String((env && env.ALLOWED_ORIGINS) || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
  return [...set];
}

/**
 * @returns {{ ok: boolean, cors: Record<string,string>, reason?: string }}
 */
function resolveCors(request, env) {
  const origin = request.headers.get('Origin');
  const base = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access, cache-diagnosis-2026-04-07',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  // Sem Origin: curl, health checks, wrangler — não é abuso via <script> de site aleatório
  if (!origin) {
    return {
      ok: true,
      cors: { ...base, 'Access-Control-Allow-Origin': '*' },
    };
  }

  // file:// manda Origin: null
  if (origin === 'null') {
    if (env && String(env.ALLOW_NULL_ORIGIN || '') === '1') {
      return {
        ok: true,
        cors: { ...base, 'Access-Control-Allow-Origin': 'null' },
      };
    }
    return { ok: false, cors: base, reason: 'Origin null (file://) bloqueado; set ALLOW_NULL_ORIGIN=1 se precisar' };
  }

  const allowed = parseAllowedOrigins(env);
  if (allowed.includes(origin)) {
    return {
      ok: true,
      cors: { ...base, 'Access-Control-Allow-Origin': origin },
    };
  }

  return {
    ok: false,
    cors: base,
    reason: 'Origin não permitida: ' + origin,
  };
}

function forbidden(cors, reason) {
  return new Response(
    JSON.stringify({
      error: {
        message: 'Forbidden: ' + (reason || 'origin not allowed'),
        code: 'origin_not_allowed',
      },
    }),
    {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}

export default {
  async fetch(request, env) {
    const gate = resolveCors(request, env);
    const CORS = gate.cors;

    if (request.method === 'OPTIONS') {
      if (!gate.ok) return forbidden(CORS, gate.reason);
      return new Response(null, { headers: CORS });
    }

    if (!gate.ok) return forbidden(CORS, gate.reason);

    const url = new URL(request.url);

    try {
      // ── API-Football: {worker}/af/<path>?<query> ──────────────────────────
      if (url.pathname.startsWith('/af/') || url.pathname === '/af') {
        const afPath = url.pathname.replace(/^\/af/, '') || '/';
        const params = new URLSearchParams(url.search);
        const key = env.AF_KEY || params.get('x-apisports-key') || '';
        params.delete('x-apisports-key');
        const qs = params.toString();
        const upstream = 'https://v3.football.api-sports.io' + afPath + (qs ? '?' + qs : '');
        const r = await fetch(upstream, {
          headers: { 'x-apisports-key': key, Accept: 'application/json' },
        });
        const body = await r.text();
        return new Response(body, {
          status: r.status,
          headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }

      // ── football-data.org: {worker}/fd/<path> ────────────────────────────
      if (url.pathname.startsWith('/fd/') || url.pathname === '/fd') {
        if (request.method !== 'GET')
          return new Response('Method not allowed', { status: 405, headers: CORS });
        const fdPath = url.pathname.replace(/^\/fd/, '') || '/';
        const params = new URLSearchParams(url.search);
        const key = env.FD_KEY || params.get('token') || '';
        params.delete('token');
        const qs = params.toString();
        const upstream = 'https://api.football-data.org/v4' + fdPath + (qs ? '?' + qs : '');
        const r = await fetch(upstream, {
          headers: { 'X-Auth-Token': key, Accept: 'application/json' },
        });
        const body = await r.text();
        const h = { ...CORS, 'Content-Type': 'application/json; charset=utf-8' };
        const ra =
          r.headers.get('X-Requests-Available-Minute') || r.headers.get('X-RequestsAvailable');
        const rc = r.headers.get('X-RequestCounter-Reset');
        if (ra) h['X-RequestsAvailable'] = ra;
        if (rc) h['X-RequestCounter-Reset'] = rc;
        h['Access-Control-Expose-Headers'] = 'X-RequestsAvailable, X-RequestCounter-Reset';
        return new Response(body, { status: r.status, headers: h });
      }

      // ── FPL: {worker}/fpl/<path> ─────────────────────────────────────────
      if (url.pathname.startsWith('/fpl/') || url.pathname === '/fpl') {
        if (request.method !== 'GET')
          return new Response('Method not allowed', { status: 405, headers: CORS });
        const fplPath = url.pathname.replace(/^\/fpl/, '') || '/';
        // só paths sob /api do fantasy — evita open proxy
        if (fplPath.includes('..')) {
          return new Response('Bad path', { status: 400, headers: CORS });
        }
        const upstream =
          'https://fantasy.premierleague.com/api' + fplPath + url.search;
        const r = await fetch(upstream, {
          headers: { Accept: 'application/json', 'User-Agent': 'meridian-v2-proxy' },
        });
        const body = await r.text();
        return new Response(body, {
          status: r.status,
          headers: {
            ...CORS,
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=900',
          },
        });
      }

      // ── Anthropic: {worker}/v1/<path> ────────────────────────────────────
      if (url.pathname.startsWith('/v1/')) {
        if (!env.ANTHROPIC_KEY && !request.headers.get('x-api-key')) {
          return new Response(
            JSON.stringify({
              error: {
                message:
                  'Sem chave Anthropic: configure a secret ANTHROPIC_KEY no Worker ou cole a chave no app.',
              },
            }),
            { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
          );
        }
        const upstream = 'https://api.anthropic.com' + url.pathname + url.search;
        const h = new Headers(request.headers);
        if (env.ANTHROPIC_KEY) h.set('x-api-key', env.ANTHROPIC_KEY);
        if (!h.has('anthropic-version')) h.set('anthropic-version', '2023-06-01');
        h.delete('host');
        h.delete('anthropic-dangerous-direct-browser-access');
        // Sem Origin/Referer no upstream: com Origin, a Anthropic trata como request
        // de browser e exige o header dangerous-direct (que acabamos de remover).
        h.delete('origin');
        h.delete('referer');
        const r = await fetch(upstream, {
          method: request.method,
          headers: h,
          body: request.method === 'POST' ? request.body : undefined,
        });
        const ct = r.headers.get('content-type') || 'application/json';
        return new Response(r.body, { status: r.status, headers: { ...CORS, 'Content-Type': ct } });
      }

      // ── Health ──────────────────────────────────────────────────────────
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            ok: true,
            service: 'meridian-v2-proxy',
            origin_gate: true,
            allowed_default: DEFAULT_ALLOWED_ORIGINS,
          }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        );
      }

      return new Response('Not found', { status: 404, headers: CORS });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: { message: 'proxy error: ' + ((e && e.message) || e) } }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }
  },
};
