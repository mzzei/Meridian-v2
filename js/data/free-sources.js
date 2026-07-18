/* js/data/free-sources.js — fontes estruturadas GRÁTIS (padrão ESPN/TSDB)
 *
 * 1) OpenFootball (GitHub football.json) — calendário + placares por temporada
 * 2) Scorebat Free Video API — resultados recentes (feed global sem key)
 * 3) OpenLigaDB — tabela/jogos (CORS aberto; cobertura principal: ligas DE)
 *
 * Todas: fetch → parse → format texto → anexa a fdCtx no gatherFacts.
 * Cache localStorage com TTL curto (igual ESPN/TSDB). Sem chave de API.
 */
const FREE_SRC_TTL = 20 * 60 * 1000; // 20 min
const OF_BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master';
const SCOREBAT_URL = 'https://www.scorebat.com/video-api/v1/';
const OPENLIGA_BASE = 'https://api.openligadb.de';

async function _freeFetchJson(url, cacheKey, ttl) {
  ttl = ttl || FREE_SRC_TTL;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && Date.now() - c.t < ttl) return c.d;
    }
  } catch {}
  const ctl = new AbortController();
  const tid = setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) return null;
    const d = await res.json();
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d }));
    } catch {}
    return d;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

function _ofSeasonCandidates(compId) {
  const c = typeof getComp === 'function' ? getComp(compId) : null;
  if (!c || !c.openfootball) return [];
  const stem = c.openfootball;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const out = [];
  if (c.calendar === 'european') {
    // season folder yyyy-yy; try current then previous
    const cur = m >= 8 ? y : y - 1;
    out.push(cur + '-' + String(cur + 1).slice(-2) + '/' + stem + '.json');
    out.push(cur - 1 + '-' + String(cur).slice(-2) + '/' + stem + '.json');
  } else {
    // calendar year folder
    out.push(y + '/' + stem + '.json');
    out.push(y - 1 + '/' + stem + '.json');
  }
  return out;
}

/** OpenFootball: resultados recentes + próximos da temporada. */
async function getOpenFootballContext(compId) {
  const id = compId || (typeof _activeCompId !== 'undefined' ? _activeCompId : 'brsa');
  const paths = _ofSeasonCandidates(id);
  if (!paths.length) return '';
  let data = null;
  let used = '';
  for (const p of paths) {
    const d = await _freeFetchJson(OF_BASE + '/' + p, 'meridian_of_' + id + '_' + p.replace(/[^\w.-]/g, '_'));
    if (d && Array.isArray(d.matches) && d.matches.length) {
      data = d;
      used = p;
      break;
    }
  }
  if (!data) return '';
  const L = [];
  const label = typeof compLabel === 'function' ? compLabel(id) : id;
  L.push(
    '=== RESULTADOS / CALENDÁRIO (OpenFootball · fonte estruturada estática independente — ' +
      (data.name || label) +
      ' · ' +
      used +
      ') ==='
  );
  const today = new Date().toISOString().slice(0, 10);
  const withScore = [];
  const upcoming = [];
  (data.matches || []).forEach((m) => {
    const ft = m.score && m.score.ft;
    const lineBase =
      (m.date || '') +
      ' · ' +
      (m.team1 || '?') +
      (ft ? ' ' + ft[0] + 'x' + ft[1] + ' ' : ' x ') +
      (m.team2 || '?') +
      (m.round ? ' (' + m.round + ')' : '');
    if (ft && ft.length >= 2) withScore.push(lineBase);
    else if ((m.date || '') >= today) upcoming.push(lineBase);
  });
  // últimos 18 com placar + próximos 12
  withScore.slice(-18).forEach((x) => L.push(x));
  if (upcoming.length) {
    L.push('--- Próximos (OpenFootball) ---');
    upcoming.slice(0, 12).forEach((x) => L.push(x));
  }
  return L.length > 1 ? L.join('\n') : '';
}

function _scorebatMatchComp(item, keys) {
  const name = String((item && item.competition && item.competition.name) || item.title || '').toLowerCase();
  return keys.some((k) => name.includes(String(k).toLowerCase()));
}

/** Scorebat free v1: gols/destaques recentes filtrados pela competição ativa. */
async function getScorebatContext(compId) {
  const id = compId || (typeof _activeCompId !== 'undefined' ? _activeCompId : 'brsa');
  const keys =
    typeof scorebatKeys === 'function'
      ? scorebatKeys(id)
      : (typeof getComp === 'function' && getComp(id).scorebat) || [];
  if (!keys.length) return '';
  const feed = await _freeFetchJson(SCOREBAT_URL, 'meridian_scorebat_v1', 15 * 60 * 1000);
  if (!Array.isArray(feed) || !feed.length) return '';
  const hits = feed.filter((x) => _scorebatMatchComp(x, keys)).slice(0, 20);
  // se poucas hits da liga, ainda anexa top global leve (contexto de mercado) — só 5
  const extra =
    hits.length >= 5
      ? []
      : feed.filter((x) => !hits.includes(x)).slice(0, 5 - Math.min(hits.length, 5));
  const rows = hits.length ? hits : extra;
  if (!rows.length) return '';
  const L = [];
  const label = typeof compLabel === 'function' ? compLabel(id) : id;
  L.push(
    '=== RESULTADOS RECENTES / HIGHLIGHTS (Scorebat Free · fonte estruturada independente — filtro: ' +
      label +
      ') ==='
  );
  rows.forEach((it) => {
    const comp = (it.competition && it.competition.name) || '';
    const date = (it.date || '').slice(0, 10);
    L.push((date ? date + ' · ' : '') + (it.title || '?') + (comp ? ' [' + comp + ']' : ''));
  });
  return L.join('\n');
}

function _openligaSeasonYear() {
  const d = new Date();
  const m = d.getMonth() + 1;
  // Bundesliga season starts ~Aug → year of start
  return m >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

/** OpenLigaDB: tabela + jogos recentes (quando a comp tem openliga shortcut). */
async function getOpenLigaContext(compId) {
  const id = compId || (typeof _activeCompId !== 'undefined' ? _activeCompId : 'brsa');
  const shortcut =
    typeof openligaShortcut === 'function'
      ? openligaShortcut(id)
      : (typeof getComp === 'function' && getComp(id).openliga) || null;
  // Cobertura DE nativa; se a comp ativa não mapeia, ainda expõe bl1 como camada
  // de referência opcional (não polui o prompt com lixo — só se shortcut explícito).
  if (!shortcut) return '';
  const season = _openligaSeasonYear();
  const [table, matches] = await Promise.all([
    _freeFetchJson(
      OPENLIGA_BASE + '/getbltable/' + shortcut + '/' + season,
      'meridian_oldb_tbl_' + shortcut + '_' + season
    ),
    _freeFetchJson(
      OPENLIGA_BASE + '/getmatchdata/' + shortcut + '/' + season,
      'meridian_oldb_md_' + shortcut + '_' + season
    ),
  ]);
  const L = [];
  const label = typeof compLabel === 'function' ? compLabel(id) : shortcut;
  if (Array.isArray(table) && table.length) {
    L.push(
      '=== CLASSIFICAÇÃO (OpenLigaDB · fonte estruturada independente — ' +
        label +
        ' · ' +
        shortcut +
        ' ' +
        season +
        ') ==='
    );
    table.slice(0, 20).forEach((t, i) => {
      L.push(
        '  ' +
          (i + 1) +
          '. ' +
          (t.teamName || t.shortName || '?') +
          ' — Pts:' +
          (t.points ?? '?') +
          ' J:' +
          (t.matches ?? '?') +
          ' V:' +
          (t.won ?? '?') +
          ' E:' +
          (t.draw ?? '?') +
          ' D:' +
          (t.lost ?? '?') +
          ' GP:' +
          (t.goals ?? '?') +
          ' GC:' +
          (t.opponentGoals ?? '?')
      );
    });
  }
  if (Array.isArray(matches) && matches.length) {
    const finished = matches
      .filter((m) => m.matchIsFinished)
      .slice(-15)
      .map((m) => {
        const r = (m.matchResults || []).find((x) => x.resultTypeID === 2) || (m.matchResults || [])[0];
        const sc =
          r && r.pointsTeam1 != null
            ? r.pointsTeam1 + 'x' + r.pointsTeam2
            : '—';
        const d = (m.matchDateTime || '').slice(0, 10);
        return (
          d +
          ' · ' +
          (m.team1 && m.team1.teamName) +
          ' ' +
          sc +
          ' ' +
          (m.team2 && m.team2.teamName)
        );
      });
    if (finished.length) {
      L.push('=== RESULTADOS RECENTES (OpenLigaDB) ===');
      finished.forEach((x) => L.push(x));
    }
  }
  return L.join('\n');
}

/**
 * Dispara as 3 fontes grátis em paralelo + devolve blocos de texto não-vazios.
 * Usado por gatherFacts (rede de segurança / validação cruzada).
 */
async function getFreeSourcesContext(compId) {
  const id = compId || (typeof _activeCompId !== 'undefined' ? _activeCompId : 'brsa');
  const [of, sb, ol] = await Promise.all([
    getOpenFootballContext(id).catch(() => ''),
    getScorebatContext(id).catch(() => ''),
    getOpenLigaContext(id).catch(() => ''),
  ]);
  return [of, sb, ol].filter(Boolean).join('\n\n');
}
