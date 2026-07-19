/**
 * Testes — intent/normalize/lineup via ESM; ownership de módulos; shell.
 * node tests/run.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadClassic(rel, extra = {}) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sandbox = {
    console,
    Math,
    String,
    Number,
    Array,
    Object,
    Date,
    RegExp,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    window: {},
    document: undefined,
    textFrom(v) {
      if (v == null) return '';
      if (typeof v === 'string') return v;
      return String(v);
    },
    ...extra,
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: rel });
  return sandbox;
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    failed++;
  } else {
    console.log('PASS', msg);
  }
}

// --- intent (ESM) ---
const intent = await import(pathToFileURL(path.join(ROOT, 'js/lib/intent.js')).href);
assert(typeof intent.routeUserIntent === 'function', 'routeUserIntent exists');
assert(intent.routeUserIntent('Flamengo x Palmeiras').mode === 'analysis', 'match → analysis');
assert(
  intent.routeUserIntent('Flamengo x Palmeiras?').mode === 'analysis' &&
    intent.looksLikeMatchQuery('Botafogo x Flamengo?') === true,
  'routing-question-mark'
);
assert(intent.routeUserIntent('qual sua opinião sobre Flamengo x Palmeiras').mode === 'chat', 'opinião → chat');
assert(intent.routeUserIntent('4-3-3 vs 4-4-2').mode === 'chat', 'formação → chat');
assert(
  intent.routeUserIntent('análise completa Flamengo x Palmeiras').mode === 'analysis' &&
    intent.routeUserIntent('análise completa Flamengo x Palmeiras').reason === 'explicit_full',
  'análise completa + times'
);
assert(intent.routeUserIntent('análise completa').mode === 'need_teams', 'análise completa sem times');
assert(intent.routeUserIntent('oi', { hasAttachments: true }).mode === 'chat', 'attachments → chat');

// --- lineup (ESM) ---
// lineup uses esc at call time from globalThis — provide before import re-eval... already imported as module once
// Re-import won't re-run. Provide esc on globalThis then call.
globalThis.esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const L = await import(pathToFileURL(path.join(ROOT, 'js/analysis/lineup.js')).href);
assert(typeof L.buildPitchModel === 'function', 'buildPitchModel exists');
const onze4231 = [
  { nome: 'Pickford', posicao: 'GOL' },
  { nome: 'James', posicao: 'LAD' },
  { nome: 'Stones', posicao: 'ZAG' },
  { nome: 'Guehi', posicao: 'ZAG' },
  { nome: 'Trippier', posicao: 'LAE' },
  { nome: 'Rice', posicao: 'VOL' },
  { nome: 'Bellingham', posicao: 'VOL' },
  { nome: 'Saka', posicao: 'PON' },
  { nome: 'Foden', posicao: 'MEI' },
  { nome: 'Gordon', posicao: 'PON' },
  { nome: 'Kane', posicao: 'ATA' },
];
const rows = L._rowsFromOnze(onze4231, '4-2-3-1');
assert(rows && rows.map((r) => r.length).join('-') === '1-4-2-3-1', '4-2-3-1 shape');
const def = L._orderLineL2R(rows[1]);
assert(def[0].nome === 'Trippier' && def[def.length - 1].nome === 'James', 'L2R laterais LAE…LAD');

// --- normalize (ESM) ---
const N = await import(pathToFileURL(path.join(ROOT, 'js/analysis/normalize.js')).href);
assert(N.ANALYSIS_SCHEMA === 2, 'ANALYSIS_SCHEMA=2');
assert(typeof N.attachAnalysisDerived === 'function', 'attachAnalysisDerived');
assert(typeof N.finalizeAnalysisPads === 'function', 'finalizeAnalysisPads');
assert(typeof N.migrateAnalysisPayload === 'function', 'migrateAnalysisPayload');

const d1 = N.migrateAnalysisPayload({
  partida: 'A x B',
  mandante: { nome: 'A', escanteios_por_jogo: 5.2, escanteios_sofridos_por_jogo: 3.1 },
  visitante: { nome: 'B', escanteios_por_jogo: 4.0 },
});
assert(d1._schema === 2, 'migrate sets schema');
assert(d1._corners && d1._corners.mandante.feitos === 5.2, 'legacy corners');

const d2 = N.migrateAnalysisPayload({
  partida: 'C x D',
  sugestoes_ticket: [{ descricao: 'Mais de 8.5 escanteios', probabilidade: 0.58, fundamento: 'x' }],
});
assert(d2.escanteios && d2.escanteios._migrated, 'ticket → escanteios migrate');
assert(d2.escanteios.eventos.length >= 5, 'pad floor 5 on migrate');

const parsed = N.attachAnalysisDerived(
  {
    partida: 'X x Y',
    cartoes_faltas: { eventos: [{ evento: 'Mais de 3.5 cartões', probabilidade: 0.5 }] },
  },
  {
    mandante: { nome: 'X', escanteios_por_jogo: 6, jogadores_chave: [{ nome: 'P', gols: 2 }] },
    visitante: { nome: 'Y' },
  }
);
assert(parsed._schema === 2, 'attach sets schema');
assert(parsed._corners && parsed._corners.mandante, 'attach corners from rawFacts');
N.finalizeAnalysisPads(parsed);
assert(parsed.cartoes_faltas.eventos.length >= 7, 'finalize pads cartoes to 7');

// --- export / shell files ---
const reportSrc = fs.readFileSync(path.join(ROOT, 'js/export/report.js'), 'utf8');
// Shell 81: PDF = impressão nativa (lógica v1); html2pdf (raster) removido — gerava 40+ págs quebradas
assert(reportSrc.includes('window.print') && reportSrc.includes('autoPrint'), 'pdf via native print (v1 logic)');
assert(!reportSrc.includes('html2pdf.bundle') && !reportSrc.includes('window.html2pdf'), 'html2pdf rasterizer removed');
assert(reportSrc.includes('rep-print-pdf') && reportSrc.includes('Salvar como PDF'), 'report carries its own print button');
assert(fs.existsSync(path.join(ROOT, 'css/print-report.css')), 'print-report.css exists');

const renderSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/render.js'), 'utf8');
assert(renderSrc.includes('renderAnalysisTabShell'), 'render uses tab shell');
assert(!renderSrc.includes('normalizeAnalysisPayload(d)'), 'render does not normalize');
// Shell 83: diagnóstico da FASE 1 (antes morria muda) + diag visível na aba Escalação
{
  const factsSrc3 = fs.readFileSync(path.join(ROOT, 'js/analysis/pipeline-facts.js'), 'utf8');
  assert(factsSrc3.includes("stage:'fase1-parse'") && factsSrc3.includes("stage:'fase1-loop'"), 'fase1 failure diagnostics');
  const runSrc4 = fs.readFileSync(path.join(ROOT, 'js/analysis/pipeline-run.js'), 'utf8');
  assert(runSrc4.includes("stage:'fase1-error'"), 'fase1 API error recorded');
  assert(runSrc4.includes('_fallbackDiagLine,'), '_fallbackDiagLine exposed');
  assert(renderSrc.includes("d._coletaOk===false&&typeof _fallbackDiagLine==='function'"), 'escalacao empty-state shows diag');
  // Shell 84: hardening da coleta — as 2 causas de rawFacts nulo achadas por código:
  // (a) stop max_tokens descartava JSON quase completo (break); (b) parse ingênuo sem repair.
  assert(factsSrc3.includes("data.stop_reason==='end_turn'||data.stop_reason==='max_tokens'"), 'fase1 salva JSON truncado no max_tokens');
  assert(factsSrc3.includes('rawFacts=parseAnalysisJson(txt)'), 'fase1 usa parse robusto (fences + repairJson)');
  assert(!/txt\.match\(\/\\\{\[/.test(factsSrc3), 'parse ingênuo removido da fase1');
  assert(factsSrc3.includes('async function _p1JsonRescue'), 'retry de forma da fase1 existe');
  assert(/_p1JsonRescue\([^)]*\)[\s\S]{0,3000}?claude-haiku-4-5-20251001/.test(factsSrc3.slice(factsSrc3.indexOf('async function _p1JsonRescue'))), 'rescue F1 roda no Haiku (prefill ok; nunca Sonnet 5)');
}
// Shell 82: ctSideSection/ctVanTag recuperadas (refactor as perdeu; todo card real crashava)
assert(renderSrc.includes('function ctSideSection') && renderSrc.includes('function ctVanTag'), 'confronto tatico helpers defined');
// toda função chamada no render deve estar definida em algum classic/ESM (fumaça anti-regressão)
{
  const calls = renderSrc.match(/\bct[A-Z]\w+\(/g) || [];
  calls.forEach((c) => {
    const name = c.slice(0, -1);
    assert(renderSrc.includes('function ' + name), 'render helper defined: ' + name);
  });
}

// --- ownership ---
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const factsSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/pipeline-facts.js'), 'utf8');
const runSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/pipeline-run.js'), 'utf8');
const schedSrc = fs.readFileSync(path.join(ROOT, 'js/data/schedule.js'), 'utf8');
const featSrc = fs.readFileSync(path.join(ROOT, 'js/ui/featured.js'), 'utf8');
const libSrc = fs.readFileSync(path.join(ROOT, 'js/ui/library.js'), 'utf8');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');

assert(factsSrc.includes('async function gatherFacts'), 'gatherFacts in pipeline-facts');
assert(runSrc.includes('async function runAnalysis'), 'runAnalysis in pipeline-run');
// Shell 70: perfil de análise por modelo (esforço removido; profundidade escala com o modelo)
assert(appSrc.includes('MODEL_PROFILES') && appSrc.includes('function modelProfile'), 'model profiles in app.js');
assert(!appSrc.includes('EFFORT_LEVELS') && !runSrc.includes('EFFORT_LEVELS'), 'effort selector removed');
assert(runSrc.includes('globalThis.modelProfile()'), 'pipeline-run uses modelProfile');
// Shell 71: budget:0 em TODOS os perfis — thinking ligado por padrão (shell 70) fazia a
// Fase 2 responder em prosa em vez de JSON (schema via prompt-contrato, não structured
// outputs) e toda análise caía no modo simplificado. NÃO reintroduzir budget>0 aqui.
assert(!/budget:\s*[1-9]\d*/.test(appSrc.match(/var MODEL_PROFILES[\s\S]*?\n\};/)?.[0] || ''), 'no model profile has thinking budget > 0');
// Shell 72: Sonnet 4.6 → Sonnet 5. CRÍTICO: Sonnet 5 liga adaptive thinking quando o
// campo `thinking` é OMITIDO (no 4.6 omitir = sem thinking) → todo body com currentModel
// precisa de {type:'disabled'} explícito, senão a Fase 2 volta a cair no modo simplificado.
assert(appSrc.includes("'claude-sonnet-5'") && !appSrc.includes('claude-sonnet-4-6'), 'sonnet-5 replaces sonnet-4-6 in app.js');
assert(!runSrc.includes('claude-sonnet-4-6'), 'sonnet-5 replaces sonnet-4-6 in pipeline-run');
assert(runSrc.includes('function _noThinkModel'), 'no-think helper exists');
assert((runSrc.match(/_noThinkModel\(globalThis\.currentModel\)/g) || []).length >= 4, 'thinking disabled on all 4 currentModel bodies (chat, fase 2, retry, fallback)');
// Shell 69: thinking devolvido à API precisa da signature (senão 400 no tool_use → modo simplificado)
assert(runSrc.includes("signature_delta"), 'streamOnce captures signature_delta');
assert(runSrc.includes("signature:curSig"), 'thinking block re-sent with signature');
assert(runSrc.includes("redacted_thinking"), 'redacted_thinking preserved');
assert(!appSrc.includes('async function gatherFacts'), 'gatherFacts not in app.js');
assert(!appSrc.includes('async function runAnalysis'), 'runAnalysis not in app.js');
// Multi-fonte grátis + FactsMemory (v54 — code-review ultra fixes)
assert(factsSrc.includes('collectPhase1Context'), 'gatherFacts uses collectPhase1Context');
assert(factsSrc.includes('phase1FilterTopics'), 'gatherFacts uses phase1FilterTopics');
assert(factsSrc.includes('factsMemIngestRawFacts'), 'gatherFacts ingests rawFacts to memory');
assert(mainSrc.includes("'js/data/free-sources.js'"), 'free-sources in CLASSIC');
assert(mainSrc.includes("'js/data/facts-memory.js'"), 'facts-memory in CLASSIC');
assert(mainSrc.includes("'js/data/cached-fetch.js'"), 'cached-fetch in CLASSIC');
assert(mainSrc.includes("'js/data/source-telemetry.js'"), 'source-telemetry in CLASSIC');
assert(mainSrc.includes("'js/data/phase1-context.js'"), 'phase1-context in CLASSIC');
const freeSrc = fs.readFileSync(path.join(ROOT, 'js/data/free-sources.js'), 'utf8');
const memSrc = fs.readFileSync(path.join(ROOT, 'js/data/facts-memory.js'), 'utf8');
const cachedSrc = fs.readFileSync(path.join(ROOT, 'js/data/cached-fetch.js'), 'utf8');
const p1Src = fs.readFileSync(path.join(ROOT, 'js/data/phase1-context.js'), 'utf8');
assert(freeSrc.includes('getOpenFootballContext') && freeSrc.includes('getScorebatContext') && freeSrc.includes('getOpenLigaContext'), '3 free sources');
assert(freeSrc.includes('getFreeSourcesContext'), 'getFreeSourcesContext aggregator');
assert(freeSrc.includes('Sem fallback') || freeSrc.includes('vazio honesto') || freeSrc.includes('não poluir'), 'Scorebat no cross-liga fallback');
assert(memSrc.includes('factsMemFilterTopics') && memSrc.includes('factsMemIngestStructured'), 'FactsMemory API');
assert(memSrc.includes('teamList.every') || memSrc.includes('teamList.length >= 2'), 'FactsMemory skip requires both teams');
assert(!memSrc.includes('presente_no_bloco_estruturado') || memSrc.includes("=== 'presente_no_bloco_estruturado'"), 'no placeholder ingest (reject only)');
assert(cachedSrc.includes('cachedJsonFetch') && cachedSrc.includes('joinContextBlocks'), 'cached-fetch helpers');
assert(cachedSrc.includes('parseMatchTeamsFromQuery'), 'parseMatchTeamsFromQuery');
assert(p1Src.includes('collectPhase1Context') && p1Src.includes('phase1FilterTopics'), 'phase1-context API');
assert(p1Src.includes('apiText') && p1Src.includes('memoryText'), 'api/memory split');
assert(p1Src.includes('buildAgentSourceLine') || p1Src.includes('agentLine'), 'phase1 agent source line');
assert(freeSrc.includes('getFreeSourcesBundle'), 'free sources bundle active/silent');
const telSrc = fs.readFileSync(path.join(ROOT, 'js/data/source-telemetry.js'), 'utf8');
assert(telSrc.includes('buildAgentSourceLine') && telSrc.includes('recordPhase1Telemetry'), 'source-telemetry API');
assert(telSrc.includes('REPERTOIRE ESTRUTURADO ATIVO'), 'agent repertoire header');
assert(telSrc.includes('computeCoverageScore') && telSrc.includes('renderCoverageBadge'), 'coverage A/B/C API');
assert(factsSrc.includes('REPERTOIRE DESTA COLETA') || factsSrc.includes('statusHuman'), 'gatherFacts anti-ghost status');
assert(factsSrc.includes('COBERTURA') || factsSrc.includes('coverage'), 'gatherFacts coverage wire');
const afSrc = fs.readFileSync(path.join(ROOT, 'js/data/football-apis.js'), 'utf8');
assert(afSrc.includes('afEnrichCoachLineupMinimal'), 'AF minimal coach/lineup path');
assert(afSrc.includes('_afLineupWorthFetch'), 'AF lineup only near kickoff');
assert(p1Src.includes('_phase1AfLayerB') || p1Src.includes('afEnrichCoachLineupMinimal'), 'phase1 AF layer B');
assert(p1Src.includes('computeCoverageScore') || p1Src.includes('coverage'), 'phase1 coverage');
const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(!indexSrc.includes('id="data-coverage"'), 'coverage badge removed from HTML (shell 68)');
assert(indexSrc.includes('probeSourcesHealthFull') || indexSrc.includes('btn-probe-sources'), 'probe button wired');
assert(indexSrc.includes('Opcional se secret') || indexSrc.includes('FD_KEY'), 'FD/AF settings hints documented');
// Shell 58: cobertura pós-busca + hint de ajuda A/B/C
assert(telSrc.includes('updateCoverageAfterSearch') && telSrc.includes('coverageLevelsFromRawFacts'), 'post-search coverage API');
assert(factsSrc.includes('updateCoverageAfterSearch'), 'gatherFacts updates coverage post-search');
assert(indexSrc.includes('id="cov-help"'), 'coverage help hint in settings');
// Shell 59: FPL + StatsBomb Open + health probe + worker /fpl
const workerSrc = fs.readFileSync(path.join(ROOT, 'worker/worker.js'), 'utf8');
assert(workerSrc.includes("'/fpl/'") && workerSrc.includes('fantasy.premierleague.com/api'), 'worker proxies FPL');
assert(workerSrc.includes('resolveCors') || workerSrc.includes('origin_gate') || workerSrc.includes('ALLOWED_ORIGINS'), 'worker origin allowlist');
assert(workerSrc.includes('mzzei.github.io') && workerSrc.includes('localhost:3457'), 'worker default origins Pages+local');
assert(workerSrc.includes('origin_not_allowed') || workerSrc.includes('Origin não permitida'), 'worker 403 forbidden origin');
// Shell 60: FD via Worker (probe 07/2026 — FD sem CORS em GET; browser direto sempre falha)
assert(workerSrc.includes("'/fd/'") && workerSrc.includes('api.football-data.org/v4'), 'worker proxies football-data');
assert(afSrc.includes('/fd${path}'), 'fd url worker-first');
assert(afSrc.includes('CORS da FD') || afSrc.includes('configure Worker URL'), 'fd status CORS hint');
// Shell 61: /status da AF (não conta na cota) — consumo do plano no status
assert(afSrc.includes('getAfStatus') && afSrc.includes("'/status'"), 'AF status endpoint (quota-free)');
assert(afSrc.includes('req hoje'), 'AF quota display');
// Shell 62: x-api-key sempre que existir (fallback p/ Worker sem secret ANTHROPIC_KEY)
assert(appSrc.includes("if(apiKey)h['x-api-key']=apiKey"), 'x-api-key always sent when present');
assert(workerSrc.includes("request.headers.get('x-api-key')"), 'worker accepts client anthropic key fallback');
// Shell 63: modo secret-no-Worker — sem chave local, tenta via Worker; gates usam afReady/fdReady
assert(afSrc.includes('function afReady') && afSrc.includes('function fdReady'), 'afReady/fdReady helpers');
assert(afSrc.includes('meridian_af_remote_ok') && afSrc.includes('meridian_fd_remote_ok'), 'remote-ok flags');
assert(p1Src.includes('fdReady') && p1Src.includes('afReady'), 'phase1 gates use ready helpers');
assert(afSrc.includes('if(!afReady())return empty'), 'af minimal enrich gated by afReady');
assert(appSrc.includes('afSaved||getWorkerUrl()') && appSrc.includes('saved||getWorkerUrl()'), 'boot tests FD/AF when worker configured');
// Shell 64: plano Free da AF sem temporada atual — chave OK ≠ secret inválida; técnico via /teams+/coachs
assert(afSrc.includes('free plans do not have access'), 'AF plan-limit detected (not secret error)');
assert(afSrc.includes('_afCoachOnlyFallback') && afSrc.includes('_afTeamIdByName'), 'AF coach fallback via team search');
assert(afSrc.includes('return _afCoachOnlyFallback(query)'), 'minimal enrich falls back to coach-only');
// Shell 65: tranca de senha nas informações avançadas (gate de vitrine)
assert(appSrc.includes('ADV_PASS_HASH') && appSrc.includes('advPassHash') && appSrc.includes('initAdvLock'), 'advanced settings password gate');
assert(indexSrc.includes('id="adv-lock"'), 'adv-lock details in HTML');
assert(!indexSrc.match(/worker-url-input[\s\S]{0,4000}<details class="sf-adv" id="adv-lock"/), 'worker url moved inside locked section');
assert(freeSrc.includes('getFplContext') && freeSrc.includes('_fplFormatContext'), 'FPL provider in free-sources');
assert(freeSrc.includes('getStatsbombOpenContext') && freeSrc.includes('_sbOpenPickSeason'), 'StatsBomb Open provider');
assert(freeSrc.includes("id: 'fpl'") && freeSrc.includes("id: 'statsbomb'"), 'fpl+statsbomb in registry');
assert(p1Src.includes('getFreeSourcesBundle(id, teams, query)'), 'phase1 passes teams+query to registry');
const healthSrc = fs.readFileSync(path.join(ROOT, 'js/data/source-health.js'), 'utf8');
assert(healthSrc.includes('probeSourcesHealth') && healthSrc.includes('NUNCA entra no prompt'), 'source-health probe (UI-only)');
assert(healthSrc.includes('_shProbeWorkerKeyed') && healthSrc.includes('probeSourcesHealthFull'), 'health probes AF/FD on full button');
assert(freeSrc.includes('element-summary') || freeSrc.includes('_fplElementSummaries'), 'FPL element-summary enrich');
assert(mainSrc.includes("'js/data/source-health.js'"), 'source-health in CLASSIC');
assert(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes('source-health.js'), 'sw precaches source-health');
assert(indexSrc.includes('id="btn-probe-sources"') && indexSrc.includes('id="fpl-status"') && indexSrc.includes('id="sbopen-status"'), 'health probe UI rows');
// Passos 2–4: pipeline-facts ESM
assert(factsSrc.includes("from '../comp/competitions.js'"), 'pipeline-facts imports competitions');
assert(factsSrc.includes("from '../state.js'"), 'pipeline-facts imports state');
assert(factsSrc.includes('state.activeCompId'), 'pipeline-facts uses state.activeCompId');
assert(factsSrc.includes("export {"), 'pipeline-facts has export');
assert(mainSrc.includes("import './analysis/pipeline-facts.js'"), 'main imports pipeline-facts ESM');
assert(!mainSrc.includes("'js/analysis/pipeline-facts.js'"), 'pipeline-facts not in CLASSIC');
assert(mainSrc.includes("import './analysis/pipeline-run.js'"), 'main imports pipeline-run ESM');
assert(!mainSrc.includes("'js/analysis/pipeline-run.js'"), 'pipeline-run not in CLASSIC');
assert(runSrc.includes("from '../lib/intent.js'"), 'pipeline-run imports intent');
assert(runSrc.includes("from './pipeline-facts.js'"), 'pipeline-run imports facts');
assert(runSrc.includes("from '../state.js'"), 'pipeline-run imports state');
assert(runSrc.includes('export {'), 'pipeline-run has export');
assert(!appSrc.includes('function loadSchedule'), 'schedule not in app.js');
assert(!appSrc.includes('function showView'), 'library not in app.js');
assert(!appSrc.includes('function _copaStatsHTML'), 'featured not in app.js');
assert(schedSrc.includes('function loadSchedule'), 'loadSchedule in schedule.js');
assert(featSrc.includes('function renderEmptyStateFeatured'), 'featured module');
assert(libSrc.includes('function showView') && libSrc.includes('function renderLibrary'), 'library module');
assert(mainSrc.includes("import './lib/intent.js'"), 'main imports intent ESM');
assert(mainSrc.includes("import './data/history.js'"), 'main imports history ESM');
assert(mainSrc.includes("import './export/report.js'"), 'main imports export ESM');
assert(mainSrc.includes("import './comp/competitions.js'") || mainSrc.includes("./comp/competitions.js"), 'main loads competitions');
assert(mainSrc.includes("import './state.js'") || mainSrc.includes("./state.js"), 'main loads state');
assert(mainSrc.includes('installHtmlBridge') || mainSrc.includes('html-bridge'), 'main installs html-bridge');
assert(!mainSrc.includes("import './data/schedule.js'"), 'schedule is classic not ESM import');
assert(!mainSrc.includes("import './ui/featured.js'"), 'featured is classic not ESM import');
assert(!mainSrc.includes("import './ui/library.js'"), 'library is classic not ESM import');
assert(mainSrc.includes("'js/data/schedule.js'"), 'schedule in CLASSIC');
assert(mainSrc.includes("'js/ui/featured.js'"), 'featured in CLASSIC');
assert(mainSrc.includes("'js/ui/library.js'"), 'library in CLASSIC');
assert(!mainSrc.includes("'js/data/history.js'"), 'history not in CLASSIC');
assert(!mainSrc.includes("'js/export/report.js'"), 'report not in CLASSIC');
assert(mainSrc.includes('loadClassic') || mainSrc.includes('CLASSIC'), 'main loads classic chain');
assert(mainSrc.includes('SHELL_VERSION'), 'main uses SHELL_VERSION');

// history + export ESM import smoke
const Hist = await import(pathToFileURL(path.join(ROOT, 'js/data/history.js')).href);
assert(typeof Hist.loadHistory === 'function' && typeof Hist.saveAnalysis === 'function', 'history ESM exports');
const Exp = await import(pathToFileURL(path.join(ROOT, 'js/export/report.js')).href);
assert(typeof Exp.exportSlugify === 'function' && Exp.exportSlugify('A × B') === 'a-b', 'exportSlugify ESM');
assert(typeof Exp.exportReport === 'function', 'exportReport ESM');
assert(fs.existsSync(path.join(ROOT, 'js/runtime.js')), 'runtime.js host helper');

// competitions + state
const Comp = await import(pathToFileURL(path.join(ROOT, 'js/comp/competitions.js')).href);
assert(Comp.COMP_ORDER.length === 5 && Comp.getComp('brsa').espn === 'bra.1', 'competitions catalog');
assert(Comp.compLabel('epl').includes('Premier') || Comp.compLabel('epl') === 'Premier League', 'compLabel');
assert(Comp.getComp('epl').tsdb === 4328 && Comp.getComp('laliga').tsdb === 4335 && Comp.getComp('ucl').tsdb === 4480, 'TSDB multi-liga IDs');
assert(Comp.getComp('brsa').openfootball === 'br.1' && Comp.getComp('epl').openfootball === 'en.1', 'openfootball stems');
assert(typeof Comp.tsdbLeague === 'function' && Comp.tsdbLeague('brsa') === 4351, 'tsdbLeague helper');
assert(!(Comp.getComp('brsa').scorebat || []).includes('serie a'), 'brsa scorebat not bare serie a');
assert((Comp.getComp('brsa').scorebat || []).some((k) => /brazil/i.test(k)), 'brsa scorebat has brazil key');
const St = await import(pathToFileURL(path.join(ROOT, 'js/state.js')).href);
assert(typeof St.setSchedule === 'function' && typeof St.setAnalysisCompId === 'function', 'state setters');
St.setSchedule([{ id: 1 }]);
assert(globalThis._schedule && globalThis._schedule.length === 1, 'state bridge _schedule');
St.setSchedule([]);
assert(St.setAnalysisCompId('epl') === true && St.state.activeCompId === 'epl', 'setAnalysisCompId');
St.setAnalysisCompId('brsa');
const Bridge = await import(pathToFileURL(path.join(ROOT, 'js/html-bridge.js')).href);
assert(Array.isArray(Bridge.HTML_ONCLICK_API) && Bridge.HTML_ONCLICK_API.includes('toggleRun'), 'html-bridge API list');

// pipeline-run ESM loads without API key (module evaluation only)
const Run = await import(pathToFileURL(path.join(ROOT, 'js/analysis/pipeline-run.js')).href);
assert(typeof Run.toggleRun === 'function' && typeof Run.runAnalysis === 'function', 'pipeline-run ESM exports');
assert(typeof Run.streamOnce === 'function', 'streamOnce exported');

// classic UI/data: no globalThis soup, no mojibake markers, loadable as classic
assert(!schedSrc.includes('globalThis.'), 'schedule free of globalThis soup');
assert(!featSrc.includes('globalThis.'), 'featured free of globalThis soup');
assert(!libSrc.includes('globalThis.'), 'library free of globalThis soup');
assert(!(schedSrc.match(/├|ÔÇ|┬À/) || []).length, 'schedule UTF-8 clean');
assert(!(featSrc.match(/├|ÔÇ|┬À/) || []).length, 'featured UTF-8 clean');
assert(!(libSrc.match(/├|ÔÇ|┬À/) || []).length, 'library UTF-8 clean');
// match state pure smoke (extract functions without top-level setInterval)
{
  const code = fs.readFileSync(path.join(ROOT, 'js/ui/featured.js'), 'utf8');
  const start = code.indexOf('function _matchKick');
  const end = code.indexOf('/* ESPN standings');
  const snippet = code.slice(start, end > start ? end : code.indexOf('function _copaStatsHTML'));
  const sandbox = { Math, Date, String, Number, Object, Array, console };
  vm.createContext(sandbox);
  vm.runInContext(snippet, sandbox);
  assert(typeof sandbox._matchState === 'function', 'featured classic _matchState');
  const st = sandbox._matchState({ data_iso: '2099-01-01', hora_brt: '15:00' });
  assert(st && st.state === 'upcoming', 'matchState upcoming future kick');
}

assert(factsSrc.split(/\n/).length < 1000, 'pipeline-facts under 1k');
assert(runSrc.split(/\n/).length < 1000, 'pipeline-run under 1k');
assert(appSrc.split(/\n/).length < 2500, 'app.js under 2500 (got ' + appSrc.split(/\n/).length + ')');

// Shell 74: card sempre entrega (anti-prosa) + competição inferida por clube
{
  const promptsSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/prompts.js'), 'utf8');
  assert((promptsSrc.match(/ENTREGA OBRIGATÓRIA/g) || []).length >= 2, 'anti-prose delivery rule in both F2 prompts');
  assert(promptsSrc.includes('jamais com pergunta'), 'no-questions rule');
  const espnSrc2 = fs.readFileSync(path.join(ROOT, 'js/data/espn.js'), 'utf8');
  assert(espnSrc2.includes('flamengo|palmeiras') && espnSrc2.includes("add('epl')") && espnSrc2.includes('real\\s*madrid'), 'club-based comp inference');
  assert(runSrc.includes("_h('inferCompIdsFromText')(query)") && runSrc.includes('setAnalysisCompId(_inf[0])'), 'runAnalysis infers competition from query');
}

// Shell 75: gate de contexto da ANÁLISE — popup antes do pipeline quando sem âncora
{
  const schedSrc2 = fs.readFileSync(path.join(ROOT, 'js/data/schedule.js'), 'utf8');
  assert(schedSrc2.includes('async function findScheduledMatchForAnalysis'), 'match anchor resolver in schedule.js');
  assert(runSrc.includes('GATE DE CONTEXTO DA ANÁLISE') && runSrc.includes("findScheduledMatchForAnalysis"), 'runAnalysis has context gate');
  assert(runSrc.includes('Contexto confirmado:') && runSrc.includes("_ctxResumeMode='analysis'"), 'gate skips when confirmed and routes popup back to analysis');
  assert(runSrc.includes('Jogo identificado na agenda'), 'anchored match injected into query');
  assert(appSrc.includes("_ctxResumeMode") && appSrc.includes("_dest==='analysis'&&typeof runAnalysis==='function'"), 'popup resubmits to runAnalysis when gate origin is analysis');
  assert(runSrc.includes('if(!skipBubble)'), 'no duplicate user bubble on resubmit');
}

// Shell 76: modo pós-jogo — mesmo card, abas re-semantizadas + placar verificado
{
  const tabsSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/tab-helpers.js'), 'utf8');
  assert(tabsSrc.includes('ANALYSIS_TAB_LABELS_POS') && tabsSrc.includes("escanteios:'Escanteios'"), 'pos-jogo tab labels (Escanteios never leaves)');
  assert(tabsSrc.includes('renderAnalysisTabShell(id, tabsHtml, mode)'), 'tab shell accepts mode');
  const renderSrc2 = fs.readFileSync(path.join(ROOT, 'js/analysis/render.js'), 'utf8');
  assert(renderSrc2.includes("contexto_analise==='pos_jogo'") && renderSrc2.includes('PÓS-JOGO') && renderSrc2.includes('PRÉVIA'), 'render mode badge');
  const promptsSrc2 = fs.readFileSync(path.join(ROOT, 'js/analysis/prompts.js'), 'utf8');
  assert((promptsSrc2.match(/"contexto_analise":"previa\|pos_jogo"/g) || []).length === 2, 'contexto_analise in both F2 schemas');
  assert((promptsSrc2.match(/MODO PÓS-JOGO/g) || []).length >= 2, 'pos-jogo rule in both F2 prompts');
  assert(runSrc.includes('_posJogo') && runSrc.includes('fetchVerifiedMatchFacts(query,apiKey,state.abort.signal') , 'verified score before Fase 2 in pos-jogo');
  // normalize: default previa + tolera variantes
  const covP = N.attachAnalysisDerived({ partida: 'A x B' }, null);
  assert(covP.contexto_analise === 'previa', 'normalize defaults to previa');
  const covPos = N.attachAnalysisDerived({ partida: 'A x B', contexto_analise: 'Pós-Jogo' }, null);
  assert(covPos.contexto_analise === 'pos_jogo', 'normalize tolerates pós-jogo variants');
}

// Shell 77: prefill '{' força JSON por construção + diagnóstico de falha
{
  const runSrc2 = fs.readFileSync(path.join(ROOT, 'js/analysis/pipeline-run.js'), 'utf8');
  assert(runSrc2.includes("messages.push({role:'assistant',content:'{'})"), 'F2 prefill on enriched path');
  assert((runSrc2.match(/_prefill\?'\{':''/g) || []).length >= 2, 'prefill prepended to finalText');
  assert(runSrc2.includes("if(_retryPrefill)retryMessages.push({role:'assistant',content:'{'})"), 'retry has model-gated prefill');
  assert(runSrc2.includes("parseAnalysisJson((_retryPrefill?'{':'')+retryR.text)"), 'retry parse prepends brace only with prefill');
  assert((runSrc2.match(/_lastAnalysisFail/g) || []).length >= 3, 'failure diagnostics persisted');
  const promptsSrc3 = fs.readFileSync(path.join(ROOT, 'js/analysis/prompts.js'), 'utf8');
  assert((promptsSrc3.match(/PRÉVIA É O CASO NORMAL/g) || []).length >= 2, 'previa-is-normal rule in both prompts');
  assert(runSrc2.includes('Recusar de novo é falha total'), 'hard retry message');
}

// Shell 78: rodapé do modo simplificado carimba shell + diagnóstico
{
  const runSrc3 = fs.readFileSync(path.join(ROOT, 'js/analysis/pipeline-run.js'), 'utf8');
  assert(runSrc3.includes('_fallbackDiagLine') && runSrc3.includes('diagnóstico ['), 'fallback footer shows shell + failure reason');
  assert(!runSrc3.includes('Leve/Médio'), 'obsolete effort hint removed from fallback footer');
  // Shell 79: Sonnet 5 NÃO suporta prefill (400 real) — gate + auto-cura + resgate Haiku
  assert(runSrc3.includes('function _prefillOk'), 'prefill gated by model');
  assert(runSrc3.includes('_prefillOk(globalThis.currentModel)'), 'prefill checks current model');
  assert(runSrc3.includes("/prefill/i.test(e2.message") && runSrc3.includes('messages.pop();_prefill=false'), 'prefill auto-cure in F2 loop');
  assert(runSrc3.includes('RESGATE FINAL') && runSrc3.includes("model:'claude-opus-4-8',messages:rescueMessages"), 'rescue uses Opus (never downgrade quality)');
  // Shell 80: escrita em versão final — sem autocorreção/monólogo no texto livre
  const promptsSrc4 = fs.readFileSync(path.join(ROOT, 'js/analysis/prompts.js'), 'utf8');
  assert((promptsSrc4.match(/VERSÃO FINAL, SEM RASCUNHO|ESCRITA EM VERSÃO FINAL/g) || []).length >= 3, 'no-self-correction rule in F2 prompts + chat persona');
  assert(runSrc3.includes('sem autocorreções no meio da frase'), 'fallback demands final-version prose');
  // BUG LATENTE (achado no 79): const MODEL_PRICE em classic não chega ao window;
  // pipeline-run (ESM) lê globalThis.MODEL_PRICE → toda análise crashava pós-Fase 2
  assert(/var MODEL_PRICE\s*=/.test(appSrc), 'MODEL_PRICE is var (reaches window)');
  assert(!runSrc3.includes('globalThis.MODEL_PRICE[globalThis'), 'no unguarded MODEL_PRICE access in pipeline-run');
}

// --- SW / index ---
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(sw.includes('SHELL_VERSION'), 'sw SHELL_VERSION');
assert(index.includes('type="module"') && index.includes('js/main.js'), 'index ESM entry main.js');
assert(!index.includes('js/app.js?v='), 'index does not multi-load app.js directly');
assert(sw.includes('main.js') && sw.includes('featured.js') && sw.includes('library.js'), 'sw precaches entry+ui');

const ver = await import(pathToFileURL(path.join(ROOT, 'js/version.js')).href);
assert(typeof ver.SHELL_VERSION === 'string' && ver.SHELL_VERSION.length > 0, 'version.js export');
assert(sw.includes("SHELL_VERSION = '" + ver.SHELL_VERSION + "'"), 'sw version matches version.js');

for (const rel of [
  'js/main.js',
  'js/version.js',
  'js/expose.js',
  'js/ui/featured.js',
  'js/ui/library.js',
  'js/analysis/pipeline-facts.js',
  'js/analysis/pipeline-run.js',
  'js/data/schedule.js',
  'js/data/football-apis.js',
  'js/data/espn.js',
  'js/data/free-sources.js',
  'js/data/facts-memory.js',
  'js/data/cached-fetch.js',
  'js/data/source-telemetry.js',
  'js/data/phase1-context.js',
  'js/data/history.js',
]) {
  assert(fs.existsSync(path.join(ROOT, rel)), 'module ' + rel);
}

// FactsMemory + cached-fetch pure smoke (classic in vm)
{
  const store = {};
  const sandbox = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
    Date,
    JSON,
    String,
    Object,
    Array,
    Math,
    console,
    Set,
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/cached-fetch.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/source-telemetry.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/facts-memory.js'), 'utf8'), sandbox);
  // anti-fantasma: só ativos na linha do agente
  const line = sandbox.buildAgentSourceLine([
    { id: 'espn', chars: 1200, benefits: ['classificação', 'próximos jogos'] },
    { id: 'tsdb', chars: 800, benefits: ['resultados'] },
    { id: 'scorebat', chars: 0, benefits: [] }, // fantasma — não entra
  ]);
  assert(line.includes('ESPN') && line.includes('TheSportsDB'), 'agent line lists active');
  assert(!line.includes('Scorebat'), 'agent line omits zero-char ghost');
  const tel = sandbox.recordPhase1Telemetry({
    compId: 'brsa',
    cascade: 'espn',
    active: [
      { id: 'espn', chars: 100, benefits: ['classificação'] },
      { id: 'openfootball', chars: 200, benefits: ['resultados'] },
    ],
    silent: ['scorebat', 'openliga'],
  });
  assert(tel.active.length === 2 && tel.silent.includes('scorebat'), 'telemetry keeps silent separate');
  assert(sandbox.formatSourcesStatusHuman(tel.active).includes('Fontes:'), 'human status');
  const cov = sandbox.computeCoverageScore({
    active: [
      { id: 'espn', chars: 1000, benefits: ['classificação', 'próximos jogos', 'resultados'] },
      { id: 'af_b', chars: 200, benefits: ['técnico API'] },
    ],
    apiText: '=== CLASSIFICAÇÃO === Pts: 40\n=== TÉCNICOS ATUAIS (API-Football · confirmado) ===\nFlamengo: X',
    afMeta: { coaches: true, lineups: false },
  });
  assert(cov.A.level === 'high' || cov.A.level === 'medium', 'coverage A from table/games');
  assert(cov.B.level === 'medium' || cov.B.level === 'high', 'coverage B from coaches');
  assert(cov.C.level === 'low', 'coverage C low without xG');
  assert(cov.summaryHuman.includes('Cobertura:'), 'coverage summary');
  assert(cov.agentBlock.includes('COBERTURA DE DADOS'), 'coverage agent block');

  // pós-busca: rawFacts com xG/métricas sobem C; nunca rebaixa
  sandbox._phase1Coverage = cov; // A alta/média · B média+ · C baixa (da coleta)
  const cov2 = sandbox.updateCoverageAfterSearch({
    mandante: {
      nome: 'Flamengo',
      tecnico: 'Filipe Luís',
      xg_marcado: 1.6,
      jogadores_chave: [{ nome: 'P', gols: 5, rating_medio: 7.2 }],
    },
    visitante: { nome: 'Palmeiras', tecnico: 'Abel', xg_sofrido: 1.1 },
  });
  assert(cov2 && cov2.postSearch === true, 'post-search coverage marked');
  assert(cov2.C.level !== 'low', 'coverage C rises after search');
  assert(cov2.summaryHuman.includes('pós-busca'), 'post-search summary label');
  const cov3 = sandbox.updateCoverageAfterSearch({ mandante: { nome: 'A' }, visitante: { nome: 'B' } });
  assert(
    cov3.C.level === cov2.C.level && cov3.B.level === cov2.B.level && cov3.A.level === cov2.A.level,
    'post-search never downgrades'
  );
  assert(sandbox.updateCoverageAfterSearch(null) === null, 'post-search null-safe');

  // Shell 59: helpers puros FPL + StatsBomb Open (free-sources classic no VM)
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/free-sources.js'), 'utf8'), sandbox);
  const fplTxt = sandbox._fplFormatContext(
    {
      teams: [{ id: 1, name: 'Arsenal' }, { id: 2, name: 'Chelsea' }],
      elements: [
        { web_name: 'Saka', team: 1, minutes: 900, goals_scored: 7, assists: 4, expected_goals: '6.1', expected_assists: '3.2', form: '7.5', total_points: 80, status: 'a', news: '' },
        { web_name: 'Palmer', team: 2, minutes: 800, goals_scored: 6, assists: 5, expected_goals: '5.0', expected_assists: '4.0', form: '6.9', total_points: 75, status: 'd', news: 'Knock - 75% chance' },
        { web_name: 'Zero', team: 1, minutes: 0, goals_scored: 0 },
      ],
    },
    ['Arsenal', 'Chelsea']
  );
  assert(fplTxt.includes('MÉTRICAS DE JOGADOR') && fplTxt.includes('Saka') && fplTxt.includes('xG 6.1'), 'FPL format players');
  assert(fplTxt.includes('Lesões/dúvidas') && fplTxt.includes('Palmer'), 'FPL flags injuries');
  assert(!fplTxt.includes('Zero'), 'FPL skips 0-minute players');
  assert(sandbox.detectSourceBenefits(fplTxt).includes('métricas de jogador'), 'FPL benefit detected');
  const yrs = sandbox._sbOpenYearsFromQuery('análise histórica La Liga 2015 Barcelona x Real Madrid');
  assert(yrs.includes('2015'), 'sb-open years from query');
  const season = sandbox._sbOpenPickSeason([{ season_name: '2014/2015' }, { season_name: '2015/2016' }], yrs);
  assert(season && season.season_name === '2014/2015', 'sb-open picks matching season');
  assert(sandbox._sbOpenPickSeason([{ season_name: '2004/2005' }], ['2026']) === null, 'sb-open null when season absent');
  assert(sandbox._sbOpenYearsFromQuery('Flamengo x Palmeiras hoje').length === 0, 'sb-open inert without year');
  assert(typeof sandbox.factsMemSet === 'function', 'factsMemSet classic');
  assert(typeof sandbox.parseMatchTeamsFromQuery === 'function', 'parseMatchTeamsFromQuery');
  const teams = sandbox.parseMatchTeamsFromQuery(
    'Análise do jogo (Brasileirão Série A): Flamengo × Palmeiras\n(rodada 12)'
  );
  assert(teams.length === 2 && /flamengo/i.test(teams[0]) && /palmeiras/i.test(teams[1]), 'parse teams from query');

  // skip NÃO ocorre se só um time tem técnico
  sandbox.factsMemSet('brsa', 'tecnico', 'Filipe Luís', 'Flamengo');
  sandbox.factsMemSet('brsa', 'escalacao', 'A,B,C', 'Flamengo');
  sandbox.factsMemSet('brsa', 'desfalques', 'ninguém', 'Flamengo');
  let filtered = sandbox.factsMemFilterTopics(
    [
      '"x desfalques técnico escalação" — sofascore',
      '"x xG estilo tático" — fbref',
      '"classificação tabela estatísticas" — espn',
    ],
    'brsa',
    true,
    ['Flamengo', 'Palmeiras']
  );
  assert(
    filtered.topics.some((t) => /t[eé]cnico|escala|desfalque/i.test(t)),
    'does not skip team topics when only one team cached'
  );

  // skip de técnico só com AMBOS os times
  sandbox.factsMemSet('brsa', 'tecnico', 'Abel', 'Palmeiras');
  sandbox.factsMemSet('brsa', 'escalacao', 'D,E,F', 'Palmeiras');
  sandbox.factsMemSet('brsa', 'desfalques', 'X', 'Palmeiras');
  filtered = sandbox.factsMemFilterTopics(
    ['"[M] desfalques técnico escalação lesões" — sofascore', '"[M] xG estilo" — fbref'],
    'brsa',
    true,
    ['Flamengo', 'Palmeiras']
  );
  assert(
    !filtered.topics.some((t) => /desfalque|t[eé]cnico|escala/i.test(t) && !/xg/i.test(t)),
    'skips team topic when both teams fully covered'
  );

  // sem teams → fail-safe (não skip de time)
  filtered = sandbox.factsMemFilterTopics(
    ['"desfalques técnico escalação" — sofascore'],
    'brsa',
    true,
    []
  );
  assert(filtered.topics.length >= 1 && /desfalque|t[eé]cnico/i.test(filtered.topics[0]), 'no team skip without parsed teams');

  sandbox.factsMemIngestRawFacts('brsa', {
    mandante: { nome: 'Flamengo', tecnico: 'Filipe Luís', xg_marcado: 1.5, xg_sofrido: 0.9 },
    visitante: { nome: 'Palmeiras', tecnico: 'Abel', ranking_fifa: '1º · 40 pts' },
  });
  assert(sandbox.factsMemIsFresh('brsa', 'tecnico', 'Flamengo'), 'ingest tecnico fresh');
  const block = sandbox.factsMemBuildKnownBlock('brsa', ['Flamengo', 'Palmeiras']);
  assert(typeof block === 'string' && block.includes('MEMÓRIA LOCAL'), 'memory block text');
  assert(block.includes('Flamengo') || block.includes('tecnico'), 'memory focused on teams');

  // reject placeholder
  sandbox.factsMemSet('brsa', 'tabela', 'presente_no_bloco_estruturado', '_liga');
  assert(sandbox.factsMemGet('brsa', 'tabela', '_liga') == null, 'rejects placeholder value');

  const joined = sandbox.joinContextBlocks(['aaa', 'bbb', 'ccc'], { maxTotal: 10, maxEach: 5 });
  assert(typeof joined === 'string' && joined.length <= 30, 'joinContextBlocks respects budget');
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
