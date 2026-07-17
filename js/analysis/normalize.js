/* js/analysis/normalize.js — schema canônico da análise + migração de histórico
 *
 * Write path único:
 *   attachAnalysisDerived(parsed, rawFacts)  → fim do pipeline (antes de render)
 *   migrateAnalysisPayload(d)                → só se d._schema !== ANALYSIS_SCHEMA
 * Render NÃO normaliza; history migra uma vez na carga.
 */
const ANALYSIS_SCHEMA = 2;

// ── Pad de eventos (rede de segurança determinística) ─────────────────────
function _padEventos(eventos, pool, target) {
  target = target || 7;
  const list = (Array.isArray(eventos) ? eventos : []).filter((e) => e && e.evento);
  if (list.length >= target) return list;
  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const have = new Set(list.map((e) => norm(e.evento)));
  const out = list.slice();
  for (const cand of pool) {
    if (out.length >= target) break;
    if (have.has(norm(cand.evento))) continue;
    out.push(cand);
    have.add(norm(cand.evento));
  }
  return out;
}

const _EST_CARTOES =
  'Estimativa conservadora — dados de cartões/faltas coletados foram insuficientes para fundamentar mais mercados com precisão.';
const _POOL_CARTOES = [
  { evento: 'Mais de 3.5 cartões amarelos totais no jogo', probabilidade: 0.55, fundamento: _EST_CARTOES },
  { evento: 'Mais de 5.5 cartões amarelos totais no jogo', probabilidade: 0.35, fundamento: _EST_CARTOES },
  { evento: 'Mais de 24.5 faltas totais no jogo', probabilidade: 0.5, fundamento: _EST_CARTOES },
  { evento: 'Ambas as equipes recebem cartão', probabilidade: 0.65, fundamento: _EST_CARTOES },
  { evento: 'Cartão no 1º tempo', probabilidade: 0.55, fundamento: _EST_CARTOES },
  { evento: 'Cartão vermelho no jogo', probabilidade: 0.12, fundamento: _EST_CARTOES },
  { evento: 'Mais de 1.5 cartões amarelos do time mandante', probabilidade: 0.5, fundamento: _EST_CARTOES },
  { evento: 'Mais de 1.5 cartões amarelos do time visitante', probabilidade: 0.5, fundamento: _EST_CARTOES },
];
const _EST_ESCANTEIOS =
  'Estimativa conservadora — estatísticas de escanteios coletadas foram insuficientes para fundamentar mais mercados com precisão.';
const _POOL_ESCANTEIOS = [
  { evento: 'Mais de 8.5 escanteios no jogo', probabilidade: 0.55, fundamento: _EST_ESCANTEIOS },
  { evento: 'Mais de 10.5 escanteios no jogo', probabilidade: 0.35, fundamento: _EST_ESCANTEIOS },
  { evento: 'Menos de 9.5 escanteios no jogo', probabilidade: 0.5, fundamento: _EST_ESCANTEIOS },
  { evento: 'Mais de 4.5 escanteios no 1º tempo', probabilidade: 0.5, fundamento: _EST_ESCANTEIOS },
  { evento: 'Ambos os times batem ao menos 1 escanteio', probabilidade: 0.82, fundamento: _EST_ESCANTEIOS },
  { evento: 'Mais de 4.5 escanteios do time mandante', probabilidade: 0.5, fundamento: _EST_ESCANTEIOS },
  { evento: 'Mais de 4.5 escanteios do time visitante', probabilidade: 0.5, fundamento: _EST_ESCANTEIOS },
  { evento: 'Time mandante com mais escanteios', probabilidade: 0.5, fundamento: _EST_ESCANTEIOS },
];

function _padCartoesEventos(eventos) {
  return _padEventos(eventos, _POOL_CARTOES, 7);
}
function _padEscanteiosEventos(eventos) {
  return _padEventos(eventos, _POOL_ESCANTEIOS, 5);
}

function _cornersFromTeam(t) {
  if (!t || typeof t !== 'object') return null;
  const f = t.escanteios_por_jogo,
    s = t.escanteios_sofridos_por_jogo;
  if ((f != null && f !== '') || (s != null && s !== ''))
    return { nome: t.nome || '', feitos: f, sofridos: s };
  return null;
}

function _padEventBlocks(d) {
  if (d.cartoes_faltas && Array.isArray(d.cartoes_faltas.eventos)) {
    const n = d.cartoes_faltas.eventos.filter((e) => e && e.evento).length;
    if (n > 0) d.cartoes_faltas.eventos = _padCartoesEventos(d.cartoes_faltas.eventos);
  }
  if (d.escanteios && Array.isArray(d.escanteios.eventos)) {
    const n = d.escanteios.eventos.filter((e) => e && e.evento).length;
    if (n > 0) d.escanteios.eventos = _padEscanteiosEventos(d.escanteios.eventos);
  }
}

/**
 * Migra payload antigo (pré-schema) uma única vez.
 * Idempotente se d._schema === ANALYSIS_SCHEMA.
 */
function migrateAnalysisPayload(d) {
  if (!d || typeof d !== 'object') return d;
  if (d._schema === ANALYSIS_SCHEMA) return d;

  if (!d._corners) {
    const cm = _cornersFromTeam(d.mandante),
      cv = _cornersFromTeam(d.visitante);
    if (cm || cv) d._corners = { mandante: cm, visitante: cv };
  }
  if (d._featEscanteios === undefined) d._featEscanteios = !!(d.escanteios || d._corners);
  if (d._featCartoes === undefined) d._featCartoes = !!(d.cartoes_faltas || d._pstats);
  if (d._featLineups === undefined) d._featLineups = !!d._lineups;

  // Pré-aba Escanteios: recupera mercados do resumo/tickets
  if (!d.escanteios && !d._corners) {
    const cornerEv = [];
    const pool = [
      ...(Array.isArray(d.eventos_provaveis) ? d.eventos_provaveis : []),
      ...(Array.isArray(d.sugestoes_ticket) ? d.sugestoes_ticket : []),
    ];
    const tf = typeof textFrom === 'function' ? textFrom : (v) => (v == null ? '' : String(v));
    for (const e of pool) {
      if (!e || typeof e !== 'object') continue;
      const name = e.evento || e.descricao || '';
      if (!/escanteio/i.test(String(name))) continue;
      cornerEv.push({
        evento: String(name),
        probabilidade: typeof e.probabilidade === 'number' ? e.probabilidade : 0.5,
        fundamento: tf(
          e.fundamento ||
            e.motivo ||
            'Mercado de escanteios recuperado do relatório original (antes da aba dedicada).'
        ),
      });
    }
    if (cornerEv.length) {
      d.escanteios = {
        analise:
          'Esta análise foi gerada antes da aba dedicada de Escanteios. Abaixo estão os mercados de escanteios que já constavam no relatório original (Resumo/tickets).',
        eventos: _padEscanteiosEventos(cornerEv),
        conclusao: null,
        _migrated: true,
      };
      d._featEscanteios = true;
    }
  }

  _padEventBlocks(d);
  d._schema = ANALYSIS_SCHEMA;
  return d;
}

/** Alias legado usado por testes / callers antigos. */
function normalizeAnalysisPayload(d) {
  return migrateAnalysisPayload(d);
}

/**
 * Único write-path pós-pipeline: anexa campos derivados de rawFacts + pads + schema.
 * rawFacts pode ser null (coleta falhou).
 */
function attachAnalysisDerived(parsed, rawFacts) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  try {
    if (rawFacts) {
      const objArr = (a) =>
        Array.isArray(a) && a.some((x) => x && typeof x === 'object')
          ? a.filter((x) => x && typeof x === 'object')
          : null;
      const mm = objArr(rawFacts.mandante && rawFacts.mandante.jogadores_chave);
      const vv = objArr(rawFacts.visitante && rawFacts.visitante.jogadores_chave);
      if (mm || vv) parsed._pstats = { mandante: mm || [], visitante: vv || [] };

      const cm = _cornersFromTeam(rawFacts.mandante);
      const cv = _cornersFromTeam(rawFacts.visitante);
      if (cm || cv) parsed._corners = { mandante: cm, visitante: cv };
    }
  } catch (_) {}

  parsed._featCartoes = true;
  parsed._featLineups = true;
  parsed._featEscanteios = true;
  parsed._coletaOk = !!rawFacts;

  try {
    if (typeof normalizeLineupTeam === 'function') {
      const mkLineup = (teamKey, tecKey) => {
        const rf = rawFacts && rawFacts[teamKey],
          p2 = parsed[teamKey],
          tec2 = parsed[tecKey];
        const nome = (rf && rf.nome) || (p2 && p2.nome) || '';
        const formacao = (rf && rf.formacao) || (tec2 && tec2.formacao) || '';
        const tecnico = (rf && rf.tecnico) || (tec2 && tec2.nome) || '';
        const banco = (rf && Array.isArray(rf.banco) ? rf.banco : [])
          .map((x) => (typeof textFrom === 'function' ? textFrom(x) : String(x || '')))
          .filter(Boolean);
        const escalacao_str = (rf && rf.escalacao_provavel) || (p2 && p2.escalacao) || '';
        const onze = (rf && Array.isArray(rf.onze_provavel) ? rf.onze_provavel : [])
          .map((p) => (typeof p === 'string' ? { nome: p, posicao: '' } : p))
          .filter((p) => p && p.nome);
        return normalizeLineupTeam({
          nome,
          formacao,
          tecnico,
          banco,
          escalacao_str,
          onze,
          rows: null,
        });
      };
      const lm = mkLineup('mandante', 'tecnico_mandante');
      const lv = mkLineup('visitante', 'tecnico_visitante');
      const has = (x) =>
        x &&
        ((x.rows && x.rows.length) ||
          (x.onze && x.onze.length) ||
          x.escalacao_str ||
          (x.banco && x.banco.length) ||
          x.tecnico ||
          x.formacao);
      if (has(lm) || has(lv)) parsed._lineups = { mandante: lm, visitante: lv };
    }
  } catch (_) {}

  // Schema marcado aqui; pads ficam para finalizeAnalysisPads (após auditoria)
  parsed._schema = ANALYSIS_SCHEMA;
  return parsed;
}

/** Pads pós-auditoria: só completa listas com ≥1 evento real. */
function finalizeAnalysisPads(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  _padEventBlocks(parsed);
  return parsed;
}

if (typeof window !== 'undefined') {
  window.ANALYSIS_SCHEMA = ANALYSIS_SCHEMA;
  window.migrateAnalysisPayload = migrateAnalysisPayload;
  window.normalizeAnalysisPayload = normalizeAnalysisPayload;
  window.attachAnalysisDerived = attachAnalysisDerived;
  window.finalizeAnalysisPads = finalizeAnalysisPads;
  window._padCartoesEventos = _padCartoesEventos;
  window._padEscanteiosEventos = _padEscanteiosEventos;
  window._padEventos = _padEventos;
}
