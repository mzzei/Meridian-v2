/**
 * Testes puros (sem browser) — routing, lineup, slug.
 * node tests/run.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadScript(rel) {
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
  };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
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
assert(intent.routeUserIntent('Flamengo x Palmeiras?').mode === 'analysis', 'match? → analysis');
assert(intent.routeUserIntent('qual sua opinião sobre Flamengo x Palmeiras').mode === 'chat', 'opinião → chat');
assert(intent.routeUserIntent('4-3-3 vs 4-4-2').mode === 'chat', 'formação → chat');
assert(
  intent.routeUserIntent('análise completa Flamengo x Palmeiras').mode === 'analysis' &&
    intent.routeUserIntent('análise completa Flamengo x Palmeiras').reason === 'explicit_full',
  'análise completa + times'
);
assert(intent.routeUserIntent('análise completa').mode === 'need_teams', 'análise completa sem times');
assert(intent.routeUserIntent('oi', { hasAttachments: true }).mode === 'chat', 'attachments → chat');

// --- lineup (needs esc) ---
const lineupSandbox = loadScript('js/analysis/lineup.js');
// provide esc/textFrom minimal if missing
if (typeof lineupSandbox.esc !== 'function') {
  lineupSandbox.esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  // re-run won't redefine functions already bound... functions in script already closed over missing esc at call time from global
}
// Functions look up esc from sandbox global at call time if not closed - they're global in sandbox
lineupSandbox.esc =
  lineupSandbox.esc ||
  function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

// Re-load lineup with esc pre-defined
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
  return (title || 'analise')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'analise';
}
assert(slugify('Fluminense × Bragantino') === 'fluminense-bragantino', 'slug export');
assert(fs.existsSync(path.join(ROOT, 'css/print-report.css')), 'print-report.css exists');
assert(fs.existsSync(path.join(ROOT, 'js/export/report.js')), 'export module exists');
assert(fs.existsSync(path.join(ROOT, 'js/analysis/prompts.js')), 'prompts module exists');

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
