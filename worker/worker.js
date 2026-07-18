/**
 * Meridian — Cloudflare Worker (proxy CORS)
 * ------------------------------------------
 * Um único Worker que faz proxy das APIs que o navegador não consegue chamar direto:
 *
 *   1. Anthropic   →  {worker}/v1/*        →  https://api.anthropic.com/v1/*
 *   2. API-Football→  {worker}/af/*        →  https://v3.football.api-sports.io/*
 *   3. FPL (EPL)   →  {worker}/fpl/*       →  https://fantasy.premierleague.com/api/*
 *                     (sem chave; a API oficial do Fantasy não manda CORS — só GET)
 *   4. football-data.org → {worker}/fd/*   →  https://api.football-data.org/v4/*
 *                     (probe 07/2026: as respostas GET da FD NÃO trazem
 *                      Access-Control-Allow-Origin em nenhuma origem → browser
 *                      direto sempre falha; o proxy é obrigatório)
 *
 * Por que existe: navegadores bloqueiam (CORS) chamadas diretas à API-Football; e manter a
 * chave da Anthropic no servidor (aqui) é mais seguro do que no navegador. O Worker adiciona
 * os cabeçalhos CORS e injeta as chaves a partir das VARIÁVEIS DE AMBIENTE do Cloudflare —
 * nenhuma chave fica no código nem no repositório.
 *
 * Variáveis de ambiente (Cloudflare → Settings → Variables / Secrets):
 *   ANTHROPIC_KEY  (obrigatória se for usar o proxy da Anthropic)
 *   AF_KEY         (opcional — se ausente, o Worker usa a chave que o app enviar na query)
 *
 * Deploy: veja o README.md nesta pasta.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access, cache-diagnosis-2026-04-07',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    try {
      // ── API-Football: {worker}/af/<path>?<query> ──────────────────────────
      if (url.pathname.startsWith('/af/') || url.pathname === '/af') {
        const afPath = url.pathname.replace(/^\/af/, '') || '/';
        const params = new URLSearchParams(url.search);
        // A chave pode vir do app (query) OU do ambiente do Worker (mais seguro).
        const key = env.AF_KEY || params.get('x-apisports-key') || '';
        params.delete('x-apisports-key'); // não repassa a chave na URL upstream
        const qs = params.toString();
        const upstream = 'https://v3.football.api-sports.io' + afPath + (qs ? '?' + qs : '');
        const r = await fetch(upstream, { headers: { 'x-apisports-key': key, 'Accept': 'application/json' } });
        const body = await r.text();
        return new Response(body, {
          status: r.status,
          headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }

      // ── football-data.org: {worker}/fd/<path> ────────────────────────────
      // FD não manda CORS nas respostas GET (nenhuma origem) — proxy obrigatório.
      // Chave: FD_KEY do ambiente OU o ?token= que o app envia (removido da URL upstream).
      if (url.pathname.startsWith('/fd/') || url.pathname === '/fd') {
        if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: CORS });
        const fdPath = url.pathname.replace(/^\/fd/, '') || '/';
        const params = new URLSearchParams(url.search);
        const key = env.FD_KEY || params.get('token') || '';
        params.delete('token');
        const qs = params.toString();
        const upstream = 'https://api.football-data.org/v4' + fdPath + (qs ? '?' + qs : '');
        const r = await fetch(upstream, { headers: { 'X-Auth-Token': key, 'Accept': 'application/json' } });
        const body = await r.text();
        const h = { ...CORS, 'Content-Type': 'application/json; charset=utf-8' };
        // repassa os headers de rate limit que o app usa para throttle
        const ra = r.headers.get('X-Requests-Available-Minute') || r.headers.get('X-RequestsAvailable');
        const rc = r.headers.get('X-RequestCounter-Reset');
        if (ra) h['X-RequestsAvailable'] = ra;
        if (rc) h['X-RequestCounter-Reset'] = rc;
        h['Access-Control-Expose-Headers'] = 'X-RequestsAvailable, X-RequestCounter-Reset';
        return new Response(body, { status: r.status, headers: h });
      }

      // ── FPL (Fantasy Premier League): {worker}/fpl/<path> ────────────────
      // API pública sem chave, mas SEM CORS — só funciona via proxy. Somente GET
      // e somente sob /api/ do fantasy.premierleague.com (nada além disso).
      if (url.pathname.startsWith('/fpl/') || url.pathname === '/fpl') {
        if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: CORS });
        const fplPath = url.pathname.replace(/^\/fpl/, '') || '/';
        const upstream = 'https://fantasy.premierleague.com/api' + fplPath + url.search;
        const r = await fetch(upstream, { headers: { 'Accept': 'application/json', 'User-Agent': 'meridian-proxy' } });
        const body = await r.text();
        return new Response(body, {
          status: r.status,
          headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
        });
      }

      // ── Anthropic: {worker}/v1/<path> (streaming) ─────────────────────────
      if (url.pathname.startsWith('/v1/')) {
        // Chave: secret do Worker (preferida) OU o x-api-key que o app enviar.
        // Sem nenhuma das duas → erro claro.
        if (!env.ANTHROPIC_KEY && !request.headers.get('x-api-key')) {
          return new Response(JSON.stringify({ error: { message: 'Sem chave Anthropic: configure a secret ANTHROPIC_KEY no Worker ou cole a chave no app.' } }),
            { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
        }
        const upstream = 'https://api.anthropic.com' + url.pathname + url.search;
        // Repassa os cabeçalhos do cliente; a secret do ambiente (se existir) prevalece.
        const h = new Headers(request.headers);
        if (env.ANTHROPIC_KEY) h.set('x-api-key', env.ANTHROPIC_KEY);
        if (!h.has('anthropic-version')) h.set('anthropic-version', '2023-06-01');
        h.delete('host');
        h.delete('anthropic-dangerous-direct-browser-access'); // desnecessário fora do navegador
        const r = await fetch(upstream, {
          method: request.method,
          headers: h,
          body: request.method === 'POST' ? request.body : undefined,
        });
        // Passa o corpo adiante (streaming SSE preservado) + CORS
        const ct = r.headers.get('content-type') || 'application/json';
        return new Response(r.body, { status: r.status, headers: { ...CORS, 'Content-Type': ct } });
      }

      // ── Health check ──────────────────────────────────────────────────────
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({ ok: true, service: 'meridian-proxy' }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } });
      }

      return new Response('Not found', { status: 404, headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: { message: 'proxy error: ' + (e && e.message || e) } }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  },
};
