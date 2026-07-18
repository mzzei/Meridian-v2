// ─── Constants ───────────────────────────────────────────────────────────
const MODEL_CTX   = {'claude-haiku-4-5-20251001':200000,'claude-sonnet-4-6':200000,'claude-opus-4-8':200000};
const MODEL_SHORT = {'claude-haiku-4-5-20251001':'Haiku 4.5','claude-sonnet-4-6':'Sonnet 4.6','claude-opus-4-8':'Opus 4.8'};
var EFFORT_LEVELS = [
  {label:'Padrão',budget:0},{label:'Leve',budget:2000},{label:'Médio',budget:5000},
  {label:'Alto',budget:10000},{label:'Máximo',budget:16000}
];
// Buscas web por nível de esforço (Padrão→Máximo). web_search ingere o conteúdo das
// páginas como tokens — é o maior gasto e NÃO é raciocínio. Escala com o esforço para
// manter o consumo congruente: a profundidade vem do thinking budget acima, não da coleta.
var EFFORT_SEARCHES = [1,1,2,3,3];
// Brasões dos clubes da Série A (ESPN CDN). Chaves normalizadas em _normTeamKey.
// Completado em runtime por scoreboard/standings da ESPN e pela API-Football.
const _ESPN_CREST=id=>`https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
const TEAM_LOGO_SEED={
  'palmeiras':2029,'flamengo':819,'fluminense':3445,'athletico paranaense':3458,
  'athletico-pr':3458,'athletico pr':3458,'red bull bragantino':6079,'bragantino':6079,
  'rb bragantino':6079,'bahia':9967,'coritiba':3456,'sao paulo':2026,'atletico-mg':7632,
  'atletico mg':7632,'atletico mineiro':7632,'corinthians':874,'cruzeiro':2022,
  'botafogo':6086,'vitoria':3457,'internacional':1936,'santos':2674,'gremio':6273,
  'vasco da gama':3454,'vasco':3454,'remo':4936,'mirassol':9169,'chapecoense':9318,
  // nomes comuns / variantes de temporada
  'fortaleza':6272,'cuiaba':17313,'criciuma':9972,'juventude':6270,'goias':3395,
  'america-mg':6154,'america mg':6154,'sport':7631,'sport recife':7631,
};
const _teamLogos={}; // name_key → logo URL (runtime + seed)
function _normTeamKey(n){
  return String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,' e ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function _registerTeamLogo(name,url){
  if(!name||!url)return;
  const k=_normTeamKey(name);if(!k)return;
  _teamLogos[k]=url;
  // atalhos: última palavra ("Gama" não; "Vasco da Gama" → também "vasco" se seed)
  const parts=k.split(' ');
  if(parts.length>=2&&parts[0].length>=5)_teamLogos[parts[0]]=_teamLogos[parts[0]]||url;
}
function _seedTeamLogos(){
  Object.entries(TEAM_LOGO_SEED).forEach(([k,id])=>{_teamLogos[k]=_ESPN_CREST(id);});
}
_seedTeamLogos();
function _teamCrestUrl(name){
  const k=_normTeamKey(name);if(!k)return'';
  if(_teamLogos[k])return _teamLogos[k];
  // Só aliases explícitos / tokens longos (≥5) contidos no nome — sem match mágico curto
  for(const [key,url] of Object.entries(_teamLogos)){
    if(key.length>=5 && (k===key || k.endsWith(' '+key) || k.startsWith(key+' ') || k.includes(' '+key+' ')))return url;
  }
  return'';
}
function teamBadge(name,sz){
  sz=sz||32;
  const n=(name||'').trim();
  const url=_teamCrestUrl(n);
  if(url)return `<img class="team-crest rs-crest" src="${url}" alt="${esc(n)}" width="${sz}" height="${sz}" loading="lazy" style="width:${sz}px;height:${sz}px" onerror="this.outerHTML='<span class=rs-flag-fb>⚽</span>'">`;
  return `<span class="rs-flag-fb">⚽</span>`;
}
function _teamCrest(name,sz){
  sz=sz||28;
  const url=_teamCrestUrl(name);
  if(!url)return'';
  return`<img class="team-crest" src="${url}" width="${sz}" height="${sz}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" style="width:${sz}px;height:${sz}px">`;
}

// Country → ISO 3166-1 alpha-2 (flagcdn.com codes). Flag emoji don't render on Windows,
// so we render real flag images instead. Keys in both Portuguese and English so ESPN API
// names (English) and Claude responses (Portuguese) both resolve correctly.
// (Mantido p/ seleções; no Brasileirão o _lv_flag prioriza brasão de clube.)
const FLAGS = {
  // Portuguese names
  'Brasil':'br','Argentina':'ar','França':'fr','Alemanha':'de','Espanha':'es',
  'Portugal':'pt','Holanda':'nl','Países Baixos':'nl','Bélgica':'be','Inglaterra':'gb-eng',
  'Escócia':'gb-sct','Gales':'gb-wls','País de Gales':'gb-wls',
  'Uruguai':'uy','México':'mx','EUA':'us','Estados Unidos':'us','Canadá':'ca',
  'Japão':'jp','Coreia do Sul':'kr','Coreia':'kr','Marrocos':'ma','Senegal':'sn','Austrália':'au',
  'Croácia':'hr','Suíça':'ch','Polônia':'pl','Dinamarca':'dk','Suécia':'se',
  'Itália':'it','Equador':'ec','Colômbia':'co','Venezuela':'ve',
  'Irã':'ir','Iraque':'iq','Jordânia':'jo','Uzbequistão':'uz','Catar':'qa','Qatar':'qa',
  'Arábia Saudita':'sa','Emirados Árabes Unidos':'ae','Noruega':'no','Peru':'pe','Chile':'cl',
  'Paraguai':'py','Costa Rica':'cr','Panamá':'pa','Honduras':'hn','Jamaica':'jm',
  'Nova Zelândia':'nz','África do Sul':'za','Turquia':'tr','Áustria':'at','Sérvia':'rs',
  'Grécia':'gr','Ucrânia':'ua','Rússia':'ru','China':'cn','Gana':'gh','Camarões':'cm',
  'Nigéria':'ng','Tunísia':'tn','Argélia':'dz','Egito':'eg','Costa do Marfim':'ci',
  'Eslovênia':'si','Eslováquia':'sk','Hungria':'hu','Romênia':'ro','Albânia':'al',
  'Geórgia':'ge','Irlanda':'ie','Islândia':'is','Armênia':'am','Kosovo':'xk',
  'República Tcheca':'cz','Tchéquia':'cz','Bolívia':'bo','El Salvador':'sv',
  'Guatemala':'gt','Cuba':'cu','Haiti':'ht','Suriname':'sr','Trinidad e Tobago':'tt',
  'Indonésia':'id','República Democrática do Congo':'cd','Congo RD':'cd',
  // English names (ESPN API returns these)
  'Brazil':'br','France':'fr','Germany':'de','Spain':'es','England':'gb-eng',
  'Scotland':'gb-sct','Wales':'gb-wls','Netherlands':'nl','Holland':'nl','Belgium':'be',
  'Uruguay':'uy','Mexico':'mx','United States':'us','USA':'us','Canada':'ca',
  'Japan':'jp','South Korea':'kr','Korea Republic':'kr','Morocco':'ma','Australia':'au',
  'Croatia':'hr','Switzerland':'ch','Poland':'pl','Denmark':'dk','Sweden':'se',
  'Italy':'it','Ecuador':'ec','Colombia':'co',
  'Iran':'ir','Iraq':'iq','Jordan':'jo','Uzbekistan':'uz',
  'Saudi Arabia':'sa','UAE':'ae','United Arab Emirates':'ae','Norway':'no',
  'Peru':'pe','Chile':'cl','Paraguay':'py','Panama':'pa','Honduras':'hn','Jamaica':'jm',
  'New Zealand':'nz','South Africa':'za','Turkey':'tr','Türkiye':'tr','Austria':'at',
  'Serbia':'rs','Greece':'gr','Ukraine':'ua','Russia':'ru','China':'cn',
  'Ghana':'gh','Cameroon':'cm','Nigeria':'ng','Tunisia':'tn','Algeria':'dz',
  'Egypt':'eg',"Ivory Coast":'ci',"Côte d'Ivoire":'ci',"Cote d'Ivoire":'ci',
  'Slovenia':'si','Slovakia':'sk','Hungary':'hu','Romania':'ro','Albania':'al',
  'Georgia':'ge','Ireland':'ie','Iceland':'is','Armenia':'am',
  'Czech Republic':'cz','Czechia':'cz','Bolivia':'bo','Guatemala':'gt',
  'Cuba':'cu','Haiti':'ht','Suriname':'sr','Trinidad and Tobago':'tt','Trinidad & Tobago':'tt',
  'Indonesia':'id','Congo DR':'cd','DR Congo':'cd','Democratic Republic of Congo':'cd',
  'Bosnia-Herzegovina':'ba','Bosnia Herzegovina':'ba','Bosnia & Herzegovina':'ba',
  'Bosnia and Herzegovina':'ba','El Salvador':'sv','Korea DPR':'kp','North Korea':'kp',
  'New Caledonia':'nc','Tahiti':'pf','Cuba':'cu','Curacao':'cw','Curaçao':'cw',
};

// ─── State / competitions ──────────────────────────────────────────────
// → js/state.js (schedule, history, views, setters + bridges globalThis)
// → js/comp/competitions.js (COMPETITIONS, COMP_ORDER, season/API helpers)
var currentModel  = 'claude-sonnet-4-6';
var currentEffort = 0;
let _lastAnalysisId = null;
let _lastChatId     = null;

function analysisCompId(){return _activeCompId;}
function statsCompId(){return _statsCompId||_activeCompId;}
function libraryCompId(){return _libCompId;}

function setAnalysisComp(id, opts){
  opts=opts||{};
  if(!COMPETITIONS[id])return false;
  const changed=(typeof setAnalysisCompId==='function')
    ? !!setAnalysisCompId(id)
    : (()=>{const c=_activeCompId!==id;_activeCompId=id;try{localStorage.setItem(COMP_ACTIVE_STORE,id);}catch{}return c;})()
  try{if(typeof ESPN_BASE!=='undefined')ESPN_BASE=espnBase(id);}catch{}
  if(opts.syncStats&&_statsCompId!==id){
    _statsCompId=id;
    _syncStatsSelLabels(id);
    if(opts.paintFeatured!==false)scheduleFeaturedPaint({enrich:true});
  }
  // chips são união multi-liga — rebuild opcional (default: não)
  if(opts.paintChips){
    _rebuildUnionSchedule();
    renderScheduleChips(_schedule);
  }
  if(opts.paintFeatured)scheduleFeaturedPaint();
  if(opts.paintLibrary&&_currentView==='library')renderLibrary();
  return changed;
}

/** Legado: alias de setAnalysisComp (sem side-effects de UI por padrão). */
function setActiveComp(id, opts){
  return setAnalysisComp(id, opts||{});
}

function setLibComp(id){
  if(typeof setLibCompId==='function')return setLibCompId(id);
  if(id!=null&&!COMPETITIONS[id])return false;
  _libCompId=id;
  return true;
}

/** Sidebar direita oculta (<=1100px) — featured no chat */
function _isRightSidebarCollapsed(){
  const rsb=document.querySelector('.r-sb');
  if(!rsb)return true;
  try{const st=getComputedStyle(rsb);return st.display==='none'||st.visibility==='hidden';}catch{return false;}
}
function _syncStatsSelLabels(id){
  const t=(getComp(id).short||getComp(id).name||'');
  document.querySelectorAll('.rs-stats-sel-name').forEach(el=>{el.textContent=t;});
}

// ── Seletor de liga: SEMPRE portal no body (um path só) ──
let _statsPopAnchor=null;
var _featuredPaintGen=0;
let _featuredPaintTimer=0;
function scheduleFeaturedPaint(opts){
  opts=opts||{};
  if(opts.immediate){
    if(_featuredPaintTimer){clearTimeout(_featuredPaintTimer);_featuredPaintTimer=0;}
    renderEmptyStateFeatured(opts);
    return;
  }
  if(_featuredPaintTimer)clearTimeout(_featuredPaintTimer);
  _featuredPaintTimer=setTimeout(()=>{_featuredPaintTimer=0;renderEmptyStateFeatured(opts);},0);
}
function setStatsComp(id){
  if(!COMPETITIONS[id])return;
  if(typeof setStatsCompId==='function')setStatsCompId(id);else _statsCompId=id;
  closeStatsCompPop();
  _syncStatsSelLabels(id);
  // paint imediato com cache; enrich carrega results+standings da liga escolhida
  scheduleFeaturedPaint({immediate:true,enrich:true});
  if(!(_schedByComp[id]||[]).length){
    loadEspnComp(id,true).then(()=>{
      _rebuildUnionSchedule();
      renderScheduleChips(_schedule);
    }).catch(()=>{});
  }
  // prewarm standings desta liga (não bloqueia UI)
  _loadCompStandings(id,false).catch(()=>{});
}
function _getStatsPortalPop(){
  let pop=document.getElementById('rs-stats-comp-pop-portal');
  if(pop)return pop;
  pop=document.createElement('div');
  pop.id='rs-stats-comp-pop-portal';
  pop.className='rs-stats-pop rs-stats-pop-portal';
  pop.setAttribute('role','listbox');
  pop.setAttribute('aria-label','Selecionar campeonato');
  document.body.appendChild(pop);
  return pop;
}
function _placeStatsPortal(pop,btn){
  if(!pop||!btn)return;
  const r=btn.getBoundingClientRect();
  const maxW=Math.min(280,Math.max(200,window.innerWidth-16));
  pop.style.width=maxW+'px';
  pop.style.maxWidth=maxW+'px';
  let left=Math.min(r.right-maxW,window.innerWidth-maxW-8);
  left=Math.max(8,left);
  pop.style.left=left+'px';
  pop.style.top=(r.bottom+6)+'px';
  requestAnimationFrame(()=>{
    if(!pop.classList.contains('open'))return;
    const pr=pop.getBoundingClientRect();
    if(pr.bottom>window.innerHeight-8)pop.style.top=Math.max(8,r.top-pr.height-6)+'px';
    if(pr.left<8)pop.style.left='8px';
    if(pr.right>window.innerWidth-8)pop.style.left=Math.max(8,window.innerWidth-pr.width-8)+'px';
  });
}
function toggleStatsCompPop(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const btn=(e&&e.currentTarget)
    ||(e&&e.target&&e.target.closest&&e.target.closest('.rs-stats-sel'))
    ||document.querySelector('#es-mobile-featured .rs-stats-sel')
    ||document.getElementById('rs-stats-sel');
  if(!btn)return;
  const pop=_getStatsPortalPop();
  const wasOpen=pop.classList.contains('open')&&_statsPopAnchor===btn;
  closeStatsCompPop();
  if(wasOpen)return;
  _renderStatsCompPop(pop);
  _statsPopAnchor=btn;
  pop.classList.add('open');
  btn.setAttribute('aria-expanded','true');
  _placeStatsPortal(pop,btn);
}
function closeStatsCompPop(){
  const pop=document.getElementById('rs-stats-comp-pop-portal');
  if(pop){
    pop.classList.remove('open');
    pop.style.left='';pop.style.top='';pop.style.width='';pop.style.maxWidth='';
  }
  _statsPopAnchor=null;
  document.querySelectorAll('.rs-stats-sel').forEach(b=>b.setAttribute('aria-expanded','false'));
}
function _renderStatsCompPop(pop){
  if(!pop)return;
  pop.innerHTML=COMP_ORDER.map(id=>{
    const c=COMPETITIONS[id];
    const st=_compStatus[id]||{};
    const hasN=!!(st.upcoming>0);
    const meta=st.loading?'verificando…':st.soon?'Em breve':(hasN?(st.upcoming+' jogo'+(st.upcoming===1?'':'s')):(st.checked?'sem jogos':'—'));
    const metaCls=(hasN||st.soon)?'rs-stats-opt-meta is-count':'rs-stats-opt-meta';
    return '<button type="button" role="option" class="rs-stats-opt'+(id===_statsCompId?' active':'')+'" data-comp="'+id+'">'
      +'<img src="'+c.logo+'" alt="" width="20" height="20" loading="lazy" draggable="false" onerror="this.remove()">'
      +'<span style="flex:1;min-width:0"><span class="rs-stats-opt-name">'+esc(c.short||c.name)+'</span><span class="'+metaCls+'">'+esc(meta)+'</span></span>'
      +'</button>';
  }).join('');
}
document.addEventListener('click',e=>{
  const opt=e.target.closest&&e.target.closest('#rs-stats-comp-pop-portal .rs-stats-opt');
  if(opt){
    e.preventDefault();e.stopPropagation();
    const id=opt.getAttribute('data-comp');
    if(id)setStatsComp(id);
    return;
  }
  const pop=document.getElementById('rs-stats-comp-pop-portal');
  if(!pop||!pop.classList.contains('open'))return;
  if(e.target.closest&&(e.target.closest('#rs-stats-comp-pop-portal')||e.target.closest('.rs-stats-sel')))return;
  closeStatsCompPop();
});
window.addEventListener('resize',()=>{closeStatsCompPop();},{passive:true});
document.addEventListener('scroll',e=>{
  const pop=document.getElementById('rs-stats-comp-pop-portal');
  if(!pop||!pop.classList.contains('open'))return;
  if(pop===e.target||pop.contains(e.target))return;
  closeStatsCompPop();
},true);

// Extrai APENAS rótulo de rodada/fase. Nunca devolve nome de confronto/jogo.
function _parseRoundLabel(fase){
  if(!fase)return'';
  const s=String(fase).trim();
  if(!s)return'';
  // Rejeita nomes de partida (ESPN: "Santos at Botafogo", "A vs B", "A × B")
  if(/\bat\b|\bvs\.?\b|×|[@]|(\s[xX]\s)/i.test(s))return'';
  // Rejeita slug de temporada / nome longo de liga
  if(/^\d{4}-/.test(s)||/-serie-|-league|brasileiro-serie/i.test(s))return'';
  if(/brasileir|premier league|laliga|serie a|libertadores|champions league/i.test(s)&&!/(rodada|round|matchday|jornada)/i.test(s))return'';
  // "Regular Season - 15", "Matchday 15", "Round 15", "Rodada 15", "Jornada 8"
  let m=s.match(/(?:rodada|round|matchday|jornada|semana|week|journ[eé]e|spieltag|\bmd)\s*[-–:]?\s*(\d+)/i)
    ||s.match(/(?:regular\s*season|season)\s*[-–:]\s*(\d+)/i)
    ||s.match(/[-–:]\s*(\d{1,2})\s*$/);
  if(m&&+m[1]>0&&+m[1]<80)return 'Rodada '+m[1];
  // mata-mata / fases nomeadas (sem números de placar)
  if(/\b3(rd|º)?\s*place\b|disputa de 3/i.test(s))return '3º lugar';
  if(/\bfinal\b/i.test(s)&&!/semi|quarter|oitava|quartas|group/i.test(s))return 'Final';
  if(/semi/i.test(s))return 'Semifinal';
  if(/quarter|quartas/i.test(s))return 'Quartas';
  if(/round of 16|oitavas|\br16\b/i.test(s))return 'Oitavas';
  if(/round of 32|32-avos/i.test(s))return '32-avos';
  if(/group|grupo/i.test(s)){
    const g=s.match(/group(?:\s*stage)?\s*[-–:]?\s*([a-l]|\d+)/i)||s.match(/grupo\s*([a-l]|\d+)/i);
    return g?'Grupo '+String(g[1]).toUpperCase():'Fase de grupos';
  }
  // Nunca devolve texto cru (evita vazar nome de jogo/time)
  return'';
}
// Mês da competição (calendário do próximo/ao vivo/último jogo — não o placar/confronto)
function _inferCompMonth(id){
  const jogos=_schedByComp[id]||[];
  const today=new Date();
  let live=null, next=null, last=null;
  jogos.forEach(j=>{
    if(!j||!j.data_iso)return;
    const d=new Date(j.data_iso+'T12:00:00');
    const st=(typeof _matchState==='function')?_matchState(j).state:'';
    if(st==='live')live=d;
    else if(st==='upcoming'){if(!next||d<next)next=d;}
    else if(d<=today){if(!last||d>last)last=d;}
  });
  const ref=live||next||last||today;
  const mon=ref.toLocaleDateString('pt-BR',{month:'long'});
  return mon.charAt(0).toUpperCase()+mon.slice(1);
}
// Rodada: só labels estruturados (Rodada N / Quartas…). Nunca o próximo jogo.
function _inferCompRound(id){
  const st0=_compStatus[id]||{};
  if(st0.roundLabel){
    const p=_parseRoundLabel(st0.roundLabel);
    if(p)return p;
    if(/^(Rodada\s+\d+|Final|Semifinal|Quartas|Oitavas|3º lugar|Grupo\s+\S+|Fase de grupos)/i.test(st0.roundLabel))
      return st0.roundLabel;
  }
  const jogos=_schedByComp[id]||[];
  if(!jogos.length)return'';
  const items=[];
  jogos.forEach(j=>{
    // aceita fase estruturada OU campo rodada numérico — nunca nome de time/jogo
    let lab=_parseRoundLabel(j.fase);
    if(!lab&&j.rodada!=null&&j.rodada!==''&&+j.rodada>0)lab='Rodada '+j.rodada;
    if(!lab)return;
    const st=(typeof _matchState==='function')?_matchState(j).state:'upcoming';
    const pri=st==='live'?0:st==='upcoming'?1:2;
    items.push({pri,t:j.data_iso||'',lab});
  });
  if(!items.length)return'';
  items.sort((a,b)=>{
    if(a.pri!==b.pri)return a.pri-b.pri;
    return a.pri===2?b.t.localeCompare(a.t):a.t.localeCompare(b.t);
  });
  return items[0].lab;
}
// Meta do card: SOMENTE "Julho · Rodada 15" (mês + rodada)
function compMetaLine(id){
  const mon=_inferCompMonth(id);
  const rod=_inferCompRound(id);
  const st=_compStatus[id]||{};
  const parts=[];
  if(mon)parts.push(mon);
  if(rod)parts.push(rod);
  else if(st.soon)parts.push('Em breve');
  else if(st.loading)parts.push('…');
  return parts.join(' · ')||'—';
}
function teamTablePos(t){
  // contrato honesto: aceita posicao_tabela novo OU ranking_fifa legado (fork BR)
  if(!t||typeof t!=='object')return'—';
  return t.posicao_tabela||t.ranking_fifa||'—';
}
// Storage keys → js/state.js (HIST_KEY, SCHED_*, CTX_*, ESPN_TTL)
// Data API keys (localStorage — read-only data providers)
const AF_KEY_STORE= 'meridian_af_key';
const AF_BASE     = 'https://v3.football.api-sports.io';
const AF_TTL      = 20 * 60 * 1000;
const AF_FIX_TTL  = 15 * 60 * 1000;
const AF_LEAGUE   = 71; // legado — preferir afLeague(id)
const FD_KEY_STORE= 'meridian_fd_key';
const SB_KEY_STORE= 'meridian_sb_key';
const OP_KEY_STORE= 'meridian_op_key';
const FD_BASE     = 'https://api.football-data.org/v4';
const FD_TTL      = 20 * 60 * 1000;
const WORKER_URL_STORE='meridian_worker_url';
// ESPN_BASE dinâmico (compat com código que ainda lê a const)
var ESPN_BASE = espnBase(_activeCompId);
var tokenState  = {sessionIn:0,sessionOut:0,sessionIn_p1:0,sessionOut_p1:0,lastIn:0,lastOut:0,runs:0,lastCacheCreated:0,lastCacheRead:0,sessionCacheRead:0,sessionCacheSaved:0,lastCacheHitPct:0,lastCacheMissReason:null};
const MODEL_PRICE = {'claude-haiku-4-5-20251001':{i:0.80,o:4.00,crs:0.72},'claude-sonnet-4-6':{i:3.00,o:15.00,crs:2.70},'claude-opus-4-8':{i:15.00,o:75.00,crs:13.50}};
const MODEL_DOCK  = {'claude-haiku-4-5-20251001':'Haiku','claude-sonnet-4-6':'Sonnet','claude-opus-4-8':'Opus'};
// Marca Meridian: estrela de 4 pontas. Gradiente com ID ÚNICO por instância (evita colisão
// entre várias estrelas na página). Cores via CSS vars --brand-star-* (acompanham o tema
// ao vivo — Aurora / Verde / B&W — inclusive se o usuário trocar a paleta no meio do loading).
function brandStarStops(){
  // Fallback estático se CSS vars não estiverem disponíveis (export HTML etc.)
  const t=(typeof currentTheme==='string'&&currentTheme)||'aurora';
  if(t==='verde')return['#d6f95a','#43e08f','#28d98e'];
  if(t==='mono')return['#f2f2f2','#b0b0b0','#6a6a6a'];
  return['#e8b44a','#9ecfd4','#6ba8a0']; // aurora
}
function brandStar(extraClass){
  const id='ms'+Math.random().toString(36).slice(2,10);
  const[c0,c1,c2]=brandStarStops();
  const cls='brand-star'+(extraClass?(' '+extraClass):'');
  // stop-color com var() + fallback hex: troca de tema atualiza o loading sem recriar o DOM
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--brand-star-0, ${c0})"/><stop offset=".5" stop-color="var(--brand-star-1, ${c1})"/><stop offset="1" stop-color="var(--brand-star-2, ${c2})"/></linearGradient></defs><path d="M12 .6C12.6 7.5 16.5 11.4 23.4 12 16.5 12.6 12.6 16.5 12 23.4 11.4 16.5 7.5 12.6 .6 12 7.5 11.4 11.4 7.5 12 .6Z" fill="url(#${id})"/></svg>`;
}
const AGENT_PESQUISA_ID  = 'agent_018yogv9RUisgKsjXkaQj7AM';
const AGENT_ANALISE_ID   = 'agent_01KEV4VR44NPKiY3FCXhHcid';
const MEMORY_STORE_ID    = 'memstore_01QAkhiox2LUTMN9Y4Cf9hQQ';
const MEM_CACHE_TTL      = 30 * 60 * 1000; // 30 min
let _memCache = null, _memCacheAt = 0;
const rlState = {tokLimit:0,tokRemaining:0,tokReset:'',reqLimit:0,reqRemaining:0};
let _thkInterval  = null, _thkStart = 0, _thkTokCount = 0, _thkP1Toks = 0, _thkEl = null;
var _running      = false, _abort = null, _pendingQuery = '';
var _currentView  = 'chat';
var _libFilter    = 'todos';
var _chatThread   = [];
var currentLang   = (()=>{try{return localStorage.getItem('brsa_lang')||'pt';}catch{return'pt';}})();

/**
 * Análise PADRÃO (pipeline completo → card Resumo/Tática/Desempenho/Cartões/Escalação/Avançado)
 * vs CHAT LIVRE (card flexível ou prosa).
 *
 * Padrão quando:
 *  - gatilho PARTIDA (biblioteca) OU
 *  - "Time A x Time B" com intenção de análise/previsão (analise, analise completa, ticket…) OU
 *  - "Time A x Time B" sozinho (sem interrogativa de opinião)
 * Chat livre quando:
 *  - opinião/recortes ("o que achou", "só os gols", "como foi o 2º tempo")
 *  - sem confronto identificável
 *  - ambiguidade (vai para popup de contexto)
 */
/* intent: js/lib/intent.js */
// ── Personalização do agente (tom/tratamento) — guardada no navegador ──
const PERSONA_STORE='brsa_persona_v1';
function getUserPersona(){try{return (localStorage.getItem(PERSONA_STORE)||'').trim();}catch{return'';}}
function savePersona(v){try{if(v&&v.trim())localStorage.setItem(PERSONA_STORE,v);else localStorage.removeItem(PERSONA_STORE);}catch{}}
// Bloco injetado nos prompts: molda SÓ o tom/tratamento, sem mexer em rigor analítico, dados ou estrutura.
function personaBlock(){
  const p=getUserPersona();
  if(!p)return'';
  return `\n\nPREFERÊNCIAS DO USUÁRIO (afetam APENAS o tom e a forma de se dirigir ao usuário — NÃO altere a precisão analítica, os dados/fatos, nem a estrutura/formato exigido da resposta; se um pedido aqui conflitar com a exatidão ou com o formato, priorize a exatidão e o formato):\n${p.slice(0,800)}`;
}
// ── Contexto adicional da conversa (fornecido pelo usuário no chat) ──
const CHAT_CTX_STORE='meridian_v2_chat_ctx_v1';
let _chatContext='';
let _pendingCtxQuery=null;      // pergunta à espera do popup de contexto
let _ctxPromptSelection=null;   // {type:'opt'|'other', label/text}
let _agentMenuText='';          // texto alvo do menu de clique direito
var _skipNextUserBubble=false;  // reenvio após popup (evita bolha duplicada)
var _skipVagueGateOnce=false;   // após o usuário escolher no popup, não reabre o gate
let _lastCtxPromptPayload=null; // {question, options} para reabrir após Cancelar
let _ctxResumeHintEl=null;      // bolha "definir contexto" no chat
function getChatContext(){return _chatContext;}
function loadChatContext(){try{_chatContext=(localStorage.getItem(CHAT_CTX_STORE)||'').trim();}catch{_chatContext='';}renderContextChip();}
function saveChatContext(v){
  _chatContext=(v||'').trim();
  try{if(_chatContext)localStorage.setItem(CHAT_CTX_STORE,_chatContext);else localStorage.removeItem(CHAT_CTX_STORE);}catch{}
  renderContextChip();
}
function appendChatContext(snippet){
  const s=String(snippet||'').trim();if(!s)return;
  const next=_chatContext?(_chatContext.replace(/\s+$/,'')+'\n\n— Trecho do agente —\n'+s):('— Trecho do agente —\n'+s);
  saveChatContext(next.slice(0,4000));
  try{toast('Contexto anexado');}catch{}
}
function toggleContextEditor(){
  const e=document.getElementById('context-editor');if(!e)return;
  if(e.style.display!=='none'){e.style.display='none';return;}
  const inp=document.getElementById('context-input');inp.value=_chatContext;
  e.style.display='block';inp.focus();
}
function applyContext(){
  saveChatContext(document.getElementById('context-input').value);
  const e=document.getElementById('context-editor');if(e)e.style.display='none';
}
function clearChatContext(){saveChatContext('');}
function renderContextChip(){
  const wrap=document.getElementById('context-chips');
  const btn=document.getElementById('context-btn');
  if(btn)btn.classList.toggle('ctx-active',!!_chatContext);
  if(!wrap)return;
  if(!_chatContext){wrap.innerHTML='';return;}
  const preview=_chatContext.length>70?_chatContext.slice(0,70)+'…':_chatContext;
  wrap.innerHTML=`<div class="att-chip" style="max-width:100%" title="${esc(_chatContext)}"><div class="att-ic">✎</div><div class="att-meta"><span class="att-name">Contexto: ${esc(preview)}</span><span class="att-sz" style="cursor:pointer" onclick="toggleContextEditor()">editar</span></div><button class="att-x" onclick="clearChatContext()" title="Remover contexto">×</button></div>`;
}
// Bloco injetado nos prompts quando há contexto ativo. Pano de fundo factual/situacional;
// dados oficiais coletados têm prioridade sobre ele em caso de conflito.
function contextBlock(){
  const c=getChatContext();
  if(!c)return'';
  return `\n\nCONTEXTO ADICIONAL (fornecido pelo usuário para esta conversa — considere-o como pano de fundo factual/situacional relevante ao responder. Se conflitar com os DADOS OFICIAIS coletados/fornecidos, priorize os dados oficiais e sinalize a divergência brevemente):\n${c.slice(0,2000)}`;
}

// ── Popup de contexto (2 opções do modelo + "Outro…") ─────────────────────
function parseContextPrompt(text){
  if(!text)return null;
  const raw=String(text);
  // Aceita JSON puro, fenced, ou prosa com JSON embutido
  const clean=raw.replace(/```(?:json)?/gi,'').replace(/```/g,'');
  let obj=null;
  // 1) tentativa direta no trecho {…}
  const st=clean.indexOf('{');
  if(st>=0){
    const end=clean.lastIndexOf('}');
    if(end>st){
      const cand=clean.slice(st,end+1);
      try{obj=JSON.parse(cand);}catch{try{obj=JSON.parse(repairJson(cand));}catch{}}
    }
    if(!obj){try{obj=JSON.parse(repairJson(clean.slice(st)));}catch{}}
  }
  // 2) regex: "context_prompt" isolado mesmo se houver lixo ao redor
  if(!obj||!obj.context_prompt){
    const m=raw.match(/\{\s*"context_prompt"\s*:\s*\{[\s\S]*?\}\s*\}/);
    if(m){
      try{obj=JSON.parse(m[0]);}catch{try{obj=JSON.parse(repairJson(m[0]));}catch{}}
    }
  }
  const cp=obj&&obj.context_prompt?obj.context_prompt:null;
  if(!cp)return null;
  const q=String(cp.question||cp.pergunta||'Qual o contexto desta pergunta?').trim();
  let opts=Array.isArray(cp.options)?cp.options:(Array.isArray(cp.opcoes)?cp.opcoes:[]);
  opts=opts.map((o,i)=>{
    if(typeof o==='string')return{id:'o'+i,label:o.trim()};
    const label=String((o&&(o.label||o.titulo||o.text||o.texto))||'').trim();
    return label?{id:String(o.id||('o'+i)),label}:null;
  }).filter(Boolean).slice(0,2);
  if(opts.length<1)return null;
  while(opts.length<2)opts.push({id:'o'+opts.length,label:'Outro cenário relevante'});
  return{question:q,options:opts};
}

/**
 * Heurística: o modelo às vezes ignora o contrato e pergunta em prosa
 * ("Qual jogo você quer analisar?"). Converte para o mesmo popup de 3 opções.
 * Retorna null se a resposta parece análise real / saudação / card.
 */
function detectProseContextPrompt(text){
  if(!text)return null;
  const t=String(text).replace(/\r/g,'').trim();
  if(!t||t.length>2200)return null;
  // já é JSON / card
  if(/^\s*[\{`]/.test(t)||/"context_prompt"\s*:/.test(t)||/"card"\s*:/.test(t))return null;
  // análise com placar/estrutura substantiva
  if(/\b\d+\s*[-x×]\s*\d+\b/.test(t)&&t.length>280&&/(placar|gol|ft\b|final|xG|posse|chute)/i.test(t))return null;
  if(/(análise\s+(tática|completa)|escalação|formação|linha\s+de\s+passe)/i.test(t)&&t.length>350)return null;

  const asksMatch=
    /qual\s+jogo\s+(voc[eê]\s+)?(quer|deseja|gostaria)|which\s+match|qual\s+partida|me\s+(diz|fale|informe|conta).{0,50}(jogo|partida|times|advers[aá]rio)|preciso\s+(de\s+)?(mais\s+)?(um\s+)?(pouquinho\s+)?mais|n[aã]o\s+(ficou\s+)?claro|est[aá]\s+amb[ií]gu|especif(ique|icar)|qual\s+(s[aã]o\s+)?os\s+times|qual\s+competi[cç][aã]o|me\s+diz\s+a[ií]|boa\s+pergunta!.{0,80}(jogo|partida|times)/i.test(t);
  const classic=
    /qual\s+jogo\s+voc[eê]\s+quer\s+analisar|me\s+diz\s+a[ií]\s+que\s+eu\s+te\s+entrego|preciso\s+de\s+um\s+pouquinho\s+mais/i.test(t);
  const bulletAsk=
    /[-•*]\s*qual\s+(s[aã]o\s+)?os\s+times|[-•*]\s*qual\s+competi|[-•*]\s*qual\s+(o\s+)?advers/i.test(t);
  const qCount=(t.match(/\?/g)||[]).length;
  const shortClarify=t.length<900&&qCount>=1&&asksMatch;

  if(!(classic||bulletAsk||shortClarify))return null;

  // pergunta principal
  let question='Qual o contexto desta análise?';
  const boldQ=t.match(/\*\*([^*?]{8,100}\?)\*\*/);
  const lineQ=t.match(/(?:^|\n)\s*(?:\*\*)?([^\n*]{8,100}\?)(?:\*\*)?\s*(?:\n|$)/);
  if(boldQ)question=boldQ[1].trim();
  else if(lineQ&&/jogo|partida|times|competi|contexto|analis/i.test(lineQ[1]))question=lineQ[1].replace(/\*+/g,'').trim();
  else if(/qual\s+jogo/i.test(t))question='Qual jogo você quer analisar?';

  // tenta extrair opções concretas do texto (ex.: "Flamengo x Botafogo")
  const opts=[];
  const seen=new Set();
  const pushOpt=(label)=>{
    const L=String(label||'').replace(/\*+/g,'').replace(/^["“']|["”']$/g,'').trim();
    if(!L||L.length<4||L.length>90)return;
    if(/qual\s+(s[aã]o|competi|jogo|partida)/i.test(L))return;
    const k=L.toLowerCase();if(seen.has(k))return;seen.add(k);
    opts.push({id:'o'+opts.length,label:L});
  };
  // "Flamengo x Botafogo" / "Time A vs Time B"
  const vsRe=/\b([A-ZÁÉÍÓÚÂÊÔÃÕÀÜ][\wÁÉÍÓÚÂÊÔÃÕÀÜáéíóúâêôãõàü.'-]{1,28})\s+(?:x|vs\.?|versus)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÀÜ][\wÁÉÍÓÚÂÊÔÃÕÀÜáéíóúâêôãõàü.'-]{1,28})\b/g;
  let vm;while((vm=vsRe.exec(t))&&opts.length<2){
    pushOpt(vm[1]+' x '+vm[2]+( /brasileir|libert|champions|premier|la\s*liga|série/i.test(t)?' (jogo citado)':''));
  }
  // defaults acionáveis (UI ainda adiciona "Outro…")
  while(opts.length<2){
    if(opts.length===0)pushOpt('Um jogo específico (informo times, competição e data)');
    else pushOpt('Usar o contexto/notícia já presente nesta conversa');
  }

  return{question,options:opts.slice(0,2)};
}

/** Resolve context_prompt do JSON OU da prosa de esclarecimento. */
function resolveContextPrompt(text){
  return parseContextPrompt(text)||detectProseContextPrompt(text);
}
/** Remove fontes/labels de competição das opções (fifa.world, Brasileirão, etc.). */
function sanitizeMatchOptionLabel(label){
  let s=String(label||'').replace(/\s+/g,' ').trim();
  // "England x Argentina 1-2 [FT] · fifa.world" → sem · fonte
  s=s.replace(/\s*[·•|]\s*[\w.-]+\.[\w.-]+(?:\.[\w.-]+)*\s*$/i,'');
  s=s.replace(/\s*[·•|]\s*(Brasileir[aã]o(?:\s*S[eé]rie\s*[A-Z])?|Libertadores|Premier(?:\s*League)?|La\s*Liga|Champions(?:\s*League)?|S[eé]rie\s*[A-Z]|Mundial|Copa\s+do\s+Mundo|UEFA|CONMEBOL|fifa\.world)\s*$/i,'');
  s=s.replace(/\s*\((?:Brasileir[aã]o|Libertadores|Premier|La\s*Liga|Champions|fifa\.[\w.]+)\)\s*$/i,'');
  return s.trim();
}

/** Posiciona o popup logo acima do dock de input (caixa de diálogo). */
function positionCtxPromptAboveDock(){
  const ov=document.getElementById('ctx-prompt-ov');
  const dock=document.querySelector('.i-dock');
  if(!ov)return;
  let gap=148;
  try{
    if(dock){
      const r=dock.getBoundingClientRect();
      // espaço do fundo da tela até o topo do dock + folga
      gap=Math.max(96, Math.round(window.innerHeight - r.top + 10));
    }
  }catch{}
  ov.style.setProperty('--ctx-dock-gap', gap+'px');
}

function openContextPromptPopup(cp,pendingQuery){
  _pendingCtxQuery=pendingQuery||_pendingCtxQuery||'';
  _ctxPromptSelection=null;
  const ov=document.getElementById('ctx-prompt-ov');
  const title=document.getElementById('ctx-prompt-title');
  const optsEl=document.getElementById('ctx-prompt-opts');
  const otherWrap=document.getElementById('ctx-prompt-other-wrap');
  const otherInp=document.getElementById('ctx-prompt-other-input');
  if(!ov||!optsEl)return;

  // normaliza opções sem fontes
  const rawOpts=(cp&&Array.isArray(cp.options)?cp.options:[]).slice(0,2).map((o,i)=>{
    if(typeof o==='string')return{id:'o'+i,label:sanitizeMatchOptionLabel(o)};
    const label=sanitizeMatchOptionLabel(o&&(o.label||o.titulo||o.text||o.texto)||'');
    return label?{id:String(o.id||('o'+i)),label}:null;
  }).filter(Boolean);
  while(rawOpts.length<2){
    rawOpts.push(rawOpts.length===0
      ?{id:'club',label:'Jogo de clube de hoje (informo times)'}
      :{id:'nt',label:'Jogo de seleção / copa de hoje (informo times)'});
  }
  const question=(cp&&(cp.question||cp.pergunta))||'Qual o contexto desta pergunta?';
  // guarda para reabrir se o usuário cancelar
  _lastCtxPromptPayload={question,options:rawOpts.map(o=>({id:o.id,label:o.label}))};

  if(title)title.textContent=question;
  if(otherWrap)otherWrap.style.display='none';
  if(otherInp)otherInp.value='';
  const opts=[...rawOpts,{id:'__other__',label:'Outro…',isOther:true}];
  optsEl.innerHTML=opts.map(o=>`
    <button type="button" class="ctx-prompt-opt" data-id="${esc(o.id)}" data-other="${o.isOther?'1':'0'}" role="radio" aria-checked="false" onclick="selectContextPromptOpt(this)">
      <span class="ctx-prompt-radio" aria-hidden="true"></span>
      <span class="ctx-prompt-opt-txt">${esc(o.label)}${o.isOther?'<small>Descreva o contexto com suas palavras</small>':''}</span>
    </button>`).join('');
  positionCtxPromptAboveDock();
  ov.style.display='flex';
  ov.setAttribute('aria-hidden','false');
  try{ov.onclick=function(e){if(e.target===ov)closeContextPromptPopup();};}catch{}
  try{
    window.removeEventListener('resize',positionCtxPromptAboveDock);
    window.addEventListener('resize',positionCtxPromptAboveDock,{passive:true});
  }catch{}
}
function selectContextPromptOpt(btn){
  if(!btn)return;
  document.querySelectorAll('#ctx-prompt-opts .ctx-prompt-opt').forEach(b=>{
    b.classList.remove('selected');b.setAttribute('aria-checked','false');
  });
  btn.classList.add('selected');btn.setAttribute('aria-checked','true');
  const isOther=btn.getAttribute('data-other')==='1';
  const otherWrap=document.getElementById('ctx-prompt-other-wrap');
  const otherInp=document.getElementById('ctx-prompt-other-input');
  if(otherWrap)otherWrap.style.display=isOther?'block':'none';
  if(isOther){
    _ctxPromptSelection={type:'other'};
    if(otherInp){otherInp.focus();}
  }else{
    const labelEl=btn.querySelector('.ctx-prompt-opt-txt');
    // só o texto principal (sem o <small> de Outro…)
    let label='';
    if(labelEl){
      label=Array.from(labelEl.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('')
        || (labelEl.childNodes[0]&&labelEl.childNodes[0].textContent)||labelEl.textContent||'';
    }
    label=sanitizeMatchOptionLabel(label.replace(/\s+/g,' ').trim());
    _ctxPromptSelection={type:'opt',id:btn.getAttribute('data-id'),label};
  }
}

/** Remove a bolha de “definir contexto” se ainda estiver no chat. */
function removeCtxResumeHint(){
  try{
    if(_ctxResumeHintEl&&_ctxResumeHintEl.parentNode)_ctxResumeHintEl.remove();
  }catch{}
  _ctxResumeHintEl=null;
}

/** Após Cancelar sem contexto: sugestão no chat para reabrir o popup. */
function showContextResumeHint(){
  removeCtxResumeHint();
  const pending=_pendingCtxQuery||'';
  const html=`<div class="ctx-resume-hint">
    <p>Sem contexto definido — não avancei com a análise${pending?` da sua pergunta`:''}. Quando quiser, abra de novo as opções de jogo.</p>
    <button type="button" class="ctx-resume-btn" onclick="reopenDeferredContextPrompt()">◎ Definir contexto</button>
  </div>`;
  const bubble=showAgentBubble(html);
  _ctxResumeHintEl=bubble?bubble.closest('.msg-agent-chat'):null;
  try{_chatThread.push({role:'assistant',content:'[sugestão: definir contexto]'});}catch{}
  scrollChat();
}

/** Reabre o último popup de contexto (ou lista jogos de novo). */
function reopenDeferredContextPrompt(){
  removeCtxResumeHint();
  const pending=_pendingCtxQuery||'';
  if(_lastCtxPromptPayload&&_lastCtxPromptPayload.options&&_lastCtxPromptPayload.options.length){
    openContextPromptPopup({
      question:_lastCtxPromptPayload.question,
      options:_lastCtxPromptPayload.options
    },pending);
    return;
  }
  // fallback: remontar picker ESPN
  const inferred=inferCompIdsFromText(pending);
  openMatchPickerPopup(pending,inferred.length?inferred:COMP_ORDER.slice());
}

function closeContextPromptPopup(){
  const ov=document.getElementById('ctx-prompt-ov');
  if(ov){ov.style.display='none';ov.setAttribute('aria-hidden','true');}
  _ctxPromptSelection=null;
  // Cancelar sem estabelecer contexto → mantém pending + sugere reabrir no chat
  const pending=_pendingCtxQuery;
  const hadPayload=!!(_lastCtxPromptPayload&&_lastCtxPromptPayload.options&&_lastCtxPromptPayload.options.length);
  if(pending&&String(pending).trim()&&hadPayload){
    // não zera _pendingCtxQuery nem _lastCtxPromptPayload — reabrir precisa deles
    showContextResumeHint();
  }else{
    _pendingCtxQuery=null;
  }
}
function confirmContextPrompt(){
  let text='';
  if(!_ctxPromptSelection){
    // tenta ler seleção do DOM
    const sel=document.querySelector('#ctx-prompt-opts .ctx-prompt-opt.selected');
    if(sel)selectContextPromptOpt(sel);
  }
  if(!_ctxPromptSelection){try{toast('Selecione uma opção');}catch{}return;}
  if(_ctxPromptSelection.type==='other'){
    text=(document.getElementById('ctx-prompt-other-input')||{}).value||'';
    text=String(text).trim();
    if(!text){try{toast('Descreva o contexto em Outro…');}catch{}return;}
  }else{
    text=sanitizeMatchOptionLabel(_ctxPromptSelection.label||'');
  }
  const pending=_pendingCtxQuery;
  // fecha sem disparar o fluxo de “cancelar”
  const ov=document.getElementById('ctx-prompt-ov');
  if(ov){ov.style.display='none';ov.setAttribute('aria-hidden','true');}
  _ctxPromptSelection=null;
  _pendingCtxQuery=null;
  _lastCtxPromptPayload=null;
  removeCtxResumeHint();

  // mescla com contexto existente — marca como identidade do jogo escolhida pelo usuário
  const anchorLine='Jogo/contexto confirmado pelo usuário: '+text;
  const merged=_chatContext?( _chatContext.replace(/\s+$/,'')+'\n\n— Esclarecimento —\n'+anchorLine ):anchorLine;
  saveChatContext(merged.slice(0,4000));

  if(pending&&String(pending).trim()){
    // remove stub "[pedido de contexto via popup]" do fio
    if(_chatThread.length&&_chatThread[_chatThread.length-1].role==='assistant'){
      const last=_chatThread[_chatThread.length-1].content||'';
      if(/pedido de contexto/i.test(last))_chatThread.pop();
    }
    // remove também o user duplicado que será recriado — mantemos 1 user no fio
    if(_chatThread.length&&_chatThread[_chatThread.length-1].role==='user')_chatThread.pop();
    // remove stub de sugestão de contexto se for a última
    if(_chatThread.length&&_chatThread[_chatThread.length-1].role==='assistant'){
      const last=_chatThread[_chatThread.length-1].content||'';
      if(/sugest[aã]o:\s*definir contexto/i.test(last))_chatThread.pop();
    }
    const ta=document.getElementById('match-input');
    // reforça a pergunta com o jogo escolhido (evita o modelo chutar de novo)
    const reinforced=pending+'\n\n[Contexto confirmado: '+text+']';
    if(ta){ta.value=reinforced;ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,220)+'px';}
    _skipNextUserBubble=true;
    _skipVagueGateOnce=true; // não reabre o popup de ambiguidade neste reenvio
    setTimeout(()=>{try{if(typeof runChat==='function')runChat();}catch{}},60);
  }else{
    try{toast('Contexto salvo');}catch{}
  }
}

// ── Clique direito no texto do agente → anexar como contexto ──────────────
function hideAgentCtxMenu(){
  const m=document.getElementById('agent-ctx-menu');
  if(m){m.style.display='none';m.setAttribute('aria-hidden','true');}
}
function showAgentCtxMenu(x,y,text){
  _agentMenuText=String(text||'').trim();
  const m=document.getElementById('agent-ctx-menu');if(!m||!_agentMenuText)return;
  // Garante menu no body (fora de containers com overflow/transform da PWA)
  if(m.parentElement!==document.body){try{document.body.appendChild(m);}catch{}}
  m.style.display='flex';
  m.setAttribute('aria-hidden','false');
  const pad=8;
  const vw=window.innerWidth,vh=window.innerHeight;
  m.style.left='0px';m.style.top='0px';
  // força reflow para medir
  const rw=m.offsetWidth||220,rh=m.offsetHeight||88;
  let left=Number(x)||0,top=Number(y)||0;
  if(left+rw>vw-pad)left=Math.max(pad,vw-rw-pad);
  if(top+rh>vh-pad)top=Math.max(pad,vh-rh-pad);
  if(left<pad)left=pad;if(top<pad)top=pad;
  m.style.left=left+'px';m.style.top=top+'px';
}
function attachSelectionAsContext(){
  hideAgentCtxMenu();
  if(!_agentMenuText)return;
  appendChatContext(_agentMenuText.slice(0,2500));
}
function copyAgentMenuText(){
  hideAgentCtxMenu();
  if(_agentMenuText)copyToClipboard(_agentMenuText);
}
function _agentHostFromNode(node){
  if(!node)return null;
  const el=node.nodeType===3?node.parentElement:node;
  if(!el||!el.closest)return null;
  return el.closest('.msg-agent-chat, .agent-bubble, .a-card, .a-tc, .tab-body, .tab-s, .a-tab, [data-agent-msg], [data-agent-text]');
}
function _selectionTextInAgent(){
  try{
    const sel=window.getSelection&&window.getSelection();
    if(!sel||sel.isCollapsed)return'';
    const raw=String(sel.toString()||'').trim();
    if(!raw)return'';
    const a=_agentHostFromNode(sel.anchorNode);
    const f=_agentHostFromNode(sel.focusNode);
    if(a||f)return raw;
    if(sel.rangeCount){
      const r=sel.getRangeAt(0);
      if(_agentHostFromNode(r.commonAncestorContainer))return raw;
    }
  }catch{}
  return'';
}
function initAgentContextMenu(){
  if(typeof document==='undefined'||document.documentElement._agentCtxMenuBound)return;
  document.documentElement._agentCtxMenuBound=true;

  // CAPTURE no document: no Edge PWA o menu nativo ganha se preventDefault for só na bubble.
  document.addEventListener('contextmenu',function(e){
    try{
      if(!e||!e.target)return;
      // não interfere no próprio menu / inputs / popup de contexto
      if(e.target.closest&&(
        e.target.closest('#agent-ctx-menu')||
        e.target.closest('#ctx-prompt-ov')||
        e.target.closest('input, textarea, select, [contenteditable="true"]')||
        e.target.closest('.spanel, .sov, .ctx-prompt-panel')
      ))return;

      const selText=_selectionTextInAgent();
      let host=_agentHostFromNode(e.target);
      // seleção no agente + clique um pouco fora do nó ainda conta
      if(!host&&selText){
        try{
          const sel=window.getSelection();
          host=_agentHostFromNode(sel&&sel.anchorNode)||_agentHostFromNode(sel&&sel.focusNode);
        }catch{}
      }
      // Só respostas do agente (bolha ou card) — _agentHostFromNode já filtra
      if(!host)return;

      let text=selText;
      if(!text){
        const bubble=(e.target.closest&&e.target.closest('.agent-bubble, .a-card, .a-tc, .tab-s'))||host;
        text=String((bubble&&(bubble.innerText||bubble.textContent))||'').trim();
      }
      if(!text)return;

      // Bloqueia menu nativo do Edge (Copiar / Inspecionar / AdBlock…)
      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();

      showAgentCtxMenu(e.clientX,e.clientY,text);
    }catch(err){try{console.warn('[agent-ctx-menu]',err);}catch{}}
  },true);

  // Mantém o menu utilizável sem limpar a seleção
  const menuEl=document.getElementById('agent-ctx-menu');
  if(menuEl&&!menuEl._boundKeep){
    menuEl._boundKeep=true;
    menuEl.addEventListener('mousedown',function(e){e.preventDefault();},{passive:false});
    menuEl.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();});
  }

  document.addEventListener('click',function(e){
    const m=document.getElementById('agent-ctx-menu');
    if(m&&m.style.display!=='none'&&!m.contains(e.target))hideAgentCtxMenu();
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')hideAgentCtxMenu();
  });
  window.addEventListener('scroll',function(){hideAgentCtxMenu();},{capture:true,passive:true});
  window.addEventListener('resize',function(){hideAgentCtxMenu();});
}
function simpleMd(t){
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/^#{1,3}\s+(.+)$/gm,'<strong>$1</strong>')
    .replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
}
function showAgentBubble(html,opts){
  const el=document.createElement('div');
  el.className='msg-agent-chat';
  el.setAttribute('data-agent-msg','1');
  // Estrela sem chip amarelado (a-ball-plain) — nunca o fundo terra-pale antigo
  el.innerHTML=`<div class="a-ball a-ball-plain" style="flex-shrink:0;margin-top:2px">${brandStar()}</div><div class="agent-bubble" data-agent-text="1">${html||''}</div>`;
  if(opts&&opts.hidden)el.style.display='none';
  document.getElementById('conversation').appendChild(el);
  if(!(opts&&opts.hidden))scrollChat();
  return el.querySelector('.agent-bubble');
}
function renderSidebarHistory(){
  const el=document.getElementById('ls-hist');if(!el)return;
  if(!_history.length){el.innerHTML=`<span class="ls-hist-empty">${t('hist_empty')}</span>`;return;}
  el.innerHTML='<span class="ls-hist-lbl">Histórico</span>'+
    _history.slice(0,12).map(a=>`<button class="ls-hist-item" onclick="openSaved('${a.hid}')"><span class="ls-hi-dot"></span><span class="ls-hi-name">${esc(a.title)}</span><span class="ls-hi-ts">${esc((a.ts||'').split(' ')[0])}</span></button>`).join('');
}

// ─── Language system ─────────────────────────────────────────────────────
const STRINGS={
  pt:{
    new_analysis:'+ Nova Análise',
    nav_chat:'Chat',nav_library:'Biblioteca de Jogos',nav_saved:'Relatórios Salvos',
    nav_models:'Modelos de Análise',nav_soon:'em breve',nav_settings:'Configurações',
    hist_empty:'Nenhuma análise ainda',
    title_chat:'Chat',sub_chat:'Converse com sua IA especialista em futebol multi-campeonato.',
    title_library:'Biblioteca de Jogos',sub_library:'Campeonatos · abra um card para ver os jogos',
    title_saved:'Relatórios Salvos',sub_saved:'Análises de partidas salvas automaticamente.',
    btn_stop:'■ Parar',btn_send:'Enviar',btn_analyze:'Analisar',btn_export_lbl:'Exportar',
    btn_export_html:'HTML',btn_export_pdf:'PDF',export_none:'Nenhuma análise para exportar.',
    input_placeholder:'Descreva uma partida ou pergunte…',
    sched_loading:'Carregando agenda…',sched_lbl:'jogos de hoje e próximos dias',
    sched_no_games:'Sem jogos nos próximos dias',sched_calendar:'ver calendário →',
    filter_label:'Filtrar:',filter_all:'Todos',filter_today:'Hoje',filter_tomorrow:'Amanhã',filter_week:'7 dias',
    saved_autosave:'Partidas analisadas salvas automaticamente',saved_clear:'Limpar tudo',
    saved_open:'Abrir',saved_empty:'Nenhum relatório salvo ainda.<br>As análises são salvas automaticamente.',
    sf_apikey:'API Key Anthropic',sf_worker:'Worker URL (Cloudflare)',sf_sources:'Fontes de Dados',
    sf_theme:'Cor',sf_theme_aurora:'Aurora',sf_theme_verde:'Verde',sf_theme_mono:'B&W',
    sf_lang:'Idioma',sf_usage:'Uso de API · Sessão',sf_usage_empty:'Nenhuma análise nesta sessão',
    sf_cost_lbl:'custo estimado',sf_tok:'Tokens',sf_cache:'Cache',sf_miss:'Último miss',sf_runs:'Análises',
    sf_entrada:'entrada',sf_saida:'saída',sf_economizou:'economizou',
    no_key_chat:'Configure sua <button onclick="openSettings()" class="inline-link">API Key</button> em Configurações para conversar com o agente.',
    no_key_analyze:'Configure sua <button onclick="openSettings()" class="inline-link">API Key</button> em Configurações para analisar partidas.',
    agent_lang:'IDIOMA: Responda sempre em português (PT-BR). Use terminologia futebolística brasileira.',
    game_upcoming:(n)=>`${n} jogo${n!==1?'s':''} próximo${n!==1?'s':''}`,
    game_all:(n)=>`todos ${n} jogos →`,
    mnav_library:'Biblioteca',mnav_saved:'Relatórios',mnav_settings:'Config',plan_label:'Plano API · Claude',
    runs_unit:(n)=>`${n} análise${n!==1?'s':''}`
  },
  en:{
    new_analysis:'+ New Analysis',
    nav_chat:'Chat',nav_library:'Match Library',nav_saved:'Saved Reports',
    nav_models:'Analysis Templates',nav_soon:'soon',nav_settings:'Settings',
    hist_empty:'No analyses yet',
    title_chat:'Chat',sub_chat:'Chat with your multi-league football AI.',
    title_library:'Match Library',sub_library:'Multi-competition calendar',
    title_saved:'Saved Reports',sub_saved:'Analyses saved automatically.',
    btn_stop:'■ Stop',btn_send:'Send',btn_analyze:'Analyze',btn_export_lbl:'Export',
    btn_export_html:'HTML',btn_export_pdf:'PDF',export_none:'No analysis to export yet.',
    input_placeholder:'Describe a match or ask a question…',
    sched_loading:'Loading schedule…',sched_lbl:'today\'s and upcoming matches',
    sched_no_games:'No upcoming matches',sched_calendar:'see calendar →',
    filter_label:'Filter:',filter_all:'All',filter_today:'Today',filter_tomorrow:'Tomorrow',filter_week:'7 days',
    saved_autosave:'Analysed matches saved automatically',saved_clear:'Clear all',
    saved_open:'Open',saved_empty:'No saved reports yet.<br>Analyses are saved automatically.',
    sf_apikey:'Anthropic API Key',sf_worker:'Worker URL (Cloudflare)',sf_sources:'Data Sources',
    sf_theme:'Color',sf_theme_aurora:'Aurora',sf_theme_verde:'Green',sf_theme_mono:'B&W',
    sf_lang:'Language',sf_usage:'API Usage · Session',sf_usage_empty:'No analyses this session',
    sf_cost_lbl:'estimated cost',sf_tok:'Tokens',sf_cache:'Cache',sf_miss:'Last miss',sf_runs:'Analyses',
    sf_entrada:'in',sf_saida:'out',sf_economizou:'saved',
    no_key_chat:'Set your <button onclick="openSettings()" class="inline-link">API Key</button> in Settings to chat with the agent.',
    no_key_analyze:'Set your <button onclick="openSettings()" class="inline-link">API Key</button> in Settings to analyze matches.',
    agent_lang:'LANGUAGE: Always respond in English. Use standard international football terminology.',
    game_upcoming:(n)=>`${n} upcoming match${n!==1?'es':''}`,
    game_all:(n)=>`all ${n} matches →`,
    mnav_library:'Library',mnav_saved:'Reports',mnav_settings:'Settings',plan_label:'API Plan · Claude',
    runs_unit:(n)=>`${n} analysis${n!==1?'es':''}`
  }
};
function t(key){const s=STRINGS[currentLang]||STRINGS.pt;return s[key]!==undefined?s[key]:(STRINGS.pt[key]!==undefined?STRINGS.pt[key]:key);}
function _setNavTxt(el,txt){
  if(!el)return;
  for(let i=el.childNodes.length-1;i>=0;i--){
    const n=el.childNodes[i];
    if(n.nodeType===3&&n.textContent.trim()){n.textContent=' '+txt+' ';return;}
  }
}
function setLang(lang){
  currentLang=lang;
  try{localStorage.setItem('brsa_lang',lang);}catch{}
  applyLang();
  try{localStorage.removeItem('brsa_espn_news_v1');}catch{}
  loadNews();
}
function applyLang(){
  // Sidebar
  const newBtn=document.querySelector('.ls-new');if(newBtn)newBtn.textContent=t('new_analysis');
  _setNavTxt(document.getElementById('nav-chat'),t('nav_chat'));
  _setNavTxt(document.getElementById('nav-library'),t('nav_library'));
  _setNavTxt(document.getElementById('nav-saved'),t('nav_saved'));
  _setNavTxt(document.querySelector('.ls-link[onclick*="openSettings"]'),t('nav_settings'));
  const soonBtn=document.querySelector('.ls-link.soon');
  if(soonBtn){
    for(let i=soonBtn.childNodes.length-1;i>=0;i--){
      const n=soonBtn.childNodes[i];if(n.nodeType===3&&n.textContent.trim()){n.textContent=' '+t('nav_models')+' ';break;}
    }
    const soonTag=soonBtn.querySelector('.ls-soon-tag');if(soonTag)soonTag.textContent=t('nav_soon');
  }
  const histEmpty=document.querySelector('.ls-hist-empty');if(histEmpty)histEmpty.textContent=t('hist_empty');
  const planEl=document.querySelector('.ls-uplan');if(planEl)planEl.textContent=t('plan_label');
  // Mobile nav
  _setNavTxt(document.getElementById('mnav-library'),t('mnav_library'));
  _setNavTxt(document.getElementById('mnav-saved'),t('mnav_saved'));
  _setNavTxt(document.getElementById('mnav-settings'),t('mnav_settings'));
  // Main header
  const mTitle=document.querySelector('.m-title'),mSub=document.querySelector('.m-sub');
  if(mTitle&&mSub){
    if(_currentView==='library'){mTitle.textContent=t('title_library');mSub.textContent=t('sub_library');mSub.style.display='';}
    else if(_currentView==='saved'){mTitle.textContent=t('title_saved');mSub.textContent=t('sub_saved');mSub.style.display='';}
    else{mTitle.textContent=t('title_chat');mSub.textContent='';mSub.style.display='none';}
  }
  // Export button
  const hdrTxt=document.querySelector('.hdr-text');if(hdrTxt)hdrTxt.textContent=' '+t('btn_export_lbl');
  const exHtml=document.getElementById('export-opt-html');if(exHtml)exHtml.textContent=t('btn_export_html');
  const exPdf=document.getElementById('export-opt-pdf');if(exPdf)exPdf.textContent=t('btn_export_pdf');
  // Input
  const ta=document.getElementById('match-input');if(ta)ta.placeholder=t('input_placeholder');
  // Settings panel
  const spH2=document.querySelector('#sov .sp-hdr h2');if(spH2)spH2.textContent=t('nav_settings');
  const sfApiLbl=document.querySelector('label[for="api-key-input"]');if(sfApiLbl)sfApiLbl.textContent=t('sf_apikey');
  const sfWrkLbl=document.querySelector('label[for="worker-url-input"]');if(sfWrkLbl)sfWrkLbl.textContent=t('sf_worker');
  const sfSrcLbl=document.getElementById('sf-sources-lbl');if(sfSrcLbl)sfSrcLbl.textContent=t('sf_sources');
  const sfThemeLbl=document.getElementById('sf-theme-lbl');if(sfThemeLbl)sfThemeLbl.textContent=t('sf_theme');
  document.querySelectorAll('.theme-btn[data-theme="aurora"] span:last-child').forEach(el=>{el.textContent=t('sf_theme_aurora');});
  document.querySelectorAll('.theme-btn[data-theme="verde"] span:last-child').forEach(el=>{el.textContent=t('sf_theme_verde');});
  document.querySelectorAll('.theme-btn[data-theme="mono"] span:last-child').forEach(el=>{el.textContent=t('sf_theme_mono');});
  const sfLangLbl=document.getElementById('sf-lang-lbl');if(sfLangLbl)sfLangLbl.textContent=t('sf_lang');
  const sfUsageLbl=document.getElementById('sf-usage-lbl');if(sfUsageLbl)sfUsageLbl.textContent=t('sf_usage');
  const sfEmpty=document.getElementById('sf-tok-empty');if(sfEmpty)sfEmpty.textContent=t('sf_usage_empty');
  const sfCostLbl=document.querySelector('.tok-sf-cost-lbl');if(sfCostLbl)sfCostLbl.textContent=t('sf_cost_lbl');
  // Filter buttons
  document.querySelectorAll('.lib-filter-btn[data-f]').forEach(btn=>{
    const f=btn.dataset.f;
    if(f==='todos')btn.textContent=t('filter_all');
    else if(f==='hoje')btn.textContent=t('filter_today');
    else if(f==='amanha')btn.textContent=t('filter_tomorrow');
    else if(f==='semana')btn.textContent=t('filter_week');
  });
  // Run button
  setRunBtn(_running||false);
  // Re-render schedule chips to update labels (team names are language-independent)
  if(_schedule&&_schedule.length){renderScheduleChips(_schedule);}
  else{const schedLbl=document.getElementById('sched-lbl');if(schedLbl)schedLbl.textContent=t('sched_lbl');}
  // Lang buttons sync (não misturar com .theme-btn)
  document.querySelectorAll('.lang-btn[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===currentLang));
  document.querySelectorAll('.theme-btn[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===currentTheme));
}

// ─── Welcome popup ────────────────────────────────────────────────────────
const WELCOME_KEY='brsa_welcomed';
function welcomeDismiss(){document.getElementById('wov').classList.remove('open');try{localStorage.setItem(WELCOME_KEY,'1');}catch{}}
function welcomeSetup(){welcomeDismiss();openSettings();}
function maybeShowWelcome(){try{if(!localStorage.getItem(WELCOME_KEY))document.getElementById('wov').classList.add('open');}catch{}}

// ─── Settings ────────────────────────────────────────────────────────────
function getWorkerUrl(){try{return localStorage.getItem(WORKER_URL_STORE)||'';}catch{return'';}}
function saveWorkerUrl(v){try{localStorage.setItem(WORKER_URL_STORE,v.trim());}catch{}}
function getApiBase(){const w=getWorkerUrl();return w||'https://api.anthropic.com';}
function getReqHeaders(apiKey,betas=[]){
  const h={'Content-Type':'application/json','anthropic-version':'2023-06-01'};
  if(!getWorkerUrl()){h['x-api-key']=apiKey;h['anthropic-dangerous-direct-browser-access']='true';}
  if(betas.length)h['anthropic-beta']=betas.join(',');
  return h;
}
// Roda no navegador do usuário para transformar um "Failed to fetch" opaco na causa real
async function diagnoseConnection(apiKey){
  if(location.protocol==='file:')
    return 'O app foi aberto como arquivo local (file://) — a origem fica "null" e a API da Anthropic bloqueia isso. Sirva por http://localhost ou pela URL do GitHub Pages.';
  if(getWorkerUrl()){
    try{const r=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1,messages:[{role:'user',content:'.'}]})});return r.status>=500?`O Worker proxy respondeu com erro ${r.status}.`:null;}
    catch{return 'Não foi possível alcançar o Worker proxy ('+getApiBase()+'). Confira se a URL está correta e online, ou remova-a nas Configurações para usar a chave direto.';}
  }
  // Sem worker: testa o TRANSPORTE com chave fictícia (não usa a sua)
  let transportOk=false;
  try{await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','anthropic-version':'2023-06-01','x-api-key':'sk-ant-probe000','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1,messages:[{role:'user',content:'.'}]})});transportOk=true;}
  catch{transportOk=false;}
  if(!transportOk)
    return 'O navegador não conseguiu alcançar api.anthropic.com. Causa provável: extensão de bloqueio (ad-block/privacidade), VPN/firewall ou rede corporativa barrando o domínio. Teste em janela anônima sem extensões ou em outra rede.';
  if(!apiKey||!apiKey.startsWith('sk-ant-'))
    return 'A conexão funciona, mas nenhuma chave de API válida foi informada. Cole sua chave (sk-ant-…) nas Configurações.';
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1,messages:[{role:'user',content:'.'}]})});
    if(r.status===401)return 'A conexão funciona, mas a chave foi recusada (401). Gere uma nova em console.anthropic.com e cole completa, sem espaços.';
    return null; // chave OK agora → a falha foi transitória, tente de novo
  }catch{
    return 'A conexão funciona com uma chave de teste, mas falha com a sua — provavelmente há um caractere inválido (espaço, quebra de linha ou símbolo) na chave colada. Apague o campo e cole a chave de novo, limpa.';
  }
}
async function fetchMemoryContext(){
  if(!getWorkerUrl()||!MEMORY_STORE_ID)return'';
  if(_memCache&&(Date.now()-_memCacheAt)<MEM_CACHE_TTL)return _memCache;
  try{
    const res=await fetch(getApiBase()+`/v1/memory_stores/${MEMORY_STORE_ID}/memories?path_prefix=/&order_by=path&depth=3`,{
      method:'GET',
      headers:{'Content-Type':'application/json','anthropic-version':'2023-06-01','anthropic-beta':'managed-agents-2026-04-01'}
    });
    if(!res.ok)return'';
    const d=await res.json();
    if(!d.data?.length)return'';
    const parts=d.data.filter(m=>m.type==='memory'&&m.content).map(m=>`### ${m.path}\n${m.content}`);
    _memCache=parts.length?`\n\n## MEMÓRIA MERIDIAN · ${compLabel(_activeCompId)}\n${parts.join('\n\n')}`:'';
    _memCacheAt=Date.now();
    return _memCache;
  }catch{return'';}
}
function parseRateLimitHeaders(res){
  const tl=parseInt(res.headers.get('anthropic-ratelimit-tokens-limit')||'0');
  const tr=parseInt(res.headers.get('anthropic-ratelimit-tokens-remaining')||'0');
  const ts=res.headers.get('anthropic-ratelimit-tokens-reset')||'';
  const rl=parseInt(res.headers.get('anthropic-ratelimit-requests-limit')||'0');
  const rr=parseInt(res.headers.get('anthropic-ratelimit-requests-remaining')||'0');
  if(tl){rlState.tokLimit=tl;rlState.tokRemaining=tr;rlState.tokReset=ts;}
  if(rl){rlState.reqLimit=rl;rlState.reqRemaining=rr;}
}
function openSettings(){
  document.getElementById('sov').style.display='flex';
  _syncSettingsTheme(currentTheme);
  const w=document.getElementById('worker-url-input');if(w)w.value=getWorkerUrl();
  const aa=document.getElementById('auto-ai-toggle');if(aa)aa.checked=autoAiEnabled();
  const ds=document.getElementById('dynsearch-toggle');if(ds)ds.checked=getDynSearch();
  const pe=document.getElementById('persona-input');if(pe)pe.value=getUserPersona();
  document.querySelectorAll('.lang-btn[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===currentLang));
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===currentTheme));
  updateSettingsTokens();
  updateInstallButton();
}

/** PWA install (Edge/Chrome) — usa beforeinstallprompt capturado no index.html */
function updateInstallButton(){
  const b=document.getElementById('btn-install-pwa');
  const h=document.getElementById('sf-install-hint');
  if(!b)return;
  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
  if(standalone){
    b.disabled=true;b.textContent='Rodando como app';
    if(h)h.innerHTML='App instalado. Com o cache gravado, <b>não precisa do servidor Node</b> para abrir a interface (só internet para análises).';
    return;
  }
  if(window.__pwaInstallEvt){
    b.disabled=false;b.textContent='Instalar Meridian v2 como app';
    if(h)h.innerHTML='Pronto para instalar. Depois de instalar, abra <b>1× com o servidor ligado</b> para gravar o cache offline.';
  }else{
    b.disabled=false;b.textContent='Como instalar no Edge';
    if(h)h.innerHTML='Edge: <b>⋯ → Aplicativos → Instalar este site como um aplicativo</b> em <code>http://127.0.0.1:3457/</code>. Após instalar, abra 1× com o servidor no ar; depois o app do Edge roda <b>sem Node</b>.';
  }
}
async function installPwaApp(){
  const b=document.getElementById('btn-install-pwa');
  const h=document.getElementById('sf-install-hint');
  const ev=window.__pwaInstallEvt;
  if(ev){
    try{
      ev.prompt();
      const choice=await ev.userChoice;
      window.__pwaInstallEvt=null;
      if(choice&&choice.outcome==='accepted'){
        if(b){b.disabled=true;b.textContent='Instalado';}
        if(h)h.textContent='App instalado. Abra pelo menu Iniciar.';
      }else{
        if(h)h.textContent='Instalação cancelada. Você pode tentar de novo pelo menu ⋯ do Edge.';
        updateInstallButton();
      }
    }catch(e){
      if(h)h.textContent='Falha ao abrir o instalador: '+(e&&e.message?e.message:e);
    }
    return;
  }
  // Sem beforeinstallprompt: orienta o menu nativo do Edge
  if(h){
    h.innerHTML='Prompt nativo ainda não disponível. No Edge: <b>⋯ → Aplicativos → Instalar este site como um aplicativo</b>. Confirme que a URL é <code>http://127.0.0.1:3457/</code> e que o servidor está rodando. Se o SW estiver quebrado: <a href="?resetsw=1" style="color:var(--honey,#e8b44a)">limpar e recarregar</a>.';
  }
  try{alert('No Edge: menu ⋯ → Aplicativos → Instalar este site como um aplicativo.\n\nURL precisa ser http://127.0.0.1:3457/ com o servidor ligado.');}catch(_){}
}

// ─── Tema de cor (Aurora | Verde | B&W mono) ─────────────────────────────
const THEME_STORE='meridian_ui_theme';
const THEME_IDS=['aurora','verde','mono'];
var currentTheme=(()=>{try{const v=localStorage.getItem(THEME_STORE);return THEME_IDS.includes(v)?v:'aurora';}catch{return'aurora';}})();
const LOGO_AURORA='assets/logo-aurora.png';
const LOGO_VERDE='assets/wc-trophy.png';
function _applyBrandLogo(theme){
  // B&W reutiliza logo Aurora com filtro CSS; Verde usa troféu
  const src=theme==='verde'?LOGO_VERDE:LOGO_AURORA;
  const alt=theme==='verde'?'Meridian':(theme==='mono'?'Meridian B&W':'Meridian Aurora');
  [document.getElementById('ls-brand-logo'),document.getElementById('wp-brand-logo'),document.querySelector('.ls-emblem-photo')].forEach(img=>{
    if(!img)return;
    if(img.getAttribute('src')!==src)img.setAttribute('src',src);
    img.alt=alt;
  });
}
// Card de Configurações = mesma lógica de paleta do botão Analisar / cards da biblioteca
// Aurora: âmbar→ciano · Verde: lima→verde · B&W: cinza metálico · texto escuro em todos
const SETTINGS_PANEL_SKINS={
  aurora:{
    scrim:'rgba(8,12,18,0.52)',
    // lib-comp-card Aurora (Analisar #e8b44a→#6ba8a0, contido)
    bg:'linear-gradient(148deg, #c99642 0%, #b88848 38%, #5a9088 100%)',
    bgSolid:'#9a8050',
    border:'1px solid rgba(255,255,255,0.32)',
    // sombra = CSS var --pal-elev-card (profundidade, sem glow)
    shadow:'var(--pal-elev-card)',
    fg:'#0c1016',
    muted:'rgba(12,16,22,0.72)',
    inputBg:'rgba(255,255,255,0.55)',
    inputBorder:'1px solid rgba(12,16,22,0.14)',
    focus:'rgba(42,30,12,0.45)',
    closeBorder:'rgba(12,16,22,0.18)',
    closeBg:'rgba(255,255,255,0.28)'
  },
  verde:{
    scrim:'rgba(2,12,7,0.52)',
    // lib-comp-card Verde (Analisar #d6f95a→#43e08f, contido)
    bg:'linear-gradient(148deg, #c4dc62 0%, #8ecf72 42%, #3cbe82 100%)',
    bgSolid:'#6cbc72',
    border:'1px solid rgba(255,255,255,0.34)',
    shadow:'var(--pal-elev-card)',
    fg:'#06251a',
    muted:'rgba(6,37,26,0.72)',
    inputBg:'rgba(255,255,255,0.55)',
    inputBorder:'1px solid rgba(6,37,26,0.14)',
    focus:'rgba(6,37,26,0.4)',
    closeBorder:'rgba(6,37,26,0.18)',
    closeBg:'rgba(255,255,255,0.3)'
  },
  mono:{
    scrim:'rgba(0,0,0,0.48)',
    // lib-comp-card B&W (Analisar cinza metálico)
    bg:'linear-gradient(148deg, #c8c8c8 0%, #9a9a9a 45%, #5a5a5a 100%)',
    bgSolid:'#8a8a8a',
    border:'1px solid rgba(255,255,255,0.28)',
    shadow:'var(--pal-elev-card)',
    fg:'#111111',
    muted:'rgba(0,0,0,0.62)',
    inputBg:'rgba(255,255,255,0.72)',
    inputBorder:'1px solid rgba(0,0,0,0.16)',
    focus:'#222222',
    closeBorder:'rgba(0,0,0,0.2)',
    closeBg:'rgba(255,255,255,0.35)'
  }
};
function _setImp(el,prop,val){if(el)el.style.setProperty(prop,val,'important');}
function _syncSettingsTheme(theme){
  const skin=SETTINGS_PANEL_SKINS[theme]||SETTINGS_PANEL_SKINS.aurora;
  const sov=document.getElementById('sov');
  const panel=sov&&sov.querySelector('.spanel');
  if(!sov||!panel)return;
  sov.classList.remove('theme-aurora','theme-verde','theme-mono');
  sov.classList.add('theme-'+theme);
  panel.classList.remove('theme-aurora','theme-verde','theme-mono');
  panel.classList.add('theme-'+theme);
  // Overlay: scrim + blur (fundo fora do card)
  _setImp(sov,'background',skin.scrim);
  _setImp(sov,'background-color',skin.scrim);
  _setImp(sov,'background-image','none');
  _setImp(sov,'backdrop-filter','blur(12px) saturate(1.15)');
  _setImp(sov,'-webkit-backdrop-filter','blur(12px) saturate(1.15)');
  // Card: paleta Analisar / lib-comp-card
  _setImp(panel,'background',skin.bg);
  _setImp(panel,'background-image',skin.bg);
  _setImp(panel,'background-color',skin.bgSolid);
  _setImp(panel,'border',skin.border);
  _setImp(panel,'box-shadow',skin.shadow);
  _setImp(panel,'backdrop-filter','none');
  _setImp(panel,'-webkit-backdrop-filter','none');
  _setImp(panel,'color',skin.fg);
  const h2=panel.querySelector('.sp-hdr h2');
  if(h2)_setImp(h2,'color',skin.fg);
  panel.querySelectorAll('.sf-lbl, .sf-hint, .sf-adv > summary, .ds-name, .ds-status, .sf-adv-body .sf-hint').forEach(el=>{
    _setImp(el,'color',skin.muted);
  });
  panel.querySelectorAll('input[type="password"], input[type="text"], textarea').forEach(el=>{
    _setImp(el,'background',skin.inputBg);
    _setImp(el,'background-color',skin.inputBg);
    _setImp(el,'border',skin.inputBorder);
    _setImp(el,'color',skin.fg);
  });
  panel.querySelectorAll('.sp-close').forEach(el=>{
    _setImp(el,'color',skin.fg);
    _setImp(el,'background',skin.closeBg||'rgba(255,255,255,0.28)');
    _setImp(el,'border-color',skin.closeBorder||'rgba(0,0,0,0.16)');
  });
  panel.querySelectorAll('.lang-btn:not(.active)').forEach(el=>{
    _setImp(el,'color',skin.fg);
    _setImp(el,'background','rgba(255,255,255,0.28)');
    _setImp(el,'border-color',skin.closeBorder||'rgba(0,0,0,0.16)');
  });
  panel.querySelectorAll('.lang-btn.active').forEach(el=>{
    if(theme==='mono'){
      _setImp(el,'background','linear-gradient(180deg,#2a2a2a,#1a1a1a)');
      _setImp(el,'color','#f5f5f5');
      _setImp(el,'border-color','#111');
    }else if(theme==='verde'){
      _setImp(el,'background','linear-gradient(120deg,rgba(6,37,26,0.18),rgba(6,37,26,0.08))');
      _setImp(el,'color',skin.fg);
      _setImp(el,'border-color','rgba(6,37,26,0.35)');
    }else{
      _setImp(el,'background','linear-gradient(120deg,rgba(12,16,22,0.16),rgba(12,16,22,0.06))');
      _setImp(el,'color',skin.fg);
      _setImp(el,'border-color','rgba(12,16,22,0.28)');
    }
  });
  // Botões de tema inativos legíveis no gradiente
  panel.querySelectorAll('.theme-btn:not(.active)').forEach(el=>{
    _setImp(el,'color',skin.fg);
    _setImp(el,'border-color',skin.closeBorder||'rgba(0,0,0,0.16)');
    _setImp(el,'background','rgba(255,255,255,0.22)');
  });
}
function setTheme(theme){
  if(!THEME_IDS.includes(theme))theme='aurora';
  currentTheme=theme;
  try{localStorage.setItem(THEME_STORE,theme);}catch{}
  document.documentElement.setAttribute('data-theme',theme);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme==='verde'?'#04130c':(theme==='mono'?'#b0b0b0':'#0c1016');
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));
  _applyBrandLogo(theme);
  _syncSettingsTheme(theme);
}
function applyStoredTheme(){setTheme(currentTheme);}
function updateSettingsTokens(){
  const tot=tokenState.sessionIn+tokenState.sessionOut;
  const emptyEl=document.getElementById('sf-tok-empty');
  const costCard=document.getElementById('sf-tok-costcard');
  const rowsEl=document.getElementById('sf-tok-rows');
  if(!emptyEl)return;
  if(!tot){emptyEl.style.display='';costCard.style.display='none';rowsEl.style.display='none';return;}
  emptyEl.style.display='none';costCard.style.display='';rowsEl.style.display='';
  const haikuP=MODEL_PRICE['claude-haiku-4-5-20251001'];
  const mainP=MODEL_PRICE[currentModel]||MODEL_PRICE['claude-sonnet-4-6'];
  const p1P=getDynSearch()?(MODEL_PRICE['claude-sonnet-4-6']):haikuP; // filtragem dinâmica roda no Sonnet
  const p1Cost=(tokenState.sessionIn_p1*p1P.i+tokenState.sessionOut_p1*p1P.o)/1e6;
  const p2In=tokenState.sessionIn-tokenState.sessionIn_p1,p2Out=tokenState.sessionOut-tokenState.sessionOut_p1;
  const cost=p1Cost+(p2In*mainP.i+p2Out*mainP.o)/1e6;
  document.getElementById('sf-tok-cost').textContent=_fmtCost(cost);
  document.getElementById('sf-tok-tokens').textContent=`${_fmtTok(tokenState.sessionIn)} ${t('sf_entrada')} · ${_fmtTok(tokenState.sessionOut)} ${t('sf_saida')}`;
  const cacheRowEl=document.getElementById('sf-tok-cache-row');
  if(tokenState.sessionCacheRead>0){
    cacheRowEl.style.display='';
    let ct=_fmtTok(tokenState.sessionCacheRead)+' lidos';
    if(tokenState.lastCacheHitPct>0)ct+=' · '+tokenState.lastCacheHitPct+'% hit';
    if(tokenState.sessionCacheSaved>0.001)ct+=' · '+t('sf_economizou')+' '+_fmtCost(tokenState.sessionCacheSaved);
    document.getElementById('sf-tok-cacherow').textContent=ct;
  }else{cacheRowEl.style.display='none';}
  const missRowEl=document.getElementById('sf-tok-miss-row');
  if(tokenState.lastCacheMissReason){
    missRowEl.style.display='';
    document.getElementById('sf-tok-missrow').textContent=tokenState.lastCacheMissReason.replace(/_/g,' ');
  }else{missRowEl.style.display='none';}
  const n=tokenState.runs;
  document.getElementById('sf-tok-runs').textContent=`${typeof t('runs_unit')==='function'?t('runs_unit')(n):t('runs_unit')} · ${MODEL_SHORT[currentModel]||currentModel}`;
}
function closeSettings(e){if(!e||e.target===document.getElementById('sov'))document.getElementById('sov').style.display='none';}

// ─── Model / Effort ──────────────────────────────────────────────────────
function setEffort(val){
  currentEffort=Number(val);
  const cur=document.getElementById('effort-cur');if(cur)cur.textContent=EFFORT_LEVELS[currentEffort].label;
  document.querySelectorAll('.estep').forEach((s,i)=>{s.classList.toggle('done',i<currentEffort);s.classList.toggle('cur',i===currentEffort);});
  const fg=document.getElementById('effort-fg');if(fg)fg.style.width=(currentEffort/4*100)+'%';
  const lbl=document.getElementById('effort-sel-lbl');if(lbl)lbl.textContent=EFFORT_LEVELS[currentEffort].label;
  document.querySelectorAll('#effort-pop .sp-opt').forEach((b,i)=>b.classList.toggle('sp-active',i===currentEffort));
}
function setModel(btn){
  currentModel=btn?.dataset?.model||btn;
  _lastAnalysisId=null;
  const isHaiku=currentModel==='claude-haiku-4-5-20251001';
  if(isHaiku)setEffort(0);
  const efBtn=document.getElementById('effort-sel-btn');if(efBtn)efBtn.disabled=isHaiku;
  const lbl=document.getElementById('model-sel-lbl');if(lbl)lbl.textContent=MODEL_DOCK[currentModel]||'Modelo';
  document.querySelectorAll('#model-pop .sp-opt').forEach(b=>b.classList.toggle('sp-active',b.dataset.model===currentModel));
  if(tokenState.runs>0)updateTokenBar();
  updateDockTokens();
}
// ─── Dock selectors & token display ──────────────────────────────────────
function _fmtTok(n){return n>=1e6?(n/1e6).toFixed(2)+'M':n>=1000?(n/1000).toFixed(1)+'k':String(n);}
function _fmtCost(usd){
  if(usd<0.0001)return '$0.00';
  if(usd<0.01)return '$'+usd.toFixed(4);
  if(usd<1)return '$'+usd.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
  return '$'+usd.toFixed(2);
}
function updateDockTokens(){
  const tot=tokenState.sessionIn+tokenState.sessionOut;
  if(!tot)return;
  const el=document.getElementById('i-tok-mini');if(el)el.style.display='flex';
  // Phase 1 always uses Haiku regardless of selected model; price each phase separately
  const haikuP=MODEL_PRICE['claude-haiku-4-5-20251001'];
  const mainP=MODEL_PRICE[currentModel]||MODEL_PRICE['claude-sonnet-4-6'];
  const p1P=getDynSearch()?(MODEL_PRICE['claude-sonnet-4-6']):haikuP; // filtragem dinâmica roda no Sonnet
  const p1Cost=(tokenState.sessionIn_p1*p1P.i+tokenState.sessionOut_p1*p1P.o)/1e6;
  const p2In=tokenState.sessionIn-tokenState.sessionIn_p1;
  const p2Out=tokenState.sessionOut-tokenState.sessionOut_p1;
  const cost=p1Cost+(p2In*mainP.i+p2Out*mainP.o)/1e6;
  const numEl=document.getElementById('i-tok-num');const costEl=document.getElementById('i-tok-cost');
  if(numEl)numEl.textContent=_fmtTok(tot);
  if(costEl)costEl.textContent=_fmtCost(cost);
  // animate ring — real rate limit data when available, else session estimate
  const ringEl=document.getElementById('tok-ring-fill');
  if(ringEl){
    const circ=43.98;
    let fill,title;
    if(rlState.tokLimit>0){
      const used=rlState.tokLimit-rlState.tokRemaining;
      fill=Math.min(used/rlState.tokLimit,1)*circ;
      const resetIn=rlState.tokReset?Math.max(0,Math.round((new Date(rlState.tokReset)-Date.now())/1000)):-1;
      const resetStr=resetIn>=0?(resetIn<60?`${resetIn}s`:`${Math.ceil(resetIn/60)}min`):'';
      title=`Janela: ${_fmtTok(used)}/${_fmtTok(rlState.tokLimit)}${resetStr?' · reseta em '+resetStr:''}`;
    }else{
      fill=Math.min(tot/150000,1)*circ;
      title=`Sessão: ${_fmtTok(tot)} tokens`;
    }
    ringEl.setAttribute('stroke-dasharray',`${fill.toFixed(2)} ${circ.toFixed(2)}`);
    const wrap=document.getElementById('i-tok-mini');if(wrap)wrap.title=title;
  }
}
function toggleModelPop(e){
  e&&e.stopPropagation();
  const pop=document.getElementById('model-pop');
  const open=pop.classList.toggle('open');
  document.getElementById('model-sel-btn').classList.toggle('pop-open',open);
  document.getElementById('effort-pop').classList.remove('open');
  document.getElementById('effort-sel-btn').classList.remove('pop-open');
}
function toggleEffortPop(e){
  e&&e.stopPropagation();
  const pop=document.getElementById('effort-pop');
  const open=pop.classList.toggle('open');
  document.getElementById('effort-sel-btn').classList.toggle('pop-open',open);
  document.getElementById('model-pop').classList.remove('open');
  document.getElementById('model-sel-btn').classList.remove('pop-open');
}
function closeSelPops(){
  ['model-pop','effort-pop'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('open');});
  ['model-sel-btn','effort-sel-btn'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('pop-open');});
}
function pickModel(id){
  setModel({dataset:{model:id}});
  closeSelPops();
}
function pickEffort(idx){setEffort(idx);closeSelPops();}

// ─── Chat helpers ─────────────────────────────────────────────────────────
function scrollChat(){const c=document.getElementById('chat');setTimeout(()=>{c.scrollTop=c.scrollHeight;},60);}

function fmt(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// O schema pede array de strings em campos como "lacunas", mas o modelo às vezes
// generaliza o padrão de outros arrays do schema (que SÃO objetos, ex. eventos_provaveis)
// e devolve {campo:"...", motivo:"..."} em vez de string — String(objeto) vira
// "[object Object]" na tela. Isso extrai um texto legível de qualquer formato.
// Recursivo: cobre objeto aninhado dentro de objeto e arrays dentro do item. Fallback
// final é JSON.stringify (não String) — nunca deve devolver o literal "[object Object]".
function textFrom(v){
  if(typeof v==='string')return v;
  if(v==null)return '';
  if(Array.isArray(v))return v.map(textFrom).filter(Boolean).join(' — ');
  if(typeof v==='object'){
    const known=v.lacuna||v.descricao||v.texto||v.campo||v.fator||v.motivo||v.detalhe||v.observacao||v.nota||v.resumo||v.mensagem||v.item;
    if(known)return textFrom(known);
    const parts=Object.values(v).map(textFrom).filter(Boolean);
    if(parts.length)return parts.join(' — ');
    try{return JSON.stringify(v);}catch{return String(v);}
  }
  return String(v);
}

let _lastQuery='';
function showUserBubble(text,atts){
  _lastQuery=text;
  document.getElementById('empty-state').style.display='none';
  renderEmptyStateFeatured();
  const now=new Date();
  const ts=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const el=document.createElement('div');
  el.className='msg-user';
  let attsHtml='';
  if(atts&&atts.length){
    attsHtml='<div class="ub-atts">'+atts.map(a=>a.kind==='image'
      ?`<img src="data:${a.mediaType};base64,${a.data}" alt="${esc(a.name)}">`
      :`<span class="ub-doc">${a.kind==='pdf'?'📄':'📃'} ${esc(a.name)}</span>`).join('')+'</div>';
  }
  const bubbleHtml=text?`<div class="user-bubble">${esc(text)}</div>`:'';
  el.innerHTML=`${attsHtml}${bubbleHtml}<div class="user-meta"><button class="ua-btn" onclick="copyUserMsg()"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>copiar</button><span class="ua-ts">${ts} ✓</span></div>`;
  document.getElementById('conversation').appendChild(el);
  scrollChat();
}
// Cópia robusta: a API async falha silenciosamente em alguns WebViews/mobile
// (sem contexto seguro ou sem gesto) — sem fallback, o clipboard ficava com
// conteúdo velho (ex.: um texto URL-encoded de antes). Fallback via execCommand
// + feedback por toast garantem que o texto REAL seja copiado no PC e no mobile.
async function copyToClipboard(text){
  text=text==null?'':String(text);
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText&&window.isSecureContext){
      await navigator.clipboard.writeText(text);
      toast('Copiado');return true;
    }
    throw new Error('no async clipboard');
  }catch(e){
    try{
      const ta=document.createElement('textarea');
      ta.value=text;ta.setAttribute('readonly','');
      ta.style.position='fixed';ta.style.top='0';ta.style.left='0';ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.focus();ta.select();ta.setSelectionRange(0,text.length);
      const ok=document.execCommand('copy');
      document.body.removeChild(ta);
      toast(ok?'Copiado':'Não foi possível copiar');return ok;
    }catch(e2){toast('Não foi possível copiar');return false;}
  }
}
function copyUserMsg(){copyToClipboard(_lastQuery);}

// ─── Anexos (imagens) ───────────────────────────────────────────────────────
// Mídia em base64 nunca entra no _chatThread (evita bloat de memória e re-cobrança
// de tokens): é enviada só no turno em que é anexada; o histórico guarda um stub.
var _attachments=[],_attSeq=0;
const ATT_MAX_IMG=5*1024*1024;       // limite da API por imagem
const ATT_MAX_PDF=12*1024*1024;      // PDF base64 (cuidado: cada página consome muitos tokens)
const ATT_MAX_TXT=200*1024;          // texto inline (.txt/.md/.csv) — ~50k tokens no pior caso
const ATT_MAX_COUNT=6;
function _fmtBytes(n){return n<1024?n+'B':n<1048576?(n/1024).toFixed(0)+'KB':(n/1048576).toFixed(1)+'MB';}
function toast(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2600);
}
function onAttachInput(input){const files=[...input.files];input.value='';files.forEach(addAttachment);}
function addAttachment(file){
  if(_attachments.length>=ATT_MAX_COUNT){toast(`Máximo de ${ATT_MAX_COUNT} anexos por mensagem.`);return;}
  const name=file.name||'arquivo';
  const isImg=/^image\/(png|jpeg|webp|gif)$/.test(file.type);
  const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(name);
  const isTxt=/^text\//.test(file.type)||/\.(txt|md|markdown|csv|log|json|tsv)$/i.test(name);
  if(isImg){
    if(file.size>ATT_MAX_IMG){toast(`"${name}" excede 5MB.`);return;}
    _readB64(file,data=>_pushAtt({kind:'image',name,mediaType:file.type,data,size:file.size}));
  }else if(isPdf){
    if(file.size>ATT_MAX_PDF){toast(`"${name}" excede 12MB.`);return;}
    _readB64(file,data=>{_pushAtt({kind:'pdf',name,mediaType:'application/pdf',data,size:file.size});if(file.size>3*1024*1024)toast('PDF grande — pode consumir muitos tokens (cada página conta).');});
  }else if(isTxt){
    if(file.size>ATT_MAX_TXT){toast(`"${name}" excede 200KB.`);return;}
    const reader=new FileReader();
    reader.onerror=()=>toast('Falha ao ler o arquivo.');
    reader.onload=()=>{const txt=String(reader.result||'');if(!txt.trim()){toast('Arquivo de texto vazio.');return;}_pushAtt({kind:'text',name,data:txt,size:file.size});};
    reader.readAsText(file);
  }else{
    toast('Formato não suportado. Use imagem, PDF ou texto (.txt/.md/.csv).');
  }
}
function _readB64(file,cb){
  const reader=new FileReader();
  reader.onerror=()=>toast('Falha ao ler o arquivo.');
  reader.onload=()=>{const data=String(reader.result).split(',')[1]||'';if(!data){toast('Arquivo vazio ou ilegível.');return;}cb(data);};
  reader.readAsDataURL(file);
}
function _pushAtt(att){att.id=++_attSeq;_attachments.push(att);renderAttachChips();}
function removeAttachment(id){_attachments=_attachments.filter(a=>a.id!==id);renderAttachChips();}
function clearAttachments(){_attachments=[];renderAttachChips();}
function renderAttachChips(){
  const box=document.getElementById('attach-chips');if(!box)return;
  box.innerHTML=_attachments.map(a=>{
    const thumb=a.kind==='image'
      ?`<img src="data:${a.mediaType};base64,${a.data}" alt="">`
      :`<span class="att-ic">${a.kind==='pdf'?'📄':'📃'}</span>`;
    return `<div class="att-chip">${thumb}<div class="att-meta"><span class="att-name">${esc(a.name)}</span><span class="att-sz">${_fmtBytes(a.size)}</span></div><button class="att-x" onclick="removeAttachment(${a.id})" title="Remover" aria-label="Remover anexo">×</button></div>`;
  }).join('');
  if(!_running)setRunBtn(false);   // "Analisar" → "Enviar" quando há anexo
}
// Monta o conteúdo multimodal da API: blocos de mídia + texto. A mídia segue só neste turno.
function buildUserContent(query,atts){
  const blocks=[];
  for(const a of atts){
    if(a.kind==='image')blocks.push({type:'image',source:{type:'base64',media_type:a.mediaType,data:a.data}});
    else if(a.kind==='pdf')blocks.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:a.data}});
    else if(a.kind==='text')blocks.push({type:'text',text:`--- Documento anexado: "${a.name}" ---\n${a.data}\n--- fim de "${a.name}" ---`});
  }
  blocks.push({type:'text',text:query||('Analise o(s) anexo(s) acima no contexto de futebol / '+compLabel(_activeCompId)+'.')});
  return blocks;
}

// ─── Thinking ─────────────────────────────────────────────────────────────
function startThinking(){
  _thkStart=Date.now();_thkTokCount=0;_thkP1Toks=0;
  const effort=EFFORT_LEVELS[currentEffort];
  _thkEl=document.createElement('div');
  _thkEl.className='thk-compact';
  _thkEl.id='thk-compact';
  // Estrela Meridian animada, na paleta do tema ativo (não o ✳ genérico)
  _thkEl.innerHTML=`<span class="thk-star-wrap" aria-hidden="true">${brandStar('brand-star-spin')}</span><span class="thk-elapsed" id="thk-elapsed-val">0s</span><span class="thk-sep">·</span><span class="thk-toks" id="thk-tok-live">0 tokens</span><span class="thk-sep">·</span><span class="thk-lbl" id="thk-label">ainda pensando…</span>${effort.budget>0?`<span id="thk-effort-pill" class="thk-pill">✦ ${effort.label}</span>`:'<span id="thk-effort-pill" style="display:none"></span>'}`;
  document.getElementById('conversation').appendChild(_thkEl);
  scrollChat();
  _thkInterval=setInterval(()=>{
    const s=Math.floor((Date.now()-_thkStart)/1000);
    const ev=document.getElementById('thk-elapsed-val');const tl=document.getElementById('thk-tok-live');
    if(ev)ev.textContent=s+'s';if(tl)tl.textContent=fmt(_thkTokCount)+' tokens';
  },400);
}
function updateThinkingToks({inTokens=0,outTokens=0,thinkingTokens=0,status='',phase=2}){
  _thkTokCount=_thkP1Toks+inTokens+outTokens+thinkingTokens;
  // Anti-fantasma / cobertura: status vindo da coleta (Fontes: … · Cobertura: A …)
  let label;
  if(status&&(/Fontes:|Cobertura:/i.test(status)))label='[F1] '+(status.length>72?status.slice(0,70)+'…':status);
  else if(status&&/Coleta estruturada/i.test(status))label='[F1] coleta estruturada…';
  else if(phase===1)label=status&&status.length<48?'[F1] '+status:'[F1] pesquisando…';
  else if(status.includes('Raciocinando'))label='ainda pensando…';
  else if(status.includes('Pesquisando'))label='buscando dados…';
  else if(status.includes('Concluindo'))label='concluindo…';
  else label='analisando…';
  const lb=document.getElementById('thk-label');if(lb)lb.textContent=label;
}
function stopThinking(done=true){
  if(_thkInterval){clearInterval(_thkInterval);_thkInterval=null;}
  if(!_thkEl)return;
  const s=Math.floor((Date.now()-_thkStart)/1000);
  const ev=document.getElementById('thk-elapsed-val');const tl=document.getElementById('thk-tok-live');const lb=document.getElementById('thk-label');
  if(ev)ev.textContent=s+'s';if(tl)tl.textContent=fmt(_thkTokCount)+' tokens';
  if(done){if(lb)lb.textContent='concluído';setTimeout(()=>{if(_thkEl){_thkEl.remove();_thkEl=null;}},1000);}
  else{_thkEl.remove();_thkEl=null;}
}

// ─── Token bar ────────────────────────────────────────────────────────────
function updateTokenBar(){
  const ctx=MODEL_CTX[currentModel]||200000;
  const p1=Math.min(100,Math.round(tokenState.lastIn/ctx*100));
  const tot=tokenState.sessionIn+tokenState.sessionOut;
  const p2=Math.min(100,Math.round(tot/ctx*100));
  document.getElementById('tok-ctx-val').textContent=`${fmt(tokenState.lastIn)} / ${fmt(ctx)} (${p1}%)`;
  document.getElementById('tok-ctx-fill').style.width=p1+'%';
  document.getElementById('tok-session-val').textContent=`${fmt(tot)} tokens`;
  document.getElementById('tok-session-fill').style.width=p2+'%';
  document.getElementById('tok-model-footer').textContent=MODEL_SHORT[currentModel]||'';
  const n=tokenState.runs;
  document.getElementById('tok-runs-footer').textContent=`${n} análise${n!==1?'s':''}`;
  const ce=document.getElementById('tok-cache-footer');
  const _hasMiss=!!tokenState.lastCacheMissReason,_hasHit=tokenState.sessionCacheRead>0;
  if(_hasHit||_hasMiss){
    ce.style.color=_hasMiss?'#e8a53a':'var(--terra)';
    const _parts=[];
    if(_hasHit)_parts.push(`${fmt(tokenState.sessionCacheRead)} cache`);
    if(tokenState.lastCacheHitPct>0)_parts.push(`${tokenState.lastCacheHitPct}% hit`);
    if(tokenState.sessionCacheSaved>0.001)_parts.push(`-$${tokenState.sessionCacheSaved.toFixed(3)}`);
    if(_hasMiss){_parts.push(tokenState.lastCacheMissReason.replace('_changed','').replace('_',' '));ce.title='miss: '+tokenState.lastCacheMissReason;}
    else ce.title='';
    ce.textContent=(_hasMiss?'⚠':'⚡')+' '+_parts.join(' · ');
  }else{ce.textContent='';ce.title='';}
  document.getElementById('token-bar').style.display='block';
  updateSettingsTokens();
}

// ─── Clear ───────────────────────────────────────────────────────────────
function clearAll(){
  _chatThread=[];_pendingQuery='';
  clearAttachments();
  if(_currentView!=='chat')showView('chat');
  if(_running&&_abort){try{_abort.abort();}catch(e){}}
  document.getElementById('conversation').innerHTML='';
  document.getElementById('empty-state').style.display='block';
  renderEmptyStateFeatured();
  taReset(document.getElementById('match-input'));
  document.getElementById('error-box').style.display='none';
  if(_thkEl){_thkEl.remove();_thkEl=null;}
  if(_thkInterval){clearInterval(_thkInterval);_thkInterval=null;}
  setRunBtn(false);
}

/* export: js/export/report.js */
// ─── Tab navigation ──────────────────────────────────────────────────────
function showTab(cardId,tab){
  const card=document.getElementById('acard-'+cardId);
  if(!card)return;
  card.querySelectorAll('.a-tc').forEach(t=>t.style.display='none');
  card.querySelectorAll('.a-tab').forEach(t=>t.classList.remove('active'));
  const tc=document.getElementById(`at-${tab}-${cardId}`);if(tc)tc.style.display='block';
  // Resolve o botão por data-tab (robusto a qualquer nº de abas; cards antigos sem
  // data-tab caem no fallback por ordem).
  // Ordem canônica = PDF referência / Meridian v1 (7 abas fixas)
  const _order=(typeof ANALYSIS_TAB_ORDER!=='undefined'?ANALYSIS_TAB_ORDER.map(t=>t.id):['resumo','tatica','individual','cartoes','escanteios','escalacao','avancado']);
  const btn=card.querySelector(`.a-tab[data-tab="${tab}"]`)||card.querySelectorAll('.a-tab')[_order.indexOf(tab)];
  if(btn){
    btn.classList.add('active');
    const pill=card.querySelector('.a-tab-pill');
    if(pill){pill.style.left=btn.offsetLeft+'px';pill.style.width=btn.offsetWidth+'px';}
  }
}
function initTabPill(cardEl){
  const btn=cardEl.querySelector('.a-tab.active');
  const pill=cardEl.querySelector('.a-tab-pill');
  if(btn&&pill){pill.style.transition='none';pill.style.left=btn.offsetLeft+'px';pill.style.width=btn.offsetWidth+'px';requestAnimationFrame(()=>{pill.style.transition='';});}
}
function copyAnalysis(id){
  const c=document.getElementById('acard-'+id);
  copyToClipboard(c?c.innerText:'');
}

// ─── Right sidebar ────────────────────────────────────────────────────────
function updateRightSidebar(d,prob){
  const cM={alto:'b-ok',medio:'b-warn',baixo:'b-warn'};
  const cL={alto:'alta confiança',medio:'média confiança',baixo:'baixa confiança'};
  const rawHn=d.mandante?.nome||'Mandante',rawAn=d.visitante?.nome||'Visitante';
  const hn=esc(rawHn),an=esc(rawAn);
  const faseLbl=d.fase||(d.comp_id?compLabel(d.comp_id):compLabel(_activeCompId));

  // Match context — brasão canônico (teamBadge)
  document.getElementById('rs-match-card').innerHTML=`
    <div class="rs-fase">${esc(faseLbl)}</div>
    <div class="rs-teams-row">
      <div class="rs-team">${teamBadge(rawHn,38)}<span>${hn}</span></div>
      <div class="rs-vs">vs</div>
      <div class="rs-team">${teamBadge(rawAn,38)}<span>${an}</span></div>
    </div>
    ${d.data_hora?`<div class="rs-det">📅 ${esc(d.data_hora)}</div>`:''}
    ${d.sede?`<div class="rs-det">📍 ${esc(d.sede)}</div>`:''}
    ${d.grupo?`<div class="rs-det">🏆 Grupo ${esc(d.grupo)}</div>`:''}
    <span class="badge ${cM[d.confianca_geral]||'b-warn'}" style="margin-top:.5rem">${cL[d.confianca_geral]||esc(d.confianca_geral)}</span>`;
  document.getElementById('rs-match').style.display='block';

  // Insights
  if(d.eventos_provaveis?.length){
    document.getElementById('rs-insights-list').innerHTML=d.eventos_provaveis.slice(0,4).map(e=>`
      <div class="rs-insight"><div class="rs-ins-dot"></div><div>${esc(e.evento)} — <strong>${Math.round((e.probabilidade||0)*100)}%</strong></div></div>`).join('');
    document.getElementById('rs-insights').style.display='block';
  }

  // Stats
  const hxg=d.mandante?.xg_marcado??'—',axg=d.visitante?.xg_marcado??'—';
  const hr=teamTablePos(d.mandante),ar=teamTablePos(d.visitante);
  const ph=Math.round(prob.home*100),pa=Math.round(prob.away*100);
  document.getElementById('rs-stats-list').innerHTML=`
    <div class="rs-sh"><span>${hn.split(' ')[0]}</span><span>${an.split(' ')[0]}</span></div>
    <div class="rs-srow"><span class="rs-sv-l">${ph}%</span><span class="rs-slbl">Vitória</span><span class="rs-sv-r">${pa}%</span></div>
    <div class="rs-sbar"><div class="rs-bh" data-w="${ph}" style="width:0%;transition:width .9s cubic-bezier(.22,.61,.36,1)"></div><div class="rs-ba" data-w="${pa}" style="width:0%;transition:width .9s cubic-bezier(.22,.61,.36,1)"></div></div>
    <div class="rs-srow"><span class="rs-sv-l">${hxg}</span><span class="rs-slbl">xG marcado</span><span class="rs-sv-r">${axg}</span></div>
    <div class="rs-srow"><span class="rs-sv-l">${d.mandante?.xg_sofrido??'—'}</span><span class="rs-slbl">xG sofrido</span><span class="rs-sv-r">${d.visitante?.xg_sofrido??'—'}</span></div>
    <div class="rs-srow"><span class="rs-sv-l">${hr}</span><span class="rs-slbl">Posição na tabela</span><span class="rs-sv-r">${ar}</span></div>`;
  document.getElementById('rs-stats').style.display='block';
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{
    document.querySelectorAll('.rs-bh[data-w],.rs-ba[data-w]').forEach(b=>b.style.width=b.dataset.w+'%');
  });});
}

/* history → js/data/history.js */

/* render cards → js/analysis/render.js */

// ─── Temporal helpers ────────────────────────────────────────────────────
// (seasonYearCalendar / seasonYearEuropean / compSeasonLabel ficam junto de COMPETITIONS)
function offsetDate(n){const d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});}
function currentDateFull(){return new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function dateLabelFromISO(iso){
  if(!iso)return'outros';
  const today=new Date();today.setHours(0,0,0,0);
  const d=new Date(iso+'T12:00:00');d.setHours(0,0,0,0);
  const diff=Math.round((d-today)/864e5);
  if(diff===0)return'hoje';if(diff===1)return'amanhã';if(diff===-1)return'ontem';
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
}
function formatDateBR(iso){if(!iso)return'';const[y,m,dd]=iso.split('-');return`${dd}/${m}/${y}`;}
// Temporada “atual” legível para prompts (liga ativa)
function currentSeasonPhrase(id){
  id=id||_activeCompId;
  const lab=compSeasonLabel(id);
  return getComp(id).calendar==='european'?`temporada ${lab}`:`temporada ${lab}`;
}

// ─── System prompt ────────────────────────────────────────────────────────
/* prompts: getSystemPrompt → js/analysis/prompts.js */

/* schedule → js/data/schedule.js */

/* AF/FD → js/data/football-apis.js */

/* ESPN core → js/data/espn.js */
function fillMatch(i){
  const j=_schedule[i];if(!j)return;
  // Contexto de ANÁLISE = liga do jogo. Não altera seletor de Estatísticas nem Biblioteca.
  if(j.comp_id&&COMPETITIONS[j.comp_id])setAnalysisComp(j.comp_id);
  if(_currentView==='library')showView('chat');
  // Prompt VISÍVEL curto e humano — as diretrizes de pesquisa (forma, lesões, escalação,
  // xG, tickets) já vivem nos prompts do pipeline (Fase 1/Fase 2) e valem para toda
  // análise; repeti-las aqui só poluía a caixa e sugeria que o pedido limitava a análise.
  // O contexto do jogo (fase/data/sede) segue numa linha compacta: ancora a busca.
  const dLabel=j.data_iso?formatDateBR(j.data_iso):'';
  const meta=[compLabel(j.comp_id||_activeCompId),j.fase&&j.fase!==compLabel(j.comp_id||_activeCompId)?j.fase:'',j.grupo?`Grupo ${j.grupo}`:'',dLabel?(j.hora_brt?`${dLabel} às ${j.hora_brt} BRT`:dLabel):'',j.sede||''].filter(Boolean).join(' · ');
  const ta=document.getElementById('match-input');
  ta.value=`Análise do jogo (${compLabel(j.comp_id||_activeCompId)}): ${j.mandante} × ${j.visitante}\n(${meta})`;
  ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,220)+'px';ta.focus();
}
// ─── Mobile sidebar ───────────────────────────────────────────────────────
function toggleSidebar(){
  const sb=document.getElementById('l-sb');
  const bd=document.getElementById('sb-backdrop');
  const open=sb.classList.toggle('open');
  bd.classList.toggle('open',open);
}
function closeSidebar(){
  const sb=document.getElementById('l-sb');
  const bd=document.getElementById('sb-backdrop');
  sb.classList.remove('open');
  bd.classList.remove('open');
}

// ─── Right sidebar featured sections (empty state) ────────────────────────
/* featured → js/ui/featured.js */

/* library → js/ui/library.js */

const KEY_STORE='brsa_api_key';
// Modo economia (padrão): chamadas de IA automáticas desligadas; créditos só nas análises pedidas
const AUTO_AI_STORE='brsa_auto_ai';
function autoAiEnabled(){try{return localStorage.getItem(AUTO_AI_STORE)==='1';}catch{return false;}}
function setAutoAi(on){try{localStorage.setItem(AUTO_AI_STORE,on?'1':'0');}catch{}if(on){loadTournamentCtx(true);}}
// Filtragem dinâmica (experimental, opt-in): Fase 1 no Sonnet + web_search_20260209.
const DYN_SEARCH_STORE='brsa_dynsearch';
function getDynSearch(){try{return localStorage.getItem(DYN_SEARCH_STORE)==='1';}catch{return false;}}
function setDynSearch(on){try{localStorage.setItem(DYN_SEARCH_STORE,on?'1':'0');}catch{}}
let _keyDebounce=null;
document.getElementById('api-key-input').addEventListener('input',function(){
  clearTimeout(_keyDebounce);
  const v=this.value.trim();
  try{if(v)sessionStorage.setItem(KEY_STORE,v);else sessionStorage.removeItem(KEY_STORE);}catch(e){}
  if(v.startsWith('sk-ant-')&&v.length>30)_keyDebounce=setTimeout(()=>{loadSchedule();loadTournamentCtx();},800);
});
document.getElementById('api-key-input').addEventListener('blur',function(){
  clearTimeout(_keyDebounce);
  const v=this.value.trim();
  if(v.startsWith('sk-ant-')&&v.length>30){loadSchedule();loadTournamentCtx();}
});

// Restaura a API Key salva nesta aba (sessionStorage — apagada ao fechar)
(function restoreApiKey(){
  let saved='';try{saved=sessionStorage.getItem(KEY_STORE)||'';}catch(e){}
  if(saved){
    document.getElementById('api-key-input').value=saved;
    if(saved.startsWith('sk-ant-')&&saved.length>30){loadSchedule();loadTournamentCtx();}
  }
})();
// Restaura o contexto adicional da conversa salvo (localStorage)
loadChatContext();

// ── Modo desempenho: desliga backdrop-filter/blobs animados (custo de compositing
// caro) quando o dispositivo não aguenta, mesmo com GPU dedicada — se a aceleração
// de hardware do navegador estiver limitada, tudo cai pra rasterização por CPU. ──
const PERF_MODE_STORE='brsa_perf_mode'; // 'on'|'off' — só existe se o usuário escolheu manualmente
function applyPerfMode(on){
  document.body.classList.toggle('wc-lite',!!on);
  const cb=document.getElementById('perf-mode-toggle');if(cb)cb.checked=!!on;
}
function getPerfModePref(){try{return localStorage.getItem(PERF_MODE_STORE);}catch{return null;}}
function setPerfMode(on){
  try{localStorage.setItem(PERF_MODE_STORE,on?'on':'off');}catch{}
  applyPerfMode(on);
  const hint=document.getElementById('perf-mode-hint');
  if(hint)hint.innerHTML='Desliga o desfoque de fundo (blur/vidro fosco) e as animações decorativas — deixa a interface mais leve para computadores que engasgam. Ativado manualmente.';
}
// Amostra o FPS real por ~1,2s e liga o modo leve se ficar abaixo do limiar. O custo do
// backdrop-filter escala com a ÁREA renderizada (ele reamostra o fundo inteiro do painel
// a cada frame) — então uma janela pequena pode passar no teste e, ao maximizar/entrar em
// tela cheia, os painéis ficam bem maiores e o mesmo dispositivo já não aguenta mais.
// Detecta tanto FPS médio baixo quanto ENGASGOS pontuais (stutter): um travamento a
// cada 1-2s pode não derrubar a média (ex.: 58fps médio ainda "parece" ok no cálculo),
// mas é exatamente o que o olho humano percebe como "não fluido". Por isso mede também
// o maior intervalo entre frames e quantos frames excederam um salto perceptível.
function _measurePerfAndApply(){
  if(getPerfModePref()!==null)return; // usuário já escolheu explicitamente: nunca remede
  if(document.body.classList.contains('wc-lite'))return; // já está no modo leve, nada a fazer
  let frames=0,start=null,last=null,maxDelta=0,jankFrames=0;
  function tick(ts){
    if(start===null){start=ts;last=ts;}
    const delta=ts-last;last=ts;
    if(delta>maxDelta)maxDelta=delta;
    if(delta>80)jankFrames++; // >80ms entre frames = engasgo visível (equivalente a <12,5fps naquele instante)
    frames++;
    if(ts-start<2000){requestAnimationFrame(tick);return;}
    const fps=frames/((ts-start)/1000);
    if(fps<45||maxDelta>150||jankFrames>=3){
      applyPerfMode(true);
      const hint=document.getElementById('perf-mode-hint');
      if(hint)hint.innerHTML=`Ativado automaticamente: detectamos baixo desempenho neste dispositivo (${fps.toFixed(0)}fps médio, maior engasgo de ${Math.round(maxDelta)}ms). Desmarque para forçar os efeitos visuais completos.`;
    }
  }
  requestAnimationFrame(tick);
}
// Detecção instantânea e definitiva: pergunta ao WebGL qual "GPU" o navegador está
// de fato usando para compositar a página. Quando a aceleração de hardware está
// desligada/quebrada (driver incompatível, política do Windows etc.), o navegador cai
// pra um renderizador por software — string do tipo "Microsoft Basic Render Driver",
// "SwiftShader", "llvmpipe" ou "Software Rasterizer" no lugar do nome da GPU real
// (ex.: "NVIDIA GeForce RTX 2060"). Isso elimina a ambiguidade da amostragem de FPS:
// não precisa medir nada, o navegador já entrega a resposta.
function _isSoftwareRenderer(){
  try{
    const c=document.createElement('canvas');
    const gl=c.getContext('webgl')||c.getContext('experimental-webgl');
    if(!gl)return false;
    const dbg=gl.getExtension('WEBGL_debug_renderer_info');
    const renderer=(dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER))||'';
    return /swiftshader|llvmpipe|basic render|software rasterizer|software renderer|\bwarp\b/i.test(renderer);
  }catch(e){return false;}
}
(function initPerfMode(){
  const pref=getPerfModePref();
  if(pref==='on'||pref==='off'){applyPerfMode(pref==='on');return;} // escolha explícita do usuário: respeita e não remede
  if(_isSoftwareRenderer()){
    applyPerfMode(true);
    const hint=document.getElementById('perf-mode-hint');
    if(hint)hint.innerHTML='Ativado automaticamente: este navegador está renderizando por software (sem aceleração de GPU) — o desfoque de fundo fica muito pesado nesse modo. Desmarque para forçar os efeitos visuais completos (não recomendado nesse caso).';
    return; // já resolvido, não precisa da amostragem de FPS
  }
  setTimeout(_measurePerfAndApply,800);
  // Remede ao redimensionar/maximizar/entrar em tela cheia (debounced): a janela pode
  // crescer bastante depois do load inicial, mudando o custo real de compositing.
  let _rz=null;
  const _reMeasure=()=>{clearTimeout(_rz);_rz=setTimeout(_measurePerfAndApply,600);};
  window.addEventListener('resize',_reMeasure);
  document.addEventListener('fullscreenchange',_reMeasure);
  // Remede periodicamente em segundo plano (a cada 25s): pega degradação que só aparece
  // durante uso real (scroll, digitação, animações concorrentes), não só no load/resize.
  setInterval(_measurePerfAndApply,25000);
})();

// ─── Data API key listeners ───────────────────────────────────────────────
(function initDataKeys(){
  // API-Football
  const afInp=document.getElementById('af-key-input');
  const afSaved=localStorage.getItem(AF_KEY_STORE)||'';
  if(afSaved){afInp.value=afSaved;setTimeout(loadAfData,200);}else{updateAfStatus('','não configurado');}
  let _afDeb=null;
  afInp.addEventListener('input',function(){
    clearTimeout(_afDeb);
    const v=this.value.trim();
    try{if(v)localStorage.setItem(AF_KEY_STORE,v);else localStorage.removeItem(AF_KEY_STORE);}catch{}
    _afDeb=setTimeout(loadAfData,800);
  });
  afInp.addEventListener('blur',function(){
    clearTimeout(_afDeb);
    const v=this.value.trim();
    if(v)loadAfData();
  });
  // football-data.org
  const fdInp=document.getElementById('fd-key-input');
  const saved=localStorage.getItem(FD_KEY_STORE)||'';
  if(saved){fdInp.value=saved;setTimeout(loadFdData,200);}else{updateFdStatus('','não configurado');}
  let _fdDeb=null;
  fdInp.addEventListener('input',function(){
    clearTimeout(_fdDeb);
    const v=this.value.trim();
    try{if(v)localStorage.setItem(FD_KEY_STORE,v);else localStorage.removeItem(FD_KEY_STORE);}catch{}
    _fdDeb=setTimeout(loadFdData,800);
  });
  fdInp.addEventListener('blur',function(){
    clearTimeout(_fdDeb);
    const v=this.value.trim();
    if(v)loadFdData();
  });
  // StatsBomb
  const sbInp=document.getElementById('sb-key-input');
  const sbSaved=localStorage.getItem(SB_KEY_STORE)||'';
  if(sbSaved){sbInp.value=sbSaved;document.getElementById('sb-status').textContent='configurado';document.getElementById('sb-status').className='ds-status ok';}
  sbInp.addEventListener('change',function(){
    const v=this.value.trim();
    try{if(v)localStorage.setItem(SB_KEY_STORE,v);else localStorage.removeItem(SB_KEY_STORE);}catch{}
    const st=document.getElementById('sb-status');if(v){st.textContent='configurado';st.className='ds-status ok';}else{st.textContent='não configurado';st.className='ds-status';}
  });
  // Opta
  const opInp=document.getElementById('op-key-input');
  const opSaved=localStorage.getItem(OP_KEY_STORE)||'';
  if(opSaved){opInp.value=opSaved;document.getElementById('op-status').textContent='configurado';document.getElementById('op-status').className='ds-status ok';}
  opInp.addEventListener('change',function(){
    const v=this.value.trim();
    try{if(v)localStorage.setItem(OP_KEY_STORE,v);else localStorage.removeItem(OP_KEY_STORE);}catch{}
    const st=document.getElementById('op-status');if(v){st.textContent='configurado';st.className='ds-status ok';}else{st.textContent='não configurado';st.className='ds-status';}
  });
})();

// Carrega o histórico persistido (localStorage) e popula a lista de Análises Recentes
// Textarea: Enter=nova linha (paragrafar); enviar só pelo botão ou Ctrl/Cmd+Enter.
function taReset(ta){ta.value='';ta.style.height='';ta.rows=1;}
(function(){
  const ta=document.getElementById('match-input');
  function taGrow(){ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,220)+'px';}
  ta.addEventListener('input',function(){taGrow();if(!_running)setRunBtn(false);});
  ta.addEventListener('keydown',function(e){
    // Enter paragrafa (comportamento padrão do textarea). Envia só com Ctrl/Cmd+Enter.
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();if(!_running)toggleRun();}
  });
  // Colar imagem direto (Ctrl+V de print de escalação/formação)
  ta.addEventListener('paste',function(e){
    const items=e.clipboardData&&e.clipboardData.items;if(!items)return;
    let handled=false;
    for(const it of items){if(it.kind==='file'&&/^image\//.test(it.type)){const f=it.getAsFile();if(f){addAttachment(f);handled=true;}}}
    if(handled)e.preventDefault();
  });
})();

/* live panel → js/data/live.js */
/* ESPN news → js/data/espn.js */

loadHistory();renderRecentAnalyses();renderSidebarHistory();maybeShowWelcome();applyStoredTheme();applyLang();
try{initAgentContextMenu();}catch(e){try{console.warn('[initAgentContextMenu]',e);}catch{}}
// re-bind se o DOM do menu chegar depois (PWA / cache parcial)
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){try{initAgentContextMenu();}catch{}});
}else{
  setTimeout(function(){try{initAgentContextMenu();}catch{}},0);
}
document.addEventListener('click',e=>{if(!e.target.closest('.sel-pop')&&!e.target.closest('.i-sel-btn'))closeSelPops();});
// ESPN não requer chave — carrega standings/agenda e notícias imediatamente
setTimeout(()=>{_loadAllCompSchedCache();loadSchedule(false);if(typeof loadNews==='function')loadNews();},200);

/* pipeline → js/analysis/pipeline.js */
