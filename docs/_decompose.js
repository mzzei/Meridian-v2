/**
 * One-shot decomposer: splits app.js into focused modules (classic globals, defer order).
 * Run: node docs/_decompose.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'js', 'app.js');
const s = fs.readFileSync(APP, 'utf8');

function extractFunctionBlock(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error('start not found: ' + startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error('end not found after ' + startMarker + ': ' + endMarker);
  return { start, end, block: src.slice(start, end) };
}

// --- 1) Extract pure intent routing ---
const intentStart = s.indexOf('function _hasMatchVsPattern');
const intentEnd = s.indexOf('// ── Personalização do agente', intentStart);
if (intentStart < 0 || intentEnd < 0) throw new Error('intent block bounds');
const intentBlock = s.slice(intentStart, intentEnd);

// Expand intent into a single router
const intentModule = `/* js/lib/intent.js — roteamento chat vs análise (puro, testável) */
${intentBlock}
/** Roteador canônico: um único ponto de decisão para toggleRun. */
function routeUserIntent(q, opts){
  opts=opts||{};
  const text=(q||'').trim();
  if(opts.hasAttachments)return{mode:'chat',reason:'attachments'};
  if(isExplicitFullAnalysisAsk(text)){
    if(_hasMatchVsPattern(text))return{mode:'analysis',reason:'explicit_full'};
    return{mode:'need_teams',reason:'explicit_full_no_match'};
  }
  if(isStandardAnalysisIntent(text))return{mode:'analysis',reason:'match_query'};
  return{mode:'chat',reason:'default'};
}
if(typeof window!=='undefined'){
  window._hasMatchVsPattern=_hasMatchVsPattern;
  window.looksLikeMatchQuery=looksLikeMatchQuery;
  window.isStandardAnalysisIntent=isStandardAnalysisIntent;
  window.isExplicitFullAnalysisAsk=isExplicitFullAnalysisAsk;
  window.routeUserIntent=routeUserIntent;
}
`;

// --- 2) Extract export block ---
const exp = extractFunctionBlock(
  s,
  '// ─── Export ───────────────────────────────────────────────────────────────',
  '// ─── Tab navigation ──────────────────────────────────────────────────────'
);
let exportBlock = exp.block;
// Replace inline print CSS with fetch of print-report.css (kept as fallback constant from file)
exportBlock = exportBlock.replace(
  /async function _loadExportAppCss\(\)\{[\s\S]*?return _exportAppCssCache;\n\}/,
  `async function _loadExportAppCss(){
  if(_exportAppCssCache!=null)return _exportAppCssCache;
  try{
    const href=(document.querySelector('link[rel="stylesheet"][href*="app.css"]')||{}).href
      ||('css/app.css?v='+Date.now());
    const r=await fetch(href,{cache:'force-cache'});
    if(r.ok)_exportAppCssCache=await r.text();
    else _exportAppCssCache='';
  }catch{_exportAppCssCache='';}
  return _exportAppCssCache;
}
let _exportPrintCssCache=null;
async function _loadExportPrintCss(){
  if(_exportPrintCssCache!=null)return _exportPrintCssCache;
  try{
    const r=await fetch('css/print-report.css?v='+Date.now(),{cache:'force-cache'});
    if(r.ok)_exportPrintCssCache=await r.text();
    else _exportPrintCssCache='';
  }catch{_exportPrintCssCache='';}
  return _exportPrintCssCache;
}`
);
exportBlock = exportBlock.replace(
  `_loadExportAppCss().then(appCss=>{
    try{_exportCardsWithCss(cardEls,opts,appCss||'');}
    catch(e){console.error(e);toast('Falha ao montar o relatório. Tente de novo.');}
  });`,
  `Promise.all([_loadExportAppCss(),_loadExportPrintCss()]).then(([appCss,printCss])=>{
    try{_exportCardsWithCss(cardEls,opts,appCss||'',printCss||'');}
    catch(e){console.error(e);toast('Falha ao montar o relatório. Tente de novo.');}
  });`
);
exportBlock = exportBlock.replace(
  'function _exportCardsWithCss(cardEls,opts,appCss){',
  'function _exportCardsWithCss(cardEls,opts,appCss,printCss){'
);
// Replace the giant inline overrides section with printCss injection
exportBlock = exportBlock.replace(
  /\/\* ── Overrides do relatório exportado ── \*\/[\s\S]*?@media \(max-width:640px\)\{[\s\S]*?\}\n\}<\/style>/,
  `/* ── print-report.css ── */
\${printCss||''}
</style>`
);
// Remove dead pdfUrl
exportBlock = exportBlock.replace(
  /    const pdfUrl=u\+\(u\.indexOf\('#'\)>=0\?''\:''\)\/\* keep blob \*\/;\n/,
  ''
);

const exportModule = `/* js/export/report.js — export HTML/PDF (depende de esc, toast, t, brandStar, compLabel, currentTheme, ensureRendered, _activeCompId em runtime) */
${exportBlock}
`;

// --- 3) Extract lineup block ---
const lineupStart = s.indexOf('// ── Escalação provável: mapa de campo ──');
const lineupEnd = s.indexOf('// Resumo disciplinar por time', lineupStart);
if (lineupStart < 0 || lineupEnd < 0) throw new Error('lineup bounds');
let lineupBlock = s.slice(lineupStart, lineupEnd);
// Add buildPitchModel as single entry
const buildPitch = `
/** Modelo único de campo: uma entrada, uma saída {rows, source}. */
function buildPitchModel(team){
  const L=normalizeLineupTeam(team)||{};
  if(Array.isArray(L.rows)&&L.rows.length)return{rows:L.rows,source:'rows',meta:L};
  if(L.escalacao_str){
    const fromText=_lineupRowsFromText(L.escalacao_str,L.formacao||'',L.tecnico||'');
    if(fromText&&fromText.length)return{rows:fromText,source:'text',meta:L};
  }
  if((L.onze||[]).length>=7){
    const fromOnze=_rowsFromOnze(L.onze,L.formacao||'');
    if(fromOnze&&fromOnze.length)return{rows:fromOnze,source:'formation',meta:L};
    // legado 4 faixas
    const buckets={GK:[],DEF:[],MID:[],ATA:[]};
    L.onze.slice(0,11).forEach(p=>buckets[_posBucket(p.posicao)].push(p));
    if(!buckets.GK.length&&!buckets.DEF.length&&!buckets.ATA.length&&buckets.MID.length>=7){
      const o=buckets.MID;buckets.GK=[o[0]];buckets.DEF=o.slice(1,5);buckets.MID=o.slice(5,8);buckets.ATA=o.slice(8,11);
    }
    const legacy=[buckets.GK,buckets.DEF,buckets.MID,buckets.ATA].filter(r=>r.length);
    if(legacy.length)return{rows:legacy,source:'legacy_buckets',meta:L};
  }
  return{rows:null,source:'empty',meta:L};
}
`;
// Simplify _pitchTeam to use buildPitchModel
lineupBlock = lineupBlock.replace(
  /function _pitchTeam\(t\)\{[\s\S]*?^\}/m,
  `function _pitchTeam(t){
  if(!t)return '<div></div>';
  const model=buildPitchModel(t);
  const L=model.meta||{};
  const nome=esc(L.nome||'—');
  const coach=L.tecnico||'';
  let body='';
  if(model.rows&&model.rows.length){
    body=_pitchRows(model.rows);
  }else if(L.escalacao_str){
    body=\`<div class="pitch-fallback">\${esc(L.escalacao_str)}</div>\`;
  }else{
    body=\`<div class="pitch-fallback" style="color:var(--muted)">Onze provável não coletado nesta análise.</div>\`;
  }
  const banco=Array.isArray(L.banco)?L.banco:[];
  return \`<div class="pitch-team">
    <div class="pitch-hd"><div class="tname" style="margin-bottom:0">\${nome}</div>\${L.formacao?\`<span class="pitch-form">\${esc(L.formacao)}</span>\`:''}</div>
    \${body}
    \${coach?\`<div class="pitch-meta">👔 Técnico: <b>\${esc(coach)}</b></div>\`:''}
    \${banco.length?\`<div class="pitch-meta">🪑 Banco: \${banco.map(esc).join(' · ')}</div>\`:''}
  </div>\`;
}`
);

const lineupModule = `/* js/analysis/lineup.js — mapa de escalação / formação */
${lineupBlock}
${buildPitch}
`;

// --- 4) Tab helpers ---
const tabHelpers = `/* js/analysis/tab-helpers.js — empty states e registry de abas da análise padrão */
function emptyTabMessage(featKey, coletaOk, labels){
  // labels: { pre, fail, empty }
  return _abaVaziaMsg(
    featKey,
    coletaOk,
    labels.pre,
    labels.fail,
    labels.empty
  );
}

/** Registry canônico das 7 abas (ordem = PDF / v1). */
const ANALYSIS_TAB_ORDER = [
  { id:'resumo', label:'Resumo' },
  { id:'tatica', label:'Tática' },
  { id:'individual', label:'Desempenho' },
  { id:'cartoes', label:'Cartões & Faltas' },
  { id:'escanteios', label:'Escanteios' },
  { id:'escalacao', label:'Escalação' },
  { id:'avancado', label:'Dados Avançados' }
];

function renderAnalysisTabShell(id, tabsHtml){
  // tabsHtml: { resumo, tatica, individual, cartoes, escanteios, escalacao, avancado }
  const buttons = ANALYSIS_TAB_ORDER.map((t,i)=>
    \`<button class="a-tab\${i===0?' active':''}" data-tab="\${t.id}" onclick="showTab(\${id},'\${t.id}')">\${t.label}</button>\`
  ).join('');
  const panels = ANALYSIS_TAB_ORDER.map((t,i)=>
    \`<div id="at-\${t.id}-\${id}" class="a-tc"\${i===0?'':' style="display:none"'}>
\${tabsHtml[t.id]||''}</div>\`
  ).join('\\n    ');
  return { buttons, panels };
}

function featureEmptyHtml(featFlag, coletaOk, kind, extraHtml){
  const map = {
    cartoes: {
      pre: 'Análise disciplinar não disponível — esta análise foi gerada antes do recurso. Rode uma nova análise para obtê-la.',
      fail: 'A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo. Rode novamente para tentar coletar cartões e faltas.',
      empty: 'Dados de cartões e faltas não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa. Rode uma nova análise para tentar novamente.'
    },
    escanteios: {
      pre: 'Análise de escanteios não disponível — esta análise foi gerada antes do recurso. Rode uma nova análise para obtê-la.',
      fail: 'A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo. Rode novamente para tentar coletar escanteios.',
      empty: 'Dados de escanteios não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa. Rode uma nova análise para tentar novamente.'
    },
    lineups: {
      pre: 'Escalações não disponíveis — esta análise foi gerada antes do recurso. Rode uma nova análise para obtê-las.',
      fail: 'A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo. Rode novamente para tentar coletar as escalações.',
      empty: 'Dados de escalação não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa. Rode uma nova análise para tentar novamente.'
    }
  };
  const L = map[kind] || map.cartoes;
  const msg = emptyTabMessage(featFlag, coletaOk, L);
  return \`<div class="tab-s"><p class="tab-body" style="color:var(--muted)">\${msg}</p></div>\${extraHtml||''}\`;
}
`;

// --- 5) Write files ---
const dirs = [
  path.join(ROOT, 'js', 'lib'),
  path.join(ROOT, 'js', 'export'),
  path.join(ROOT, 'js', 'analysis'),
  path.join(ROOT, 'css'),
  path.join(ROOT, 'tests'),
];
dirs.forEach((d) => fs.mkdirSync(d, { recursive: true }));

fs.writeFileSync(path.join(ROOT, 'js', 'lib', 'intent.js'), intentModule, 'utf8');
fs.writeFileSync(path.join(ROOT, 'js', 'export', 'report.js'), exportModule, 'utf8');
fs.writeFileSync(path.join(ROOT, 'js', 'analysis', 'lineup.js'), lineupModule, 'utf8');
fs.writeFileSync(path.join(ROOT, 'js', 'analysis', 'tab-helpers.js'), tabHelpers, 'utf8');

// print CSS extracted (static, no template bg — use body class / data-theme)
const printCss = `/* css/print-report.css — relatório exportado / impressão */
html,body{height:auto!important;overflow:auto!important}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
html[data-theme="aurora"],html:not([data-theme]) { background:#0c1016!important; }
html[data-theme="verde"] { background:#04130c!important; }
html[data-theme="mono"] { background:#b8b8b8!important; }
.app,.l-sb,.r-sb,.m-nav,.wc-blobs,.sb-backdrop,.sov,.ctx-prompt-ov,.help-ov,.lpov,.wov{display:none!important}
.rep-wrap{max-width:880px;margin:0 auto;padding:2rem 1.25rem 4rem}
.rep-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid rgba(158,207,212,.15);flex-wrap:wrap}
.rep-brand{display:flex;gap:12px;align-items:center}
.rep-ball{width:42px;height:42px;background:linear-gradient(150deg,rgba(232,180,74,.22),rgba(232,180,74,.12));border:1.5px solid rgba(232,180,74,.35);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 18px rgba(232,180,74,.2)}
.rep-title{font-family:var(--sans),system-ui,sans-serif;font-size:1.15rem;font-weight:800;letter-spacing:.2em;color:var(--deep,#f4efe6);line-height:1.05}
.rep-title-sub{display:block;font-weight:600;font-size:7.5px;letter-spacing:.235em;margin-top:4px;background:linear-gradient(100deg,#e8b44a,#9ecfd4 50%,#6ba8a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:transparent}
.rep-meta{font-size:11px;color:var(--muted,#8a9aa6);margin-top:6px;letter-spacing:.02em}
.rep-actions{display:flex;flex-direction:column;align-items:flex-end;gap:6px;max-width:280px}
.rep-print{background:var(--terra,#d4a04a);color:#0c1016;border:none;border-radius:10px;padding:.55rem 1.1rem;font-family:var(--sans),system-ui,sans-serif;font-size:13px;font-weight:700;cursor:pointer}
.rep-print:hover{filter:brightness(1.08)}
.rep-print-pdf{min-width:160px}
.rep-print-hint{font-size:10.5px;color:var(--muted,#8a9aa6);line-height:1.35;text-align:right}
.rep-disc{font-size:11px;color:var(--dim,#5c6b78);text-align:center;margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid rgba(158,207,212,.12);line-height:1.6}
.rep-wrap .a-card{margin-bottom:1.75rem;overflow:visible!important;max-width:100%}
.rep-wrap .a-subtitle{padding-top:1.9rem;padding-bottom:.5rem}
.rep-wrap .a-title{padding-bottom:1.1rem;line-height:1.15}
.rep-wrap .a-tabs{display:none!important}
.rep-wrap .a-tc{display:block!important}
.print-tabname{display:block!important;font-family:var(--sans),system-ui,sans-serif;font-weight:700;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--terra,#d4a04a);padding:.85rem 0 .3rem;border-top:1px solid rgba(158,207,212,.18);margin:.5rem 0 .2rem}
.rep-wrap .ticket-head{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;gap:12px!important}
.rep-wrap .ticket-desc{flex:1 1 auto!important;padding-right:8px!important}
.rep-wrap .ticket-prob{flex:0 0 auto!important;margin-left:auto!important}
.rep-wrap .irow{display:flex!important;justify-content:space-between!important;gap:12px!important}
.rep-wrap .ilbl{flex:0 0 auto!important;padding-right:10px!important}
.rep-wrap .ival{flex:1 1 auto!important;text-align:right!important}
.rep-wrap .pmeta{display:flex!important;justify-content:space-between!important;align-items:baseline!important;gap:10px!important}
.rep-wrap .pname{flex:1 1 auto!important}
.rep-wrap .ppct{flex:0 0 auto!important}
.rep-wrap .lrow{display:flex!important;justify-content:space-between!important;gap:12px!important}
.rep-wrap .ev-head{display:flex!important;justify-content:space-between!important;gap:10px!important}
.rep-wrap .pitch{display:flex!important;flex-direction:column!important}
.rep-wrap .p-row{display:flex!important;justify-content:space-evenly!important}
.rep-wrap .teams-full{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important}
.rep-wrap .s3{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:8px!important}
body.printing .a-tabs{display:none!important}
body.printing .a-tc{display:block!important}
body.printing .print-tabname{display:block!important}
body.printing .no-print{display:none!important}
body.printing .a-card{overflow:visible}
body.printing .a-title,body.printing .print-tabname{break-after:avoid;page-break-after:avoid}
body.printing .ticket,body.printing .tcard,body.printing .stile,body.printing .pitch-team{break-inside:avoid;page-break-inside:avoid}
body.printing .frow,body.printing .tend-item,body.printing .prow,body.printing .ev-row,body.printing .duelo-row,body.printing .lrow,body.printing .urow,body.printing .irow,body.printing .ct-item{break-inside:avoid;page-break-inside:avoid}
body.printing .lrow{break-after:avoid;page-break-after:avoid}
body.printing .llogic{break-inside:avoid;page-break-inside:avoid}
body.printing .tab-body,body.printing .ct-diag,body.printing .llogic,body.printing .ev-reason,body.printing .ticket-reason{orphans:2;widows:2}
@media print{
  @page{margin:14mm}
  .no-print{display:none!important}
  .rep-wrap{max-width:none;padding:0}
  .a-card{overflow:visible;margin-bottom:1.25rem}
  .a-tabs{display:none!important}
  .a-tc{display:block!important}
  .print-tabname{display:block!important}
  .ticket,.tcard,.stile,.pitch-team{break-inside:avoid;page-break-inside:avoid}
  .frow,.tend-item,.prow,.ev-row,.duelo-row,.lrow,.urow,.irow,.ct-item{break-inside:avoid;page-break-inside:avoid}
  .lrow{break-after:avoid;page-break-after:avoid}
  .llogic{break-inside:avoid;page-break-inside:avoid}
  .a-title,.print-tabname{break-after:avoid;page-break-after:avoid}
  .tab-body,.ct-diag,.llogic,.ev-reason,.ticket-reason{orphans:2;widows:2}
}
@media (max-width:640px){
  .rep-wrap .teams-full{grid-template-columns:1fr!important}
  .rep-wrap .s3{grid-template-columns:1fr!important}
}
`;
fs.writeFileSync(path.join(ROOT, 'css', 'print-report.css'), printCss, 'utf8');

// --- 6) Patch app.js: remove extracted blocks, wire toggleRun to routeUserIntent ---
let app = s;
// Remove intent (will load from intent.js) — leave a short comment
app = app.slice(0, intentStart) + '/* intent: js/lib/intent.js */\n' + app.slice(intentEnd);
// Re-find export after first edit
const exp2 = extractFunctionBlock(
  app,
  '// ─── Export ───────────────────────────────────────────────────────────────',
  '// ─── Tab navigation ──────────────────────────────────────────────────────'
);
app = app.slice(0, exp2.start) + '/* export: js/export/report.js */\n' + app.slice(exp2.end);

const lineupStart2 = app.indexOf('// ── Escalação provável: mapa de campo ──');
const lineupEnd2 = app.indexOf('// Resumo disciplinar por time', lineupStart2);
if (lineupStart2 < 0 || lineupEnd2 < 0) throw new Error('lineup re-bounds');
app = app.slice(0, lineupStart2) + '/* lineup: js/analysis/lineup.js */\n' + app.slice(lineupEnd2);

// Inject tab-helpers usage note near _abaVaziaMsg if present - keep _abaVaziaMsg in app, tab-helpers uses it

// Replace toggleRun body with router
app = app.replace(
  /function toggleRun\(\)\{[\s\S]*?^function openHelpAnalysis/m,
  `function toggleRun(){
  if(_running){cancelAnalysis();return;}
  const q=document.getElementById('match-input').value.trim();
  const route=routeUserIntent(q,{hasAttachments:!!(_attachments&&_attachments.length)});
  if(route.mode==='need_teams'){
    toast('Para análise completa, diga os times: ex. Flamengo x Palmeiras');
    document.getElementById('match-input').focus();
    return;
  }
  if(route.mode==='analysis'){
    if(route.reason==='explicit_full')toast('Gerando análise padrão (7 abas)…');
    runAnalysis();
    return;
  }
  runChat();
}
function openHelpAnalysis`
);

// showTab order: use ANALYSIS_TAB_ORDER if available
app = app.replace(
  "const _order=['resumo','tatica','individual','cartoes','escanteios','escalacao','avancado'];",
  "const _order=(typeof ANALYSIS_TAB_ORDER!=='undefined'?ANALYSIS_TAB_ORDER.map(t=>t.id):['resumo','tatica','individual','cartoes','escanteios','escalacao','avancado']);"
);

// feature empty for cartoes/escanteios/escalacao - replace long _abaVaziaMsg ternary tails with featureEmptyHtml when available
// Optional soft replace for empty escanteios branch
app = app.replace(
  /:`<div class="tab-s"><p class="tab-body" style="color:var\(--muted\)">\$\{_abaVaziaMsg\(d\._featEscanteios,d\._coletaOk,'Análise de escanteios[^']*','A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo\. Rode novamente para tentar coletar escanteios\.','Dados de escanteios não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa\. Rode uma nova análise para tentar novamente\.'\)\}<\/p><\/div>\$\{ecStats\?`<div class="tab-s"><div class="tab-h">Escanteios por Jogo · Coletados<\/div><div class="teams-full">\$\{ecStats\}<\/div><\/div>`:''\}`;/,
  `:(typeof featureEmptyHtml==='function'?featureEmptyHtml(d._featEscanteios,d._coletaOk,'escanteios',ecStats?\`<div class="tab-s"><div class="tab-h">Escanteios por Jogo · Coletados</div><div class="teams-full">\${ecStats}</div></div>\`:''):\`<div class="tab-s"><p class="tab-body" style="color:var(--muted)">\${_abaVaziaMsg(d._featEscanteios,d._coletaOk,'Análise de escanteios não disponível — esta análise foi gerada antes do recurso. Rode uma nova análise para obtê-la.','A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo. Rode novamente para tentar coletar escanteios.','Dados de escanteios não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa. Rode uma nova análise para tentar novamente.')}</p></div>\${ecStats?\`<div class="tab-s"><div class="tab-h">Escanteios por Jogo · Coletados</div><div class="teams-full">\${ecStats}</div></div>\`:''}\`);`
);

fs.writeFileSync(APP, app, 'utf8');

// --- 7) prompts extraction (copy functions to separate file, leave stubs that call if loaded) ---
// Safer: write prompts.js as documentation + re-export by keeping functions in app for now
// Extract getSystemPrompt / Phase2 / analyst to analysis/prompts.js and remove from app
function extractFn(src, name) {
  const re = new RegExp('function ' + name + '\\(');
  const m = src.match(re);
  if (!m) return null;
  const start = m.index;
  // find next \\nfunction at beginning of line after start+10
  const rest = src.slice(start + 10);
  const next = rest.search(/\nfunction [A-Za-z_$]/);
  if (next < 0) return { start, end: src.length, body: src.slice(start) };
  const end = start + 10 + next;
  return { start, end, body: src.slice(start, end) };
}

// Skip full prompt extraction if too risky — write prompts.js with note pointing to app
// Actually extract for real
let app2 = fs.readFileSync(APP, 'utf8');
const promptFns = ['getSystemPrompt', 'getSystemPromptPhase2', 'analystSystemPrompt'];
const promptBodies = [];
// extract from end to start so indices stable
const found = promptFns.map((n) => ({ n, ...extractFn(app2, n) })).filter((x) => x.body);
found.sort((a, b) => b.start - a.start);
for (const f of found) {
  promptBodies.unshift({ n: f.n, body: f.body });
  app2 = app2.slice(0, f.start) + `/* prompts: ${f.n} → js/analysis/prompts.js */\n` + app2.slice(f.end);
}
if (promptBodies.length) {
  fs.writeFileSync(
    path.join(ROOT, 'js', 'analysis', 'prompts.js'),
    `/* js/analysis/prompts.js — system prompts da análise padrão e chat */\n` +
      promptBodies.map((p) => p.body).join('\n'),
    'utf8'
  );
  fs.writeFileSync(APP, app2, 'utf8');
}

const finalApp = fs.readFileSync(APP, 'utf8');
console.log('app.js lines now', finalApp.split(/\n/).length);
console.log('wrote modules: intent, export/report, analysis/lineup, analysis/tab-helpers, analysis/prompts, css/print-report.css');
console.log('prompt fns extracted', promptBodies.map((p) => p.n).join(', '));
