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
assert(!appSrc.includes('function loadSchedule'), 'schedule not in app.js');
assert(!appSrc.includes('function showView'), 'library not in app.js');
assert(!appSrc.includes('function _copaStatsHTML'), 'featured not in app.js');
assert(schedSrc.includes('function loadSchedule'), 'loadSchedule in schedule.js');
assert(featSrc.includes('function renderEmptyStateFeatured'), 'featured module');
assert(libSrc.includes('function showView') && libSrc.includes('function renderLibrary'), 'library module');
assert(mainSrc.includes("import './lib/intent.js'"), 'main imports intent ESM');
assert(mainSrc.includes("import './data/history.js'"), 'main imports history ESM');
assert(mainSrc.includes("import './export/report.js'"), 'main imports export ESM');
assert(!mainSrc.includes("'js/data/history.js'") && !mainSrc.includes('"js/data/history.js"'), 'history not in CLASSIC');
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
  'js/data/history.js',
]) {
  assert(fs.existsSync(path.join(ROOT, rel)), 'module ' + rel);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
