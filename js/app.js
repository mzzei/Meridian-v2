// ─── Constants ───────────────────────────────────────────────────────────
const MODEL_CTX   = {'claude-haiku-4-5-20251001':200000,'claude-sonnet-4-6':200000,'claude-opus-4-8':200000};
const MODEL_SHORT = {'claude-haiku-4-5-20251001':'Haiku 4.5','claude-sonnet-4-6':'Sonnet 4.6','claude-opus-4-8':'Opus 4.8'};
const EFFORT_LEVELS = [
  {label:'Padrão',budget:0},{label:'Leve',budget:2000},{label:'Médio',budget:5000},
  {label:'Alto',budget:10000},{label:'Máximo',budget:16000}
];
// Buscas web por nível de esforço (Padrão→Máximo). web_search ingere o conteúdo das
// páginas como tokens — é o maior gasto e NÃO é raciocínio. Escala com o esforço para
// manter o consumo congruente: a profundidade vem do thinking budget acima, não da coleta.
const EFFORT_SEARCHES = [1,1,2,3,3];
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

// ─── State ───────────────────────────────────────────────────────────────
let currentModel  = 'claude-sonnet-4-6';
let currentEffort = 0;
let _lastAnalysisId = null;
let _lastChatId     = null;
let _schedule     = []; // união (próximos) de todos os campeonatos — chips / destaque
let _schedByComp  = {}; // { [compId]: jogo[] } — agendas por campeonato
let _cardCount    = 0;
let _history      = [];
// ── Multi-campeonato ─────────────────────────────────────────────────────
// Vários campeonatos rodam em paralelo: cada um tem agenda/cache/logo próprios.
// Biblioteca: cards de campeonato → jogos do card aberto.
// Análise: o jogo carrega comp_id; prompts usam o rótulo da competição.
// calendar:
//   'year'      — temporada = ano civil (Brasileirão, Libertadores): 2026 → "2026"
//   'european'  — ago–mai; API usa ano de início; UI mostra "2025/26"
// season NÃO é hardcoded: calculada em runtime por seasonYearFor / compSeasonLabel
const COMPETITIONS = {
  brsa: {
    id:'brsa', name:'Brasileirão Série A', short:'Série A', country:'Brasil',
    calendar:'year', kind:'league',
    espn:'bra.1', af:71, fd:'BSA', tsdb:4351,
    logo:'https://a.espncdn.com/i/leaguelogos/soccer/500/85.png',
    labelDefault:'Brasileirão Série A'
  },
  libertadores: {
    id:'libertadores', name:'CONMEBOL Libertadores', short:'Libertadores', country:'CONMEBOL',
    calendar:'year', kind:'cup',
    espn:'conmebol.libertadores', af:13, fd:'CLI', tsdb:null,
    logo:'https://a.espncdn.com/i/leaguelogos/soccer/500/58.png',
    labelDefault:'Libertadores'
  },
  epl: {
    id:'epl', name:'Premier League', short:'EPL', country:'Inglaterra',
    calendar:'european', kind:'league',
    espn:'eng.1', af:39, fd:'PL', tsdb:null,
    logo:'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
    labelDefault:'Premier League'
  },
  laliga: {
    id:'laliga', name:'LaLiga', short:'LaLiga', country:'Espanha',
    calendar:'european', kind:'league',
    espn:'esp.1', af:140, fd:'PD', tsdb:null,
    logo:'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png',
    labelDefault:'LaLiga'
  },
  ucl: {
    id:'ucl', name:'UEFA Champions League', short:'UCL', country:'UEFA',
    calendar:'european', kind:'cup',
    espn:'uefa.champions', af:2, fd:'CL', tsdb:null,
    logo:'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png',
    labelDefault:'Champions League'
  }
};
const COMP_ORDER = ['brsa','libertadores','epl','laliga','ucl'];
const COMP_ACTIVE_STORE = 'meridian_active_comp';
const COMP_SCHED_STORE  = 'meridian_sched_by_comp_v2'; // v2: fase só rodada estruturada (não nome de jogo)

// Faixas EXATAS por competição (sanity-check de números / anti-alucinação)
// leagueGames = jogos de liga por clube na temporada regular; maxPlayer* = tetos plausíveis
const COMP_SANITY = {
  brsa: {
    kind:'league', teams:20, leagueGames:38,
    maxPlayerLeagueGames:38, maxPlayerAllComps:55,
    goalsTopMin:10, goalsTopMax:25, goalsAbsurd:40,
    format:'pontos corridos · 20 clubes · 38 rodadas (turno e returno)',
    extraTimeDefault:false
  },
  epl: {
    kind:'league', teams:20, leagueGames:38,
    maxPlayerLeagueGames:38, maxPlayerAllComps:55,
    goalsTopMin:10, goalsTopMax:25, goalsAbsurd:40,
    format:'pontos corridos · 20 clubes · 38 rodadas',
    extraTimeDefault:false
  },
  laliga: {
    kind:'league', teams:20, leagueGames:38,
    maxPlayerLeagueGames:38, maxPlayerAllComps:55,
    goalsTopMin:10, goalsTopMax:30, goalsAbsurd:45,
    format:'pontos corridos · 20 clubes · 38 rodadas',
    extraTimeDefault:false
  },
  libertadores: {
    kind:'cup', teams:null, leagueGames:null,
    maxPlayerCompGames:17, maxPlayerAllComps:60,
    goalsTopMin:5, goalsTopMax:15, goalsAbsurd:25,
    format:'grupos + mata-mata (ida/volta em várias fases) · ~6–17 jogos por clube no torneio',
    extraTimeDefault:true
  },
  ucl: {
    kind:'cup', teams:null, leagueGames:null,
    maxPlayerCompGames:17, maxPlayerAllComps:60,
    goalsTopMin:5, goalsTopMax:15, goalsAbsurd:25,
    format:'fase liga/grupos + mata-mata · ~6–17 jogos por clube na UCL da temporada',
    extraTimeDefault:true
  }
};
function compSanity(id){return COMP_SANITY[id||_activeCompId]||COMP_SANITY.brsa;}

/**
 * Contextos de competição — independentes por desenho:
 *  analysis (_activeCompId) → prompts do agente, AF/FD, ESPN “ativa”, fillMatch
 *  stats    (_statsCompId)  → seletor Estatísticas + clubes/próximos da sidebar
 *  library  (_libCompId)    → drill-down da Biblioteca (null = grade de cards)
 *
 * Um clique em chip/jogo NÃO deve mudar o seletor de Estatísticas.
 * Abrir uma liga na Biblioteca NÃO deve resetar o seletor de Estatísticas.
 */
let _activeCompId = (()=>{try{const v=localStorage.getItem(COMP_ACTIVE_STORE);return (v&&COMPETITIONS[v])?v:'brsa';}catch{return'brsa';}})();
let _statsCompId = _activeCompId;
let _libCompId = null;
let _compStatus = {}; // { loading, checked, upcoming, total, soon, error, roundLabel }

function getComp(id){return COMPETITIONS[id||_activeCompId]||COMPETITIONS.brsa;}
function analysisCompId(){return _activeCompId;}
function statsCompId(){return _statsCompId||_activeCompId;}
function libraryCompId(){return _libCompId;}

/** Só o contexto de análise do agente. Sem tocar stats/library por padrão. */
function setAnalysisComp(id, opts){
  opts=opts||{};
  if(!COMPETITIONS[id])return false;
  const changed=_activeCompId!==id;
  _activeCompId=id;
  try{localStorage.setItem(COMP_ACTIVE_STORE,id);}catch{}
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
  // id null = volta à grade
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
let _featuredPaintGen=0;
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
  _statsCompId=id;
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

function espnBase(id){return 'https://site.api.espn.com/apis/site/v2/sports/soccer/'+getComp(id).espn;}
function espnStandingsUrl(id){return 'https://site.api.espn.com/apis/v2/sports/soccer/'+getComp(id).espn+'/standings';}
function afLeague(id){return getComp(id).af;}
function fdCode(id){return getComp(id).fd;}
function compLabel(id){return getComp(id).labelDefault||getComp(id).name;}
// ── Concepção de tempo de temporada (reusa “agora” real; sem ano fixo no config) ──
// Calendário civil (BR/CONMEBOL): o ano da temporada = ano corrente.
// Europeu (ago–mai): a temporada é rotulada pelo ANO DE INÍCIO.
//   • ago–dez → temporada começa neste ano (ex.: set/2025 → 2025/26)
//   • jan–jul → ainda na temporada do ano anterior (ex.: jul/2026 → 2025/26)
// API-Football / football-data usam o ano de início; a UI mostra o rótulo legível.
function seasonYearCalendar(d){d=d||new Date();return d.getFullYear();}
function seasonYearEuropean(d){
  d=d||new Date();
  const y=d.getFullYear(), m=d.getMonth()+1; // 1–12
  return m>=8?y:y-1; // ago–jul
}
function seasonYearFor(id,d){
  const c=getComp(id);
  return (c.calendar==='european')?seasonYearEuropean(d):seasonYearCalendar(d);
}
function compSeasonLabel(id,d){
  const c=getComp(id);
  if(c.calendar==='european'){
    const y=seasonYearEuropean(d);
    return y+'/'+String(y+1).slice(-2); // "2025/26"
  }
  return String(seasonYearCalendar(d));
}
function afSeason(id){return seasonYearFor(id);} // API: ano de início / civil
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
// Storage por app (não só por liga) + chaves legadas brsa_*
const HIST_KEY    = 'meridian_history_v1';
const SCHED_STORE = 'meridian_sched_union_v1';
const SCHED_TTL   = 24 * 60 * 60 * 1000;
const CTX_STORE   = 'meridian_ctx_v1';
const CTX_TTL     = 12 * 60 * 60 * 1000;
const ESPN_TTL    = 15 * 60 * 1000;
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
let ESPN_BASE = espnBase(_activeCompId);
const tokenState  = {sessionIn:0,sessionOut:0,sessionIn_p1:0,sessionOut_p1:0,lastIn:0,lastOut:0,runs:0,lastCacheCreated:0,lastCacheRead:0,sessionCacheRead:0,sessionCacheSaved:0,lastCacheHitPct:0,lastCacheMissReason:null};
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
let _running      = false, _abort = null, _pendingQuery = '';
let _currentView  = 'chat';
let _libFilter    = 'todos';
let _chatThread   = [];
let currentLang   = (()=>{try{return localStorage.getItem('brsa_lang')||'pt';}catch{return'pt';}})();

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
let _skipNextUserBubble=false;  // reenvio após popup (evita bolha duplicada)
let _skipVagueGateOnce=false;   // após o usuário escolher no popup, não reabre o gate
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
let currentTheme=(()=>{try{const v=localStorage.getItem(THEME_STORE);return THEME_IDS.includes(v)?v:'aurora';}catch{return'aurora';}})();
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
let _attachments=[],_attSeq=0;
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
  const label=phase===1?'[F1] pesquisando…':status.includes('Raciocinando')?'ainda pensando…':status.includes('Pesquisando')?'buscando dados…':status.includes('Concluindo')?'concluindo…':'analisando…';
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

function _loadSchedCache(){
  try{const raw=localStorage.getItem(SCHED_STORE);if(!raw)return null;const c=JSON.parse(raw);return(c&&Array.isArray(c.jogos))?c:null;}catch{return null;}
}
function _saveSchedCache(jogos){
  try{localStorage.setItem(SCHED_STORE,JSON.stringify({fetched_at:Date.now(),jogos}));}catch(e){}
}
// Jogos confirmados que as fontes dinâmicas (ESPN/IA) às vezes omitem — garantidos no calendário
const KNOWN_FIXTURES=[]; // fixtures extras opcionais (vazio = só APIs)
function _tagComp(jogos,compId){
  return(Array.isArray(jogos)?jogos:[]).map(j=>({...j,comp_id:j.comp_id||compId,fase:j.fase||compLabel(compId)}));
}
function _saveCompSched(compId,jogos){
  _schedByComp[compId]=_tagComp(jogos,compId);
  try{
    const raw=JSON.parse(localStorage.getItem(COMP_SCHED_STORE)||'{}');
    raw[compId]={fetched_at:Date.now(),jogos:_schedByComp[compId]};
    localStorage.setItem(COMP_SCHED_STORE,JSON.stringify(raw));
  }catch{}
}
function _loadAllCompSchedCache(){
  try{
    const raw=JSON.parse(localStorage.getItem(COMP_SCHED_STORE)||'{}');
    Object.keys(raw||{}).forEach(id=>{
      if(COMPETITIONS[id]&&Array.isArray(raw[id]?.jogos))_schedByComp[id]=raw[id].jogos;
    });
  }catch{}
}
function _rebuildUnionSchedule(){
  // União de TODOS os campeonatos (sem priorizar liga ativa) — chips usam os + próximos no tempo
  const all=[];
  COMP_ORDER.forEach(id=>{
    (_schedByComp[id]||[]).forEach(j=>all.push({...j,comp_id:j.comp_id||id}));
  });
  // ordena por kickoff real (data + hora BRT), não só data civil / ordem de liga
  all.sort((a,b)=>{
    const da=_kickMs(a),db=_kickMs(b);
    if(da!==db)return da-db;
    return (a.data_iso||'').localeCompare(b.data_iso||'')||(a.hora_brt||'').localeCompare(b.hora_brt||'');
  });
  _schedule=all;
  try{localStorage.setItem(SCHED_STORE,JSON.stringify({fetched_at:Date.now(),jogos:all}));}catch{}
  return all;
}
function _compLogo(id){
  const c=getComp(id);
  return c.logo?`<img class="lib-comp-logo" src="${c.logo}" alt="${esc(c.name)}" loading="lazy" onerror="this.style.visibility='hidden'">`:'<span style="font-size:28px">🏆</span>';
}

function _mergeKnownFixtures(jogos){
  jogos=Array.isArray(jogos)?jogos.slice():[];
  const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  const key=j=>[norm(j.mandante),norm(j.visitante)].sort().join('|')+'@'+(j.data_iso||'');
  const seen=new Set(jogos.map(key));
  KNOWN_FIXTURES.forEach(f=>{if(!seen.has(key(f))){jogos.push({...f});seen.add(key(f));}});
  return jogos;
}
function loadSchedule(force){
  // Multi-campeonato: carrega TODAS as ligas em paralelo via ESPN (grátis).
  // AF/FD (se chave) enriquecem o campeonato ativo.
  _loadAllCompSchedCache();
  if(!force&&Object.keys(_schedByComp).length){
    _rebuildUnionSchedule();
    renderScheduleChips(_schedule);
    if(_currentView==='library')renderLibrary();
    scheduleFeaturedPaint();
  }
  loadAllCompetitions(!!force);
  if(getAfKey()){
    if(force){try{localStorage.removeItem('brsa_af_fixtures_v1');localStorage.removeItem('meridian_af_fixtures_'+_activeCompId);}catch{}}
    loadAfData();
  }else if(getFdKey()){
    loadFdData();
  }
}
async function loadAllCompetitions(force){
  const espnEl=document.getElementById('espn-status');
  if(espnEl){espnEl.textContent='verificando…';espnEl.className='ds-status';}
  COMP_ORDER.forEach(id=>_setCompStatus(id,{loading:true}));
  // Verifica automaticamente a disponibilidade de jogos de TODOS os campeonatos
  const results=await Promise.all(COMP_ORDER.map(id=>loadEspnComp(id,force).catch(e=>{
    _setCompStatus(id,{loading:false,checked:true,error:String(e&&e.message||'falha'),soon:false});
    return{id,ok:false,err:e};
  })));
  const okN=results.filter(r=>r&&r.ok).length;
  const soonN=results.filter(r=>r&&r.soon).length;
  if(espnEl){
    espnEl.textContent=okN?`ativo · ${okN}/${COMP_ORDER.length}${soonN?` · ${soonN} em breve`:''}`:(soonN===COMP_ORDER.length?'em breve':(_espnLastError||'indisponível'));
    espnEl.className='ds-status '+(okN||soonN?'ok':'err');
  }
  _rebuildUnionSchedule();
  renderScheduleChips(_schedule);
  if(_currentView==='library')renderLibrary();
  scheduleFeaturedPaint();
}
function _countUpcoming(jogos){
  const today=new Date();today.setHours(0,0,0,0);
  return(Array.isArray(jogos)?jogos:[]).filter(j=>{
    if(!j)return false;
    const st=(typeof _matchState==='function')?_matchState(j).state:null;
    if(st==='live'||st==='upcoming')return true;
    if(!j.data_iso)return true;
    return new Date(j.data_iso+'T12:00:00')>=today;
  }).length;
}
function _setCompStatus(compId,patch){
  _compStatus[compId]=Object.assign({loading:false,checked:false,upcoming:0,total:0,soon:false,error:''},_compStatus[compId]||{},patch);
}
async function loadEspnComp(compId,force){
  const c=getComp(compId);
  if(!c||!c.espn){_setCompStatus(compId,{checked:true,soon:true,error:'sem fonte'});return{id:compId,ok:false};}
  _setCompStatus(compId,{loading:true,error:''});
  // cache fresco?
  if(!force){
    try{
      const raw=JSON.parse(localStorage.getItem(COMP_SCHED_STORE)||'{}');
      const ent=raw[compId];
      if(ent&&Array.isArray(ent.jogos)&&ent.fetched_at&&Date.now()-ent.fetched_at<ESPN_TTL){
        _schedByComp[compId]=ent.jogos;
        const up=_countUpcoming(ent.jogos);
        // soon só se já verificamos e não há NENHUM jogo no cache
        _setCompStatus(compId,{loading:false,checked:true,upcoming:up,total:ent.jogos.length,soon:!ent.jogos.length});
        return{id:compId,ok:!!ent.jogos.length,cached:true};
      }
    }catch{}
  }
  // Janela ampla: 30 dias atrás + 60 à frente — detecta temporada inativa vs sem jogos próximos
  const from=new Date(Date.now()-30*864e5);const to=new Date(Date.now()+60*864e5);
  const ymd=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const url=`${espnBase(compId)}/scoreboard?dates=${ymd(from)}-${ymd(to)}&limit=100`;
  const cacheKey=`meridian_espn_${compId}_${ymd(from)}_${ymd(to)}`;
  let sb=null;
  try{sb=await fetchEspn(url,cacheKey,ESPN_TTL);}catch(e){_setCompStatus(compId,{loading:false,checked:true,error:String(e&&e.message||'falha'),soon:false});return{id:compId,ok:false,err:e};}
  // sb null = falha de rede (não é "em breve")
  if(sb==null){
    _setCompStatus(compId,{loading:false,checked:true,error:_espnLastError||'indisponível',soon:false});
    return{id:compId,ok:false};
  }
  const events=(sb&&sb.events)||[];
  const jogos=espnScoreboardToSchedule(sb,compId);
  if(jogos.length)_saveCompSched(compId,jogos);
  else{_schedByComp[compId]=[];try{
    const raw=JSON.parse(localStorage.getItem(COMP_SCHED_STORE)||'{}');
    raw[compId]={fetched_at:Date.now(),jogos:[]};
    localStorage.setItem(COMP_SCHED_STORE,JSON.stringify(raw));
  }catch{}}
  const up=_countUpcoming(jogos);
  // Sem eventos na janela ampla → competição ainda não começou / hiato → "Em breve"
  const soon=!events.length;
  const roundLabel=_inferCompRound(compId);
  _setCompStatus(compId,{loading:false,checked:true,upcoming:up,total:jogos.length,soon,error:'',roundLabel:roundLabel||''});
  // Prewarm classificação da liga (featured stats por compId)
  _loadCompStandings(compId,false).catch(()=>{});
  return{id:compId,ok:!!jogos.length,soon,upcoming:up};
}
async function fetchScheduleFromApi(silent){
  const apiKey=document.getElementById('api-key-input').value.trim();
  if(!getWorkerUrl()&&!apiKey.startsWith('sk-'))return;
  const chips=document.getElementById('ex-chips');
  const _clFallback=compLabel(_activeCompId);
  if(!silent){chips.innerHTML='<span class="ex-loading"><span class="ldot"></span> Buscando agenda de '+esc(_clFallback)+'…</span>';document.getElementById('reload-btn').style.display='none';}
  const today=new Date().toISOString().slice(0,10);
  const in14=new Date(Date.now()+14*864e5).toISOString().slice(0,10);
  // Fallback Haiku se ESPN falhar — usa a liga de ANÁLISE ativa (CompContext), não hardcode Série A
  const SP=`${_clFallback} football schedule. Respond ONLY with valid JSON (no markdown, no extra text): {"jogos":[{"mandante":"nome pt-BR","visitante":"nome pt-BR","fase":"Rodada N ou ${_clFallback}","grupo":null,"data_iso":"YYYY-MM-DD","hora_brt":"HH:MM","sede":"cidade · estádio"}]}. Inclua TODOS os jogos confirmados de ${today} até ${in14}.`;
  const msgs=[{role:'user',content:`Calendário de ${_clFallback} de ${today} a ${in14}. Todos os jogos com times em português, fase/rodada (se disponível), data YYYY-MM-DD e horário BRT. Apenas esta competição.`}];
  try{
    for(let i=0;i<6;i++){
      const res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2500,system:SP,messages:msgs,tools:[{type:'web_search_20250305',name:'web_search'}]})});
      parseRateLimitHeaders(res);const data=await res.json();if(!res.ok)throw new Error(data.error?.message);
      if(data.stop_reason==='end_turn'){
        const txt=data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
        const m=txt.match(/\{[\s\S]*\}/);
        if(m){let jogos;try{jogos=JSON.parse(m[0]).jogos||[];}catch{jogos=[];}
          jogos=jogos.filter(j=>j.mandante&&j.visitante&&j.data_iso);
          if(jogos.length){_saveSchedCache(jogos);_schedule=jogos;renderScheduleChips(_schedule);if(_currentView==='library')renderLibrary();return;}}
        break;
      }
      if(data.stop_reason==='tool_use'){msgs.push({role:'assistant',content:data.content});msgs.push({role:'user',content:data.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:''}))});}else break;
    }
    if(!silent)renderScheduleChips([]);
  }catch(e){if(!silent)chips.innerHTML=`<button class="chip chip-cta" onclick="fetchScheduleFromApi(false)">↻ tentar novamente</button>`;}
}
/** Kickoff ms — delega a _matchKick (fonte única de tempo) */
function _kickMs(j){
  if(typeof _matchKick!=='function'){
    if(!j||!j.data_iso)return Infinity;
    const t=(j.hora_brt&&/^\d{1,2}:\d{2}/.test(j.hora_brt))?j.hora_brt:'12:00';
    const d=new Date(j.data_iso+'T'+t+':00-03:00');
    return isNaN(d.getTime())?Infinity:d.getTime();
  }
  const k=_matchKick(j);
  return k?k.getTime():Infinity;
}
function _chipTimeMeta(j,s){
  if(s&&s.state==='live')return'AO VIVO';
  const day=dateLabelFromISO(j.data_iso);
  const hr=j.hora_brt||'';
  if(day==='hoje'||day==='amanhã')return[day,hr].filter(Boolean).join(' · ');
  return[day&&day!=='outros'?day:(j.data_iso||''),hr].filter(Boolean).join(' · ');
}
/** Ranker canônico: live+upcoming por kickoff. compId null/undefined = todas as ligas. */
function nearestMatches(list,n,compId){
  n=n==null?5:n;
  const rows=[];
  (list||[]).forEach((j,idx)=>{
    if(!j||!j.data_iso)return;
    if(compId!=null&&compId!==''&&(j.comp_id||compId)!==compId)return;
    const s=(typeof _matchState==='function')?_matchState(j):null;
    if(!s||(s.state!=='live'&&s.state!=='upcoming'))return;
    rows.push({j,s,idx,t:s.k?s.k.getTime():_kickMs(j),pri:s.state==='live'?0:1});
  });
  rows.sort((a,b)=>(a.pri-b.pri)||(a.t-b.t));
  return rows.slice(0,n);
}
function renderScheduleChips(jogos){
  jogos=_mergeKnownFixtures(Array.isArray(jogos)?jogos:[]);
  jogos=jogos.slice().sort((a,b)=>{
    const da=_kickMs(a),db=_kickMs(b);
    if(da!==db)return da-db;
    return (a.mandante||'').localeCompare(b.mandante||'');
  });
  _schedule=jogos;
  const chips=document.getElementById('ex-chips');
  if(!chips)return;
  if(!jogos.length){
    chips.innerHTML='<span class="ex-loading">Nenhuma partida encontrada</span>';
    const rb=document.getElementById('reload-btn');if(rb)rb.style.display='inline';
    return;
  }
  const nearest=nearestMatches(jogos,5,null);
  if(!nearest.length){
    chips.innerHTML='<span class="ex-auto-hint">'+t('sched_no_games')+' · <button class="chip chip-cta" onclick="showView(\'library\')">'+t('sched_calendar')+'</button></span>';
    const lbl=document.getElementById('sched-lbl');if(lbl)lbl.textContent=t('sched_lbl');
    const rb=document.getElementById('reload-btn');if(rb)rb.style.display='inline';
    return;
  }
  let html='';
  nearest.forEach(function(row){
    const j=row.j,s=row.s,idx=row.idx;
    const live=s.state==='live';
    const meta=_chipTimeMeta(j,s);
    const title=((j.comp_id?compLabel(j.comp_id)+' · ':'')+(j.mandante||'')+' × '+(j.visitante||''));
    html+='<button type="button" class="chip chip-match'+(live?' chip-live':'')+'" onclick="fillMatch('+idx+')" title="'+esc(title)+'">'
      +'<span class="chip-teams">'+esc(j.mandante||'?')+' × '+esc(j.visitante||'?')+'</span>'
      +'<span class="chip-meta'+(live?' chip-meta-live':'')+'">'+esc(meta)+'</span>'
      +'</button>';
  });
  if(jogos.length>nearest.length){
    html+='<button type="button" class="chip chip-cta" onclick="showView(\'library\')" style="margin-top:4px">'
      +(typeof t('game_all')==='function'?t('game_all')(jogos.length):t('game_all'))
      +'</button>';
  }
  chips.innerHTML=html;
  const rb=document.getElementById('reload-btn');if(rb)rb.style.display='inline';
  const lbl=document.getElementById('sched-lbl');
  if(lbl)lbl.textContent=typeof t('game_upcoming')==='function'?t('game_upcoming')(nearest.length):t('game_upcoming');
  scheduleFeaturedPaint();
}

// ─── Tournament context cache ─────────────────────────────────────────────
function _loadCtxCache(){
  try{const raw=localStorage.getItem(CTX_STORE);if(!raw)return null;const c=JSON.parse(raw);return(c&&c.data)?c:null;}catch{return null;}
}
function _saveCtxCache(data){
  try{localStorage.setItem(CTX_STORE,JSON.stringify({fetched_at:Date.now(),data}));}catch(e){}
}
function getTournamentCtxString(){
  const c=_loadCtxCache();if(!c)return'';
  try{
    const d=c.data;const lines=[];
    if(d.fase_atual)lines.push(`FASE ATUAL: ${d.fase_atual}`);
    if(d.standings&&Object.keys(d.standings).length){
      lines.push('CLASSIFICAÇÃO DOS GRUPOS:');
      Object.entries(d.standings).forEach(([g,rows])=>{lines.push(`  ${g}: ${rows.map(r=>`${r.time}(${r.pts}pts)`).join(' | ')}`);});
    }
    if(d.results&&d.results.length){
      lines.push('RESULTADOS RECENTES:');
      d.results.slice(0,12).forEach(r=>lines.push(`  ${r.data||''} ${r.mandante} ${r.placar||'?-?'} ${r.visitante}`));
    }
    return lines.join('\n');
  }catch{return'';}
}
function loadTournamentCtx(force){
  if(getAfKey()||getFdKey())return; // loadAfData/loadFdData já atualiza CTX_STORE — evita race condition
  if(!autoAiEnabled()&&!force)return; // modo economia: não gasta créditos no automático (force = ação explícita)
  const cache=_loadCtxCache();
  if(cache&&!force){const age=Date.now()-(cache.fetched_at||0);if(age<CTX_TTL)return;}
  fetchTournamentCtxFromApi();
}
async function fetchTournamentCtxFromApi(){
  const apiKey=document.getElementById('api-key-input').value.trim();
  if(!getWorkerUrl()&&!apiKey.startsWith('sk-'))return;
  const today=new Date().toISOString().slice(0,10);
  const _cl=compLabel(_activeCompId);
  const SP=`${_cl} — agente de contexto. Data: ${today}. Pesquise e retorne APENAS JSON válido (sem markdown): {"fase_atual":"string (ex.: Rodada 15 / Fase de grupos)","standings":{"Tabela":[{"time":"","pts":0,"j":0,"v":0,"e":0,"d":0,"gp":0,"gc":0}]},"results":[{"data":"DD/MM","mandante":"","placar":"N-N","visitante":""}]}. Inclua a classificação de ${_cl} e os últimos 12 resultados.`;
  const msgs=[{role:'user',content:`Tabela de classificação e resultados recentes de ${_cl} até ${today}.`}];
  try{
    for(let i=0;i<4;i++){
      const res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:3000,system:SP,messages:msgs,tools:[{type:'web_search_20250305',name:'web_search'}]})});
      parseRateLimitHeaders(res);const data=await res.json();if(!res.ok)return;
      if(data.stop_reason==='end_turn'){
        const txt=data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
        const m=txt.match(/\{[\s\S]*\}/);
        if(m){let d;try{d=JSON.parse(m[0]);}catch{return;}if(d&&(d.results||d.standings)){_saveCtxCache(d);return;}}
        return;
      }
      if(data.stop_reason==='tool_use'){msgs.push({role:'assistant',content:data.content});msgs.push({role:'user',content:data.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:''}))});}else return;
    }
  }catch{}
}

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
function _esAnalyze(query){
  const inp=document.getElementById('match-input');
  inp.value=query;inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,220)+'px';inp.focus();
  if(typeof toggleRun==='function')toggleRun();
}
// Time awareness: combine data_iso + hora_brt (Brasília UTC-3) into a kickoff Date
function _matchKick(m){
  if(!m||!m.data_iso)return null;
  const t=(m.hora_brt&&/^\d{1,2}:\d{2}/.test(m.hora_brt))?m.hora_brt:'12:00';
  const d=new Date(m.data_iso+'T'+t+':00-03:00');
  return isNaN(d.getTime())?null:d;
}
// Returns {state:'live'|'upcoming'|'finished'|'unknown', mins, k}
function _matchState(m){
  const k=_matchKick(m);
  if(!k)return{state:'unknown',mins:0,k:null};
  const el=(Date.now()-k.getTime())/60000;
  if(el<0)return{state:'upcoming',mins:-el,k};
  if(el<=130)return{state:'live',mins:el,k};
  return{state:'finished',mins:el,k};
}
function _relTime(mins){
  if(mins<1)return'agora';
  if(mins<60)return'em '+Math.round(mins)+' min';
  const h=Math.floor(mins/60),mm=Math.round(mins%60);
  if(mins<24*60)return'em '+h+'h'+(mm?(' '+mm+'min'):'');
  const d=Math.round(mins/(24*60));
  return'em '+d+(d>1?' dias':' dia');
}

/* ESPN standings/results → js/data/espn.js */

/**
 * Card de Estatísticas (featured) — SOMENTE dados da liga do seletor (_statsCompId):
 * results: _compResults[id] | standings/fase: _compStandings[id] | agenda: _schedForStatsComp
 * NÃO usa _loadCtxCache / contexto de análise.
 */
function _copaStatsHTML(compId){
  const id=compId||_statsCompId||_activeCompId;
  const results=_compResults[id]||[];
  const pack=_getCompStandings(id);
  const standings=(pack&&pack.standings&&Object.keys(pack.standings).length)?pack.standings:null;
  let faseAtual=(pack&&pack.faseAtual)||'';
  if(!faseAtual){
    const rl=(typeof _inferCompRound==='function')?_inferCompRound(id):'';
    if(rl)faseAtual=rl;
  }
  const st=_compStatus[id]||{};

  // Jogos disputados / agendados — filtrados pelo campeonato do seletor
  const sched=(_schedByComp[id]&&_schedByComp[id].length)?_schedByComp[id]:_schedule.filter(m=>(m.comp_id||'')===id);
  const jogados=results.length;
  const liveNow=sched.filter(m=>_matchState(m).state==='live').length;
  const futuros=sched.filter(m=>{const s=_matchState(m).state;return s==='upcoming';}).length;

  // Gols por clube: prioriza classificações (gp); senão soma a partir dos resultados
  const golsPorTime={};
  if(standings&&Object.keys(standings).length){
    Object.values(standings).forEach(rows=>{(rows||[]).forEach(r=>{if(r&&r.time!=null)golsPorTime[r.time]=(golsPorTime[r.time]||0)+(parseInt(r.gp)||0);});});
  }else{
    results.forEach(r=>{
      const mm=(r.placar||'').match(/(\d+)\s*[-x:]\s*(\d+)/);if(!mm)return;
      const a=parseInt(mm[1]),b=parseInt(mm[2]);
      if(r.mandante)golsPorTime[r.mandante]=(golsPorTime[r.mandante]||0)+a;
      if(r.visitante)golsPorTime[r.visitante]=(golsPorTime[r.visitante]||0)+b;
    });
  }
  const topGols=Object.entries(golsPorTime).filter(([,g])=>g>0).sort((a,b)=>b[1]-a[1]).slice(0,3);

  // Maiores diferenças de gols (goleadas) a partir dos resultados, deduplicadas
  const seen=new Set();
  let goleadas=results.map(r=>{
    const mm=(r.placar||'').match(/(\d+)\s*[-x:]\s*(\d+)/);
    if(!mm)return null;
    const a=parseInt(mm[1]),b=parseInt(mm[2]);const dif=Math.abs(a-b);
    if(isNaN(dif)||dif<1)return null;
    const venc=a>=b?r.mandante:r.visitante;const perd=a>=b?r.visitante:r.mandante;
    const key=`${venc}|${perd}|${Math.max(a,b)}-${Math.min(a,b)}`;
    if(seen.has(key))return null;seen.add(key);
    return{venc,perd,placar:`${Math.max(a,b)}-${Math.min(a,b)}`,dif};
  }).filter(Boolean).sort((x,y)=>y.dif-x.dif);
  // Goleada de verdade = 3+ de saldo; se houver poucas, mostra as maiores vitórias disponíveis
  const reais=goleadas.filter(g=>g.dif>=3);
  goleadas=(reais.length>=2?reais:goleadas.filter(g=>g.dif>=2)).slice(0,10);

  const hasStandings=!!(standings&&Object.keys(standings).length);
  const hasData=jogados>0||topGols.length>0||!!faseAtual||futuros>0||liveNow>0||hasStandings;
  if(!hasData){
    if(st.soon)return`<div class="rs-cs-empty"><b>${esc(compLabel(id))}</b> ainda não tem jogos na janela atual.<br><span style="color:var(--muted)">Status: em breve</span><br><span style="color:var(--terra);cursor:pointer" onclick="loadEspnComp('${id}',true).then(()=>scheduleFeaturedPaint({immediate:true,enrich:true}))">↻ Verificar de novo</span></div>`;
    if(st.loading)return`<div class="rs-cs-empty">Verificando disponibilidade de <b>${esc(compLabel(id))}</b>…</div>`;
    return`<div class="rs-cs-empty">As estatísticas de <b>${esc(compLabel(id))}</b> aparecem quando houver dados.<br><span style="color:var(--terra);cursor:pointer" onclick="setStatsComp('${id}');Promise.all([loadEspnComp('${id}',true),_loadCompResults('${id}'),_loadCompStandings('${id}',true)]).then(()=>{_rebuildUnionSchedule();scheduleFeaturedPaint({immediate:true});})">↻ Carregar agora</span></div>`;
  }

  let html=`<div class="rs-cs-grid">
    <div class="rs-cs-cell"><span class="rs-cs-num">${jogados}</span><span class="rs-cs-lbl">Jogos disputados</span></div>
    <div class="rs-cs-cell"><span class="rs-cs-num">${liveNow>0?liveNow:futuros}</span><span class="rs-cs-lbl">${liveNow>0?'Ao vivo agora':'Próximos jogos'}</span></div>
  </div>`;

  if(topGols.length){
    html+=`<div class="rs-cs-sec"><div class="rs-cs-sec-lbl">⚽ Mais gols marcados</div>${
      topGols.map(([team,g],i)=>{
        const flag=teamBadge(team,14);
        return`<div class="rs-cs-row"><span class="rs-cs-rank">${i+1}</span><span class="rs-cs-team">${flag} ${esc(team)}</span><span class="rs-cs-val">${g}</span></div>`;
      }).join('')
    }</div>`;
  }

  if(goleadas.length){
    html+=`<div class="rs-cs-sec"><div class="rs-cs-sec-lbl">🔥 Maiores goleadas</div>${
      goleadas.map(g=>{
        const flag=teamBadge(g.venc,14);
        return`<div class="rs-cs-row"><span class="rs-cs-team">${flag} ${esc(g.venc)} <span style="color:var(--muted)">vs ${esc(g.perd)}</span></span><span class="rs-cs-val">${esc(g.placar)}</span></div>`;
      }).join('')
    }</div>`;
  }

  if(faseAtual){
    html+=`<div class="rs-cs-sec"><div class="rs-cs-sec-lbl">🏆 Fase atual</div><div class="rs-cs-phase"><b>${esc(faseAtual)}</b></div></div>`;
  }

  // Classificação por grupo (dados gratuitos do ESPN) — recolhível p/ não ocupar o card todo
  if(standings&&Object.keys(standings).length){
    const grpHtml=Object.entries(standings).map(([gname,rows])=>{
      if(!rows||!rows.length)return'';
      const head=`<div class="rs-cl-row rs-cl-head"><span class="rs-cl-pos">#</span><span class="rs-cl-team">Time</span><span class="rs-cl-n">P</span><span class="rs-cl-n">SG</span><span class="rs-cl-pts">Pts</span></div>`;
      const body=rows.map((r,i)=>{
        const flag=teamBadge(r.time,12);
        const sg=(r.sg>0?'+':'')+r.sg;
        return`<div class="rs-cl-row${i<2?' rs-cl-q':''}"><span class="rs-cl-pos">${r.rank||i+1}</span><span class="rs-cl-team">${flag} ${esc(r.time)}</span><span class="rs-cl-n">${r.j}</span><span class="rs-cl-n">${sg}</span><span class="rs-cl-pts">${r.pts}</span></div>`;
      }).join('');
      return`<div class="rs-cl-grp"><div class="rs-cl-gh">${esc(gname).replace(/^Group/i,'Grupo')}</div>${head}${body}</div>`;
    }).join('');
    if(grpHtml)html+=`<div class="rs-cs-sec rs-cs-sec-cl">
      <details class="rs-cl">
        <summary class="rs-cl-sum" aria-label="Abrir classificação da liga">
          <span class="rs-cl-sum-ico" aria-hidden="true">📋</span>
          <span class="rs-cl-sum-txt">
            <span class="rs-cl-sum-title">Classificação</span>
            <span class="rs-cl-sum-hint">tocar para expandir a tabela</span>
          </span>
          <svg class="rs-cl-sum-arr" viewBox="0 0 10 6" width="10" height="10" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="currentColor"/></svg>
        </summary>
        <div class="rs-cl-body">${grpHtml}</div>
      </details>
    </div>`;
  }

  return html;
}
/** Agenda da liga do seletor de Estatísticas (mesma regra do card de stats). */
function _schedForStatsComp(compId){
  const id=compId||_statsCompId||_activeCompId;
  if(_schedByComp[id]&&_schedByComp[id].length)return _schedByComp[id];
  return (_schedule||[]).filter(m=>(m.comp_id||_activeCompId)===id);
}
function _teamsHTML(compId){
  const id=compId||_statsCompId||_activeCompId;
  const nearest=nearestMatches(_schedForStatsComp(id),12,id);
  const teams=[];const seen=new Set();
  nearest.forEach(function(row){
    const m=row.j;
    [[m.mandante,m.mandante_logo],[m.visitante,m.visitante_logo]].forEach(function(pair){
      const name=pair[0],logo=pair[1];
      if(!name)return;const k=_normTeamKey(name);if(seen.has(k))return;seen.add(k);
      if(logo)_registerTeamLogo(name,logo);
      teams.push(name);
    });
  });
  if(!teams.length){
    return '<div class="rs-feat-empty">Nenhum clube em destaque em <b>'+esc(compLabel(id))+'</b> no momento.</div>';
  }
  return '<div class="rs-tg">'+teams.slice(0,6).map(function(team){
    const crest=teamBadge(team,32);
    return '<div class="rs-team-badge" onclick="_esAnalyze(\'Analise '+esc(team)+'\')"><span class="rs-team-emblem">'+crest+'</span><span class="rs-team-name">'+esc(team)+'</span></div>';
  }).join('')+'</div>';
}
function _calendarHTML(compId){
  const id=compId||_statsCompId||_activeCompId;
  const nearest=nearestMatches(_schedForStatsComp(id),6,id);
  if(!nearest.length){
    return '<div class="rs-feat-empty">Sem jogos futuros em <b>'+esc(compLabel(id))+'</b>.</div>';
  }
  return nearest.map(function(row){
    const m=row.j,s=row.s;
    const d=s.k.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const dateHtml=s.state==='live'
      ?'<span class="rs-cal-livedot"></span><span class="rs-cal-livetag">AO VIVO</span>'
      :(esc(d)+(m.hora_brt?' <span class="rs-cal-time">'+esc(m.hora_brt)+'</span>':''));
    const mh=esc((m.mandante||'').replace(/'/g,"\\'"));
    const vh=esc((m.visitante||'').replace(/'/g,"\\'"));
    const click=s.state==='live'
      ?('openLiveByTeams(\''+mh+'\',\''+vh+'\')')
      :('_esAnalyze(\'Analise '+esc(m.mandante||'')+' vs '+esc(m.visitante||'')+'\')');
    return '<div class="rs-cal-item" onclick="'+click+'">'
      +'<span class="rs-cal-date">'+dateHtml+'</span>'
      +'<span class="rs-cal-teams">'+esc(m.mandante||'?')+' × '+esc(m.visitante||'?')+'</span>'
      +'</div>';
  }).join('');
}

/** HTML dos 3 cards featured/** HTML dos 3 cards featured (stats + clubes + próximos). Sem pop in-tree — portal global. */
function _featuredCardsHTML(statsId,statsHTML,teamsHTML,calHTML){
  const short=getComp(statsId).short||getComp(statsId).name||'';
  return '<div class="rs-block rs-block-featured">'
    +'<div class="rs-stats-hdr">'
    +'<div class="rs-lbl">📊 Estatísticas</div>'
    +'<button type="button" class="rs-stats-sel" onclick="toggleStatsCompPop(event)" aria-haspopup="listbox" aria-expanded="false">'
    +'<span class="rs-stats-sel-name">'+esc(short)+'</span>'
    +'<svg viewBox="0 0 10 6" fill="currentColor" width="10" height="10" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>'
    +'</button></div>'
    +'<div class="rs-featured-stats-body">'+statsHTML+'</div></div>'
    +'<div class="rs-block rs-block-featured"><div class="rs-lbl">⭐ Clubes em Destaque · '+esc(short)+'</div>'+teamsHTML+'</div>'
    +'<div class="rs-block rs-block-featured"><div class="rs-lbl">📅 Próximos Jogos · '+esc(short)+'</div>'+calHTML+'</div>';
}
function _paintFeaturedHosts(statsId,statsHTML,teamsHTML,calHTML){
  const short=getComp(statsId).short||getComp(statsId).name||'';
  const body=document.getElementById('rs-copa-stats-body');if(body)body.innerHTML=statsHTML;
  const tg=document.getElementById('rs-teams-grid');if(tg)tg.innerHTML=teamsHTML;
  const cl=document.getElementById('rs-calendar-list');if(cl)cl.innerHTML=calHTML;
  const teamsBlk=document.getElementById('rs-teams');
  if(teamsBlk){const tLbl=teamsBlk.querySelector('.rs-lbl');if(tLbl)tLbl.textContent='⭐ Clubes em Destaque · '+short;}
  const calBlk=document.getElementById('rs-calendar');
  if(calBlk){const cLbl=calBlk.querySelector('.rs-lbl');if(cLbl)cLbl.textContent='📅 Próximos Jogos · '+short;}
  _syncStatsSelLabels(statsId);
  const mob=document.getElementById('es-mobile-featured');
  if(mob)mob.innerHTML=_featuredCardsHTML(statsId,statsHTML,teamsHTML,calHTML);
}
function renderEmptyStateFeatured(opts){
  opts=opts||{};
  if(!opts.keepPop)closeStatsCompPop();
  const convo=document.getElementById('conversation');
  const hasConvo=convo&&convo.children.length>0;
  const showStats=!hasConvo;
  const statsId=_statsCompId||_activeCompId;
  const gen=++_featuredPaintGen;
  const statsEl=document.getElementById('rs-copa-stats');
  if(statsEl)statsEl.style.display=showStats?'block':'none';
  ['rs-teams','rs-calendar'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=showStats?'block':'none';
  });
  const mob=document.getElementById('es-mobile-featured');
  if(!showStats){if(mob)mob.innerHTML='';return;}

  _paintFeaturedHosts(statsId,_copaStatsHTML(statsId),_teamsHTML(statsId),_calendarHTML(statsId));

  if(opts.enrich!==false){
    // results + standings da MESMA liga do seletor (nunca ctx de análise)
    Promise.all([
      _loadCompResults(statsId),
      _loadCompStandings(statsId,false)
    ]).then(()=>{
      if(gen!==_featuredPaintGen)return;
      const c2=document.getElementById('conversation');
      if(c2&&c2.children.length>0)return;
      if((_statsCompId||_activeCompId)!==statsId)return;
      _paintFeaturedHosts(statsId,_copaStatsHTML(statsId),_teamsHTML(statsId),_calendarHTML(statsId));
    }).catch(()=>{});
  }
}

// Refresh time-aware featured every 60s so countdowns/live state stay current
setInterval(()=>{const es=document.getElementById('empty-state');if(es&&es.style.display!=='none')scheduleFeaturedPaint({keepPop:true,enrich:false});},60*1000);

// ─── Biblioteca de Jogos ──────────────────────────────────────────────────
function showView(view){
  _currentView=view;
  const chatEl=document.getElementById('chat');
  const libEl=document.getElementById('lib-panel');
  const savedEl=document.getElementById('saved-panel');
  const dockEl=document.querySelector('.i-dock');
  const navChat=document.getElementById('nav-chat');
  const navLib=document.getElementById('nav-library');
  const navSaved=document.getElementById('nav-saved');
  const mTitle=document.querySelector('.m-title');
  const mSub=document.querySelector('.m-sub');
  [navChat,navLib,navSaved].forEach(n=>n&&n.classList.remove('active'));
  chatEl.style.display='none';libEl.style.display='none';savedEl.style.display='none';dockEl.style.display='none';
  if(view==='library'){
    libEl.style.display='flex';navLib.classList.add('active');
    mTitle.textContent=t('title_library');
    if(mSub){mSub.textContent=t('sub_library');mSub.style.display='';}
    renderLibrary();
  }else if(view==='saved'){
    savedEl.style.display='flex';navSaved.classList.add('active');
    mTitle.textContent=t('title_saved');
    if(mSub){mSub.textContent=t('sub_saved');mSub.style.display='';}
    renderSavedReports();
  }else{
    chatEl.style.display='';dockEl.style.display='';navChat.classList.add('active');
    mTitle.textContent=t('title_chat');
    if(mSub){mSub.textContent='';mSub.style.display='none';}
  }
  ['chat','library','saved'].forEach(v=>{const b=document.getElementById('mnav-'+v);if(b)b.classList.toggle('active',v===view);});
  const mSet=document.getElementById('mnav-settings');if(mSet)mSet.classList.remove('active');
}
function renderSavedReports(){
  const listEl=document.getElementById('saved-list');
  const clrBtn=document.getElementById('saved-clear-btn');
  if(clrBtn)clrBtn.style.display=_history.length?'inline-flex':'none';
  if(!_history.length){
    listEl.innerHTML=`<div class="lib-empty">${t('saved_empty')}</div>`;
    return;
  }
  listEl.innerHTML=_history.map(a=>`
    <div class="lib-match" onclick="openSaved('${a.hid}')">
      <div style="flex:1;min-width:0">
        <div class="lib-match-teams">${esc(a.title)}</div>
        <div class="lib-match-meta">${esc(a.fase||a.comp_label||compLabel(a.comp_id||_activeCompId))} · ${esc(a.ts)}</div>
      </div>
      <button class="lib-match-btn" onclick="event.stopPropagation();openSaved('${a.hid}')">${t('saved_open')}</button>
    </div>`).join('');
}
function openSaved(hid){
  showView('chat');
  openHistory(hid);
}
function setLibFilter(f){
  _libFilter=f;
  document.querySelectorAll('#lib-match-filters .lib-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.f===f));
  renderLibrary();
}
function libBackToComps(){
  _libCompId=null;
  renderLibrary();
}
function openLibComp(compId){
  if(!COMPETITIONS[compId])return;
  setLibComp(compId);
  // Foca o agente nesta liga para análises a partir da lista — NÃO mexe no seletor de Estatísticas
  setAnalysisComp(compId);
  const st=_compStatus[compId]||{};
  if(!st.checked||st.loading||!(st.upcoming>0)){
    _setCompStatus(compId,{loading:true});
    loadEspnComp(compId,true).then(()=>{
      _rebuildUnionSchedule();
      if(_libCompId===compId)renderLibrary();
      // não repinta featured (stats é independente)
    });
  }
  renderLibrary();
}
function renderLibrary(){
  const libMatches=document.getElementById('lib-matches');
  const back=document.getElementById('lib-back-btn');
  const flbl=document.getElementById('lib-filter-lbl');
  const mfilters=document.getElementById('lib-match-filters');
  const note=document.getElementById('lib-cache-note');

  // ── Nível 1: cards de campeonato ──────────────────────────────────────
  if(!_libCompId){
    if(back)back.style.display='none';
    if(flbl){flbl.style.display='';flbl.textContent='Campeonatos';}
    if(mfilters)mfilters.style.display='none';
    // Sempre revalida disponibilidade ao abrir a grade (força checagem se ainda não checked)
    const needCheck=COMP_ORDER.some(id=>!(_compStatus[id]&&_compStatus[id].checked)&&!(_compStatus[id]&&_compStatus[id].loading));
    if(needCheck){
      COMP_ORDER.forEach(id=>{if(!(_compStatus[id]&&_compStatus[id].checked))_setCompStatus(id,{loading:true});});
      loadAllCompetitions(false).then(()=>{if(_currentView==='library'&&!_libCompId)renderLibrary();});
    }
    const today=new Date();today.setHours(0,0,0,0);
    const notPast=j=>{if(!j.data_iso)return true;return new Date(j.data_iso+'T12:00:00')>=today;};
    let html='<div class="lib-comp-grid">';
    COMP_ORDER.forEach(id=>{
      const c=COMPETITIONS[id];
      const st=_compStatus[id]||{};
      const jogos=(_schedByComp[id]||[]).filter(notPast);
      const n=st.upcoming!=null&&st.checked?st.upcoming:jogos.length;
      let countHtml;
      if(st.loading||(!st.checked&&!(_schedByComp[id]||[]).length)){
        countHtml=`<div class="lib-comp-count loading">verificando…</div>`;
      }else if(st.soon||(st.checked&&!n&&!(_schedByComp[id]||[]).length)){
        countHtml=`<div class="lib-comp-count soon">Em breve</div>`;
      }else if(st.checked&&!n){
        countHtml=`<div class="lib-comp-count soon">Sem jogos próximos</div>`;
      }else{
        countHtml=`<div class="lib-comp-count">${n} jogo${n===1?'':'s'} à frente</div>`;
      }
      const soonCls=(st.soon||(st.checked&&!n&&!(_schedByComp[id]||[]).length))?' soon':'';
      html+=`<button type="button" class="lib-comp-card${soonCls}" onclick="openLibComp('${id}')">
        ${_compLogo(id)}
        <div class="lib-comp-name">${esc(c.name)}</div>
        <div class="lib-comp-meta">${esc(compMetaLine(id))}</div>
        ${countHtml}
      </button>`;
    });
    html+='</div>';
    libMatches.innerHTML=html;
    if(note){
      const total=COMP_ORDER.reduce((a,id)=>a+((_schedByComp[id]||[]).length),0);
      const soonN=COMP_ORDER.filter(id=>(_compStatus[id]||{}).soon).length;
      const loading=COMP_ORDER.some(id=>(_compStatus[id]||{}).loading);
      note.textContent=loading
        ?`Verificando disponibilidade dos ${COMP_ORDER.length} campeonatos…`
        :`${COMP_ORDER.length} campeonatos · ${total} jogos em agenda${soonN?` · ${soonN} em breve`:''}`;
    }
    return;
  }

  // ── Nível 2: jogos do campeonato ──────────────────────────────────────
  const comp=getComp(_libCompId);
  if(back)back.style.display='inline-flex';
  if(flbl){flbl.style.display='none';}
  if(mfilters)mfilters.style.display='inline-flex';
  document.querySelectorAll('#lib-match-filters .lib-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.f===_libFilter));
  const st=_compStatus[_libCompId]||{};
  const jogos=(_schedByComp[_libCompId]&&_schedByComp[_libCompId].length)?_schedByComp[_libCompId]:_schedule.filter(j=>(j.comp_id||_activeCompId)===_libCompId);
  if(!jogos.length){
    const soon=st.soon||(st.checked&&!st.upcoming);
    const loading=st.loading||!st.checked;
    libMatches.innerHTML=`<div class="lib-comp-hdr"><img src="${esc(comp.logo||'')}" alt="" width="28" height="28" style="object-fit:contain;background:transparent;padding:0;box-shadow:none;border-radius:0" onerror="this.remove()"><div class="lib-comp-hdr-title">${esc(comp.name)}</div></div>
      <div class="lib-empty">${loading
        ?`Verificando disponibilidade de jogos…`
        :soon
          ?`<b>Em breve</b><br>Este campeonato ainda não tem jogos na janela atual (temporada não iniciada ou hiato).<br><button class="chip chip-cta" style="margin-top:10px" onclick="loadEspnComp('${_libCompId}',true).then(()=>{_rebuildUnionSchedule();renderLibrary();})">↻ Verificar de novo</button>`
          :`Sem jogos próximos neste campeonato.<br><button class="chip chip-cta" style="margin-top:10px" onclick="loadEspnComp('${_libCompId}',true).then(()=>{_rebuildUnionSchedule();renderLibrary();})">↻ Buscar agora</button>`
      }</div>`;
    if(note)note.textContent=soon?`${comp.name} · em breve`:comp.name;
    return;
  }
  const today=new Date();today.setHours(0,0,0,0);
  const notPast=j=>{if(!j.data_iso)return true;return new Date(j.data_iso+'T12:00:00')>=today;};
  let filtered=jogos.filter(notPast);
  if(_libFilter==='hoje')filtered=filtered.filter(j=>dateLabelFromISO(j.data_iso)==='hoje');
  else if(_libFilter==='amanha')filtered=filtered.filter(j=>dateLabelFromISO(j.data_iso)==='amanhã');
  else if(_libFilter==='semana'){const lim=new Date(today.getTime()+7*864e5);filtered=filtered.filter(j=>{if(!j.data_iso)return false;const d=new Date(j.data_iso+'T12:00:00');return d<lim;});}
  if(!filtered.length){libMatches.innerHTML=`<div class="lib-comp-hdr"><img src="${esc(comp.logo||'')}" alt="" width="28" height="28" style="object-fit:contain;border-radius:6px" onerror="this.remove()"><div class="lib-comp-hdr-title">${esc(comp.name)}</div></div><div class="lib-empty">Nenhuma partida neste filtro.</div>`;return;}
  const grp={};filtered.forEach(j=>{const k=j.data_iso||'outros';if(!grp[k])grp[k]=[];grp[k].push(j);});
  let html=`<div class="lib-comp-hdr"><img src="${esc(comp.logo||'')}" alt="" width="28" height="28" style="object-fit:contain;border-radius:6px" onerror="this.remove()"><div class="lib-comp-hdr-title">${esc(comp.name)}</div></div>`;
  Object.keys(grp).sort().forEach(dateKey=>{
    const lbl=dateLabelFromISO(dateKey);
    const full=dateKey!=='outros'?new Date(dateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}):'';
    const hdr=lbl==='hoje'?`Hoje · ${full}`:lbl==='amanhã'?`Amanhã · ${full}`:full||dateKey;
    html+=`<div class="lib-day-hdr">${esc(hdr)}</div>`;
    grp[dateKey].forEach(j=>{
      // index na união _schedule (fillMatch)
      let idx=_schedule.findIndex(x=>x.mandante===j.mandante&&x.visitante===j.visitante&&x.data_iso===j.data_iso&&(x.comp_id||'')===(j.comp_id||_libCompId));
      if(idx<0){// garante presença
        j.comp_id=j.comp_id||_libCompId;_schedule.push(j);idx=_schedule.length-1;
      }
      const crestH=teamBadge(j.mandante,18),crestA=teamBadge(j.visitante,18);
      html+=`<div class="lib-match" onclick="fillMatch(${idx})">
        <div style="flex:1;min-width:0">
          <div class="lib-match-teams" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${crestH}<span>${esc(j.mandante)}</span> <span style="color:var(--muted);font-weight:400">×</span> ${crestA}<span>${esc(j.visitante)}</span></div>
          <div class="lib-match-meta">${esc(j.fase||compLabel(j.comp_id||_libCompId))}${j.sede?` · ${esc(j.sede)}`:''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-right:8px">
          <div class="lib-match-time">${esc(j.hora_brt||'–:––')} BRT</div>
        </div>
        <button class="lib-match-btn" onclick="event.stopPropagation();fillMatch(${idx})">Analisar</button>
      </div>`;
    });
  });
  libMatches.innerHTML=html;
  if(note)note.textContent=`${comp.name} · ${filtered.length} partida${filtered.length===1?'':'s'} · filtros acima`;
}

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

// Regra de grounding temporal compartilhada (Fase 1 coleta + Fase 2 análise). Escrita UMA vez:
// princípio geral (qualquer fato volátil só dos dados) + verificação (dados vencem a memória) +
// completude (extrair tudo; "a confirmar" é último recurso). Cobre toda a classe de erro, não
// uma lista curta — impede técnico/escalação/ranking/clube/etc. desatualizados de memória.
const GROUNDING_RULE=`GROUNDING TEMPORAL (regra dura — o erro mais grave a evitar):
Seu conhecimento de treino está DESATUALIZADO para o futebol atual (clubes e seleções). Elencos, técnicos, placares e status de jogo mudam o tempo todo — inclusive no acréscimo.
• FATOS VOLÁTEIS — use SOMENTE o que vier dos dados coletados/buscas/blocos oficiais desta mensagem, NUNCA de memória de treino: placar e status de jogo (FT/LIVE/intervalo); minuto do gol; técnico atual; escalação; lesões/suspensões; forma recente; tabela/fase.
• PLACAR É SACRO (tolerância zero a alucinação): NUNCA invente, complete, arredonde ou "lembre" placar. Se existir "=== PLACARES VERIFICADOS ===", use EXATAMENTE status + placar dali (FT = placar oficial de término da fonte, não um parcial). Se não houver bloco, busque por identidade do jogo + "full time/resultado final" (sem presupor o placar na query) e cite a fonte. Proibido qualquer placar sem lastro nesta mensagem.
• CONHECIMENTO PRÓPRIO só para o que NÃO muda: leitura tática genérica, padrões históricos distantes, metodologia (xG, Poisson) — nunca para o resultado de um jogo "que acabou de acontecer".
• VERIFICAÇÃO: se memória divergir dos dados, os DADOS vencem. Se "lembra" e não está nos dados, NÃO afirme — busque.
• COMPLETUDE: extraia o máximo das fontes. Não se abstenha de informar por preguiça: se o fato é público (placar FT), a coleta deve encontrá-lo.
• NARRATIVA DE INCERTEZA: não invente o valor ausente; diga o que falta e busque.`;

// Regra de fontes: prioriza imprensa internacional de referência + stats; demais OK se necessário.
// Prompt-only (não allowed_domains — já quebrou o pipeline). Odds = insumo genérico, sem bookmaker.
const SOURCE_RULE=`FONTES E CITAÇÃO (regra obrigatória — priorize, não descarte o resto sem necessidade):

PRIORIDADE 1 (use primeiro; em conflito de fatos, prefira estas se forem mais recentes/oficiais):
• BBC Sport, The Guardian, Sky Sports, The Athletic, ESPN FC (internacional), Reuters Sport
• Provedores estatísticos: FBref/StatsBomb, Opta/The Analyst, Sofascore, FotMob, WhoScored, Understat
• Federações e sites oficiais de clubes/competições (FIFA, UEFA, CONMEBOL, CBF, Premier League, LaLiga, etc.)

PRIORIDADE 2 (use quando P1 não cobrir o fato, for a fonte mais local/atual, ou para cruzar):
• Transfermarkt, Goal.com, Marca, AS, L'Équipe, Gazzetta dello Sport, Kicker
• Imprensa BR quando o jogo/clube for sul-americano: GE/Globo Esporte, Lance, UOL Esporte, ESPN Brasil
• Fabrizio Romano (@FabrizioRomano) para transferências/lesões de última hora

• Cite a fonte no fundamento. Prefira rigor estatístico (FBref/Opta/Sofascore) a portal de opinião.
• NUNCA cite, no campo "fundamento", casas de apostas, agregadores de odds ou blogs de "dicas/tips" (bet365, betano, betfair, legalbet, etc.) — mesmo que apareçam na busca.
• Odds de mercado podem ser INSUMO analítico genérico ("probabilidade implícita de mercado") — NUNCA nomeie a casa.
• Se um dado só existir em fonte P2 (ou só em fonte de apostas como odds), use-o com atribuição correta; não invente por falta de P1. NÃO descarte uma fonte boa só porque não é BBC/Guardian — a regra é priorizar, não excluir.`;

// Disciplina de tickets + sanity por competição (faixas em COMP_SANITY).
function ticketRulesFor(id){
  const s=compSanity(id);
  const cl=compLabel(id);
  let band='';
  if(s.kind==='league'){
    band=`FORMATO DE ${cl}: ${s.format}.
• Jogos de LIGA por clube na temporada: exatamente ${s.leagueGames} rodadas possíveis (um clube joga ${s.leagueGames} jogos de liga se completar a temporada).
• Jogador: raramente ultrapassa ${s.maxPlayerLeagueGames} jogos SÓ de liga; com copas/continentais, teto plausível ~${s.maxPlayerAllComps} jogos no total — acima disso sem base nos dados = alucinação.
• Artilharia na liga: faixa típica de ponta ~${s.goalsTopMin}–${s.goalsTopMax} gols; ≥${s.goalsAbsurd} gols SÓ na liga sem fonte nos dados = descarte.
• NÃO ASSUMA PRORROGAÇÃO (liga = 90'+acréscimos).`;
  }else{
    band=`FORMATO DE ${cl}: ${s.format}.
• Jogos NESTA competição por clube: tipicamente bem abaixo de uma liga nacional; teto plausível por jogador no torneio ~${s.maxPlayerCompGames} jogos (fase de grupos/liga + mata-mata). Total em todas as competições na temporada ainda pode chegar a ~${s.maxPlayerAllComps}.
• Artilharia NESTE torneio: faixa típica de ponta ~${s.goalsTopMin}–${s.goalsTopMax} gols; ≥${s.goalsAbsurd} só no torneio sem fonte = descarte.
• NÃO aplique "38 rodadas de pontos corridos" a copas.
• Prorrogação/pênaltis: só se a fase for mata-mata e as regras do torneio pedirem (não invente tempo extra em fase de grupos).`;
  }
  return `DISCIPLINA DE TICKETS E APOSTAS (regra obrigatória — evita alucinação e jargão):
• TERMINOLOGIA: NÃO use a gíria "perna" sozinha — escreva "aposta", "mercado" ou "perna do bilhete". Explique jargão na 1ª ocorrência (ex.: "same game parlay = várias apostas do mesmo jogo num bilhete").
• NUNCA invente odd/cotação numérica — fale em PROBABILIDADE estimada (%). Sem bilhete de casa de apostas com cotação fechada.
• ESTATÍSTICAS DE JOGADOR / lesão / forma: SOMENTE dos DADOS COLETADOS/BUSCA. Nunca de memória. Se não veio, diga que não confirmou.
• SANITY-CHECK OBRIGATÓRIO (faixas EXATAS desta competição):
${band}
• QUALIDADE DOS MERCADOS: priorize resultado, totais de gols, BTTS, jogador finaliza/marca, handicap, cartões. Evite mercados obscuros (tiro de meta, laterais) sem lastro.
• COERÊNCIA: não misture contagens de liga vs copas vs continental sem explicar.`;
}

// ─── Phase 1: fact gathering (Haiku + web_search) ────────────────────────
async function gatherFacts(query,apiKey,signal,onUpdate,maxSearches){
  // Pre-fetch structured data com FALLBACK em cascata: AF (paga) → FD (paga) → ESPN (grátis).
  // CADA fonte só é tentada se a anterior não retornou nada. Antes era if/else-if/else, então
  // uma chave AF/FD que FALHA (ex.: CORS, quota) deixava fdCtx vazio e NUNCA caía na ESPN —
  // o usuário com chave quebrada ficava com dados PIORES do que sem chave. Agora a ESPN é
  // sempre a rede de segurança final (grátis, sem chave).
  let fdCtx='';
  // TheSportsDB (fonte independente da cascata) dispara JÁ e roda em paralelo com AF/FD/ESPN;
  // só é aguardada no fim, então seu timeout (até 8s se não responder) não soma ao tempo total.
  const _tsdbPromise=getTsdbContext().catch(()=>'');
  if(getAfKey()){
    const[standings,fixtures]=await Promise.all([getAfStandings(),getAfFixtures()]);
    fdCtx=formatAfContext(standings,fixtures);
    // Técnico atual e escalação confirmada direto da API-Football (determinístico).
    if(fdCtx)fdCtx+=await afEnrichCoachLineup(query,fixtures);
  }
  if(!fdCtx&&getFdKey()){
    const[standings,matches]=await Promise.all([getFdStandings(),getFdMatches()]);
    fdCtx=formatFdContext(standings,matches);
  }
  if(!fdCtx){
    // ESPN: grátis, sem chave — base garantida (classificação, resultados, forma recente).
    // Técnico/escalação NÃO vêm da ESPN → ficam por conta do web_search (Sofascore etc.).
    const[standings,scoreboard]=await Promise.all([getEspnStandings(),getEspnScoreboard()]);
    fdCtx=formatEspnContext(standings,scoreboard);
  }
  // Camada extra: TheSportsDB (grátis, CORS aberto) — 2ª fonte estruturada INDEPENDENTE.
  // Sempre anexada quando responde: dá à Fase 2 material real p/ validação cruzada de
  // placares/datas, e vira a rede de segurança final se ESPN/AF/FD falharem juntas.
  // (disparada lá em cima, em paralelo com a cascata — aqui só colhe o resultado.)
  try{const _tsdb=await _tsdbPromise;if(_tsdb)fdCtx=fdCtx?fdCtx+'\n\n'+_tsdb:_tsdb;}catch{}
  const hasFd=!!fdCtx;
  // jogadores_chave é uma LISTA DE OBJETOS estruturados (um por jogador citado) com o
  // conjunto fundamental de stats da competição — assim os mercados de jogador ficam cobertos
  // já na coleta e o portão de completude consegue checar campo a campo depois.
  const _pStat='{"nome":"","posicao":"","jogos":null,"minutos":null,"gols":null,"assistencias":null,"finalizacoes_por_jogo":null,"finalizacoes_no_gol_por_jogo":null,"grandes_chances_ou_passes_decisivos_por_jogo":null,"cartoes_amarelos":null,"cartoes_vermelhos":null,"a_um_amarelo_da_suspensao":null,"faltas_cometidas_por_jogo":null,"faltas_sofridas_por_jogo":null,"desarmes_por_jogo":null,"cobra_penaltis_ou_faltas":"","rating_medio":null,"observacao":""}';
  const _teamTpl='{"nome":"","tecnico":"","ranking_fifa":"","resultados_recentes":[],"xg_marcado":null,"xg_sofrido":null,"escanteios_por_jogo":null,"escanteios_sofridos_por_jogo":null,"desfalques":[],"escalacao_provavel":"","formacao":"","onze_provavel":[{"nome":"","posicao":""}],"banco":[],"jogadores_chave":['+_pStat+'],"estilo_ofensivo":"","vulnerabilidades_defensivas":[]}';
  const SCHEMA='{"mandante":'+_teamTpl+',"visitante":'+_teamTpl+',"contexto_fase":"","grupo_classificacao":"","lacunas":[]}';
  // web_search é o maior consumidor de tokens (cada resultado traz o conteúdo das páginas).
  // TODAS as dimensões (lesões/escalação, xG, tática, forma) são cobertas em QUALQUER
  // esforço: a 1ª busca é abrangente e a forma já vem do ESPN/API de graça. O esforço só
  // adiciona buscas que APROFUNDAM/cruzam fontes — não destrava tópicos. A profundidade de
  // raciocínio vem do thinking budget da Fase 2, separada da coleta.
  const _cl=compLabel(_activeCompId);
  const _season=typeof compSeasonLabel==='function'?compSeasonLabel(_activeCompId):'';
  const topics=hasFd?[
    `"[Mandante] [Visitante] ${_cl} técnico atual posição tabela lesões suspensões escalação provável xG estilo tático" — Sofascore, FotMob, Transfermarkt, fbref`,
    `"[Mandante] desfalques e [Visitante] vulnerabilidades defensivas ${_cl} esquema tático treinador" — imprensa esportiva, Sofascore`,
    `"[Mandante] [Visitante] ${_cl} fbref xG expected goals estatísticas avançadas" — fbref, Sofascore`
  ]:[
    `"[Mandante] [Visitante] ${_cl} técnico atual forma recente resultados lesões escalação provável" — ESPN, Sofascore, Transfermarkt`,
    `"[Mandante] [Visitante] ${_cl} xG estilo tático vulnerabilidades defensivas treinador" — fbref, Sofascore`,
    `"${_cl} ${_season} classificação tabela estatísticas" — ESPN, fbref, imprensa`
  ];
  const _maxUses=Math.max(1,Math.min(maxSearches??topics.length,topics.length));
  const _dir=topics.slice(0,_maxUses).map((s,i)=>`${'①②③④'[i]} ${s}`).join('\n');
  // Fontes hiperconfiáveis: TEXTO-GUIA no prompt (orienta o modelo a buscar/priorizar nelas).
  // NÃO usar como allowed_domains — a allowlist por domínio já degradou a coleta e quebrou o
  // formato estruturado 2x (ver worldcupagent-web-search-regression). Aqui é só dica, não filtro.
  const _srcNote='FONTES (PRIORIZE P1; use P2 se necessário — não descarte fonte boa só por não ser P1): '
    +'P1 imprensa: BBC Sport, The Guardian, Sky Sports, The Athletic, ESPN FC, Reuters. '
    +'P1 stats: Sofascore e FotMob (métricas por jogo: rating, finalizações, grandes chances, posse, xG, forma, escalações); FBref/StatsBomb, Opta/The Analyst, WhoScored, Understat. '
    +'P1 oficiais: federações e sites de clubes/competições. '
    +'P2: Transfermarkt, Goal, Marca, AS, L\'Équipe, Gazzetta, Kicker, GE/Lance/UOL (BR/CONMEBOL), Fabrizio Romano (@FabrizioRomano) para notícias de última hora. '
    +'Em conflito, prevalece a mais recente e oficial entre as fontes citadas.';
  const _coverNote='IMPORTANTE: preencha TODOS os campos do schema (técnico, posição na tabela, lesões/desfalques, escalação, xG, estilo ofensivo, vulnerabilidades) a partir do que cada busca retornar e dos dados já fornecidos — cada busca cobre várias dimensões. A posição na tabela de '+_cl+' é pública — sempre preencha "ranking_fifa" com posição/pontos (ex.: "5º · 28 pts"); não o deixe vazio.\n'
    +'RESULTADOS JÁ DISPUTADOS: os placares dos jogos que cada time já fez em '+_cl+' são FATOS DUROS e costumam estar no bloco de dados reais fornecido (ESPN/TheSportsDB) — extraia o PLACAR EXATO de cada um para "resultados_recentes". Nunca escreva "resultado inferido do contexto": ou o placar está nos dados/busca (use o número), ou registre honestamente que não veio.\n'
    +'PRIORIDADE MÁXIMA DE COLETA — técnico atual e escalação/onze provável: são informação PÚBLICA e quase sempre encontrável (imprensa esportiva, escalações prováveis pré-jogo, Sofascore/FotMob, federações). BUSQUE ativamente e preencha "tecnico" e "escalacao_provavel" a partir do que a busca retornar. Deixá-los vazios é FALHA DE BUSCA, não uma lacuna legítima — se a sua busca não trouxe, refine a busca (ex.: "[Seleção] técnico atual 2026", "[Seleção] escalação provável [adversário]"). Só deixe vazio se a busca realmente não retornar NADA sobre eles. NUNCA preencha de memória (pode estar desatualizado) — o valor tem de vir dos resultados da busca.\n'
    +'ESCALAÇÃO ESTRUTURADA (alimenta o mapa de campo do app): além do texto em "escalacao_provavel", preencha "formacao" (ex.: "4-3-3"), "onze_provavel" como LISTA DE 11 OBJETOS {nome, posicao} na ordem goleiro→defesa→meio→ataque, com posicao abreviada (GOL, ZAG, LAD, LAE, VOL, MEI, PON, ATA), e "banco" com os suplentes prováveis que a fonte citar (lista de nomes; vazio se a fonte não trouxer). As páginas de escalação provável (Sofascore/imprensa) publicam onze + banco — extraia dos resultados, nunca de memória.\n'
    +'ESCANTEIOS POR TIME (alimenta a aba Escanteios): preencha "escanteios_por_jogo" (média de escanteios a FAVOR por jogo) e "escanteios_sofridos_por_jogo" (média CONTRA por jogo) de cada clube/seleção, com números REAIS da competição (Sofascore/FotMob publicam "corners per match"). Ex.: 6.2 e 3.8. Deixe null só se a busca realmente não trouxer; nunca invente de memória.\n'
    +'PROIBIDO INVENTAR NOME DE JOGADOR (erro gravíssimo, nunca aceitável): cada nome em "onze_provavel", "banco" e "escalacao_provavel" TEM de aparecer literalmente nos resultados de busca. Nunca escreva um jogador "como opção/alternativa" (ex.: "X ou Y") a menos que AMBOS os nomes venham da mesma fonte para aquele slot. Se não tiver certeza de quem ocupa uma posição, escreva "a confirmar" — jamais preencha com um nome vindo de memória, mesmo que pareça plausível pelo estilo do time; jogadores saem por empréstimo, troca de clube ou lesão entre rodadas, e a memória do treino pode estar desatualizada ou simplesmente errada.\n'
    +'MÉTRICAS POR JOGADOR (Sofascore/FotMob) — "jogadores_chave" é uma LISTA DE OBJETOS: um objeto por jogador citado (mire nos 3-5 titulares mais decisivos de cada time). Cada objeto tem o CONJUNTO FUNDAMENTAL OBRIGATÓRIO de campos, preenchidos com números REAIS de '+_cl+' (temporada atual) vindos da busca: "nome", "posicao", "jogos", "minutos", "gols", "assistencias", "finalizacoes_por_jogo", "finalizacoes_no_gol_por_jogo", "grandes_chances_ou_passes_decisivos_por_jogo", "cartoes_amarelos", "cartoes_vermelhos", "a_um_amarelo_da_suspensao" (true/false), "faltas_cometidas_por_jogo", "faltas_sofridas_por_jogo", "desarmes_por_jogo", "cobra_penaltis_ou_faltas" (ex.: "pênaltis e faltas"/"faltas"/"não"), "rating_medio", e "observacao" (texto livre p/ o que não couber acima — p/ goleiros use aqui: defesas/jogo, clean sheets, gols sofridos; e sequências/lesões relevantes). Esses dados fundamentam os mercados de jogador e são PÚBLICOS e quase sempre encontráveis — deixar os campos-chave (gols, finalizacoes_no_gol_por_jogo, cartoes_amarelos, rating_medio) vazios para um titular citado é FALHA DE BUSCA, não lacuna legítima: refine a busca (ex.: "[Jogador] cartões '+_cl+' Sofascore", "[Jogador] finalizações por jogo FotMob") antes de desistir. Use null (não invente) só quando a busca realmente não trouxer aquele número; SÓ use valores da busca, nunca de memória, e descarte implausíveis (jogos de liga + copas; não invente totais impossíveis).\n'
    +'VALIDAÇÃO CRUZADA NA COLETA: quando um mesmo fato (técnico, escalação, xG, placar) aparecer em 2+ fontes independentes, cite as fontes juntas no próprio valor (ex.: "4-3-3 (Sofascore, FBref)"); quando vier de UMA única fonte, cite só ela — a etapa de análise usa essa marcação para calibrar a confiança. Se duas fontes CONFLITAREM, registre o conflito em "lacunas" com ambas as versões.\n'
    +_srcNote+'\n'+SOURCE_RULE+'\n'+GROUNDING_RULE;
  const SP=hasFd
    ?`Você é um agente de pesquisa de futebol (${compLabel(_activeCompId)}). Data: ${currentDateFull()}.
CLASSIFICAÇÃO, RESULTADOS E FORMA RECENTE DO CAMPEONATO JÁ VÊM VIA API abaixo — não pesquise isso.
Faça NO MÁXIMO ${_maxUses} busca(s) para complementar:
${_dir}
${_coverNote}
Retorne APENAS JSON válido:
${SCHEMA}`
    :`Você é um agente de pesquisa de futebol (${compLabel(_activeCompId)}). Data: ${currentDateFull()}.
Faça NO MÁXIMO ${_maxUses} busca(s) (uma por linha) e retorne APENAS JSON válido:
${SCHEMA}
BUSCAS:
${_dir}
${_coverNote}
Extraia placares, classificação de ${compLabel(_activeCompId)}, xG e estilo diretamente das páginas. RESPONDA APENAS COM O JSON.`;
  const msgs=[{role:'user',content:hasFd?`${query}\n\nDADOS DA API:\n${fdCtx}`:query}];
  let accIn=0,accOut=0; // acumula uso por todas as iterações (busca + resposta)
  // Evidência de busca em TEXTO-CLARO (títulos + URLs dos resultados). O CORPO das páginas
  // vem cifrado/opaco no web_search (usado só p/ citação), então guardamos o que é legível —
  // serve de corpus para o portão anti-alucinação cruzar nomes de jogadores antes de renderizar.
  const _evi=[];
  // Filtragem dinâmica (opt-in): Sonnet + web_search_20260209 filtra as páginas antes de
  // entrarem no contexto. Auto-cura: se o acesso não suportar (400), desliga e cai pro
  // Haiku + web_search básico (caminho provado) sem quebrar a coleta.
  let _useModel=getDynSearch()?'claude-sonnet-4-6':'claude-haiku-4-5-20251001';
  let _useTool=getDynSearch()?'web_search_20260209':'web_search_20250305';
  let _dynActive=getDynSearch();
  // Structured outputs na coleta: JSON garantido pela API (testado ao vivo com
  // Haiku 4.5 e Sonnet 4.6 + web_search). Auto-cura: 400 → desliga e repete.
  let _soP1=true;
  for(let i=0;i<5;i++){
    if(signal.aborted)throw new Error('cancelled');
    const mkBody=()=>JSON.stringify({model:_useModel,max_tokens:3000,system:SP,messages:msgs,tools:[{type:_useTool,name:'web_search',max_uses:_maxUses}],...(_soP1?{output_config:{format:{type:'json_schema',schema:FACTS_SCHEMA}}}:{})});
    let res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body:mkBody(),signal});
    // Auto-cura em 400, do reparo mais barato para o mais destrutivo:
    // 1º structured outputs (flag local, não muda modelo nem persiste nada);
    // só se o 400 PERSISTIR desligamos a filtragem dinâmica (persistida + rebaixa Sonnet→Haiku).
    // Ordem importa: um 400 causado pelo structured outputs não pode sacrificar a dynSearch por engano.
    if(res.status===400&&_soP1){
      _soP1=false; // structured outputs não suportado neste acesso/combinação → caminho provado
      res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body:mkBody(),signal});
    }
    if(res.status===400&&_dynActive){
      setDynSearch(false);_dynActive=false;_useModel='claude-haiku-4-5-20251001';_useTool='web_search_20250305';
      try{toast('Filtragem dinâmica indisponível neste acesso — usando busca padrão.');}catch{}
      res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body:mkBody(),signal});
    }
    parseRateLimitHeaders(res);if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Erro ${res.status}`);}
    const data=await res.json();
    const u=data.usage||{};accIn+=u.input_tokens||0;accOut+=u.output_tokens||0;
    // Colhe títulos/URLs dos resultados de busca desta iteração (texto-claro).
    try{(data.content||[]).forEach(b=>{
      if(b&&b.type==='web_search_tool_result'&&Array.isArray(b.content))
        b.content.forEach(r=>{if(r&&r.title)_evi.push(r.title);if(r&&r.url)_evi.push(r.url);});
    });}catch(_){}
    onUpdate({inTokens:accIn,outTokens:accOut,status:'Pesquisando dados…',phase:1});
    if(data.stop_reason==='end_turn'){
      const txt=data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
      const m=txt.match(/\{[\s\S]*\}/);
      let rawFacts=null;try{if(m)rawFacts=JSON.parse(m[0]);}catch{}
      // Anexa o corpus de evidência (dados da API + títulos/URLs de busca), minúsculo, p/ o
      // portão anti-alucinação. Não-enumerável: não polui o JSON exibido nem a persistência.
      if(rawFacts&&typeof rawFacts==='object'){try{Object.defineProperty(rawFacts,'_evidence',{value:((hasFd?fdCtx:'')+'\n'+_evi.join('\n')).toLowerCase(),enumerable:false,configurable:true});}catch(_){}}
      return{rawFacts,inTokens:accIn,outTokens:accOut};
    }
    if(data.stop_reason==='tool_use'){
      msgs.push({role:'assistant',content:data.content});
      msgs.push({role:'user',content:data.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:''}))});
    }else if(data.stop_reason==='pause_turn'){
      msgs.push({role:'assistant',content:data.content}); // retoma a busca server-side (filtragem dinâmica)
    }else break;
  }
  return{rawFacts:null,inTokens:accIn,outTokens:accOut};
}
// Fecha chaves/colchetes pendentes e aspas abertas → recupera JSON cortado no max_tokens.
function repairJson(s){
  let t=s.replace(/,\s*$/,'');
  let inStr=false,esc=false;const stack=[];
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(esc){esc=false;continue;}
    if(c==='\\'){esc=true;continue;}
    if(c==='"'){inStr=!inStr;continue;}
    if(inStr)continue;
    if(c==='{'||c==='[')stack.push(c);
    else if(c==='}'||c===']')stack.pop();
  }
  if(inStr)t+='"';
  t=t.replace(/,\s*$/,'');
  while(stack.length)t+=(stack.pop()==='{'?'}':']');
  return t;
}
// Extrai o objeto JSON da resposta do modelo, tolerando markdown e truncamento.
function parseAnalysisJson(raw){
  const clean=(raw||'').replace(/```(?:json)?\s*/gi,'').replace(/```/g,'');
  const start=clean.indexOf('{');if(start<0)return null;
  const lastClose=clean.lastIndexOf('}');
  if(lastClose>start){
    const cand=clean.slice(start,lastClose+1);
    try{return JSON.parse(cand);}catch{}
    try{return JSON.parse(repairJson(cand));}catch{}
  }
  // Truncado no max_tokens (sem } final): repara do primeiro { até o fim.
  try{return JSON.parse(repairJson(clean.slice(start)));}catch{}
  return null;
}
function buildEnrichedQuery(query,rawFacts,ctx){
  const parts=[query];
  if(rawFacts){parts.push('\nDADOS PRÉ-COLETADOS (não pesquise, calcule com base nisto):');parts.push(JSON.stringify(rawFacts,null,2));}
  if(ctx){parts.push('\nCONTEXTO DO TORNEIO (standings e resultados recentes):');parts.push(ctx);}
  return parts.join('\n');
}

// ─── Portão de completude por jogador (garantia por CÓDIGO, não por prompt) ───
// Depois da coleta, checa se os titulares citados têm os stats-chave preenchidos.
// Se faltar, dispara UMA busca-alvo (Haiku + web_search) só para os campos vazios e
// funde o resultado no rawFacts. Custo ZERO quando a coleta já veio completa (só
// inspeciona o JSON em memória — nenhuma chamada de API).
const _PLAYER_CRITICAL=['gols','finalizacoes_no_gol_por_jogo','cartoes_amarelos','rating_medio'];
const _PLAYER_FIELDS=['posicao','jogos','minutos','gols','assistencias','finalizacoes_por_jogo','finalizacoes_no_gol_por_jogo','grandes_chances_ou_passes_decisivos_por_jogo','cartoes_amarelos','cartoes_vermelhos','a_um_amarelo_da_suspensao','faltas_cometidas_por_jogo','faltas_sofridas_por_jogo','desarmes_por_jogo','cobra_penaltis_ou_faltas','rating_medio','observacao'];
// Fatos de TIME públicos e estáveis que NUNCA devem virar lacuna — o portão os
// busca deterministicamente se a coleta vier vazia (mesmo racional do ranking na regra).
const _TEAM_CRITICAL=['ranking_fifa'];
function _pgEmpty(v){return v===null||v===undefined||v==='';}
function _pgNorm(s){return String(s||'').trim().toLowerCase();}
function _mergePlayerPatch(rawFacts,patchArr){
  const byName={};patchArr.forEach(p=>{if(p&&p.nome)byName[_pgNorm(p.nome)]=p;});
  [rawFacts.mandante,rawFacts.visitante].filter(Boolean).forEach(tm=>{
    (Array.isArray(tm.jogadores_chave)?tm.jogadores_chave:[]).forEach(p=>{
      if(!p||typeof p!=='object')return;
      const src=byName[_pgNorm(p.nome)];if(!src)return;
      _PLAYER_FIELDS.forEach(f=>{if(_pgEmpty(p[f])&&!_pgEmpty(src[f]))p[f]=src[f];});
    });
  });
}
function _mergeTeamPatch(rawFacts,timesArr){
  if(!Array.isArray(timesArr))return;
  const byName={};timesArr.forEach(t=>{if(t&&t.nome)byName[_pgNorm(t.nome)]=t;});
  [rawFacts.mandante,rawFacts.visitante].filter(Boolean).forEach(tm=>{
    if(!tm||!tm.nome)return;
    const src=byName[_pgNorm(tm.nome)];if(!src)return;
    _TEAM_CRITICAL.forEach(f=>{if(_pgEmpty(tm[f])&&!_pgEmpty(src[f]))tm[f]=src[f];});
  });
}
async function fillDataGaps(rawFacts,apiKey,signal,onUpdate){
  try{
    if(!rawFacts)return{inTokens:0,outTokens:0};
    const gaps=[];
    [rawFacts.mandante,rawFacts.visitante].filter(Boolean).forEach(tm=>{
      (Array.isArray(tm.jogadores_chave)?tm.jogadores_chave:[]).forEach(p=>{
        if(!p||typeof p!=='object'||!p.nome)return;
        const missing=_PLAYER_CRITICAL.filter(f=>_pgEmpty(p[f]));
        if(missing.length)gaps.push({nome:p.nome,faltando:missing});
      });
    });
    // Fatos de TIME faltantes (posição na tabela): público — não pode virar lacuna.
    const teamGaps=[];
    [rawFacts.mandante,rawFacts.visitante].filter(Boolean).forEach(tm=>{
      if(!tm||!tm.nome)return;
      const missing=_TEAM_CRITICAL.filter(f=>_pgEmpty(tm[f]));
      if(missing.length)teamGaps.push({nome:tm.nome,faltando:missing});
    });
    if(!gaps.length&&!teamGaps.length)return{inTokens:0,outTokens:0}; // completo → custo zero
    onUpdate&&onUpdate({status:'Completando dados faltantes…',phase:1});
    const partes=[];
    const _clGap=compLabel(_activeCompId);
    if(teamGaps.length)partes.push('CLUBES (posição na tabela de '+_clGap+' é pública — ex.: "5º · 28 pts"):\n'+teamGaps.map(g=>`- ${g.nome}: faltam ${g.faltando.join(', ')}`).join('\n'));
    if(gaps.length)partes.push('JOGADORES:\n'+gaps.map(g=>`- ${g.nome}: faltam ${g.faltando.join(', ')}`).join('\n'));
    const SP=`Você preenche dados FALTANTES de ${_clGap} buscando na web (tabela/posição · Sofascore/FotMob/FBref/imprensa). Retorne APENAS JSON válido: {"times":[{"nome":"","ranking_fifa":""}],"jogadores":[{"nome":"","posicao":"","jogos":null,"minutos":null,"gols":null,"assistencias":null,"finalizacoes_por_jogo":null,"finalizacoes_no_gol_por_jogo":null,"grandes_chances_ou_passes_decisivos_por_jogo":null,"cartoes_amarelos":null,"cartoes_vermelhos":null,"a_um_amarelo_da_suspensao":null,"faltas_cometidas_por_jogo":null,"faltas_sofridas_por_jogo":null,"desarmes_por_jogo":null,"cobra_penaltis_ou_faltas":"","rating_medio":null,"observacao":""}]}. Preencha ao menos os campos pedidos. Use null/"" quando a busca não trouxer; NUNCA invente de memória; descarte implausíveis (totais absurdos de jogos/gols na temporada).`;
    const msgs=[{role:'user',content:`DATA: ${currentDateFull()}. Busque e preencha os dados faltantes em ${_clGap}:\n${partes.join('\n\n')}`}];
    let accIn=0,accOut=0;
    for(let i=0;i<3;i++){
      if(signal.aborted)break;
      const body=JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1500,system:SP,messages:msgs,tools:[{type:'web_search_20250305',name:'web_search',max_uses:2}]});
      const res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body,signal});
      if(!res.ok)break;
      const data=await res.json();const u=data.usage||{};accIn+=u.input_tokens||0;accOut+=u.output_tokens||0;
      if(data.stop_reason==='end_turn'){
        const txt=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
        const m=txt.match(/\{[\s\S]*\}/);let patch=null;try{if(m)patch=JSON.parse(m[0]);}catch{}
        if(patch){if(Array.isArray(patch.jogadores))_mergePlayerPatch(rawFacts,patch.jogadores);if(Array.isArray(patch.times))_mergeTeamPatch(rawFacts,patch.times);}
        break;
      }
      if(data.stop_reason==='tool_use'){
        msgs.push({role:'assistant',content:data.content});
        msgs.push({role:'user',content:data.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:''}))});
      }else if(data.stop_reason==='pause_turn'){msgs.push({role:'assistant',content:data.content});}
      else break;
    }
    return{inTokens:accIn,outTokens:accOut};
  }catch(e){if(e&&(e.name==='AbortError'||e.message==='cancelled'))throw e;return{inTokens:0,outTokens:0};}
}

// ─── Portão anti-alucinação de nome (garantia por CÓDIGO, não por prompt) ──────
// A instrução de prompt (GROUNDING_RULE) já pedia para não inventar jogador, e mesmo assim
// escapou (ex.: Di María "convocado" mesmo já fora do clube). Aqui o CÓDIGO cruza cada
// nome da escalação contra uma verificação com busca fresca — e ESCOVA os comprovadamente
// fora do elenco atual ANTES da Fase 2 usar o nome. Só marca inválido quem a busca confirma
// que NÃO está no elenco (aposentado/cortado/inexistente); "não achei nada" NÃO invalida
// (evita falso-positivo que apagaria titular real). Mesmo racional/estrutura do fillDataGaps.
function _lvKey(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function _lvCollectNames(tm){
  if(!tm)return[];
  const out=[],push=n=>{const c=_cleanName(n);if(c&&c.length>1&&!/^a confirmar$/i.test(c))out.push(c);};
  (Array.isArray(tm.onze_provavel)?tm.onze_provavel:[]).forEach(p=>push(typeof p==='string'?p:(p&&p.nome)));
  (Array.isArray(tm.banco)?tm.banco:[]).forEach(push);
  const rows=_lineupRowsFromText(tm.escalacao_provavel||'',tm.formacao||'');
  if(rows)rows.flat().forEach(p=>push(p.nome));
  const seen=new Set(),ded=[];
  out.forEach(n=>{const k=_lvKey(n);if(k&&!seen.has(k)){seen.add(k);ded.push(n);}});
  return ded;
}
// Escova um time: onze_provavel inválido → "A confirmar" (mantém posição p/ não desalinhar o
// mapa); banco inválido → removido; escalacao_provavel → nome trocado por "a confirmar".
function _lvScrubTeam(tm,invalidKeys){
  if(!tm||!invalidKeys.size)return[];
  const removed=[];
  if(Array.isArray(tm.onze_provavel))tm.onze_provavel.forEach(p=>{
    const nm=typeof p==='string'?p:(p&&p.nome);if(!nm)return;
    if(invalidKeys.has(_lvKey(nm))){removed.push(nm);if(typeof p==='object')p.nome='A confirmar';}
  });
  if(Array.isArray(tm.onze_provavel))tm.onze_provavel=tm.onze_provavel.map(p=>typeof p==='string'&&invalidKeys.has(_lvKey(p))?{nome:'A confirmar',posicao:''}:p);
  if(Array.isArray(tm.banco))tm.banco=tm.banco.filter(n=>{const bad=invalidKeys.has(_lvKey(n));if(bad)removed.push(n);return!bad;});
  if(tm.escalacao_provavel&&removed.length){
    removed.forEach(nm=>{const re=new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');tm.escalacao_provavel=tm.escalacao_provavel.replace(re,'a confirmar');});
  }
  return[...new Set(removed)];
}
async function verifyLineupNames(rawFacts,apiKey,signal,onUpdate){
  try{
    if(!rawFacts)return{inTokens:0,outTokens:0};
    const mNames=_lvCollectNames(rawFacts.mandante),vNames=_lvCollectNames(rawFacts.visitante);
    if(!mNames.length&&!vNames.length)return{inTokens:0,outTokens:0}; // sem escalação → nada a checar
    const cap=a=>a.slice(0,16); // teto de nomes por time (mantém a chamada barata)
    const mN=cap(mNames),vN=cap(vNames);
    const mNome=(rawFacts.mandante&&rawFacts.mandante.nome)||'mandante',vNome=(rawFacts.visitante&&rawFacts.visitante.nome)||'visitante';
    onUpdate&&onUpdate({status:'Verificando escalações…',phase:1});
    const evi=(rawFacts._evidence||'').slice(0,3000);
    const _clLv=compLabel(_activeCompId);
    const SP=`Você VERIFICA elencos de ${_clLv} com busca na web. Para CADA jogador listado, confirme se ele está ATUALMENTE no clube indicado e disponível (no elenco) para ${_clLv}. Responda APENAS JSON: {"jogadores":[{"nome":"","time":"mandante|visitante","no_elenco":true|false|null}]}. `
      +'no_elenco=false SOMENTE se a busca mostrar que ele NÃO está no elenco atual (aposentado do clube, cortado, ou nome que não corresponde a jogador real desse clube). no_elenco=true se achar o jogador no elenco/escalação atual. no_elenco=null se não achar evidência suficiente — NUNCA invalide por falta de evidência, só com evidência de ausência. Não invente jogadores nem substitutos.';
    const lista=[...mN.map(n=>`- ${n} (${mNome})`),...vN.map(n=>`- ${n} (${vNome})`)].join('\n');
    const msgs=[{role:'user',content:`DATA: ${currentDateFull()}. Jogo: ${mNome} x ${vNome}. Verifique no elenco atual (${_clLv}):\n${lista}${evi?`\n\nEVIDÊNCIA JÁ COLETADA (títulos/links de busca — use como pista, confirme com nova busca):\n${evi}`:''}`}];
    let accIn=0,accOut=0,verif=null;
    for(let i=0;i<3;i++){
      if(signal.aborted)break;
      const body=JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1200,system:SP,messages:msgs,tools:[{type:'web_search_20250305',name:'web_search',max_uses:3}]});
      const res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body,signal});
      if(!res.ok)break;
      const data=await res.json();const u=data.usage||{};accIn+=u.input_tokens||0;accOut+=u.output_tokens||0;
      if(data.stop_reason==='end_turn'){
        const txt=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
        const m=txt.match(/\{[\s\S]*\}/);try{if(m)verif=JSON.parse(m[0]);}catch{}
        break;
      }
      if(data.stop_reason==='tool_use'){
        msgs.push({role:'assistant',content:data.content});
        msgs.push({role:'user',content:data.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:''}))});
      }else if(data.stop_reason==='pause_turn'){msgs.push({role:'assistant',content:data.content});}
      else break;
    }
    if(verif&&Array.isArray(verif.jogadores)){
      const invalid=new Set(verif.jogadores.filter(j=>j&&j.no_elenco===false&&j.nome).map(j=>_lvKey(j.nome)));
      if(invalid.size){
        const rm=[..._lvScrubTeam(rawFacts.mandante,invalid),..._lvScrubTeam(rawFacts.visitante,invalid)];
        if(rm.length){
          rawFacts.lacunas=Array.isArray(rawFacts.lacunas)?rawFacts.lacunas:[];
          rawFacts.lacunas.push(`Nome(s) retirado(s) da escalação por não constarem no elenco atual de ${compLabel(_activeCompId)} (verificação automática): ${rm.join(', ')}.`);
        }
      }
    }
    return{inTokens:accIn,outTokens:accOut};
  }catch(e){if(e&&(e.name==='AbortError'||e.message==='cancelled'))throw e;return{inTokens:0,outTokens:0};}
}

// ─── Fase 3 · Verificador (auditor pré-render) ────────────────────────────
// Papel novo no pipeline: um crítico BARATO (Haiku, sem web_search) que recebe os
// fatos coletados + a análise pronta e aponta problemas OBJETIVOS antes de renderizar.
// Ele NUNCA reescreve a análise (modelo barato reescrevendo o analista degradaria o
// resultado): devolve ressalvas, e a fusão é feita por CÓDIGO — anota em "incerteza",
// rebaixa confiança mal calibrada e carimba o selo de auditoria no card.
function _applyAudit(parsed,v){
  if(!parsed||!v)return 0;
  const rs=Array.isArray(v.ressalvas)?v.ressalvas.filter(r=>r&&r.problema).slice(0,4):[];
  if(rs.length){
    parsed.incerteza=Array.isArray(parsed.incerteza)?parsed.incerteza:[];
    rs.forEach(r=>parsed.incerteza.push({fator:`Auditoria (${r.gravidade==='alta'?'grave':'atenção'}): ${r.problema}`,impacto:r.onde||'apontado na verificação automática pré-entrega'}));
  }
  if(v.rebaixar_confianca===true&&parsed.confianca_geral==='alto')parsed.confianca_geral='medio';
  parsed._audit={veredito:rs.length?'com_ressalvas':'aprovada',n:rs.length};
  return rs.length;
}
async function verifyAnalysis(parsed,rawFacts,apiKey,signal,onUpdate){
  try{
    if(!parsed)return null;
    onUpdate&&onUpdate({status:'Auditando análise…',phase:2});
    const SP=`Você é um AUDITOR de análises de futebol multi-campeonato (foco: ${compLabel(_activeCompId)}). Recebe (A) FATOS COLETADOS e (B) a ANÁLISE final. NÃO refaça a análise; aponte apenas problemas OBJETIVOS e verificáveis nos dois blocos: `
      +'1) INCONSISTÊNCIA NUMÉRICA — probabilidade de ticket incompatível com os lambdas declarados; múltipla cuja probabilidade combinada não bate com o produto das pernas; 1X2 que não soma ~100%. '
      +'2) FALTA DE LASTRO — afirmação factual central de (B) apresentada como MEDIDA/oficial que NÃO aparece em (A) (possível alucinação). Se (A) estiver vazio, pule este critério. NÃO é falta de lastro um valor rotulado como ESTIMADO (ex.: "xG estimado ~1.6 · de finalizações/grandes chances") derivado de proxies presentes em (A) — estimar é função legítima do analista; só marque se a estimativa NÃO tiver proxy nenhum em (A) ou for vendida como valor oficial. '
      +'3) CONFIANÇA MAL CALIBRADA — "alto"/"alta" apoiada em fonte única ou convivendo com lacunas graves declaradas. '
      +'4) VALOR IMPLAUSÍVEL — xG fora de 0–4, mais de ~45 jogos de liga para um jogador na temporada (sem copas), rating fora de 4–10, probabilidade fora de 1–95%. '
      +'5) CONTRADIÇÃO INTERNA entre seções de (B). '
      +'Seja conservador: só aponte o que é objetivo; NADA de opinião tática. Máximo 4 ressalvas, as mais graves primeiro. '
      +'Responda APENAS JSON: {"veredito":"aprovada|com_ressalvas","rebaixar_confianca":true|false,"ressalvas":[{"gravidade":"alta|media","problema":"","onde":""}]}';
    const body=JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:800,system:SP,
      messages:[{role:'user',content:`(A) FATOS COLETADOS:\n${JSON.stringify(rawFacts||{})}\n\n(B) ANÁLISE FINAL:\n${JSON.stringify(parsed)}`}]});
    const res=await fetch(getApiBase()+'/v1/messages',{method:'POST',headers:getReqHeaders(apiKey),body,signal});
    if(!res.ok)return null;
    const data=await res.json();const u=data.usage||{};
    const txt=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    const m=txt.match(/\{[\s\S]*\}/);let v=null;try{if(m)v=JSON.parse(m[0]);}catch{}
    if(v)_applyAudit(parsed,v);
    return{inTokens:u.input_tokens||0,outTokens:u.output_tokens||0};
  }catch(e){if(e&&(e.name==='AbortError'||e.message==='cancelled'))throw e;return null;}
}
// ─── Structured Outputs (output_config.format · json_schema) — FASE 1 ────
// Garante JSON 100% válido direto da API na COLETA. Testado AO VIVO via Worker
// (07/2026): Haiku 4.5 e Sonnet 4.6, com thinking budget_tokens, web_search e
// stream — todos aceitam. NÃO confundir com output_config.effort (que causou
// 400 no passado); aqui é o campo "format", validado. Restrições do recurso:
// additionalProperties:false obrigatório; sem min/max; anuláveis via anyOf.
const _soStr={type:'string'};
const _soStrArr={type:'array',items:{type:'string'}};
const _soNullable=t=>({anyOf:[{type:t},{type:'null'}]});
function _soObj(props){return{type:'object',properties:props,required:Object.keys(props),additionalProperties:false};}
// Fase 1 (coleta): espelho do SCHEMA textual do gatherFacts.
// jogadores_chave agora é uma lista de objetos estruturados (15 stats fundamentais + nome/posição/observação).
const _soN=()=>_soNullable('number');
const _soPlayer=()=>_soObj({nome:_soStr,posicao:_soStr,jogos:_soN(),minutos:_soN(),gols:_soN(),assistencias:_soN(),finalizacoes_por_jogo:_soN(),finalizacoes_no_gol_por_jogo:_soN(),grandes_chances_ou_passes_decisivos_por_jogo:_soN(),cartoes_amarelos:_soN(),cartoes_vermelhos:_soN(),a_um_amarelo_da_suspensao:_soNullable('boolean'),faltas_cometidas_por_jogo:_soN(),faltas_sofridas_por_jogo:_soN(),desarmes_por_jogo:_soN(),cobra_penaltis_ou_faltas:_soStr,rating_medio:_soN(),observacao:_soStr});
const _soTeamP1=()=>_soObj({nome:_soStr,tecnico:_soStr,ranking_fifa:_soStr,resultados_recentes:_soStrArr,xg_marcado:_soNullable('number'),xg_sofrido:_soNullable('number'),desfalques:_soStrArr,escalacao_provavel:_soStr,formacao:_soStr,onze_provavel:{type:'array',items:_soObj({nome:_soStr,posicao:_soStr})},banco:_soStrArr,jogadores_chave:{type:'array',items:_soPlayer()},estilo_ofensivo:_soStr,vulnerabilidades_defensivas:_soStrArr});
const FACTS_SCHEMA=_soObj({mandante:_soTeamP1(),visitante:_soTeamP1(),contexto_fase:_soStr,grupo_classificacao:_soStr,lacunas:_soStrArr});
// Fase 2 (análise): structured outputs NÃO é usado. Testado ao vivo (07/2026):
// o schema completo da análise (19 campos, confronto_tatico aninhado etc.) excede
// o limite de gramática compilada da API — erro "The compiled grammar is too large"
// em Haiku, Sonnet e Opus, mesmo sem enums/anyOf. Bisect: só 15 dos 19 campos
// de topo cabem. Podar campos não é opção: com additionalProperties:false o modelo
// ficaria PROIBIDO de emitir as seções podadas (a UI perderia painéis inteiros).
// A Fase 2 segue com o caminho provado: prompt-contrato + parseAnalysisJson/repairJson
// + retry sem thinking. NÃO reintroduzir output_config na Fase 2 sem reteste ao vivo.

/* prompts: getSystemPromptPhase2 → js/analysis/prompts.js */

function _chatNeedsLiveData(q,hasAtts){
  if(hasAtts)return true;
  const s=String(q||'');
  return /\b(resultado|placar|ganh|venc|perd|empat|gol|classifica|tabela|como foi|encerr|termin|acab|quanto foi|vencedor|eliminad|avan[cç]|pr[oó]xim|quando joga|agenda|calend|ao vivo|jogou|marcou|sofreu|saldo|l[ií]der|ponto|opini[aã]o|achou|jogo|partida|amistoso|sele[cç][aã]o|acr[eé]scimo|acr[eé]scimos|hoje|ontem|agora|final|ft\b|live)/i.test(s)
    || /\b(argentina|brasil|fran[cç]a|alemanha|inglaterra|espanha|portugal|uruguai|colombia|m[eé]xico|eua|estados unidos)\b/i.test(s);
}
/** Pedido que exige PLACAR verificado (tolerância zero a alucinação). */
function _chatNeedsScoreVerification(q){
  const s=String(q||'');
  return /\b(resultado|placar|ganh|venc|perd|empat|gol|como foi|encerr|termin|acab|quanto foi|vencedor|amistoso|acr[eé]scimo|hoje|ontem|jogo da|jogo do|partida|opini[aã]o.*jogo|jogo.*opini[aã]o)/i.test(s)
    || (/\bjogo\b/i.test(s)&&/\b(argentina|brasil|fran[cç]a|alemanha|inglaterra|espanha|sele[cç])/i.test(s));
}

// ── Identidade do jogo: NUNCA o modelo pode "chutar" qual partida é "o jogo de hoje" ──
const _KNOWN_SIDES=/\b(flamengo|palmeiras|corinthians|s[aã]o\s*paulo|santos|vasco|fluminense|botafogo|gremio|gr[eê]mio|internacional|cruzeiro|atl[eé]tico[\s-]?mg|athletico|bahia|fortaleza|bragantino|mirassol|vit[oó]ria|juventude|sport|cuiab[aá]|argentina|brasil|fran[cç]a|alemanha|inglaterra|espanha|portugal|uruguai|col[oô]mbia|m[eé]xico|holanda|pa[ií]ses\s*baixos|it[aá]lia|eua|estados\s*unidos|marrocos|jap[aã]o|cro[aá]cia|b[eé]lgica|chile|equador|peru|paraguai|real\s*madrid|barcelona|manchester|liverpool|chelsea|arsenal|psg|bayern|juventus|milan|inter\b|napoli|dortmund|ajax)\b/i;

/** Tem âncora explícita de partida (Time A x Time B, ou time + competição/data clara)? */
function hasExplicitMatchAnchor(q){
  const s=String(q||'').trim();
  if(!s)return false;
  // "Flamengo x Botafogo", "Brasil vs Argentina", "Time A × Time B"
  if(/\b[\wÀ-ÿ][\wÀ-ÿ.'-]{1,28}(?:\s+[\wÀ-ÿ.'-]{1,28}){0,3}\s+(?:x|vs\.?|versus|×|contra)\s+[\wÀ-ÿ][\wÀ-ÿ.'-]{1,28}(?:\s+[\wÀ-ÿ.'-]{1,28}){0,3}\b/i.test(s))return true;
  // um time conhecido + (hoje|ontem|placar|resultado|amistoso|copa|liga)
  const sideHits=(s.match(new RegExp(_KNOWN_SIDES.source,'gi'))||[]);
  if(sideHits.length>=2)return true;
  if(sideHits.length===1&&/\b(hoje|ontem|agora|placar|resultado|amistoso|final|semi|copa|libertadores|brasileir|premier|champions|euro|mundial)\b/i.test(s))return true;
  // contexto da conversa já nomeou o jogo
  const ctx=getChatContext();
  if(ctx&&/\b(?:x|vs\.?|versus|×)\b/i.test(ctx)&&ctx.length>8)return true;
  return false;
}

/**
 * Pergunta ambígua do tipo "opinião sobre o jogo de hoje" — SEM times.
 * Nesses casos o app DEVE abrir popup ANTES de chamar o modelo (zero suposição).
 */
function isVagueMatchQuery(q){
  const s=String(q||'').trim();
  if(!s||s.length>280)return false;
  if(hasExplicitMatchAnchor(s))return false;
  // anexos / contexto longo com âncora já resolvem
  if(getChatContext()&&hasExplicitMatchAnchor(getChatContext()))return false;
  const aboutMatch=/\b(jogo|partida|confronto|placar|resultado)\b/i.test(s)
    ||/\b(opini[aã]o|achou|acha|an[aá]lise|analisa|comenta|como\s+foi|que\s+achou)\b/i.test(s);
  const vagueWhen=/\b(hoje|ontem|agora|desse?\s+jogo|do\s+jogo|da\s+partida|o\s+jogo|a\s+partida|esse\s+jogo|essa\s+partida)\b/i.test(s)
    ||/^(qual|quais|e\s+a[ií]|me\s+fala|me\s+d[aá]|sua)\b/i.test(s);
  // "qual sua opinião sobre o jogo de hoje?" → true
  if(aboutMatch&&vagueWhen)return true;
  if(/\b(opini[aã]o|an[aá]lise|analisa|comenta).{0,40}\b(jogo|partida)\b/i.test(s)&&!hasExplicitMatchAnchor(s))return true;
  if(/\b(jogo|partida)\s+(de\s+)?(hoje|ontem)\b/i.test(s)&&!hasExplicitMatchAnchor(s))return true;
  return false;
}

/* ESPN chat helpers → js/data/espn.js */

/**
 * Verificação de placar via Haiku + web_search.
 * Procedimento por IDENTIDADE DO JOGO + STATUS OFICIAL (FT/LIVE), sem presupor placar.
 * Retorna bloco para o chat — o modelo principal não deve inventar placar.
 */
async function fetchVerifiedMatchFacts(query,apiKey,signal,espnHint){
  if(!apiKey&&!getWorkerUrl())return'';
  const today=currentDateFull();
  const isoToday=new Date().toISOString().slice(0,10);
  const isoYday=new Date(Date.now()-864e5).toISOString().slice(0,10);
  const hintBlock=(espnHint&&String(espnHint).trim())
    ? `\n\nDADOS ESTRUTURADOS ESPN (pista, não verdade absoluta — confirme se status/placar batem com fontes oficiais):\n${String(espnHint).slice(0,3500)}\n`
    : '';

  const SP=`Você é o VERIFICADOR DE RESULTADOS do Meridian (camada de fatos, não opinião).
Tolerância ZERO a placar inventado. Você NÃO chuta placares; você RESOLVE o jogo e LÊ o resultado em fontes.

REFERÊNCIA TEMPORAL: ${today} | ISO hoje=${isoToday} | ontem=${isoYday}
Interprete "acabou de acontecer", "hoje", "agora", "ontem" com esta âncora.

════════════════════════════════════════
PROCEDIMENTO (nesta ordem — não pule etapas)
════════════════════════════════════════

A) IDENTIFICAR O JOGO (antes de qualquer placar)
   Extraia da pergunta: time(s)/seleção(ões), adversário se houver, competição se houver, âncora temporal.
   Monte a hipótese de jogo: "X vs Y · competição · data provável".
   Se houver vários candidatos, escolha o mais recente compatível com a âncora (hoje/ontem/LIVE).
   NÃO coloque placar na query de busca. Queries com placar (ex.: "Time 2-1") enviesam a coleta e são PROIBIDAS.

B) BUSCAR POR IDENTIDADE + STATUS, NÃO POR NÚMERO
   Faça 2–3 buscas (P1 primeiro). Modelos de query (adapte aos nomes reais):
   • "[Time A] vs [Time B] full time" / "resultado final" / "FT"
   • "[Time] latest match result [hoje|yesterday|ISO date]"
   • "[Time] [competição] scoreboard" ou site oficial da competição
   • Se só um time: "[Time] most recent result" / "último jogo placar"
   Fontes P1: site oficial da competição/federação, Reuters, BBC Sport, ESPN, Sky, Guardian, Sofascore, FotMob.
   Fontes P2 só se P1 não fechar: GE, Marca, etc.

C) CLASSIFICAR O ESTADO DO JOGO (crítico)
   Decida status com evidência explícita da fonte:
   • FT  = Full Time / Final / Encerrado / Resultado final (placar oficial de fim de jogo)
   • LIVE = em andamento (use placar + minuto/relógio da fonte)
   • HT   = intervalo
   • NS   = não iniciado
   • UNKNOWN = fonte ambígua
   Regra: só marque FT se a fonte indicar fim de jogo. Não invente FT a partir de um placar "congelado" sem status.
   O placar de FT é o placar OFICIAL de término — o que a fonte publica como final (não reconstrua minuto a minuto; não use placar parcial de "aos 89'" como se fosse FT).

D) CONFIRMAR (impecável ≠ lento: seja preciso)
   Ideal: 2 fontes independentes com o MESMO placar e status FT (ou mesma LIVE).
   Aceitável com 1 fonte P1 clara + status FT explícito (confidence medium).
   Se divergência (ex. 1-1 vs 2-1): NÃO invente o meio. Liste conflito, prefira fonte oficial/mais recente com status FT, confidence low.
   Se não achar: status UNKNOWN, scores null — NUNCA preencha placar "provável".

E) SAÍDA
   JSON apenas. "notes" = como resolveu (ex.: "FT em ESPN + BBC; mesma marcação"). Sem narrativa tática.

PROIBIDO:
• Inventar placar ou status
• Usar memória de treino como placar
• Buscar já assumindo um placar ("Time 1-0", "Time 2-1…")
• Tratar LIVE como FT
• Preencher score quando status=UNKNOWN

JSON:
{"matches":[{"home":"","away":"","score_home":null,"score_away":null,"status":"FT|LIVE|HT|NS|UNKNOWN","minute":"","competition":"","date":"YYYY-MM-DD","confidence":"high|medium|low","resolved_how":"","sources":["…"],"notes":""}],"summary_pt":"1–2 frases: jogo identificado + placar/status + fontes"}`;

  const msgs=[{role:'user',content:
    `Pergunta do usuário:\n"""${query}"""\n${hintBlock}\n`+
    `Execute o procedimento A→E. Identifique o jogo, busque por identidade+status (sem presupor placar), devolva só o JSON.`}];
  try{
    let acc='';
    for(let i=0;i<5;i++){
      if(signal&&signal.aborted)break;
      const res=await fetch(getApiBase()+'/v1/messages',{
        method:'POST',
        headers:getReqHeaders(apiKey),
        body:JSON.stringify({
          model:'claude-haiku-4-5-20251001',
          max_tokens:1400,
          system:SP,
          messages:msgs,
          tools:[{type:'web_search_20250305',name:'web_search',max_uses:3}]
        }),
        signal
      });
      if(!res.ok)break;
      const data=await res.json();
      if(data.stop_reason==='end_turn'){
        acc=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
        break;
      }
      if(data.stop_reason==='tool_use'){
        msgs.push({role:'assistant',content:data.content});
        msgs.push({role:'user',content:data.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:''}))});
      }else if(data.stop_reason==='pause_turn'){
        msgs.push({role:'assistant',content:data.content});
      }else break;
    }
    if(!acc)return'';
    const m=acc.match(/\{[\s\S]*\}/);
    let parsed=null;try{if(m)parsed=JSON.parse(m[0]);}catch{}
    if(parsed&&Array.isArray(parsed.matches)&&parsed.matches.length){
      const lines=parsed.matches.map(x=>{
        const st=String(x.status||'UNKNOWN').toUpperCase();
        const hasSc=x.score_home!=null&&x.score_away!=null&&st!=='UNKNOWN'&&st!=='NS';
        const score=hasSc?`${x.score_home}-${x.score_away}`:'—';
        const conf=x.confidence||'?';
        const how=x.resolved_how||x.notes||'';
        return `• ${x.home||'?'} ${score} ${x.away||'?'} | status=${st}${x.minute?' · '+x.minute:''} | conf=${conf} | ${x.competition||''} | ${x.date||''} | fontes: ${(x.sources||[]).join(', ')||'—'} | ${how}`;
      });
      return `=== PLACARES VERIFICADOS (coleta por identidade do jogo + status FT/LIVE · autoridade máxima) ===\n${parsed.summary_pt?parsed.summary_pt+'\n':''}${lines.join('\n')}\n=== FIM PLACARES VERIFICADOS ===\nRegra: use status e placar deste bloco. Se status=UNKNOWN ou score=—, não invente número — busque ou declare não confirmado.`;
    }
    return `=== PLACARES VERIFICADOS (texto bruto · não invente além disto) ===\n${acc.slice(0,2000)}\n=== FIM ===`;
  }catch(e){
    if(e&&(e.name==='AbortError'||e.message==='cancelled'))throw e;
    return'';
  }
}

async function runChat(){
  if(_running)return;
  const apiKey=document.getElementById('api-key-input').value.trim();
  const query=document.getElementById('match-input').value.trim();
  const atts=_attachments.slice();
  if(!query&&!atts.length){document.getElementById('match-input').focus();return;}
  const skipBubble=!!_skipNextUserBubble;_skipNextUserBubble=false;
  if(!skipBubble)showUserBubble(query,atts);
  const ta=document.getElementById('match-input');taReset(ta);if(!skipBubble)clearAttachments();
  if(!apiKey&&!getWorkerUrl()){
    showAgentBubble(t('no_key_chat'));
    return;
  }

  // ═══ GATE DE AMBIGUIDADE (cliente) ═══
  // "opinião sobre o jogo de hoje" SEM times → popup ANTES do LLM.
  // Zero suposição de partida. Zero raciocínio/scripts no chat.
  const histPeek=_chatThread.slice(-6).map(m=>m.content||'').join('\n');
  const skipVague=!!_skipVagueGateOnce;_skipVagueGateOnce=false;
  const vague=!skipVague&&isVagueMatchQuery(query)&&!atts.length
    &&!hasExplicitMatchAnchor((getChatContext()||'')+'\n'+histPeek+'\n'+query)
    &&!/\[Contexto confirmado:/i.test(query);
  if(vague){
    _running=true;setRunBtn(true);
    _chatThread.push({role:'user',content:query});
    _chatThread.push({role:'assistant',content:'[pedido de contexto via popup]'});
    const inferredGate=inferCompIdsFromText((query||'')+'\n'+histPeek);
    const espnIdsGate=inferredGate.length?inferredGate:COMP_ORDER.slice();
    try{
      startThinking();
      const lbl=document.getElementById('thk-label');
      if(lbl)lbl.textContent='listando jogos de hoje…';
      await openMatchPickerPopup(query,espnIdsGate);
    }catch{
      openContextPromptPopup({
        question:'Qual jogo você quer analisar ou comentar?',
        options:[
          {id:'a',label:'Jogo de clube de hoje (informo times/liga)'},
          {id:'b',label:'Jogo de seleção / copa de hoje (informo times)'}
        ]
      },query);
    }finally{
      stopThinking(true);
      _running=false;_abort=null;setRunBtn(false);
    }
    return;
  }

  _running=true;_abort=new AbortController();
  document.getElementById('error-box').style.display='none';
  setRunBtn(true);
  // O thread guarda só texto (stub p/ anexos) — base64 jamais persiste no histórico.
  const histStub=atts.length?[query,...atts.map(a=>`[anexo: ${a.name}]`)].filter(Boolean).join('\n'):query;
  _chatThread.push({role:'user',content:histStub});
  // Bolha oculta desde a criação (sem flash do chip amarelo). Só thk-compact no loading.
  // Reaparece apenas se houver prosa/erro; card/popup removem a linha.
  const bubble=showAgentBubble('',{hidden:true});
  const _agentRow=bubble.closest('.msg-agent-chat');
  const _revealAgent=()=>{if(_agentRow){_agentRow.style.display='';scrollChat();}};
  startThinking();
  try{
    // Multi-liga + verificação de placar (seleções/amistosos fora do COMP_ORDER).
    const histText=_chatThread.slice(-8).map(m=>m.content||'').join('\n');
    const inferred=inferCompIdsFromText((query||'')+'\n'+histText);
    const espnIds=inferred.length?inferred:COMP_ORDER.slice();
    const needsLive=_chatNeedsLiveData(query,atts.length);
    const needsScore=_chatNeedsScoreVerification(query)||needsLive;
    const hasAnchor=hasExplicitMatchAnchor(query)||hasExplicitMatchAnchor(getChatContext()||'')||atts.length>0;
    let liveData='', scoreFacts='';
    if(needsLive||needsScore){
      const lbl=document.getElementById('thk-label');
      if(lbl)lbl.textContent='resolvendo jogo e status (ESPN)…';
      // 1) ESPN primeiro (pista estruturada)
      liveData=await gatherEspnForChat(espnIds).catch(()=>'');
      // 2) Verificador de placar SÓ com âncora clara — se vago, não deixa o Haiku "escolher" um jogo
      if(needsScore&&hasAnchor){
        if(lbl)lbl.textContent='confirmando resultado oficial (web)…';
        scoreFacts=await fetchVerifiedMatchFacts(query,apiKey,_abort.signal,liveData).catch(()=>'');
        if(!scoreFacts){
          if(lbl)lbl.textContent='segunda passagem: full-time / resultado final…';
          const retryQ=`${query}\n\n[Instrução ao verificador: identifique o jogo mais recente compatível; confirme se está FT ou LIVE; busque "full time" / "resultado final" / scoreboard oficial — NÃO assuma placar na query.]`;
          scoreFacts=await fetchVerifiedMatchFacts(retryQ,apiKey,_abort.signal,liveData).catch(()=>'');
        }
      }
    }
    const metaComp=inferred.length
      ? `=== COMPETIÇÕES INFERIDAS: ${inferred.map(id=>compLabel(id)).join(' · ')} ===`
      : `=== CONTEXTO: pode ser clube OU seleção (não se limite às ligas embutidas do app). ===`;
    const scoreBlock=scoreFacts
      ? `\n\n${scoreFacts}\n\nREGRA: o bloco PLACARES VERIFICADOS é a autoridade máxima. Sua opinião tática pode ser livre; o PLACAR e o STATUS do jogo (FT/LIVE) devem copiar esse bloco. Nunca diga outro placar.`
      : (needsScore&&hasAnchor?`\n\n=== AVISO DE COLETA ===\nNão foi possível montar PLACARES VERIFICADOS nesta passagem. Você DEVE usar web_search agora (2+ fontes P1) antes de afirmar qualquer placar. PROIBIDO inventar placar de memória.\n=== FIM AVISO ===`:'');
    const liveBlock=liveData
      ? `\n\n=== DADOS REAIS ESPN (placares/tabelas; se divergir de PLACARES VERIFICADOS, prevalece PLACARES VERIFICADOS) ===\n${liveData}\n=== FIM ESPN ===\n\nREGRA DURA: se houver VÁRIOS jogos no bloco ESPN e o usuário NÃO nomeou times, NÃO escolha um sozinho — responda APENAS com context_prompt listando 2 jogos concretos do bloco.`
      :'';
    const effectiveQuery=`${query||'(sem texto — analise o anexo)'}\n\n${metaComp}${scoreBlock}${liveBlock}`;
    let trimmedThread=_chatThread.length>20?_chatThread.slice(-20):_chatThread;
    if(trimmedThread.length>0&&trimmedThread[0].role!=='user')trimmedThread=trimmedThread.slice(1);
    // Mídia/dados só no turno atual (efêmeros)
    let reqMessages=trimmedThread;
    if(atts.length||liveData||scoreFacts||needsScore){
      const lastContent=atts.length?buildUserContent(effectiveQuery,atts):effectiveQuery;
      reqMessages=trimmedThread.slice(0,-1).concat([{role:'user',content:lastContent}]);
    }else{
      reqMessages=trimmedThread.slice(0,-1).concat([{role:'user',content:effectiveQuery}]);
    }
    const _chatEffort=EFFORT_LEVELS[currentEffort]||{budget:0};
    // Chat: thinking estendido DESLIGADO por padrão de segurança UX —
    // raciocínio/tool monologue não pode vazar na bolha. Só liga se esforço ≥ Médio.
    const _chatThink=_chatEffort.budget>=5000 && !/opus-4-8|opus-4-7|fable-5/.test(currentModel);
    const _chatBase=(atts.length||liveData||scoreFacts)?4500:3200;
    const _searchUses=scoreFacts?2:(hasAnchor?4:2);
    const _chatBody={model:currentModel,max_tokens:_chatBase+(_chatThink?_chatEffort.budget:0),
      system:[{type:'text',text:analystSystemPrompt(),cache_control:{type:'ephemeral'}}],
      messages:reqMessages,stream:true,
      tools:[{type:'web_search_20250305',name:'web_search',max_uses:_searchUses}]};
    if(_chatThink){_chatBody.thinking={type:'enabled',budget_tokens:_chatEffort.budget};_chatBody.temperature=1;}
    if(getWorkerUrl())_chatBody.diagnostics={previous_message_id:_lastChatId};
    const res=await fetch(getApiBase()+'/v1/messages',{
      method:'POST',
      headers:getReqHeaders(apiKey,getWorkerUrl()?['cache-diagnosis-2026-04-07']:[]),
      body:JSON.stringify(_chatBody),
      signal:_abort.signal
    });
    parseRateLimitHeaders(res);if(!res.ok)throw new Error(`Erro ${res.status}`);
    let text='';const reader=res.body.getReader(),dec=new TextDecoder();
    // Streaming: NUNCA pinta thinking/tool noise; JSON → placeholder; prosa limpa → stream.
    let _isJson=null;
    let _isCtxProse=false;
    let _isNoise=false;
    // Status de espera fica só no thk-compact (não reabre a bolha "trabalhando…")
    const _paint=()=>{
      const lead=text.replace(/^\s+/,'');
      if(!lead)return;
      // noise interno (raciocínio/scripts) — não mostra bolha
      if(isInternalModelNoise(lead)||isInternalModelNoise(text)){
        _isNoise=true;
        if(_agentRow)_agentRow.style.display='none';
        return;
      }
      if(_isJson===null){
        _isJson=lead.startsWith('{')||/^```(?:json)?\s*\{/i.test(lead)||/"context_prompt"\s*:/.test(lead)||/"card"\s*:/.test(lead);
        if(_isJson){
          // card/json: mantém bolha oculta; thk-label indica progresso
          if(_agentRow)_agentRow.style.display='none';
          const lb=document.getElementById('thk-label');if(lb)lb.textContent='montando análise…';
        }
      }
      if(!_isJson&&!_isCtxProse&&text.length>40&&detectProseContextPrompt(text)){
        _isCtxProse=true;
        if(_agentRow)_agentRow.style.display='none';
        const lb=document.getElementById('thk-label');if(lb)lb.textContent='precisando de contexto…';
        return;
      }
      if(_isCtxProse||_isJson)return;
      // prosa: só pinta se NÃO for monólogo interno
      const clean=stripInternalReasoning(text);
      if(!clean||isInternalModelNoise(clean)){
        if(_agentRow)_agentRow.style.display='none';
        return;
      }
      _revealAgent();
      bubble.innerHTML=simpleMd(clean);scrollChat();
    };
    while(true){
      const{done,value}=await reader.read();if(done)break;
      for(const line of dec.decode(value).split('\n')){
        if(!line.startsWith('data:'))continue;
        const d=line.slice(5).trim();if(d==='[DONE]')continue;
        try{const j=JSON.parse(d);
          // SOMENTE text_delta vira conteúdo — thinking_delta / tool nunca entram na bolha
          if(j.type==='content_block_delta'&&j.delta?.type==='text_delta'){text+=j.delta.text;_paint();}
          // ignora thinking_delta, input_json_delta, signatures etc. de propósito
          if(j.type==='message_start'){
            if(j.message?.usage){
              tokenState.lastIn=j.message.usage.input_tokens||0;tokenState.sessionIn+=tokenState.lastIn;
              const _chatCR=j.message.usage.cache_read_input_tokens||0;
              if(_chatCR>0){tokenState.sessionCacheRead+=_chatCR;const _cP=MODEL_PRICE[currentModel]||MODEL_PRICE['claude-sonnet-4-6'];tokenState.sessionCacheSaved+=(_chatCR*(_cP.crs||0))/1e6;}
            }
            if(j.message?.id)_lastChatId=j.message.id;
            if(j.message?.diagnostics?.cache_miss_reason)console.debug('[cache-diag chat] miss:',j.message.diagnostics.cache_miss_reason.type);
          }
          if(j.type==='message_delta'&&j.usage){tokenState.lastOut=(j.usage.output_tokens||0);tokenState.sessionOut+=j.usage.output_tokens||0;}
        }catch{}
      }
    }
    // Pós-processamento: limpa raciocínio, extrai JSON, bloqueia suposição de jogo
    text=stripInternalReasoning(text);
    const _ctxP=resolveContextPrompt(text);
    if(_ctxP){
      const row=bubble.closest('.msg-agent-chat');if(row)row.remove();else bubble.innerHTML='';
      const lastUser=(_chatThread.length&&_chatThread[_chatThread.length-1].role==='user')
        ?_chatThread[_chatThread.length-1].content:query;
      _chatThread.push({role:'assistant',content:'[pedido de contexto via popup]'});
      openContextPromptPopup(_ctxP,lastUser);
      stopThinking(true);setTimeout(()=>{updateTokenBar();updateDockTokens();},400);
    }else{
      let _card=chatCardFrom(text);
      // Segurança: pergunta vaga + card de jogo específico = suposição → popup, não análise
      const presup=_card?cardPresupposedVagueMatch(_card,query):null;
      if(presup){
        const row=bubble.closest('.msg-agent-chat');if(row)row.remove();else bubble.innerHTML='';
        _chatThread.push({role:'assistant',content:'[pedido de contexto via popup]'});
        openContextPromptPopup(presup,query);
        stopThinking(true);setTimeout(()=>{updateTokenBar();updateDockTokens();},400);
      }else if(_card){
        const row=bubble.closest('.msg-agent-chat');if(row)row.remove();else bubble.innerHTML='';
        const painted=renderChatCard(_card);
        if(!painted){
          // card oco/quebrado — nunca mostrar casca vazia (print do bug)
          const err=showAgentBubble('A análise veio incompleta (card sem conteúdo substantivo). Peça de novo com times, placar e foco — ex.: <em>"Inglaterra x Argentina FT — análise tática e gols"</em>.');
          _chatThread.push({role:'assistant',content:'[card incompleto — pedido de reenvio]'});
        }else{
          _chatThread.push({role:'assistant',content:cardToPlain(_card)||'…'});
        }
        stopThinking(true);setTimeout(()=>{updateTokenBar();updateDockTokens();},1300);
      }else{
        const clean=stripInternalReasoning(text||'');
        if(!clean||isInternalModelNoise(clean)){
          // fallback: se o modelo só vomitou raciocínio, pede contexto em vez de mostrar lixo
          if(isVagueMatchQuery(query)||needsScore){
            const row=bubble.closest('.msg-agent-chat');if(row)row.remove();else bubble.innerHTML='';
            _chatThread.push({role:'assistant',content:'[pedido de contexto via popup]'});
            await openMatchPickerPopup(query,espnIds);
          }else{
            _revealAgent();
            bubble.innerHTML=simpleMd('Não consegui montar uma resposta limpa. Reformule com times e competição (ex.: "Flamengo x Palmeiras hoje").');
            _chatThread.push({role:'assistant',content:'[resposta sanitizada — pedido de reformulação]'});
          }
        }else{
          _revealAgent();
          bubble.innerHTML=simpleMd(clean);
          _chatThread.push({role:'assistant',content:clean});
        }
        stopThinking(true);setTimeout(()=>{updateTokenBar();updateDockTokens();},1300);
      }
    }
  }catch(e){
    stopThinking(false);
    _revealAgent();
    if(e?.name==='AbortError')bubble.innerHTML='<em>Parado.</em>';
    else bubble.innerHTML=simpleMd('Erro: '+e.message);
    _chatThread.pop();
  }finally{_running=false;_abort=null;setRunBtn(false);}
}

// Flexible analyst persona — multi-campeonato + double-check de contexto
/* prompts: analystSystemPrompt → js/analysis/prompts.js */

function showFallbackCard(query){
  const ts=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const el=document.createElement('div');
  el.innerHTML=`<div class="a-card">
    <div class="a-hdr">
      <div class="a-agent"><div class="a-ball a-ball-plain">${brandStar()}</div></div>
      <div class="a-hdr-r"><span class="a-ts">${ts}</span></div>
    </div>
    <div class="a-subtitle">Análise em texto · modo simplificado</div>
    <div class="a-title">${esc(query||'Análise').slice(0,80)}</div>
    <div class="a-tc" style="padding:1rem 1.25rem;line-height:1.6"><span class="ldot" style="display:inline-block;margin:4px"></span></div>
    <div class="disc">Gerada em texto livre porque o relatório estruturado não pôde ser montado nesta resposta. Pode ser exportada normalmente. Para o relatório completo com abas, tente de novo (de preferência sem o raciocínio estendido "Leve/Médio").</div>
  </div>`;
  const card=el.firstElementChild;
  card.dataset.hid='fb'+Date.now().toString(36);
  document.getElementById('empty-state').style.display='none';
  document.getElementById('conversation').appendChild(card);
  scrollChat();
  return card.querySelector('.a-tc');
}
async function conversationalFallback(query,apiKey,reqHeaders,signal){
  const ctx=getTournamentCtxString?getTournamentCtxString():'';
  const bubble=showFallbackCard(query);
  const res=await fetch(getApiBase()+'/v1/messages',{
    method:'POST',
    headers:reqHeaders,
    body:JSON.stringify({model:currentModel,max_tokens:3500,
      system:[{type:'text',text:analystSystemPrompt(),cache_control:{type:'ephemeral'}}],
      messages:[{role:'user',content:`DATA: ${currentDateFull()}${ctx?`\n\nContexto do torneio:\n${ctx}`:''}\n\n${query}\n\n(Formato desta resposta: TEXTO CORRIDO analítico, sem JSON — este é o modo simplificado.)`}],
      stream:true}),
    signal
  });
  parseRateLimitHeaders(res);
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Erro ${res.status}`);}
  let text='';const reader=res.body.getReader(),dec=new TextDecoder();
  while(true){
    const{done,value}=await reader.read();if(done)break;
    for(const line of dec.decode(value).split('\n')){
      if(!line.startsWith('data:'))continue;
      const d=line.slice(5).trim();if(d==='[DONE]')continue;
      try{const j=JSON.parse(d);
        if(j.type==='content_block_delta'&&j.delta?.type==='text_delta'){text+=j.delta.text;bubble.innerHTML=simpleMd(text);scrollChat();}
        if(j.type==='message_start'&&j.message?.usage){tokenState.lastIn=j.message.usage.input_tokens||0;tokenState.sessionIn+=tokenState.lastIn;}
        if(j.type==='message_delta'&&j.usage){tokenState.lastOut=j.usage.output_tokens||0;tokenState.sessionOut+=j.usage.output_tokens||0;}
      }catch{}
    }
  }
  if(!text)throw new Error('sem resposta');
  _chatThread.push({role:'user',content:query});
  _chatThread.push({role:'assistant',content:text});
  setTimeout(()=>{updateTokenBar();updateDockTokens();},1300);
  return text;
}

// ─── Main analysis ────────────────────────────────────────────────────────
function toggleRun(){
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
function openHelpAnalysis(){
  const ov=document.getElementById('help-analysis-ov');
  if(ov){ov.style.display='flex';ov.setAttribute('aria-hidden','false');}
}
function closeHelpAnalysis(e){
  if(e&&e.target&&e.target!==document.getElementById('help-analysis-ov')&&!e.target.closest?.('.help-x'))return;
  const ov=document.getElementById('help-analysis-ov');
  if(ov){ov.style.display='none';ov.setAttribute('aria-hidden','true');}
}
function cancelAnalysis(){if(_running&&_abort){try{_abort.abort();}catch(e){}}}
function setRunBtn(running){
  const b=document.getElementById('run-btn');
  b.classList.toggle('i-stop',running);
  if(running)b.textContent=t('btn_stop');
  else b.textContent=(_attachments.length||_chatThread.length>0)?t('btn_send'):t('btn_analyze');
}

// Condensa a análise estruturada num texto curto para servir de MEMÓRIA em follow-ups
// de chat (grounding sem re-gastar tokens de coleta). Mantém os fatos-chave, não os
// fundamentos longos de cada ticket.
function _analysisSummaryForThread(d){
  if(!d||typeof d!=='object')return 'Análise estruturada gerada nesta conversa.';
  const L=[],tm=d.mandante||{},tv=d.visitante||{};
  L.push(`[ANÁLISE ESTRUTURADA JÁ ENTREGUE NESTA CONVERSA — ${d.partida||'partida'}${d.fase?' · '+d.fase:''}${d.data_hora?' · '+d.data_hora:''}${d.sede?' · '+d.sede:''}]`);
  if(tm.nome||tv.nome){
    L.push(`${tm.nome||'Mandante'}: posição ${tm.ranking_fifa||'?'}; forma ${tm.forma_recente||'?'}; xG ${tm.xg_marcado??'?'}/${tm.xg_sofrido??'?'}; escalação ${tm.escalacao||'?'}; desfalques ${(tm.desfalques||[]).map(textFrom).filter(Boolean).join(', ')||'nenhum'}.`);
    L.push(`${tv.nome||'Visitante'}: posição ${tv.ranking_fifa||'?'}; forma ${tv.forma_recente||'?'}; xG ${tv.xg_marcado??'?'}/${tv.xg_sofrido??'?'}; escalação ${tv.escalacao||'?'}; desfalques ${(tv.desfalques||[]).map(textFrom).filter(Boolean).join(', ')||'nenhum'}.`);
  }
  const tcm=d.tecnico_mandante||{},tcv=d.tecnico_visitante||{};
  if(tcm.nome||tcv.nome)L.push(`Técnicos: ${tcm.nome||'?'} (${tcm.formacao||'?'}, ${tcm.filosofia||''}) x ${tcv.nome||'?'} (${tcv.formacao||'?'}, ${tcv.filosofia||''}).`);
  if(d.lambda)L.push(`Lambdas (gols esperados): ${tm.nome||'mandante'} ${d.lambda.home_mid??'?'}, ${tv.nome||'visitante'} ${d.lambda.away_mid??'?'}.`);
  if(Array.isArray(d.eventos_provaveis)&&d.eventos_provaveis.length)L.push('Eventos prováveis: '+d.eventos_provaveis.slice(0,6).map(e=>`${e.evento} ${Math.round((e.probabilidade||0)*100)}%`).join('; ')+'.');
  if(Array.isArray(d.sugestoes_ticket)&&d.sugestoes_ticket.length)L.push('Tickets: '+d.sugestoes_ticket.slice(0,6).map(x=>`${x.descricao} (${Math.round((x.probabilidade||0)*100)}%, ${x.confianca||''})`).join('; ')+'.');
  if(Array.isArray(d.fatores_decisivos)&&d.fatores_decisivos.length)L.push('Fatores decisivos: '+d.fatores_decisivos.slice(0,5).map(textFrom).filter(Boolean).join('; ')+'.');
  if(d.confronto_tatico&&d.confronto_tatico.conclusao)L.push('Síntese tática: '+d.confronto_tatico.conclusao);
  if(Array.isArray(d.lacunas)&&d.lacunas.length)L.push('Lacunas conhecidas: '+d.lacunas.slice(0,4).map(textFrom).filter(Boolean).join('; ')+'.');
  L.push('(Base factual desta partida — use como memória para perguntas de acompanhamento; não repita a coleta se a resposta já estiver aqui.)');
  return L.join('\n');
}
async function runAnalysis(){
  if(_running)return;
  const apiKey=document.getElementById('api-key-input').value.trim();
  if(!apiKey&&!getWorkerUrl()){
    const q=document.getElementById('match-input').value.trim();
    showUserBubble(q);taReset(document.getElementById('match-input'));
    showAgentBubble(t('no_key_analyze'));
    return;
  }
  const query=document.getElementById('match-input').value.trim();
  if(!query){document.getElementById('match-input').focus();return;}

  _running=true;_abort=new AbortController();_pendingQuery=query;
  document.getElementById('error-box').style.display='none';
  setRunBtn(true);
  const ks=document.getElementById('key-status');ks.textContent='Analisando…';ks.style.color='var(--muted)';

  taReset(document.getElementById('match-input'));
  showUserBubble(query);
  startThinking();

  const effort=EFFORT_LEVELS[currentEffort];
  // diagnostics + beta cache-diagnosis são internos do proxy; em modo browser direto quebram o CORS → só com Worker
  const reqHeaders=getReqHeaders(apiKey,getWorkerUrl()?['cache-diagnosis-2026-04-07']:[]);

  let finalText='',lastIn=0,lastOut=0,lastCacheCreated=0,lastCacheRead=0;

  try{
    // ── Fase 1: Haiku coleta fatos via web_search ─────────────────────────
    updateThinkingToks({status:'Pesquisando dados…',phase:1});
    let rawFacts=null,p1in=0,p1out=0;
    try{
      const r1=await gatherFacts(query,apiKey,_abort.signal,(upd)=>updateThinkingToks({...upd,phase:1}),EFFORT_SEARCHES[currentEffort]??1);
      rawFacts=r1.rawFacts;p1in=r1.inTokens;p1out=r1.outTokens;
    }catch(e1){
      if(e1.message==='cancelled'||e1.name==='AbortError')throw e1;
      updateThinkingToks({status:'Pesquisa falhou, analisando diretamente…',phase:1});
    }
    tokenState.sessionIn+=p1in;tokenState.sessionOut+=p1out;
    tokenState.sessionIn_p1+=p1in;tokenState.sessionOut_p1+=p1out;
    _thkP1Toks=p1in+p1out;

    // Portão de completude: preenche dados-chave faltantes (stats de titulares citados
    // E posição na tabela) — custo zero se a coleta já veio completa; senão, UMA
    // busca-alvo Haiku + web_search cobrindo os dois. Antes do portão: se a coleta
    // regrediu a STRINGS em jogadores_chave (ex.: auto-cura desligou structured outputs),
    // coage cada nome a objeto {nome} — o portão então detecta os stats vazios e busca.
    if(rawFacts){
      try{[rawFacts.mandante,rawFacts.visitante].filter(Boolean).forEach(tm=>{
        if(Array.isArray(tm.jogadores_chave))tm.jogadores_chave=tm.jogadores_chave.map(p=>typeof p==='string'?{nome:p}:p);
      });}catch(_){}
      const g=await fillDataGaps(rawFacts,apiKey,_abort.signal,(upd)=>updateThinkingToks({...upd,phase:1}));
      tokenState.sessionIn+=g.inTokens;tokenState.sessionOut+=g.outTokens;
      tokenState.sessionIn_p1+=g.inTokens;tokenState.sessionOut_p1+=g.outTokens;
      _thkP1Toks+=g.inTokens+g.outTokens;
      // Portão anti-alucinação: cruza cada nome da escalação com busca fresca e escova os
      // comprovadamente fora do elenco ANTES da Fase 2 — a escalação errada não chega ao render.
      const lv=await verifyLineupNames(rawFacts,apiKey,_abort.signal,(upd)=>updateThinkingToks({...upd,phase:1}));
      tokenState.sessionIn+=lv.inTokens;tokenState.sessionOut+=lv.outTokens;
      tokenState.sessionIn_p1+=lv.inTokens;tokenState.sessionOut_p1+=lv.outTokens;
      _thkP1Toks+=lv.inTokens+lv.outTokens;
    }

    // ── Fase 2: modelo escolhido analisa (sem ferramentas se fatos OK) ────
    updateThinkingToks({status:'Raciocinando…',phase:2});
    const useEnriched=!!rawFacts;
    const ctx=useEnriched?getTournamentCtxString():'';
    const finalQuery=useEnriched?buildEnrichedQuery(query,rawFacts,ctx):query;
    const sysText=useEnriched?getSystemPromptPhase2():getSystemPrompt();
    const memCtx=await fetchMemoryContext();
    // Teto generoso: o JSON estruturado cheio passa de 6k tokens e truncava (→ fallback).
    // Cobra-se pelo uso real, não pelo teto, então elevar não aumenta custo. Soma-se o
    // budget de raciocínio porque thinking consome desse mesmo teto.
    const baseBody={model:currentModel,max_tokens:9000+(effort.budget>0?effort.budget:0),system:[{type:'text',text:sysText,cache_control:{type:'ephemeral'}}]};
    if(getWorkerUrl())baseBody.diagnostics={previous_message_id:_lastAnalysisId};
    if(!useEnriched)baseBody.tools=[{type:'web_search_20250305',name:'web_search',max_uses:4}];
    if(effort.budget>0){baseBody.thinking={type:'enabled',budget_tokens:effort.budget};baseBody.temperature=1;}
    // NOTA (07/2026): structured outputs (output_config.format) foi testado ao vivo
    // para a Fase 2 e o schema completo da análise EXCEDE o limite de gramática da
    // API ("compiled grammar is too large") em todos os modelos. Fase 2 permanece
    // no caminho provado (contrato no prompt + parseAnalysisJson + retry). O recurso
    // está ATIVO na Fase 1 (FACTS_SCHEMA, menor). Ver comentário em FACTS_SCHEMA.
    const messages=[{role:'user',content:`DATA: ${currentDateFull()}${memCtx}\n\nAnalise esta partida/contexto de ${compLabel(_activeCompId)} e retorne APENAS o JSON estruturado: ${finalQuery}${contextBlock()}`}];
    let _newAnalysisId=null;

    for(let iter=0;iter<10;iter++){
      let _r2,_netAttempt=0;
      // Reconecta em qualquer iteração após queda de rede/proxy (não só na primeira)
      while(true){
        try{
          _r2=await streamOnce({...baseBody,messages},reqHeaders,(upd)=>{updateThinkingToks({...upd,phase:2});},_abort.signal);
          break;
        }catch(e2){
          if(e2.name==='AbortError'||e2.message==='cancelled')throw e2;
          const isNet=(e2.name==='TypeError'||e2.message==='Failed to fetch');
          if(isNet&&_netAttempt<2&&!_abort.signal.aborted){
            _netAttempt++;
            updateThinkingToks({status:'Reconectando…',phase:2});
            await new Promise(r=>setTimeout(r,1200*_netAttempt));
            continue;
          }
          const msg=isNet?'Fase 2: falha de conexão com a API (rede ou proxy CORS). Verifique sua internet/chave e tente de novo.':`Fase 2: ${e2.message}`;
          throw Object.assign(e2,{message:msg});
        }
      }
      if(iter===0&&_r2.id){
        _newAnalysisId=_r2.id;
        const{cacheRead:_cr0,inTokens:_in0,cacheCreated:_cc0}=_r2;
        const _tot0=_in0+_cr0+_cc0;
        tokenState.lastCacheHitPct=_tot0>0?Math.round(_cr0/_tot0*100):0;
        tokenState.lastCacheMissReason=_r2.diagnostics?.cache_miss_reason?.type||null;
        if(tokenState.lastCacheMissReason)console.debug('[cache-diag] miss:',tokenState.lastCacheMissReason,'~'+(_r2.diagnostics.cache_miss_reason.cache_missed_input_tokens??'?')+'tok');
      }
      const{text,stopReason,allContent,toolUses,inTokens,outTokens,thinkingTokens,cacheCreated,cacheRead}=_r2;
      lastIn=inTokens;lastOut=outTokens;lastCacheCreated+=cacheCreated;lastCacheRead+=cacheRead;
      if(stopReason==='end_turn'){finalText=text;break;}
      if(stopReason==='tool_use'&&!useEnriched){
        messages.push({role:'assistant',content:allContent});
        messages.push({role:'user',content:toolUses.map(t=>({type:'tool_result',tool_use_id:t.id,content:''}))});
        updateThinkingToks({inTokens:lastIn,outTokens:lastOut,thinkingTokens,status:'Pesquisando dados…',phase:2});
      }else{finalText=text;break;}
    }

    if(_newAnalysisId)_lastAnalysisId=_newAnalysisId;
    const _mainP=MODEL_PRICE[currentModel]||MODEL_PRICE['claude-sonnet-4-6'];
    tokenState.sessionCacheSaved+=(lastCacheRead*(_mainP.crs||0))/1e6;
    tokenState.lastIn=lastIn;tokenState.lastOut=lastOut;tokenState.sessionIn+=lastIn;tokenState.sessionOut+=lastOut;tokenState.runs++;
    tokenState.lastCacheCreated=lastCacheCreated;tokenState.lastCacheRead=lastCacheRead;tokenState.sessionCacheRead+=lastCacheRead;
    stopThinking(true);
    setTimeout(()=>{updateTokenBar();updateDockTokens();},1300);
    // Extração robusta: aceita blocos markdown e repara JSON truncado.
    let parsed=parseAnalysisJson(finalText);
    if(!parsed){
      // Re-pedido SEM raciocínio estendido. Thinking ("Leve"/"Médio"+) deixa o modelo
      // conversador → ele responde em prosa ou JSON truncado. Sem thinking, com teto alto
      // de tokens e contrato explícito, o JSON estruturado sai limpo. Dispara em QUALQUER
      // falha de parse (chaves ausentes OU JSON malformado/truncado), não só a primeira.
      updateThinkingToks({status:'Reformulando resposta…',phase:2});
      const retryMessages=[
        {role:'user',content:`DATA: ${currentDateFull()}\n\nAnalise esta partida/contexto de ${compLabel(_activeCompId)} e retorne APENAS o JSON estruturado: ${finalQuery}${contextBlock()}`},
        {role:'assistant',content:finalText.slice(0,2000)},
        {role:'user',content:'Retorne APENAS o JSON estruturado da análise, começando com { e terminando com }, sem texto antes ou depois, sem blocos de código markdown.'}
      ];
      const retryBody={...baseBody,messages:retryMessages};
      delete retryBody.tools;delete retryBody.thinking;delete retryBody.temperature;
      retryBody.max_tokens=Math.max(retryBody.max_tokens||0,9000);
      const retryR=await streamOnce(retryBody,reqHeaders,(upd)=>updateThinkingToks({...upd,phase:2}),_abort.signal).catch(()=>null);
      if(retryR){lastOut+=retryR.outTokens||0;parsed=parseAnalysisJson(retryR.text);}
    }
    if(!parsed)throw new Error('O modelo não retornou uma análise estruturada. Tente descrever a partida com "PARTIDA: [Time A] x [Time B]" ou use um dos jogos sugeridos.');
    // Campos derivados (write path único) — pads DEPOIS da auditoria
    attachAnalysisDerived(parsed, rawFacts);
    // Fase 3 · Verificador: auditoria barata (Haiku) da análise pronta ANTES de renderizar.
    // Falha do auditor nunca bloqueia a entrega (retorna null e a análise sai sem selo).
    const _va=await verifyAnalysis(parsed,rawFacts,apiKey,_abort.signal,(upd)=>updateThinkingToks({...upd,phase:2}));
    if(_va){tokenState.sessionIn+=_va.inTokens;tokenState.sessionOut+=_va.outTokens;}
    // Rede de segurança de eventos (cartões/escanteios) — após auditoria
    finalizeAnalysisPads(parsed);
    renderResults(parsed);
    // Memória: registra a análise estruturada no fio do chat para que perguntas de
    // acompanhamento ("e se a Bósnia abrir o placar?") sejam fundamentadas pela análise
    // já feita — e não apenas por uma nova consulta rasa à ESPN. Resumo condensado
    // (não o JSON inteiro) para manter o custo dos follow-ups baixo.
    try{_chatThread.push({role:'user',content:_pendingQuery||query});_chatThread.push({role:'assistant',content:_analysisSummaryForThread(parsed)});}catch(_){}
    ks.textContent='Guardada apenas nesta aba · apagada ao fechar';ks.style.color='var(--muted)';
  }catch(e){
    stopThinking(false);
    if(e&&(e.name==='AbortError'||e.message==='cancelled')){
      const inp=document.getElementById('match-input');
      if(!inp.value.trim())inp.value=_pendingQuery;
      ks.textContent='Análise interrompida · ajuste e tente de novo';ks.style.color='var(--muted)';
    }else{
      // Graceful fallback: pipeline estruturado falhou → resposta analítica livre
      let _fellBack=false;
      if(!(_abort&&_abort.signal&&_abort.signal.aborted)){
        try{await conversationalFallback(_pendingQuery||query,apiKey,reqHeaders,_abort?_abort.signal:undefined);_fellBack=true;}
        catch(e2){if(e2&&(e2.name==='AbortError'||e2.message==='cancelled'))_fellBack=true;}
      }
      if(_fellBack){
        ks.textContent='Análise em texto (modo simplificado) · exportável';ks.style.color='var(--muted)';
      }else{
        let _msg=e.message||'Erro inesperado. Verifique sua conexão.';
        const _isNet=(e&&e.name==='TypeError')||/Failed to fetch|falha de conex/i.test(_msg);
        if(_isNet){const _diag=await diagnoseConnection(apiKey).catch(()=>null);if(_diag)_msg='Diagnóstico: '+_diag;}
        document.getElementById('error-box').style.display='block';
        document.getElementById('error-msg').innerHTML=esc(_msg)+' <button class="inline-link" onclick="document.getElementById(\'error-box\').style.display=\'none\';toggleRun()">↺ tentar de novo</button>';
        ks.textContent='Guardada apenas nesta aba · apagada ao fechar';ks.style.color='var(--muted)';
      }
    }
  }finally{
    _running=false;_abort=null;
    setRunBtn(false);
  }
}

// ─── Streaming ────────────────────────────────────────────────────────────
async function streamOnce(body,headers,onUpdate,signal,url=''){url=url||getApiBase()+'/v1/messages';
  const res=await fetch(url,{method:'POST',headers,body:JSON.stringify({...body,stream:true}),signal});
  parseRateLimitHeaders(res);if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Erro ${res.status}`);}
  const reader=res.body.getReader(),decoder=new TextDecoder();
  let buf='',inTokens=0,outTokens=0,thinkingChars=0,cacheCreated=0,cacheRead=0,msgId=null,msgDiag=undefined;
  let allBlocks=[],currentBlock=null,curText='',curThink='',curToolInput='',stopReason=null;
  try{
    outer:while(true){
      const{done,value}=await reader.read();if(done)break;
      buf+=decoder.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()??'';
      for(const line of lines){
        if(!line.startsWith('data: '))continue;
        const raw=line.slice(6).trim();if(raw==='[DONE]')break outer;
        let e;try{e=JSON.parse(raw);}catch{continue;}
        switch(e.type){
          case 'message_start':
            inTokens=e.message?.usage?.input_tokens??0;
            cacheCreated=e.message?.usage?.cache_creation_input_tokens??0;
            cacheRead=e.message?.usage?.cache_read_input_tokens??0;
            msgId=e.message?.id??null;
            msgDiag=e.message?.diagnostics;
            onUpdate({inTokens,outTokens,thinkingTokens:0,status:'Analisando…'});break;
          case 'content_block_start':
            currentBlock={type:e.content_block.type,index:e.index};
            if(e.content_block.type==='tool_use'){currentBlock.id=e.content_block.id;currentBlock.name=e.content_block.name;curToolInput='';}
            else if(e.content_block.type==='thinking')curThink='';
            else curText='';
            break;
          case 'content_block_delta':
            if(!currentBlock)break;
            const d=e.delta;
            if(d.type==='thinking_delta'){curThink+=d.thinking;thinkingChars+=d.thinking.length;onUpdate({inTokens,outTokens,thinkingTokens:Math.floor(thinkingChars/4),status:'Raciocinando…'});}
            else if(d.type==='text_delta'){curText+=d.text;onUpdate({inTokens,outTokens:Math.max(outTokens,Math.floor(curText.length/3)),thinkingTokens:Math.floor(thinkingChars/4),status:'Analisando…'});}
            else if(d.type==='input_json_delta')curToolInput+=d.partial_json;
            break;
          case 'content_block_stop':
            if(!currentBlock)break;
            if(currentBlock.type==='thinking')allBlocks.push({type:'thinking',thinking:curThink});
            else if(currentBlock.type==='text'&&curText)allBlocks.push({type:'text',text:curText});
            else if(currentBlock.type==='tool_use'){let inp={};try{inp=JSON.parse(curToolInput);}catch{}allBlocks.push({type:'tool_use',id:currentBlock.id,name:currentBlock.name,input:inp});}
            currentBlock=null;break;
          case 'message_delta':
            if(e.usage)outTokens=e.usage.output_tokens??outTokens;
            stopReason=e.delta?.stop_reason??stopReason;
            // outTokens from message_delta already includes thinking tokens — zero the estimate to avoid double-count
            onUpdate({inTokens,outTokens,thinkingTokens:0,status:'Concluindo…'});break;
        }
      }
    }
  }finally{try{reader.releaseLock();}catch{}}
  return{text:allBlocks.filter(b=>b.type==='text').map(b=>b.text).join(''),stopReason,allContent:allBlocks,toolUses:allBlocks.filter(b=>b.type==='tool_use'),inTokens,outTokens,thinkingTokens:0,cacheCreated,cacheRead,id:msgId,diagnostics:msgDiag};
}
