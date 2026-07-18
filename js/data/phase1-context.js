/* js/data/phase1-context.js — orquestra coleta estruturada da Fase 1
 *
 * Um único ponto: cascata paga/grátis + free registry + memória por times.
 * gatherFacts só consome o resultado (sem spaghetti de IIFEs).
 *
 * Retorno:
 *   {
 *     apiText,      // só APIs (p/ ingest memória; sem eco de MEMÓRIA LOCAL)
 *     memoryText,   // bloco MEMÓRIA LOCAL focado nos times
 *     fdCtx,        // api + free + memória (p/ prompt), com orçamento
 *     hasFd,        // há dado estruturado de API nesta run (não só memória)
 *     teams,        // [home, away] parseados da query
 *     sources,      // meta leve
 *   }
 */
const PHASE1_CTX_TOTAL = 16000;
const PHASE1_CTX_EACH = 5000;

/**
 * Cascata AF → FD → ESPN (igual comportamento histórico).
 * Funções vêm do global classic (football-apis / espn).
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
  return { text: fdCtx || '', source };
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

  // free registry (TSDB+OF+Scorebat+OpenLiga) em paralelo com a cascata
  const freeP =
    typeof getFreeSourcesContext === 'function'
      ? getFreeSourcesContext(id).catch(() => '')
      : Promise.resolve('');

  const cascade = await _phase1CascadePaidOrEspn(query);
  let freeText = '';
  try {
    freeText = (await freeP) || '';
  } catch {
    freeText = '';
  }

  // apiText = cascata + free — NUNCA inclui memória (evita ingest circular)
  const apiParts = [cascade.text, freeText].filter((t) => t && String(t).trim());
  const apiText =
    typeof joinContextBlocks === 'function'
      ? joinContextBlocks(apiParts, { maxTotal: PHASE1_CTX_TOTAL - 2000, maxEach: PHASE1_CTX_EACH })
      : apiParts.join('\n\n');

  // persiste trechos reais de API (não o bloco de memória)
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

  const allParts = [apiText, memoryText].filter((t) => t && String(t).trim());
  const fdCtx =
    typeof joinContextBlocks === 'function'
      ? joinContextBlocks(allParts, { maxTotal: PHASE1_CTX_TOTAL, maxEach: PHASE1_CTX_EACH })
      : allParts.join('\n\n');

  // hasFd = API real nesta run (cascata ou free). Memória sozinha NÃO conta.
  const hasFd = !!(cascade.text || freeText);

  return {
    apiText,
    memoryText,
    fdCtx,
    hasFd,
    teams,
    sources: {
      cascade: cascade.source || null,
      freeChars: (freeText || '').length,
      memoryChars: (memoryText || '').length,
      teams,
    },
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
      '. Use MEMÓRIA LOCAL / DADOS DA API; só busque lacunas e atualizações de última hora.\n';
  }
  return {
    topics: out.topics || topics || [],
    skipNote,
    skippedDims: out.skippedDims || [],
  };
}
