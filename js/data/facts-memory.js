/* js/data/facts-memory.js — memória local de fatos básicos repetíveis
 *
 * Objetivo: economizar web_search (tokens/$) guardando no localStorage
 * dimensões estáveis/repetidas (tabela, forma, técnico, xG médio…) e
 * injetando-as na próxima coleta em vez de re-buscar na web.
 *
 * NÃO substitui grounding: fatos voláteis (placar LIVE, escalação do dia)
 * têm TTL curto. Memória de treino do modelo continua proibida — isto é
 * cache de DADOS já coletados/API, não knowledge cut-off.
 */
const FACTS_MEM_STORE = 'meridian_facts_mem_v1';
const FACTS_MEM_META = 'meridian_facts_mem_meta_v1';

/** TTLs por dimensão (ms). Mais estável → maior TTL. */
const FACTS_MEM_TTL = {
  tabela: 6 * 60 * 60 * 1000, // classificação
  resultados: 2 * 60 * 60 * 1000, // placares recentes
  forma: 4 * 60 * 60 * 1000,
  tecnico: 24 * 60 * 60 * 1000, // técnico muda raro
  ranking: 6 * 60 * 60 * 1000,
  xg: 12 * 60 * 60 * 1000,
  estilo: 24 * 60 * 60 * 1000,
  escanteios: 12 * 60 * 60 * 1000,
  // escalação/desfalques: voláteis — TTL curto; ainda economiza re-busca no mesmo dia
  escalacao: 3 * 60 * 60 * 1000,
  desfalques: 3 * 60 * 60 * 1000,
  structured_blob: 2 * 60 * 60 * 1000, // bloco texto das APIs grátis
};

/** Dimensões cobertas por fontes estruturadas (ESPN/TSDB/OF/Scorebat) — skip web por padrão se hasFd. */
const FACTS_MEM_STRUCTURED_DIMS = ['tabela', 'resultados', 'forma', 'ranking'];

/** Dimensões que, se frescas na memória, permitem enxugar tópicos de web_search. */
const FACTS_MEM_SKIPPABLE = ['tecnico', 'xg', 'estilo', 'escanteios', 'escalacao', 'desfalques'];

function _fmNow() {
  return Date.now();
}

function _fmLoad() {
  try {
    return JSON.parse(localStorage.getItem(FACTS_MEM_STORE) || '{}') || {};
  } catch {
    return {};
  }
}

function _fmSave(db) {
  try {
    localStorage.setItem(FACTS_MEM_STORE, JSON.stringify(db));
  } catch {}
}

function _fmKey(compId, dim, entity) {
  return [compId || 'brsa', dim, entity || '_liga'].join('::');
}

function factsMemGet(compId, dim, entity) {
  const db = _fmLoad();
  const k = _fmKey(compId, dim, entity);
  const e = db[k];
  if (!e || e.v == null) return null;
  const ttl = FACTS_MEM_TTL[dim] || 6 * 60 * 60 * 1000;
  if (_fmNow() - (e.ts || 0) > ttl) return null;
  return e.v;
}

function factsMemIsFresh(compId, dim, entity) {
  return factsMemGet(compId, dim, entity) != null;
}

function factsMemSet(compId, dim, value, entity) {
  if (value == null || value === '') return;
  const db = _fmLoad();
  const k = _fmKey(compId, dim, entity);
  db[k] = { ts: _fmNow(), v: value, dim: dim };
  // GC simples: remove entradas > 7 dias
  const week = 7 * 24 * 60 * 60 * 1000;
  const now = _fmNow();
  Object.keys(db).forEach((key) => {
    if (now - (db[key].ts || 0) > week) delete db[key];
  });
  _fmSave(db);
}

function factsMemListFresh(compId) {
  const db = _fmLoad();
  const prefix = (compId || 'brsa') + '::';
  const now = _fmNow();
  const out = [];
  Object.keys(db).forEach((k) => {
    if (!k.startsWith(prefix)) return;
    const e = db[k];
    if (!e) return;
    const dim = e.dim || k.split('::')[1];
    const ttl = FACTS_MEM_TTL[dim] || 6 * 60 * 60 * 1000;
    if (now - (e.ts || 0) > ttl) return;
    const entity = k.split('::')[2] || '_liga';
    out.push({ dim, entity, value: e.v, ageMin: Math.round((now - e.ts) / 60000) });
  });
  return out;
}

/**
 * Monta bloco de texto "MEMÓRIA LOCAL" para injetar no prompt da Fase 1.
 * Só inclui entradas frescas da competição.
 */
function factsMemBuildKnownBlock(compId) {
  const rows = factsMemListFresh(compId);
  if (!rows.length) return '';
  const L = [
    '=== MEMÓRIA LOCAL (fatos básicos já coletados — NÃO re-busque na web o que já está abaixo; só busque lacunas/atualizações) ===',
  ];
  rows.forEach((r) => {
    const who = r.entity === '_liga' ? 'liga' : r.entity;
    const val = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
    L.push('[' + r.dim + ' · ' + who + ' · ~' + r.ageMin + 'min] ' + String(val).slice(0, 400));
  });
  return L.join('\n');
}

/**
 * Quais dimensões skipáveis já estão cobertas (memória fresca + hasFd estruturado).
 * Retorna Set de dim names.
 */
function factsMemCoveredDims(compId, hasStructured) {
  const covered = new Set();
  if (hasStructured) FACTS_MEM_STRUCTURED_DIMS.forEach((d) => covered.add(d));
  FACTS_MEM_SKIPPABLE.forEach((d) => {
    // coberto se existe entrada de liga OU de algum time (heurística: ≥1 fresh)
    const rows = factsMemListFresh(compId).filter((r) => r.dim === d);
    if (rows.length) covered.add(d);
  });
  // structured blob fresco também conta como tabela/resultados
  if (factsMemIsFresh(compId, 'structured_blob')) {
    FACTS_MEM_STRUCTURED_DIMS.forEach((d) => covered.add(d));
  }
  return covered;
}

/**
 * Filtra / enxuga a lista de tópicos de web_search conforme memória.
 * - hasStructured: remove buscas de tabela/forma
 * - técnico+escalação+xg na memória: reduz tópicos redundantes
 * Retorna { topics, skippedDims, maxUsesHint }
 */
function factsMemFilterTopics(topics, compId, hasStructured) {
  const covered = factsMemCoveredDims(compId, hasStructured);
  const skipped = [];
  const kept = [];
  (topics || []).forEach((t) => {
    const low = String(t).toLowerCase();
    let drop = false;
    // se já temos tabela+resultados estruturados, tópicos só de classificação caem
    if (
      covered.has('tabela') &&
      covered.has('resultados') &&
      /classifica[cç][aã]o|tabela|forma recente resultados/i.test(low) &&
      !/t[eé]cnico|les[oõ]es|escala[cç]|xg|desfalque/i.test(low)
    ) {
      drop = true;
      skipped.push('tabela/resultados');
    }
    // técnico + escalação + desfalques todos na memória → tópico de desfalques/técnico pode cair
    if (
      covered.has('tecnico') &&
      covered.has('escalacao') &&
      covered.has('desfalques') &&
      /t[eé]cnico|escala[cç]|desfalque|les[oõ]es|suspens/i.test(low) &&
      !/xg|vulnerab|estat/i.test(low)
    ) {
      drop = true;
      skipped.push('tecnico/escalacao');
    }
    // xG + estilo na memória → tópico só de xG cai
    if (covered.has('xg') && covered.has('estilo') && /xg|expected goals|estilo t[aá]tico/i.test(low) && !/les[oõ]es|escala/i.test(low)) {
      drop = true;
      skipped.push('xg/estilo');
    }
    if (!drop) kept.push(t);
  });
  // nunca zerar: se tudo caiu, mantém 1 tópico mais genérico de lacunas
  if (!kept.length && topics && topics.length) {
    kept.push(
      '"[Mandante] [Visitante] atualizações de última hora lesões escalação" — Sofascore, imprensa (memória local já cobriu o resto — só lacunas)'
    );
  }
  const uniqSkip = [...new Set(skipped)];
  return {
    topics: kept,
    skippedDims: uniqSkip,
    coveredDims: [...covered],
    maxUsesHint: Math.max(1, kept.length),
  };
}

/**
 * Ingere bloco estruturado (fdCtx texto) como blob + tenta extrair linhas de tabela/resultados.
 */
function factsMemIngestStructured(compId, fdCtx) {
  if (!fdCtx || !String(fdCtx).trim()) return;
  const text = String(fdCtx);
  factsMemSet(compId, 'structured_blob', text.slice(0, 12000), '_liga');
  // heurística leve: se tem bloco de classificação, marca dim
  if (/classifica|standings|pts:|pontos/i.test(text)) {
    factsMemSet(compId, 'tabela', 'presente_no_bloco_estruturado', '_liga');
  }
  if (/resultado|confirmados|scoreboard|ft\b|\d+x\d+/i.test(text)) {
    factsMemSet(compId, 'resultados', 'presente_no_bloco_estruturado', '_liga');
    factsMemSet(compId, 'forma', 'presente_no_bloco_estruturado', '_liga');
  }
}

/**
 * Após Fase 1 bem-sucedida: grava fatos do rawFacts por time (técnico, xG, etc.).
 */
function factsMemIngestRawFacts(compId, rawFacts) {
  if (!rawFacts || typeof rawFacts !== 'object') return;
  const saveTeam = (tm) => {
    if (!tm || !tm.nome) return;
    const ent = String(tm.nome).trim();
    if (tm.tecnico) factsMemSet(compId, 'tecnico', String(tm.tecnico), ent);
    if (tm.ranking_fifa) factsMemSet(compId, 'ranking', String(tm.ranking_fifa), ent);
    if (tm.xg_marcado != null || tm.xg_sofrido != null) {
      factsMemSet(
        compId,
        'xg',
        'marc=' + (tm.xg_marcado ?? '?') + ' sofr=' + (tm.xg_sofrido ?? '?'),
        ent
      );
    }
    if (tm.estilo_ofensivo) factsMemSet(compId, 'estilo', String(tm.estilo_ofensivo), ent);
    if (tm.escanteios_por_jogo != null) {
      factsMemSet(
        compId,
        'escanteios',
        'fav=' + tm.escanteios_por_jogo + ' sof=' + (tm.escanteios_sofridos_por_jogo ?? '?'),
        ent
      );
    }
    if (tm.escalacao_provavel || (Array.isArray(tm.onze_provavel) && tm.onze_provavel.length)) {
      const esc =
        tm.escalacao_provavel ||
        (tm.onze_provavel || [])
          .map((p) => (p && p.nome) || '')
          .filter(Boolean)
          .join(', ');
      if (esc) factsMemSet(compId, 'escalacao', String(esc).slice(0, 500), ent);
    }
    if (Array.isArray(tm.desfalques) && tm.desfalques.length) {
      factsMemSet(compId, 'desfalques', tm.desfalques.join(', ').slice(0, 400), ent);
    }
    if (Array.isArray(tm.resultados_recentes) && tm.resultados_recentes.length) {
      factsMemSet(compId, 'resultados', JSON.stringify(tm.resultados_recentes).slice(0, 600), ent);
      factsMemSet(compId, 'forma', JSON.stringify(tm.resultados_recentes).slice(0, 400), ent);
    }
  };
  saveTeam(rawFacts.mandante);
  saveTeam(rawFacts.visitante);
  if (rawFacts.grupo_classificacao) {
    factsMemSet(compId, 'tabela', String(rawFacts.grupo_classificacao).slice(0, 400), '_liga');
  }
}

/** Limpa memória (debug / botão futuro). */
function factsMemClear(compId) {
  if (!compId) {
    try {
      localStorage.removeItem(FACTS_MEM_STORE);
    } catch {}
    return;
  }
  const db = _fmLoad();
  const prefix = compId + '::';
  Object.keys(db).forEach((k) => {
    if (k.startsWith(prefix)) delete db[k];
  });
  _fmSave(db);
}

/** Stats leves p/ UI/debug. */
function factsMemStats(compId) {
  const rows = factsMemListFresh(compId);
  return { count: rows.length, dims: [...new Set(rows.map((r) => r.dim))], rows: rows.slice(0, 30) };
}
