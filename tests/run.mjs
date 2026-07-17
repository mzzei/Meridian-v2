/**
 * Testes puros — routing, lineup, normalize, export, shell.
 * node tests/run.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadScript(rel, extra = {}) {
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

// --- intent ---
const intent = loadScript('js/lib/intent.js');
assert(typeof intent.routeUserIntent === 'function', 'routeUserIntent exists');
assert(intent.routeUserIntent('Flamengo x Palmeiras').mode === 'analysis', 'match → analysis');
assert(
  typeof intent.routeUserIntent === 'function' &&
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

// --- lineup ---
function loadLineup() {
  const code = fs.readFileSync(path.join(ROOT, 'js/analysis/lineup.js'), 'utf8');
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
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
    textFrom(v) {
      if (v == null) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v.nome) return String(v.nome);
      return String(v);
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'lineup.js' });
  return sandbox;
}

const L = loadLineup();
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

// --- normalize (schema + migrate once) ---
const N = loadScript('js/analysis/normalize.js');
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
// second migrate is no-op
const d1b = N.migrateAnalysisPayload(d1);
assert(d1b === d1 || d1b._schema === 2, 'migrate idempotent');

const d2 = N.migrateAnalysisPayload({
  partida: 'C x D',
  sugestoes_ticket: [{ descricao: 'Mais de 8.5 escanteios', probabilidade: 0.58, fundamento: 'x' }],
});
assert(d2.escanteios && d2.escanteios._migrated, 'ticket → escanteios migrate');
assert(d2.escanteios.eventos.length >= 5, 'pad floor 5 on migrate');

const parsed = N.attachAnalysisDerived(
  { partida: 'X x Y', cartoes_faltas: { eventos: [{ evento: 'Mais de 3.5 cartões', probabilidade: 0.5 }] } },
  {
    mandante: { nome: 'X', escanteios_por_jogo: 6, jogadores_chave: [{ nome: 'P', gols: 2 }] },
    visitante: { nome: 'Y' },
  }
);
assert(parsed._schema === 2, 'attach sets schema');
assert(parsed._corners && parsed._corners.mandante, 'attach corners from rawFacts');
assert(parsed._pstats && parsed._pstats.mandante.length === 1, 'attach pstats');
assert(parsed._featEscanteios === true, 'attach feat flags');
// pads after audit
N.finalizeAnalysisPads(parsed);
assert(parsed.cartoes_faltas.eventos.length >= 7, 'finalize pads cartoes to 7');

// --- slug ---
function slugify(title) {
  return (
    (title || 'analise')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'analise'
  );
}
assert(slugify('Fluminense × Bragantino') === 'fluminense-bragantino', 'slug export');

// --- export module ---
const reportSrc = fs.readFileSync(path.join(ROOT, 'js/export/report.js'), 'utf8');
assert(reportSrc.includes('assets/vendor/html2pdf'), 'pdf uses local vendor not CDN');
assert(!reportSrc.includes('cdn.jsdelivr.net'), 'no jsdelivr CDN in export');
assert(reportSrc.includes('exportSlugify') || reportSrc.includes('function exportSlugify'), 'exportSlugify');
assert(fs.existsSync(path.join(ROOT, 'assets/vendor/html2pdf.bundle.min.js')), 'html2pdf vendored');
assert(fs.existsSync(path.join(ROOT, 'css/print-report.css')), 'print-report.css exists');

// --- render uses shell ---
const renderSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/render.js'), 'utf8');
assert(renderSrc.includes('renderAnalysisTabShell'), 'render uses tab shell');
assert(!renderSrc.includes('normalizeAnalysisPayload(d)'), 'render does not normalize');
assert(!renderSrc.includes('_POOL_CARTOES'), 'pad pools not in render');

// --- app pipeline ---
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
assert(appSrc.includes('attachAnalysisDerived'), 'app uses attachAnalysisDerived');
assert(appSrc.includes('finalizeAnalysisPads'), 'app pads after audit');
assert(!appSrc.includes('function loadHistory'), 'history not in app.js');
assert(fs.existsSync(path.join(ROOT, 'js/data/history.js')), 'history module exists');
assert(fs.existsSync(path.join(ROOT, 'js/analysis/normalize.js')), 'normalize module exists');

// --- SW ---
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(sw.includes('SHELL_VERSION'), 'sw single SHELL_VERSION');
assert(sw.includes('networkFirstNav') || sw.includes('isNav'), 'sw navigate network-first');
assert(!sw.includes('preferNetwork'), 'sw no preferNetwork blanket');
assert(index.includes('__hadSwController'), 'client reload only on update');
assert(!index.includes('SW_ACTIVATED'), 'no dual SW_ACTIVATED reload');
const vMatch = index.match(/app\.css\?v=(\d+)/);
assert(vMatch, 'index has app.css?v=');
assert(sw.includes("SHELL_VERSION = '" + vMatch[1] + "'") || sw.includes('SHELL_VERSION = "' + vMatch[1] + '"') || sw.includes("'" + vMatch[1] + "'"), 'shell version aligned ' + vMatch[1]);
assert(index.includes('normalize.js'), 'index loads normalize');
assert(index.includes('history.js'), 'index loads history');

// modules
for (const rel of [
  'js/analysis/render.js',
  'js/analysis/normalize.js',
  'js/data/espn.js',
  'js/data/football-apis.js',
  'js/data/live.js',
  'js/data/history.js',
  'js/export/report.js',
  'js/lib/intent.js',
]) {
  assert(fs.existsSync(path.join(ROOT, rel)), 'module ' + rel);
}

// API modules ownership (not left in app.js)
const appSrc2 = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const espnSrc = fs.readFileSync(path.join(ROOT, 'js/data/espn.js'), 'utf8');
const footSrc = fs.readFileSync(path.join(ROOT, 'js/data/football-apis.js'), 'utf8');
assert(!appSrc2.includes('async function loadAfData'), 'AF not in app.js');
assert(!appSrc2.includes('async function loadFdData'), 'FD not in app.js');
assert(!appSrc2.includes('async function gatherEspnForChat'), 'gatherEspn not in app.js');
assert(footSrc.includes('async function loadAfData') && footSrc.includes('async function loadFdData'), 'AF/FD in football-apis');
assert(espnSrc.includes('async function gatherEspnForChat'), 'gatherEspn in espn.js');
assert(espnSrc.includes('async function fetchEspnScoreboardPath'), 'scoreboard path in espn.js');
assert(espnSrc.includes('function _parseEspnStandingsPayload'), 'standings parse in espn.js');
assert(index.includes('football-apis.js'), 'index loads football-apis');
assert(appSrc2.split(/\n/).length < 4500, 'app.js under 4500 lines (got ' + appSrc2.split(/\n/).length + ')');

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
