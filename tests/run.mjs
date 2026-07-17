/**
 * Testes puros (sem browser) — routing, lineup, export, normalização, shell.
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
// Harness id: routing-question-mark (antes falhava por “função não encontrada”)
assert(
  typeof intent.routeUserIntent === 'function' &&
    intent.routeUserIntent('Flamengo x Palmeiras?').mode === 'analysis' &&
    intent.routeUserIntent('Fluminense x Bragantino?').mode === 'analysis' &&
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
assert(typeof L._rowsFromOnze === 'function', '_rowsFromOnze exists');

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
assert(rows && rows.map((r) => r.length).join('-') === '1-4-2-3-1', '4-2-3-1 shape ' + (rows && rows.map((r) => r.length).join('-')));
const def = L._orderLineL2R(rows[1]);
assert(def[0].nome === 'Trippier' && def[def.length - 1].nome === 'James', 'L2R laterais LAE…LAD');

const model = L.buildPitchModel({
  nome: 'ENG',
  formacao: '4-2-3-1',
  onze: onze4231,
  escalacao_str: '',
  banco: [],
});
assert(model.source === 'formation' || model.source === 'rows', 'buildPitchModel source=' + model.source);
assert(model.rows && model.rows.map((r) => r.length).join('-') === '1-4-2-3-1', 'buildPitchModel shape');

// --- slug helper (inline, mirrors export) ---
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
assert(fs.existsSync(path.join(ROOT, 'css/print-report.css')), 'print-report.css exists');
assert(fs.existsSync(path.join(ROOT, 'js/export/report.js')), 'export module exists');
assert(fs.existsSync(path.join(ROOT, 'js/analysis/prompts.js')), 'prompts module exists');

// --- export module: one-click PDF helpers present ---
const reportSrc = fs.readFileSync(path.join(ROOT, 'js/export/report.js'), 'utf8');
assert(reportSrc.includes('_downloadPdfOneClick'), 'export-pdf-oneclick helper');
assert(reportSrc.includes('html2pdf'), 'export-pdf-html2pdf');
assert(reportSrc.includes('buildExportHtml'), 'export-build-html');
assert(reportSrc.includes("format==='pdf'") || reportSrc.includes('format === \'pdf\''), 'export-pdf-html formats');
assert(reportSrc.includes('data-auto-pdf'), 'export-pdf-print fallback');

// --- render: normalizeAnalysisPayload (histórico antigo sem escanteios) ---
const render = loadScript('js/analysis/render.js', {
  textFrom(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return String(v);
  },
  esc(s) {
    return String(s == null ? '' : s);
  },
});
assert(typeof render.normalizeAnalysisPayload === 'function', 'normalizeAnalysisPayload exists');

// Caso 1: times com médias de escanteios → _corners
const d1 = render.normalizeAnalysisPayload({
  partida: 'A x B',
  mandante: { nome: 'A', escanteios_por_jogo: 5.2, escanteios_sofridos_por_jogo: 3.1 },
  visitante: { nome: 'B', escanteios_por_jogo: 4.0 },
});
assert(d1._corners && d1._corners.mandante && d1._corners.mandante.feitos === 5.2, 'legacy _corners from team fields');
assert(d1._featEscanteios === true, 'legacy feat escanteios from corners');

// Caso 2: só tickets com "escanteios" no resumo → migra bloco escanteios
const d2 = render.normalizeAnalysisPayload({
  partida: 'C x D',
  sugestoes_ticket: [
    { descricao: 'Mais de 8.5 escanteios', probabilidade: 0.58, fundamento: 'pressão ofensiva' },
    { descricao: 'Ambas marcam', probabilidade: 0.5 },
  ],
  eventos_provaveis: [{ evento: 'Mais de 4.5 escanteios no 1º tempo', probabilidade: 0.45 }],
});
assert(d2.escanteios && Array.isArray(d2.escanteios.eventos) && d2.escanteios.eventos.length >= 1, 'legacy escanteios migrated from tickets');
assert(d2.escanteios._migrated === true, 'legacy escanteios marked migrated');
assert(d2._featEscanteios === true, 'legacy feat after migration');

// Caso 3: pad eventos curtos
const d3 = render.normalizeAnalysisPayload({
  escanteios: { analise: 'x', eventos: [{ evento: 'Mais de 8.5 escanteios no jogo', probabilidade: 0.55 }] },
  _featEscanteios: true,
});
assert(d3.escanteios.eventos.length >= 5, 'pad escanteios to floor 5, got ' + d3.escanteios.eventos.length);

// --- SW / cache bust ---
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(/CACHE_VERSION\s*=\s*'meridian-v2-offline-v\d+'/.test(sw), 'cache-bust CACHE_VERSION');
assert(sw.includes('preferNetwork') || sw.includes('networkFirst') || sw.includes('no-cache'), 'sw network-first online');
assert(sw.includes('SW_ACTIVATED'), 'sw notify clients');
assert(index.includes('?resetsw=1') || index.includes('resetsw'), 'resetsw UX');
assert(index.includes('controllerchange') || index.includes('SW_ACTIVATED'), 'client auto-reload on SW update');
// shell ?v= alinhado
const vMatch = index.match(/app\.css\?v=(\d+)/);
assert(vMatch, 'index has app.css?v=');
assert(sw.includes('?v=' + vMatch[1]), 'sw shell ?v= matches index (' + vMatch[1] + ')');

// --- 7 tabs no renderResults source ---
const renderSrc = fs.readFileSync(path.join(ROOT, 'js/analysis/render.js'), 'utf8');
assert(
  ['resumo', 'tatica', 'individual', 'cartoes', 'escanteios', 'escalacao', 'avancado'].every((t) =>
    renderSrc.includes("data-tab=\"" + t + "\"") || renderSrc.includes("data-tab='" + t + "'") || renderSrc.includes("'" + t + "'")
  ),
  'analysis-7-tabs in render'
);

// --- modules exist ---
for (const rel of [
  'js/analysis/render.js',
  'js/data/espn.js',
  'js/data/live.js',
  'js/export/report.js',
  'js/lib/intent.js',
]) {
  assert(fs.existsSync(path.join(ROOT, rel)), 'module ' + rel);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
