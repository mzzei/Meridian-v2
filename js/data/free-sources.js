/* js/data/free-sources.js — fontes estruturadas GRÁTIS (registry)
 *
 * Providers independentes da cascata paga AF→FD→ESPN:
 *   1) TheSportsDB (getTsdbContext em espn.js) — multi-liga
 *   2) OpenFootball (GitHub football.json) — calendário/placares
 *   3) Scorebat Free — highlights recentes (filtro estrito por liga)
 *   4) OpenLigaDB — só se COMPETITIONS.openliga estiver mapeado (senão no-op)
 *
 * Padrão: fetch → parse → texto → orçamento/dedupe → join.
 */
const FREE_SRC_TTL = 20 * 60 * 1000;
const OF_BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master';
const SCOREBAT_URL = 'https://www.scorebat.com/video-api/v1/';
const OPENLIGA_BASE = 'https://api.openligadb.de';
/** teto de chars por fonte / total free (input tokens) */
const FREE_CAP_EACH = 3800;
const FREE_CAP_TOTAL = 9000;

function _freeCompId(compId) {
  return compId || (typeof _activeCompId !== 'undefined' ? _activeCompId : 'brsa');
}

function _freeGetComp(id) {
  return typeof getComp === 'function' ? getComp(id) : null;
}

function _freeLabel(id) {
  return typeof compLabel === 'function' ? compLabel(id) : id;
}

async function _freeJson(url, cacheKey, ttl) {
  if (typeof cachedJsonFetch === 'function') {
    return cachedJsonFetch(url, cacheKey, { ttl: ttl || FREE_SRC_TTL, timeout: 9000 });
  }
  // fallback mínimo se cached-fetch não carregou
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function _ofSeasonCandidates(compId) {
  const c = _freeGetComp(compId);
  if (!c || !c.openfootball) return [];
  const stem = c.openfootball;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const out = [];
  if (c.calendar === 'european') {
    const cur = m >= 8 ? y : y - 1;
    out.push(cur + '-' + String(cur + 1).slice(-2) + '/' + stem + '.json');
    out.push(cur - 1 + '-' + String(cur).slice(-2) + '/' + stem + '.json');
  } else {
    out.push(y + '/' + stem + '.json');
    out.push(y - 1 + '/' + stem + '.json');
  }
  return out;
}

/** Dedup linhas de placar por chave home|away|date. */
function _dedupeScoreLines(lines) {
  const seen = new Set();
  const out = [];
  (lines || []).forEach((line) => {
    const k = String(line)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\sx×\-–.]/gi, '')
      .slice(0, 80);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(line);
  });
  return out;
}

async function getOpenFootballContext(compId) {
  const id = _freeCompId(compId);
  const paths = _ofSeasonCandidates(id);
  if (!paths.length) return '';
  let data = null;
  let used = '';
  for (const p of paths) {
    const d = await _freeJson(
      OF_BASE + '/' + p,
      'meridian_of_' + id + '_' + p.replace(/[^\w.-]/g, '_'),
      FREE_SRC_TTL
    );
    if (d && Array.isArray(d.matches) && d.matches.length) {
      data = d;
      used = p;
      break;
    }
  }
  if (!data) return '';
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
  const L = [
    '=== RESULTADOS / CALENDÁRIO (OpenFootball · ' +
      (data.name || _freeLabel(id)) +
      ' · ' +
      used +
      ') ===',
  ];
  _dedupeScoreLines(withScore.slice(-16)).forEach((x) => L.push(x));
  if (upcoming.length) {
    L.push('--- Próximos (OpenFootball) ---');
    upcoming.slice(0, 10).forEach((x) => L.push(x));
  }
  return L.length > 1 ? L.join('\n') : '';
}

function _scorebatKeys(id) {
  if (typeof scorebatKeys === 'function') return scorebatKeys(id);
  const c = _freeGetComp(id);
  return (c && Array.isArray(c.scorebat) && c.scorebat) || [];
}

function _scorebatMatchComp(item, keys) {
  const name = String((item && item.competition && item.competition.name) || '').toLowerCase();
  if (!name) return false;
  return keys.some((k) => name.includes(String(k).toLowerCase()));
}

/** Scorebat: só hits da competição. Sem fallback de outras ligas. */
async function getScorebatContext(compId) {
  const id = _freeCompId(compId);
  const keys = _scorebatKeys(id);
  if (!keys.length) return '';
  const feed = await _freeJson(SCOREBAT_URL, 'meridian_scorebat_v1', 15 * 60 * 1000);
  if (!Array.isArray(feed) || !feed.length) return '';
  const hits = feed.filter((x) => _scorebatMatchComp(x, keys)).slice(0, 15);
  if (!hits.length) return ''; // vazio honesto — não poluir com PL/Ligue1 no contexto BR
  const L = [
    '=== RESULTADOS RECENTES / HIGHLIGHTS (Scorebat Free · ' + _freeLabel(id) + ') ===',
  ];
  hits.forEach((it) => {
    const comp = (it.competition && it.competition.name) || '';
    const date = (it.date || '').slice(0, 10);
    L.push((date ? date + ' · ' : '') + (it.title || '?') + (comp ? ' [' + comp + ']' : ''));
  });
  return L.join('\n');
}

function _openligaSeasonYear() {
  const d = new Date();
  const m = d.getMonth() + 1;
  return m >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

/** OpenLigaDB: no-op se openliga não estiver no catálogo (sem teatro). */
async function getOpenLigaContext(compId) {
  const id = _freeCompId(compId);
  const shortcut =
    typeof openligaShortcut === 'function'
      ? openligaShortcut(id)
      : (_freeGetComp(id) && _freeGetComp(id).openliga) || null;
  if (!shortcut) return '';
  const season = _openligaSeasonYear();
  const [table, matches] = await Promise.all([
    _freeJson(
      OPENLIGA_BASE + '/getbltable/' + shortcut + '/' + season,
      'meridian_oldb_tbl_' + shortcut + '_' + season
    ),
    _freeJson(
      OPENLIGA_BASE + '/getmatchdata/' + shortcut + '/' + season,
      'meridian_oldb_md_' + shortcut + '_' + season
    ),
  ]);
  const L = [];
  if (Array.isArray(table) && table.length) {
    L.push(
      '=== CLASSIFICAÇÃO (OpenLigaDB · ' +
        _freeLabel(id) +
        ' · ' +
        shortcut +
        ' ' +
        season +
        ') ==='
    );
    table.slice(0, 18).forEach((t, i) => {
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
          (t.lost ?? '?')
      );
    });
  }
  if (Array.isArray(matches) && matches.length) {
    const finished = matches
      .filter((m) => m.matchIsFinished)
      .slice(-12)
      .map((m) => {
        const r =
          (m.matchResults || []).find((x) => x.resultTypeID === 2) ||
          (m.matchResults || [])[0];
        const sc =
          r && r.pointsTeam1 != null ? r.pointsTeam1 + 'x' + r.pointsTeam2 : '—';
        return (
          (m.matchDateTime || '').slice(0, 10) +
          ' · ' +
          (m.team1 && m.team1.teamName) +
          ' ' +
          sc +
          ' ' +
          (m.team2 && m.team2.teamName)
        );
      });
    if (finished.length) {
      L.push('=== RESULTADOS (OpenLigaDB) ===');
      finished.forEach((x) => L.push(x));
    }
  }
  return L.join('\n');
}

/**
 * Registry de fontes independentes (paralelo) — anti-fantasma.
 * Retorna { text, active[], silent[] }:
 *   active = só quem devolveu texto útil (entra no agente)
 *   silent = tentados e vazios (NÃO vão pro prompt; só telemetria)
 * TSDB vive em espn.js.
 */
async function getFreeSourcesBundle(compId) {
  const id = _freeCompId(compId);
  const providers = [
    {
      id: 'tsdb',
      run: () =>
        typeof getTsdbContext === 'function' ? getTsdbContext(id) : Promise.resolve(''),
    },
    { id: 'openfootball', run: () => getOpenFootballContext(id) },
    { id: 'scorebat', run: () => getScorebatContext(id) },
    { id: 'openliga', run: () => getOpenLigaContext(id) },
  ];
  const settled = await Promise.all(
    providers.map(async (p) => {
      try {
        const text = await p.run();
        const t = text && String(text).trim() ? String(text).trim() : '';
        if (!t) return { id: p.id, ok: false, text: '', chars: 0 };
        return { id: p.id, ok: true, text: t, chars: t.length };
      } catch {
        return { id: p.id, ok: false, text: '', chars: 0 };
      }
    })
  );
  const active = settled
    .filter((r) => r.ok)
    .map((r) => ({
      id: r.id,
      text: r.text,
      chars: r.chars,
      benefits:
        typeof detectSourceBenefits === 'function' ? detectSourceBenefits(r.text) : [],
    }));
  const silent = settled.filter((r) => !r.ok).map((r) => r.id);
  const blocks = active.map((a) => a.text);
  const text =
    typeof joinContextBlocks === 'function'
      ? joinContextBlocks(blocks, { maxTotal: FREE_CAP_TOTAL, maxEach: FREE_CAP_EACH })
      : blocks.join('\n\n').slice(0, FREE_CAP_TOTAL);
  return { text, active, silent };
}

/** Compat: só o texto (quem não precisa de telemetria). */
async function getFreeSourcesContext(compId) {
  const b = await getFreeSourcesBundle(compId);
  return b.text || '';
}

/** Ids ativos (telemetria). */
async function getFreeSourcesMeta(compId) {
  const b = await getFreeSourcesBundle(compId);
  return (b.active || []).map((a) => a.id);
}
