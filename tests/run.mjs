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
assert(reportSrc.includes('assets/vendor/html2pdf'), 'pdf uses local vendor not CDN');
assert(fs.existsSync(path.join(ROOT, 'assets/vendor/html2pdf.bundle.min.js')), 'html2pdf vendored');
assert(fs.existsSync(path.join(ROOT, 'css/print-report.css')), 'print-report.css exists');

const renderSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/render.js'), 'utf8');
assert(renderSrc.includes('renderAnalysisTabShell'), 'render uses tab shell');
assert(!renderSrc.includes('normalizeAnalysisPayload(d)'), 'render does not normalize');

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
assert(!appSrc.includes('async function gatherFacts'), 'gatherFacts not in app.js');
assert(!appSrc.includes('async function runAnalysis'), 'runAnalysis not in app.js');
// Multi-fonte grátis + FactsMemory (v54 — code-review ultra fixes)
assert(factsSrc.includes('collectPhase1Context'), 'gatherFacts uses collectPhase1Context');
assert(factsSrc.includes('phase1FilterTopics'), 'gatherFacts uses phase1FilterTopics');
assert(factsSrc.includes('factsMemIngestRawFacts'), 'gatherFacts ingests rawFacts to memory');
assert(mainSrc.includes("'js/data/free-sources.js'"), 'free-sources in CLASSIC');
assert(mainSrc.includes("'js/data/facts-memory.js'"), 'facts-memory in CLASSIC');
assert(mainSrc.includes("'js/data/cached-fetch.js'"), 'cached-fetch in CLASSIC');
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
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data/facts-memory.js'), 'utf8'), sandbox);
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
