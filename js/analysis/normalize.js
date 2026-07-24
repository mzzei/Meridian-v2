import { expose } from '../expose.js';

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
// ── xG zerado na análise (shell 105) ───────────────────────────────────────
// Auditoria real (Corinthians × Remo): visitante veio com xg_marcado:0 e
// xg_sofrido:0 enquanto o away_logic estimava ~1.0 — o modelo preencheu 0 onde
// não sabia (o template JSON usa 0.0 como exemplo de FORMA) e 0 é lido como
// MEDIÇÃO. xG médio 0 (ou fora de 0.1–4.5) não existe → vira null e o card
// mostra "—", coerente com a estimativa declarada no lambda.
function _sanitizeAnalysisTeamXg(parsed) {
  try {
    for (const side of ['mandante', 'visitante']) {
      const t = parsed[side];
      if (!t || typeof t !== 'object') continue;
      for (const f of ['xg_marcado', 'xg_sofrido']) {
        if (t[f] == null || t[f] === '') continue;
        const n = Number(t[f]);
        if (!isFinite(n) || n < 0.1 || n > 4.5) t[f] = null;
      }
    }
  } catch {}
}

// ── Mercados de gols reconciliados por Poisson (shell 105) ─────────────────
// Auditoria real: "P(U3.5)=0.66 não decorre dos lambdas 1.6+1.0 por Poisson".
// Filosofia do produto: o modelo estima PARÂMETROS (lambdas), o código calcula
// PROBABILIDADES — a aba Tática já faz isso; eventos/tickets de mercados PUROS
// de gols passam a decorrer dos mesmos lambdas, com nota documentando o ajuste.
// Cobertos: over/under total X.5 (sem nome de time), ambas marcam sim/não,
// "<time> marca / +0.5 do <time>" (P≥1 gol). Mercados táticos (1X2, cartões,
// escanteios) ficam com o modelo — ali contexto legitimamente desvia de Poisson.
function _poi(k, lam) { let lp = -lam + k * Math.log(lam); for (let i = 1; i <= k; i++) lp -= Math.log(i); return lam <= 0 ? (k === 0 ? 1 : 0) : Math.exp(lp); }
function _poissonReconcileGoalMarkets(parsed) {
  try {
    const lh = Number(parsed.lambda && parsed.lambda.home_mid), la = Number(parsed.lambda && parsed.lambda.away_mid);
    if (!isFinite(lh) || !isFinite(la) || lh <= 0 || la <= 0 || lh > 6 || la > 6) return;
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const hn = norm(parsed.mandante && parsed.mandante.nome), vn = norm(parsed.visitante && parsed.visitante.nome);
    const pTotalOver = (line) => { let under = 0; for (let t = 0; t <= Math.floor(line); t++) { let pt = 0; for (let i = 0; i <= t; i++) pt += _poi(i, lh) * _poi(t - i, la); under += pt; } return 1 - under; };
    const pTeamAtLeast = (k, l) => { let u = 0; for (let i = 0; i < k; i++) u += _poi(i, l); return 1 - u; };
    const bt = (1 - Math.exp(-lh)) * (1 - Math.exp(-la));
    // REGRA-MÃE contra a repetição (auditoria Santos×Chape, shell 112): a reconciliação
    // SÓ recalcula/carimba um mercado que mapeia com CERTEZA a uma fórmula de Poisson de
    // jogo inteiro. Se não mapeia (período, linha ambígua), retorna null → NÃO toca e NÃO
    // carimba: o valor do modelo fica (auditável). Carimbo indevido é pior que não mexer —
    // ele mascara o erro E é blindado pelo backstop do auditor (shell 110).
    const calc = (t) => {
      // ESCOPO: mercados de PERÍODO (1º/2º tempo, intervalo, etapa) não são modeláveis pelos
      // lambdas de JOGO INTEIRO — o bug real tratava "1.5 gol no 2º tempo" como total da
      // partida (82% em vez de ~46%). Fora do escopo → devolve ao modelo, sem carimbo.
      if (/tempo|intervalo|\bht\b|\b1t\b|\b2t\b|\betapa\b/.test(t)) return null;
      const teamHome = !!(hn && t.includes(hn)), teamAway = !!(vn && t.includes(vn));
      // TOTAL over/under de gols do jogo (só quando NÃO é de um time específico)
      const mOU = t.match(/\b(mais|menos|over|under)\b[^0-9]{0,12}(\d+)[.,]5\s*(gols?|golos?)/);
      if (mOU && !teamHome && !teamAway) {
        const over = pTotalOver(Number(mOU[2]) + 0.5);
        return /menos|under/.test(mOU[1]) ? 1 - over : over;
      }
      if (/ambas(?: as)? equipes marcam|ambas marcam|btts/.test(t)) return /n[a]o\b|\bnao\b/.test(t) ? 1 - bt : bt;
      // MERCADO POR TIME: a LINHA decide o k → P(time ≥ k). O bug (Santos×Chape): devolvia
      // 1−e^−λ = P(≥1) para QUALQUER "marca", ignorando a linha — "Santos marca +1.5 gol"
      // (≥2, ~57%) saía 85% (≥1). Agora "+N.5"→≥N+1, "N ou mais"→≥N, "marca"/"+0.5"→≥1.
      const team = teamHome ? lh : teamAway ? la : null;
      if (team != null && !/escanteio|cart[a]o|cantos|falta/.test(t)) {
        let k = null;
        const mLine = t.match(/(?:mais de|acima de|over|\+\s*de|>)\s*(\d+)[.,]5/);
        const mMais = t.match(/\b(\d+)\s*(?:\+|ou mais)\s*(?:gols?|golos?)?/);
        if (mLine) k = Number(mLine[1]) + 1;
        else if (mMais) k = Number(mMais[1]);
        else if (/marca(?: a qualquer momento)?\b|(?:mais de|over|>)\s*0[.,]5/.test(t)) k = 1;
        if (k != null && k >= 1) return pTeamAtLeast(k, team);
      }
      return null;
    };
    const all = [].concat(parsed.eventos_provaveis || [], parsed.sugestoes_ticket || []).filter((e) => e && typeof e === 'object');
    for (const e of all) {
      if (typeof e.probabilidade !== 'number') continue;
      const p = calc(norm(e.evento || e.descricao || ''));
      if (p == null) continue;
      const expected = Math.round(p * 100) / 100;
      // tolerância 1 p.p. (igual shell 103): o caso auditado real divergia ~2 p.p.
      if (Math.abs(Math.round(e.probabilidade * 100) - Math.round(expected * 100)) > 1) {
        const antes = e.probabilidade;
        e.probabilidade = expected;
        e.fundamento = String(e.fundamento || '').trim() + ` [prob. recalculada por Poisson dos lambdas ${lh.toFixed(1)}+${la.toFixed(1)} (era ${Math.round(antes * 100)}%)]`;
      }
    }
  } catch {}
}

// ── Coerência aritmética de dupla chance (shell 103) ──────────────────────
// Auditoria real: "1X = 0.78 mas Vence(0.55)+Empate(0.25) = 0.80" — incoerência
// interna de 2 p.p. Aritmética não é tarefa de LLM: quando o card traz o trio
// (vitória do time, empate) E uma dupla chance do MESMO time, a probabilidade da
// dupla chance é RECONCILIADA por código para V+E, com nota no fundamento (o
// ajuste fica documentado — auditoria não acusa "ad hoc"). Só mexe quando a
// divergência passa de 1 p.p.; nunca inventa entradas novas.
function _fixDoubleChanceCoherence(parsed) {
  try {
    const all = []
      .concat(Array.isArray(parsed.eventos_provaveis) ? parsed.eventos_provaveis : [])
      .concat(Array.isArray(parsed.sugestoes_ticket) ? parsed.sugestoes_ticket : [])
      .filter((e) => e && typeof e === 'object');
    const txt = (e) => String(e.evento || e.descricao || '');
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const prob = (e) => (typeof e.probabilidade === 'number' ? e.probabilidade : null);
    // vitórias secas: "<Time> vence…" sem "ou empata"/dupla
    const wins = all
      .map((e) => {
        const m = norm(txt(e)).match(/^([\w .'-]{2,40}?)\s+vence/);
        return m && !/ou empat|dupla/.test(norm(txt(e))) && prob(e) != null ? { team: m[1].trim(), p: prob(e) } : null;
      })
      .filter(Boolean);
    const drawE = all.find((e) => /empate/.test(norm(txt(e))) && !/vence|ou |dupla/.test(norm(txt(e))) && prob(e) != null);
    if (!wins.length || !drawE) return;
    for (const e of all) {
      const t = norm(txt(e));
      if (!/dupla chance|vence ou empata|\(1x\)|\(x2\)/.test(t) || prob(e) == null) continue;
      const win = wins.find((w) => t.includes(w.team));
      if (!win) continue;
      const expected = Math.round((win.p + drawE.probabilidade) * 100) / 100;
      // comparação em p.p. INTEIROS (float faria 0.80-0.79 = 0.0100…9 disparar à toa)
      const diffPp = Math.abs(Math.round(prob(e) * 100) - Math.round(expected * 100));
      if (expected > 0 && expected <= 1 && diffPp > 1) {
        const antes = e.probabilidade;
        e.probabilidade = expected;
        e.fundamento = String(e.fundamento || '').trim() +
          ` [prob. reconciliada por código: V ${Math.round(win.p * 100)}% + E ${Math.round(drawE.probabilidade * 100)}% (era ${Math.round(antes * 100)}%)]`;
      }
    }
  } catch {}
}

// ── Calibração de confiança por CÓDIGO (shell 108) ─────────────────────────
// Auditoria real (Botafogo × Vitória): tickets "alta" com confianca_geral
// "medio", e "alta"/"media" em escanteios/cartões cuja coleta explicitamente
// NÃO trouxe dados (só proxies). Regras deterministas:
// 1. Teto: confiança de ticket ≤ confianca_geral (alto→alta, medio→media,
//    baixo→baixa). Rebaixamento é anotado no fundamento.
// 2. Mercado sem dado coletado nunca fica acima de "media"; se o TETO geral já
//    for menor, vale o menor. Detecção pelo rawFacts: escanteios sem médias
//    plausíveis, cartões sem stats disciplinares, jogador citado sem números.
const _CONF_RANK = { baixa: 0, media: 1, alta: 2 };
const _GERAL_CAP = { baixo: 'baixa', medio: 'media', alto: 'alta' };
function _calibrateConfidence(parsed, rawFacts) {
  try {
    const tickets = Array.isArray(parsed.sugestoes_ticket) ? parsed.sugestoes_ticket : [];
    if (!tickets.length) return;
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const geralCap = _GERAL_CAP[norm(parsed.confianca_geral)] || 'alta';
    const plaus = (v, lo, hi) => v != null && v !== '' && isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi;
    const sides = [rawFacts && rawFacts.mandante, rawFacts && rawFacts.visitante].filter(Boolean);
    const temEscanteios = sides.some((t) => plaus(t.escanteios_por_jogo, 1, 9.9) || plaus(t.escanteios_sofridos_por_jogo, 1, 9.9));
    const temDisciplina = sides.some((t) => (Array.isArray(t.jogadores_chave) ? t.jogadores_chave : []).some((p) => p && typeof p === 'object' && (p.cartoes_amarelos != null || p.faltas_cometidas_por_jogo != null)));
    // jogadores com stats numéricos coletados (qualquer campo além de nome/posição)
    const comStats = new Set();
    sides.forEach((t) => (Array.isArray(t.jogadores_chave) ? t.jogadores_chave : []).forEach((p) => {
      if (p && typeof p === 'object' && p.nome && Object.keys(p).some((k) => k !== 'nome' && k !== 'posicao' && k !== 'observacao' && p[k] != null && p[k] !== '')) comStats.add(norm(p.nome));
    }));
    const semStatsCitado = (txt) => {
      // nome próprio no texto do ticket que NÃO está no conjunto com stats
      for (const t of sides)
        for (const arr of [t.onze_provavel, t.jogadores_chave])
          for (const p of Array.isArray(arr) ? arr : []) {
            const nm = norm(typeof p === 'string' ? p : p && p.nome);
            if (nm && nm.length > 3 && txt.includes(nm) && !comStats.has(nm)) return true;
          }
      return false;
    };
    for (const tk of tickets) {
      if (!tk || typeof tk !== 'object') continue;
      const cur = norm(tk.confianca);
      if (!(cur in _CONF_RANK)) continue;
      const txt = norm(tk.descricao || '');
      let cap = geralCap, motivo = `teto = confianca_geral "${norm(parsed.confianca_geral)}"`;
      // motivo de MERCADO vence o genérico quando os tetos empatam (mais informativo);
      // se o teto geral já é mais estrito (baixa), ele permanece — nunca sobe
      const capMkt = (cond, label) => {
        if (!cond) return;
        if (_CONF_RANK[cap] > _CONF_RANK.media) cap = 'media';
        if (_CONF_RANK[cap] >= _CONF_RANK.media) motivo = label;
      };
      capMkt(/escanteio|cantos/.test(txt) && !temEscanteios, 'escanteios sem dados coletados (proxies)');
      capMkt(/cart[a]o|cart[o]es|amarelo/.test(txt) && !temDisciplina, 'cartões sem stats disciplinares coletados');
      capMkt(semStatsCitado(txt), 'jogador citado sem números individuais coletados');
      if (_CONF_RANK[cur] > _CONF_RANK[cap]) {
        tk.confianca = cap;
        tk.fundamento = String(tk.fundamento || '').trim() + ` [confiança rebaixada por código: ${motivo}]`;
      }
    }
  } catch {}
}

// ── PRÉVIA sem "jogo encerrado" no contexto (shell 109) ─────────────────────
// Auditoria real (Corinthians × Remo): contexto_fase trazia "jogo encerrado no
// intervalo com Corinthians 3-0" num card de PRÉVIA (retrospecto do 1º turno
// contaminando a categorização do documento). Regra por código: em prévia,
// sentença que AFIRMA o jogo analisado como ocorrido é removida do contexto e o
// evento vira lacuna declarada (a informação não some — muda de lugar e ganha
// rótulo honesto). Sentença de retrospecto rotulada ("no 1º turno…") sobrevive.
const _FINISHED_RE = /(jogo|partida)\s+(encerrad|finalizad|terminad)|encerrad[oa]\s+no\s+intervalo|placar\s+final|termin(ou|ada)\s+\d+\s*[x×-]\s*\d+/i;
function _sanitizePreviaContext(parsed) {
  try {
    if (parsed.contexto_analise !== 'previa') return;
    for (const f of ['contexto_fase', 'fase']) {
      const v = String(parsed[f] || '');
      if (!v || !_FINISHED_RE.test(v)) continue;
      const kept = v.split(/(?<=[.;!?])\s+/).filter((sent) => !_FINISHED_RE.test(sent));
      parsed[f] = kept.join(' ').trim();
      if (!Array.isArray(parsed.lacunas)) parsed.lacunas = [];
      parsed.lacunas.push(`Linha afirmando jogo já encerrado foi removida de "${f}" por conflitar com o status de PRÉVIA (provável contaminação de retrospecto na coleta) — confirme o status real da partida.`);
    }
  } catch {}
}

// ── Desfalque × onze provável: conflito RESOLVIDO por código (shell 109) ────
// Auditoria real: Marcelo Rangel simultaneamente em desfalques ("departamento
// médico, status a confirmar") e no onze_provavel — (B) admitia a contradição
// mas não resolvia. Regra determinística:
// - desfalque FIRME (suspenso/lesionado/cirurgia/fora da temporada) → sai do
//   onze (vira "A confirmar"), permanece em desfalques;
// - desfalque INCERTO (dúvida/a confirmar/departamento médico/transição) →
//   permanece no onze, SAI de desfalques e vira item de "incerteza" (impacto
//   alto) — um jogador não pode estar nas duas listas ao mesmo tempo.
const _FIRM_OUT_RE = /suspens|lesionad|les[aã]o\b|cirurgia|rompiment|fratur|fora da temporada|cortad/i;
function _reconcileDesfalquesOnze(parsed) {
  try {
    const key = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').trim();
    for (const side of ['mandante', 'visitante']) {
      const team = parsed[side];
      const lu = parsed._lineups && parsed._lineups[side];
      if (!team || !Array.isArray(team.desfalques) || !lu || !Array.isArray(lu.onze)) continue;
      const kept = [];
      for (const d of team.desfalques) {
        const dTxt = typeof d === 'string' ? d : (d && d.nome) || '';
        const dKey = key(dTxt);
        if (!dKey) { kept.push(d); continue; }
        const hit = lu.onze.find((p) => p && p.nome && (key(p.nome) === dKey || dKey.startsWith(key(p.nome)) || key(p.nome).startsWith(dKey)));
        if (!hit) { kept.push(d); continue; }
        const firm = _FIRM_OUT_RE.test(String(dTxt) + ' ' + String((d && d.motivo) || ''));
        if (firm) {
          hit.nome = `A confirmar (era ${hit.nome} — listado como desfalque)`;
          kept.push(d);
        } else {
          if (!Array.isArray(parsed.incerteza)) parsed.incerteza = [];
          parsed.incerteza.push({ fator: `${dTxt}: constava como desfalque E no onze provável — mantido no onze por o desfalque ser incerto; status a confirmar`, impacto: 'alto' });
        }
      }
      team.desfalques = kept;
    }
  } catch {}
}

function attachAnalysisDerived(parsed, rawFacts) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  // ordem (shell 105/108/109): saneia xG=0 → recalcula mercados de gols pelos
  // lambdas → reconcilia dupla chance → calibra confiança → limpa contexto de
  // prévia (desfalque×onze roda DEPOIS dos lineups, no fim desta função)
  _sanitizeAnalysisTeamXg(parsed);
  _poissonReconcileGoalMarkets(parsed);
  _fixDoubleChanceCoherence(parsed);
  _calibrateConfidence(parsed, rawFacts);
  _sanitizePreviaContext(parsed);
  // Modo do card (shell 76): tolera variantes ("pós-jogo", "pos-jogo") e normaliza
  // para 'previa' | 'pos_jogo'. Default: prévia (cards antigos continuam válidos).
  try {
    const _ctxA = String(parsed.contexto_analise || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    parsed.contexto_analise = /pos/.test(_ctxA) ? 'pos_jogo' : 'previa';
  } catch {
    parsed.contexto_analise = 'previa';
  }
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
      const nonEmptyArr = (a) => Array.isArray(a) && a.length;
      const mkLineup = (teamKey, tecKey) => {
        const rf = rawFacts && rawFacts[teamKey],
          p2 = parsed[teamKey],
          tec2 = parsed[tecKey];
        const nome = (rf && rf.nome) || (p2 && p2.nome) || '';
        // PARTE X (shell 87): proveniência POR TIME. rawFacts confirmado (match-day
        // ESPN/AF) = 'api'; rawFacts web_search = 'pesquisa'; só F2 = 'modelo'; nada = 'inferida'.
        const rfConfirmed = !!(rf && rf._confirmed);
        const rfHasXI = rf && (nonEmptyArr(rf.onze_provavel) || rf.escalacao_provavel);
        const p2HasXI = p2 && (nonEmptyArr(p2.onze_provavel) || p2.escalacao);
        let fonte = 'inferida';
        if (rfConfirmed && rfHasXI) fonte = 'api';
        else if (rfHasXI) fonte = 'pesquisa';
        else if (p2HasXI) fonte = 'modelo';
        // Fonte da FORMAÇÃO (número) — separada do XI: evita rotular "4-2-3-1" como oficial.
        const rfForm = rf && rf.formacao,
          p2Form = tec2 && tec2.formacao;
        let formacaoFonte = 'inferida';
        if (rfConfirmed && rfForm) formacaoFonte = 'api';
        else if (rfForm) formacaoFonte = 'pesquisa';
        else if (p2Form) formacaoFonte = 'modelo';
        const formacao = rfForm || p2Form || '';
        const tecnico = (rf && rf.tecnico) || (tec2 && tec2.nome) || '';
        // Preferência rawFacts F1 (ou confirmado) > JSON F2 > vazio. Nunca inventa.
        const bancoSrc =
          (rf && nonEmptyArr(rf.banco) ? rf.banco : null) ||
          (p2 && nonEmptyArr(p2.banco) ? p2.banco : []);
        const banco = bancoSrc
          .map((x) => (typeof textFrom === 'function' ? textFrom(x) : String(x || '')))
          .filter(Boolean);
        const escalacao_str = (rf && rf.escalacao_provavel) || (p2 && p2.escalacao) || '';
        const onzeSrc =
          (rf && nonEmptyArr(rf.onze_provavel) ? rf.onze_provavel : null) ||
          (p2 && nonEmptyArr(p2.onze_provavel) ? p2.onze_provavel : []);
        const onze = onzeSrc
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
          fonte,
          formacaoFonte,
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
      if (has(lm) || has(lv)) {
        parsed._lineups = { mandante: lm, visitante: lv };
        // Rodapé (PARTE X Q0.4): fonte GLOBAL = PIOR nível entre os dois times, para o
        // disclaimer não vender "confirmada" quando só um lado é confirmado.
        const worse =
          typeof _luWorseFonte === 'function'
            ? _luWorseFonte(lm.fonte, lv.fonte)
            : rawFacts
              ? 'pesquisa'
              : 'modelo';
        parsed._lineupsFonte = worse;
      }
    }
  } catch (_) {}

  // shell 109: depende de _lineups já montado — resolve desfalque × onze
  _reconcileDesfalquesOnze(parsed);

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

expose({
  ANALYSIS_SCHEMA,
  migrateAnalysisPayload,
  normalizeAnalysisPayload,
  attachAnalysisDerived,
  finalizeAnalysisPads,
  _padCartoesEventos,
  _padEscanteiosEventos,
  _padEventos,
});

export {
  ANALYSIS_SCHEMA,
  migrateAnalysisPayload,
  normalizeAnalysisPayload,
  attachAnalysisDerived,
  finalizeAnalysisPads,
  _padCartoesEventos,
  _padEscanteiosEventos,
  _padEventos,
};
