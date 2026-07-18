/* js/data/phase1-context.js — orquestra coleta estruturada da Fase 1
 *
 * Cascata AF→FD→ESPN + free registry + memória.
 * Anti-fantasma: só fontes ATIVAS entram no prompt (linha de repertoire limpa).
 * Silenciosas (vazias) ficam só na telemetria — sem lacunas inventadas.
 */
const PHASE1_CTX_TOTAL = 16000;
const PHASE1_CTX_EACH = 5000;

/**
 * Cascata AF → FD → ESPN.
 * @returns {{text:string, source:string, benefits:string[]}}
 */
async function _phase1CascadePaidOrEspn(query) {
  let fdCtx = '';
  let source = '';
  try {
    if (typeof getAfKey === 'function' && getAfKey()) {
      const [standings, fixtures] = await Promise.all([getAfStandings(), getAfFixtures()]);
      fdCtx = formatAfContext(standings, fixtures);
      if (fdCtx && typeof afEnrichCoachLineup === 'function') {
        fdCtx += await afEnrichCoachLineup(query, fixtures);
      }
      if (fdCtx) source = 'af';
    }
  } catch {}
  try {
    if (!fdCtx && typeof getFdKey === 'function' && getFdKey()) {
      const [standings, matches] = await Promise.all([getFdStandings(), getFdMatches()]);
      fdCtx = formatFdContext(standings, matches);
      if (fdCtx) source = 'fd';
    }
  } catch {}
  try {
    if (!fdCtx && typeof getEspnStandings === 'function') {
      const [standings, scoreboard] = await Promise.all([
        getEspnStandings(),
        getEspnScoreboard(),
      ]);
      fdCtx = formatEspnContext(standings, scoreboard);
      if (fdCtx) source = 'espn';
    }
  } catch {}
  const text = fdCtx || '';
  return {
    text,
    source,
    benefits:
      text && typeof detectSourceBenefits === 'function'
        ? detectSourceBenefits(text)
        : text
          ? ['contexto estruturado']
          : [],
  };
}

/**
 * Coleta completa de contexto estruturado p/ Fase 1.
 * @param {string} compId
 * @param {string} query
 */
async function collectPhase1Context(compId, query) {
  const id = compId || (typeof _activeCompId !== 'undefined' ? _activeCompId : 'brsa');
  const teams =
    typeof parseMatchTeamsFromQuery === 'function' ? parseMatchTeamsFromQuery(query) : [];

  // free bundle (texto + active/silent) em paralelo com a cascata
  const freeP =
    typeof getFreeSourcesBundle === 'function'
      ? getFreeSourcesBundle(id).catch(() => ({ text: '', active: [], silent: [] }))
      : typeof getFreeSourcesContext === 'function'
        ? getFreeSourcesContext(id)
            .then((t) => ({
              text: t || '',
              active: t ? [{ id: 'free', text: t, chars: t.length }] : [],
              silent: [],
            }))
            .catch(() => ({ text: '', active: [], silent: [] }))
        : Promise.resolve({ text: '', active: [], silent: [] });

  const cascade = await _phase1CascadePaidOrEspn(query);
  let freeBundle = { text: '', active: [], silent: [] };
  try {
    freeBundle = (await freeP) || freeBundle;
  } catch {
    freeBundle = { text: '', active: [], silent: [] };
  }

  // apiText = cascata + free ativos — sem memória, sem fantasmas
  const apiParts = [cascade.text, freeBundle.text].filter((t) => t && String(t).trim());
  const apiText =
    typeof joinContextBlocks === 'function'
      ? joinContextBlocks(apiParts, {
          maxTotal: PHASE1_CTX_TOTAL - 2500,
          maxEach: PHASE1_CTX_EACH,
        })
      : apiParts.join('\n\n');

  try {
    if (apiText && typeof factsMemIngestStructured === 'function') {
      factsMemIngestStructured(id, apiText);
    }
  } catch {}

  let memoryText = '';
  try {
    if (typeof factsMemBuildKnownBlock === 'function') {
      memoryText = factsMemBuildKnownBlock(id, teams) || '';
    }
  } catch {
    memoryText = '';
  }

  // active list (só o que tem chars) — base do raciocínio limpo
  const active = [];
  if (cascade.text && cascade.source) {
    active.push({
      id: cascade.source,
      text: cascade.text,
      chars: cascade.text.length,
      benefits: cascade.benefits || [],
    });
  }
  (freeBundle.active || []).forEach((a) => {
    if (a && a.chars > 0) active.push(a);
  });
  if (memoryText && memoryText.trim()) {
    active.push({
      id: 'memory',
      text: memoryText,
      chars: memoryText.length,
      benefits:
        typeof detectSourceBenefits === 'function'
          ? detectSourceBenefits(memoryText)
          : ['cache local'],
    });
  }

  const agentLine =
    typeof buildAgentSourceLine === 'function' ? buildAgentSourceLine(active) : '';

  // fdCtx: linha de repertoire (se houver) + dados — sem listar silenciosas
  const bodyParts = [agentLine, apiText, memoryText].filter((t) => t && String(t).trim());
  const fdCtx =
    typeof joinContextBlocks === 'function'
      ? joinContextBlocks(bodyParts, {
          maxTotal: PHASE1_CTX_TOTAL,
          maxEach: PHASE1_CTX_EACH,
        })
      : bodyParts.join('\n\n');

  const hasFd = !!(cascade.text || freeBundle.text);

  const telemetry =
    typeof recordPhase1Telemetry === 'function'
      ? recordPhase1Telemetry({
          compId: id,
          cascade: cascade.source || null,
          active,
          silent: freeBundle.silent || [],
          freeChars: (freeBundle.text || '').length,
          apiChars: (apiText || '').length,
          memoryChars: (memoryText || '').length,
          teams,
          agentLine,
        })
      : {
          active,
          silent: freeBundle.silent || [],
          cascade: cascade.source || null,
        };

  return {
    apiText,
    memoryText,
    fdCtx,
    hasFd,
    teams,
    agentLine,
    sources: telemetry,
    statusHuman:
      typeof formatSourcesStatusHuman === 'function'
        ? formatSourcesStatusHuman(active)
        : active.map((a) => a.id).join(' · '),
  };
}

/**
 * Aplica filtro de tópicos com times do confronto.
 * @returns {{topics:string[],skipNote:string,skippedDims:string[]}}
 */
function phase1FilterTopics(topics, compId, hasStructured, teams) {
  let out = { topics: topics || [], skippedDims: [] };
  try {
    if (typeof factsMemFilterTopics === 'function') {
      const f = factsMemFilterTopics(topics, compId, hasStructured, teams);
      if (f && Array.isArray(f.topics) && f.topics.length) out = f;
    }
  } catch {}
  let skipNote = '';
  if (out.skippedDims && out.skippedDims.length) {
    skipNote =
      '\nECONOMIA DE BUSCA (memória local fresca p/ os times deste jogo): dimensões não re-buscadas: ' +
      out.skippedDims.join(', ') +
      '. Use REPERTOIRE / DADOS DA API; só busque lacunas reais do jogo (lesões de última hora, etc.).\n';
  }
  return {
    topics: out.topics || topics || [],
    skipNote,
    skippedDims: out.skippedDims || [],
  };
}
