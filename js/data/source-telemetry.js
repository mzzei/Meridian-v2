/* js/data/source-telemetry.js — anti-fantasma: só fontes ATIVAS no raciocínio
 *
 * Princípio: o agente recebe UMA linha limpa do que REALMENTE entrou no contexto
 * e o benefício de cada uma. Fontes vazias NÃO viram lacuna, NÃO poluem o prompt.
 *
 * Telemetria (UI/debug): globalThis._phase1Telemetry + lastPhase1SourcesHuman().
 */

const SOURCE_META = {
  af: { label: 'API-Football', role: 'cascata paga' },
  fd: { label: 'football-data.org', role: 'cascata paga' },
  espn: { label: 'ESPN', role: 'base ao vivo' },
  tsdb: { label: 'TheSportsDB', role: 'validação cruzada' },
  openfootball: { label: 'OpenFootball', role: 'calendário/placares' },
  scorebat: { label: 'Scorebat', role: 'highlights recentes' },
  openliga: { label: 'OpenLigaDB', role: 'tabela DE' },
  memory: { label: 'Memória local', role: 'fatos já coletados nesta app' },
};

/** Benefícios detectados no texto (só o que o bloco realmente contém). */
function detectSourceBenefits(text) {
  const t = String(text || '');
  const b = [];
  if (/classifica|standings|Pts:|pontos/i.test(t)) b.push('classificação');
  if (/\d+\s*[xX\-–]\s*\d+|resultado|confirmados|scoreboard/i.test(t)) b.push('resultados');
  if (/pr[oó]xim/i.test(t)) b.push('próximos jogos');
  if (/ao vivo|LIVE/i.test(t)) b.push('ao vivo');
  if (/highlight/i.test(t)) b.push('highlights');
  if (/calend[aá]rio|OpenFootball/i.test(t) && !b.includes('resultados')) b.push('calendário');
  if (/MEMÓRIA LOCAL|t[eé]cnico/i.test(t) && /MEMÓRIA/i.test(t)) b.push('técnico/forma cache');
  if (!b.length && t.trim().length > 40) b.push('contexto estruturado');
  return b;
}

function sourceLabel(id) {
  return (SOURCE_META[id] && SOURCE_META[id].label) || id;
}

/**
 * Monta linha de raciocínio LIMPA — só ativos com benefício.
 * @param {{id:string,chars:number,benefits?:string[],text?:string}[]} active
 * @returns {string} bloco curto p/ o topo de DADOS DA API (ou '' se nada)
 */
function buildAgentSourceLine(active) {
  const rows = (active || []).filter((a) => a && a.chars > 0);
  if (!rows.length) return '';
  const L = [
    '=== REPERTOIRE ESTRUTURADO ATIVO (use os blocos abaixo; NÃO re-busque o que estas fontes já cobrem; ignore fontes que não estão listadas) ===',
  ];
  rows.forEach((a) => {
    const benefits =
      Array.isArray(a.benefits) && a.benefits.length
        ? a.benefits.join(', ')
        : detectSourceBenefits(a.text || '').join(', ') || 'dados estruturados';
    const role = (SOURCE_META[a.id] && SOURCE_META[a.id].role) || '';
    L.push(
      '• ' +
        sourceLabel(a.id) +
        (role ? ' (' + role + ')' : '') +
        ' — ' +
        benefits +
        ' · ~' +
        a.chars +
        'c'
    );
  });
  return L.join('\n');
}

/** Status humano curto p/ UI (thinking bar). */
function formatSourcesStatusHuman(active) {
  const rows = (active || []).filter((a) => a && a.chars > 0);
  if (!rows.length) return 'Sem fontes estruturadas';
  return (
    'Fontes: ' +
    rows
      .map((a) => sourceLabel(a.id))
      .join(' · ')
  );
}

/**
 * Persiste telemetria da última coleta (anti-fantasma auditável).
 * @param {object} telemetry
 */
function recordPhase1Telemetry(telemetry) {
  const t = telemetry || {};
  const active = Array.isArray(t.active) ? t.active : [];
  const payload = {
    ts: Date.now(),
    compId: t.compId || null,
    cascade: t.cascade || null,
    active: active.map((a) => ({
      id: a.id,
      label: sourceLabel(a.id),
      chars: a.chars || 0,
      benefits: a.benefits || detectSourceBenefits(a.text || ''),
    })),
    // ghosts = tentados e vazios — NÃO vão pro prompt do agente
    silent: Array.isArray(t.silent) ? t.silent : [],
    freeChars: t.freeChars || 0,
    apiChars: t.apiChars || 0,
    memoryChars: t.memoryChars || 0,
    teams: t.teams || [],
    agentLine: t.agentLine || buildAgentSourceLine(active),
  };
  try {
    globalThis._phase1Telemetry = payload;
  } catch {}
  try {
    // snapshot leve p/ debug (sem textos enormes)
    sessionStorage.setItem(
      'meridian_phase1_sources_v1',
      JSON.stringify({
        ts: payload.ts,
        compId: payload.compId,
        active: payload.active,
        silent: payload.silent,
        teams: payload.teams,
      })
    );
  } catch {}
  return payload;
}

function lastPhase1SourcesHuman() {
  try {
    const t = globalThis._phase1Telemetry;
    if (!t) return '';
    return formatSourcesStatusHuman(t.active);
  } catch {
    return '';
  }
}

function getPhase1Telemetry() {
  try {
    return globalThis._phase1Telemetry || null;
  } catch {
    return null;
  }
}
