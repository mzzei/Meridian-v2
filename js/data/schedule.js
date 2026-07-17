/* ESM low-risk — js/data/schedule.js */
import { expose } from '../expose.js';

function _loadSchedCache(){
  try{const raw=localStorage.getItem(globalThis.SCHED_STORE);if(!raw)return null;const c=JSON.parse(raw);return(c&&Array.isArray(c.jogos))?c:null;}catch{return null;}
}
function _saveSchedCache(jogos){
  try{localStorage.setItem(globalThis.SCHED_STORE,JSON.stringify({fetched_at:Date.now(),jogos}));}catch(e){}
}
// Jogos confirmados que as fontes din├ómicas (ESPN/IA) ├ás vezes omitem ÔÇö garantidos no calend├írio
const KNOWN_FIXTURES=[]; // fixtures extras opcionais (vazio = s├│ APIs)
function _tagComp(jogos,compId){
  return(Array.isArray(jogos)?jogos:[]).map(j=>({...j,comp_id:j.comp_id||compId,fase:j.fase||globalThis.compLabel(compId)}));
}
function _saveCompSched(compId,jogos){
  globalThis._schedByComp[compId]=_tagComp(jogos,compId);
  try{
    const raw=JSON.parse(localStorage.getItem(globalThis.COMP_SCHED_STORE)||'{}');
    raw[compId]={fetched_at:Date.now(),jogos:globalThis._schedByComp[compId]};
    localStorage.setItem(globalThis.COMP_SCHED_STORE,JSON.stringify(raw));
  }catch{}
}
function _loadAllCompSchedCache(){
  try{
    const raw=JSON.parse(localStorage.getItem(globalThis.COMP_SCHED_STORE)||'{}');
    Object.keys(raw||{}).forEach(id=>{
      if(globalThis.COMPETITIONS[id]&&Array.isArray(raw[id]?.jogos))globalThis._schedByComp[id]=raw[id].jogos;
    });
  }catch{}
}
function _rebuildUnionSchedule(){
  // Uni├úo de TODOS os campeonatos (sem priorizar liga ativa) ÔÇö chips usam os + pr├│ximos no tempo
  const all=[];
  globalThis.COMP_ORDER.forEach(id=>{
    (globalThis._schedByComp[id]||[]).forEach(j=>all.push({...j,comp_id:j.comp_id||id}));
  });
  // ordena por kickoff real (data + hora BRT), n├úo s├│ data civil / ordem de liga
  all.sort((a,b)=>{
    const da=_kickMs(a),db=_kickMs(b);
    if(da!==db)return da-db;
    return (a.data_iso||'').localeCompare(b.data_iso||'')||(a.hora_brt||'').localeCompare(b.hora_brt||'');
  });
  globalThis._schedule=all;
  try{localStorage.setItem(globalThis.SCHED_STORE,JSON.stringify({fetched_at:Date.now(),jogos:all}));}catch{}
  return all;
}
function _compLogo(id){
  const c=globalThis.getComp(id);
  return c.logo?`<img class="lib-comp-logo" src="${c.logo}" alt="${globalThis.esc(c.name)}" loading="lazy" onerror="this.style.visibility='hidden'">`:'<span style="font-size:28px">­ƒÅå</span>';
}

function _mergeKnownFixtures(jogos){
  jogos=Array.isArray(jogos)?jogos.slice():[];
  const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[╠Ç-═»]/g,'').trim();
  const key=j=>[norm(j.mandante),norm(j.visitante)].sort().join('|')+'@'+(j.data_iso||'');
  const seen=new Set(jogos.map(key));
  KNOWN_FIXTURES.forEach(f=>{if(!seen.has(key(f))){jogos.push({...f});seen.add(key(f));}});
  return jogos;
}
function loadSchedule(force){
  // Multi-campeonato: carrega TODAS as ligas em paralelo via ESPN (gr├ítis).
  // AF/FD (se chave) enriquecem o campeonato ativo.
  _loadAllCompSchedCache();
  if(!force&&Object.keys(globalThis._schedByComp).length){
    _rebuildUnionSchedule();
    renderScheduleChips(globalThis._schedule);
    if(globalThis._currentView==='library')globalThis.renderLibrary();
    globalThis.scheduleFeaturedPaint();
  }
  loadAllCompetitions(!!force);
  if(globalThis.getAfKey()){
    if(force){try{localStorage.removeItem('brsa_af_fixtures_v1');localStorage.removeItem('meridian_af_fixtures_'+globalThis._activeCompId);}catch{}}
    globalThis.loadAfData();
  }else if(globalThis.getFdKey()){
    globalThis.loadFdData();
  }
}
async function loadAllCompetitions(force){
  const espnEl=document.getElementById('espn-status');
  if(espnEl){espnEl.textContent='verificandoÔÇª';espnEl.className='ds-status';}
  globalThis.COMP_ORDER.forEach(id=>_setCompStatus(id,{loading:true}));
  // Verifica automaticamente a disponibilidade de jogos de TODOS os campeonatos
  const results=await Promise.all(globalThis.COMP_ORDER.map(id=>loadEspnComp(id,force).catch(e=>{
    _setCompStatus(id,{loading:false,checked:true,error:String(e&&e.message||'falha'),soon:false});
    return{id,ok:false,err:e};
  })));
  const okN=results.filter(r=>r&&r.ok).length;
  const soonN=results.filter(r=>r&&r.soon).length;
  if(espnEl){
    espnEl.textContent=okN?`ativo ┬À ${okN}/${globalThis.COMP_ORDER.length}${soonN?` ┬À ${soonN} em breve`:''}`:(soonN===globalThis.COMP_ORDER.length?'em breve':(globalThis._espnLastError||'indispon├¡vel'));
    espnEl.className='ds-status '+(okN||soonN?'ok':'err');
  }
  _rebuildUnionSchedule();
  renderScheduleChips(globalThis._schedule);
  if(globalThis._currentView==='library')globalThis.renderLibrary();
  globalThis.scheduleFeaturedPaint();
}
function _countUpcoming(jogos){
  const today=new Date();today.setHours(0,0,0,0);
  return(Array.isArray(jogos)?jogos:[]).filter(j=>{
    if(!j)return false;
    const st=(typeof globalThis._matchState==='function')?globalThis._matchState(j).state:null;
    if(st==='live'||st==='upcoming')return true;
    if(!j.data_iso)return true;
    return new Date(j.data_iso+'T12:00:00')>=today;
  }).length;
}
function _setCompStatus(compId,patch){
  globalThis._compStatus[compId]=Object.assign({loading:false,checked:false,upcoming:0,total:0,soon:false,error:''},globalThis._compStatus[compId]||{},patch);
}
async function loadEspnComp(compId,force){
  const c=globalThis.getComp(compId);
  if(!c||!c.espn){_setCompStatus(compId,{checked:true,soon:true,error:'sem fonte'});return{id:compId,ok:false};}
  _setCompStatus(compId,{loading:true,error:''});
  // cache fresco?
  if(!force){
    try{
      const raw=JSON.parse(localStorage.getItem(globalThis.COMP_SCHED_STORE)||'{}');
      const ent=raw[compId];
      if(ent&&Array.isArray(ent.jogos)&&ent.fetched_at&&Date.now()-ent.fetched_at<globalThis.ESPN_TTL){
        globalThis._schedByComp[compId]=ent.jogos;
        const up=_countUpcoming(ent.jogos);
        // soon s├│ se j├í verificamos e n├úo h├í NENHUM jogo no cache
        _setCompStatus(compId,{loading:false,checked:true,upcoming:up,total:ent.jogos.length,soon:!ent.jogos.length});
        return{id:compId,ok:!!ent.jogos.length,cached:true};
      }
    }catch{}
  }
  // Janela ampla: 30 dias atr├ís + 60 ├á frente ÔÇö detecta temporada inativa vs sem jogos pr├│ximos
  const from=new Date(Date.now()-30*864e5);const to=new Date(Date.now()+60*864e5);
  const ymd=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const url=`${espnBase(compId)}/scoreboard?dates=${ymd(from)}-${ymd(to)}&limit=100`;
  const cacheKey=`meridian_espn_${compId}_${ymd(from)}_${ymd(to)}`;
  let sb=null;
  try{sb=await fetchEspn(url,cacheKey,globalThis.ESPN_TTL);}catch(e){_setCompStatus(compId,{loading:false,checked:true,error:String(e&&e.message||'falha'),soon:false});return{id:compId,ok:false,err:e};}
  // sb null = falha de rede (n├úo ├® "em breve")
  if(sb==null){
    _setCompStatus(compId,{loading:false,checked:true,error:globalThis._espnLastError||'indispon├¡vel',soon:false});
    return{id:compId,ok:false};
  }
  const events=(sb&&sb.events)||[];
  const jogos=globalThis.espnScoreboardToSchedule(sb,compId);
  if(jogos.length)_saveCompSched(compId,jogos);
  else{globalThis._schedByComp[compId]=[];try{
    const raw=JSON.parse(localStorage.getItem(globalThis.COMP_SCHED_STORE)||'{}');
    raw[compId]={fetched_at:Date.now(),jogos:[]};
    localStorage.setItem(globalThis.COMP_SCHED_STORE,JSON.stringify(raw));
  }catch{}}
  const up=_countUpcoming(jogos);
  // Sem eventos na janela ampla ÔåÆ competi├º├úo ainda n├úo come├ºou / hiato ÔåÆ "Em breve"
  const soon=!events.length;
  const roundLabel=globalThis._inferCompRound(compId);
  _setCompStatus(compId,{loading:false,checked:true,upcoming:up,total:jogos.length,soon,error:'',roundLabel:roundLabel||''});
  // Prewarm classifica├º├úo da liga (featured stats por compId)
  globalThis._loadCompStandings(compId,false).catch(()=>{});
  return{id:compId,ok:!!jogos.length,soon,upcoming:up};
}
async function fetchScheduleFromApi(silent){
  const apiKey=document.getElementById('api-key-input').value.trim();
  if(!globalThis.getWorkerUrl()&&!apiKey.startsWith('sk-'))return;
  const chips=document.getElementById('ex-chips');
  const _clFallback=globalThis.compLabel(globalThis._activeCompId);
  if(!silent){chips.innerHTML='<span class="ex-loading"><span class="ldot"></span> Buscando agenda de '+globalThis.esc(_clFallback)+'ÔÇª</span>';document.getElementById('reload-btn').style.display='none';}
  const today=new Date().toISOString().slice(0,10);
  const in14=new Date(Date.now()+14*864e5).toISOString().slice(0,10);
  // Fallback Haiku se ESPN falhar ÔÇö usa a liga de AN├üLISE ativa (CompContext), n├úo hardcode S├®rie A
  const SP=`${_clFallback} football schedule. Respond ONLY with valid JSON (no markdown, no extra text): {"jogos":[{"mandante":"nome pt-BR","visitante":"nome pt-BR","fase":"Rodada N ou ${_clFallback}","grupo":null,"data_iso":"YYYY-MM-DD","hora_brt":"HH:MM","sede":"cidade ┬À est├ídio"}]}. Inclua TODOS os jogos confirmados de ${today} at├® ${in14}.`;
  const msgs=[{role:'user',content:`Calend├írio de ${_clFallback} de ${today} a ${in14}. Todos os jogos com times em portugu├¬s, fase/rodada (se dispon├¡vel), data YYYY-MM-DD e hor├írio BRT. Apenas esta competi├º├úo.`}];
  try{
    for(let i=0;i<6;i++){
      const res=await fetch(globalThis.getApiBase()+'/v1/messages',{method:'POST',headers:globalThis.getReqHeaders(apiKey),body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:2500,system:SP,messages:msgs,tools:[{type:'web_search_20250305',name:'web_search'}]})});
      globalThis.parseRateLimitHeaders(res);const data=await res.json();if(!res.ok)throw new Error(data.error?.message);
      if(data.stop_reason==='end_turn'){
        const txt=data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
        const m=txt.match(/\{[\s\S]*\}/);
        if(m){let jogos;try{jogos=JSON.parse(m[0]).jogos||[];}catch{jogos=[];}
          jogos=jogos.filter(j=>j.mandante&&j.visitante&&j.data_iso);
          if(jogos.length){_saveSchedCache(jogos);globalThis._schedule=jogos;renderScheduleChips(globalThis._schedule);if(globalThis._currentView==='library')globalThis.renderLibrary();return;}}
        break;
      }
      if(data.stop_reason==='tool_use'){msgs.push({role:'assistant',content:data.content});msgs.push({role:'user',content:data.content.filter(b=>b.type==='tool_use').map(b=>({type:'tool_result',tool_use_id:b.id,content:''}))});}else break;
    }
    if(!silent)renderScheduleChips([]);
  }catch(e){if(!silent)chips.innerHTML=`<button class="chip chip-cta" onclick="fetchScheduleFromApi(false)">Ôå╗ tentar novamente</button>`;}
}
/** Kickoff ms ÔÇö delega a globalThis._matchKick (fonte ├║nica de tempo) */
function _kickMs(j){
  if(typeof globalThis._matchKick!=='function'){
    if(!j||!j.data_iso)return Infinity;
    const t=(j.hora_brt&&/^\d{1,2}:\d{2}/.test(j.hora_brt))?j.hora_brt:'12:00';
    const d=new Date(j.data_iso+'T'+t+':00-03:00');
    return isNaN(d.getTime())?Infinity:d.getTime();
  }
  const k=globalThis._matchKick(j);
  return k?k.getTime():Infinity;
}
function _chipTimeMeta(j,s){
  if(s&&s.state==='live')return'AO VIVO';
  const day=dateLabelFromISO(j.data_iso);
  const hr=j.hora_brt||'';
  if(day==='hoje'||day==='amanh├ú')return[day,hr].filter(Boolean).join(' ┬À ');
  return[day&&day!=='outros'?day:(j.data_iso||''),hr].filter(Boolean).join(' ┬À ');
}
/** Ranker can├┤nico: live+upcoming por kickoff. compId null/undefined = todas as ligas. */
function nearestMatches(list,n,compId){
  n=n==null?5:n;
  const rows=[];
  (list||[]).forEach((j,idx)=>{
    if(!j||!j.data_iso)return;
    if(compId!=null&&compId!==''&&(j.comp_id||compId)!==compId)return;
    const s=(typeof globalThis._matchState==='function')?globalThis._matchState(j):null;
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
  globalThis._schedule=jogos;
  const chips=document.getElementById('ex-chips');
  if(!chips)return;
  if(!jogos.length){
    chips.innerHTML='<span class="ex-loading">Nenhuma partida encontrada</span>';
    const rb=document.getElementById('reload-btn');if(rb)rb.style.display='inline';
    return;
  }
  const nearest=nearestMatches(jogos,5,null);
  if(!nearest.length){
    chips.innerHTML='<span class="ex-auto-hint">'+globalThis.t('sched_no_games')+' ┬À <button class="chip chip-cta" onclick="globalThis.showView(\'library\')">'+globalThis.t('sched_calendar')+'</button></span>';
    const lbl=document.getElementById('sched-lbl');if(lbl)lbl.textContent=globalThis.t('sched_lbl');
    const rb=document.getElementById('reload-btn');if(rb)rb.style.display='inline';
    return;
  }
  let html='';
  nearest.forEach(function(row){
    const j=row.j,s=row.s,idx=row.idx;
    const live=s.state==='live';
    const meta=_chipTimeMeta(j,s);
    const title=((j.comp_id?globalThis.compLabel(j.comp_id)+' ┬À ':'')+(j.mandante||'')+' ├ù '+(j.visitante||''));
    html+='<button type="button" class="chip chip-match'+(live?' chip-live':'')+'" onclick="globalThis.fillMatch('+idx+')" title="'+globalThis.esc(title)+'">'
      +'<span class="chip-teams">'+globalThis.esc(j.mandante||'?')+' ├ù '+globalThis.esc(j.visitante||'?')+'</span>'
      +'<span class="chip-meta'+(live?' chip-meta-live':'')+'">'+globalThis.esc(meta)+'</span>'
      +'</button>';
  });
  if(jogos.length>nearest.length){
    html+='<button type="button" class="chip chip-cta" onclick="globalThis.showView(\'library\')" style="margin-top:4px">'
      +(typeof globalThis.t('game_all')==='function'?globalThis.t('game_all')(jogos.length):globalThis.t('game_all'))
      +'</button>';
  }
  chips.innerHTML=html;
  const rb=document.getElementById('reload-btn');if(rb)rb.style.display='inline';
  const lbl=document.getElementById('sched-lbl');
  if(lbl)lbl.textContent=typeof globalThis.t('game_upcoming')==='function'?globalThis.t('game_upcoming')(nearest.length):globalThis.t('game_upcoming');
  globalThis.scheduleFeaturedPaint();
}

// ÔöÇÔöÇÔöÇ Tournament context cache ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function _loadCtxCache(){
  try{const raw=localStorage.getItem(globalThis.CTX_STORE);if(!raw)return null;const c=JSON.parse(raw);return(c&&c.data)?c:null;}catch{return null;}
}
function _saveCtxCache(data){
  try{localStorage.setItem(globalThis.CTX_STORE,JSON.stringify({fetched_at:Date.now(),data}));}catch(e){}
}
function getTournamentCtxString(){
  const c=_loadCtxCache();if(!c)return'';
  try{
    const d=c.data;const lines=[];
    if(d.fase_atual)lines.push(`FASE ATUAL: ${d.fase_atual}`);
    if(d.standings&&Object.keys(d.standings).length){
      lines.push('CLASSIFICA├ç├âO DOS GRUPOS:');
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
  if(globalThis.getAfKey()||globalThis.getFdKey())return; // globalThis.loadAfData/globalThis.loadFdData j├í atualiza globalThis.CTX_STORE ÔÇö evita race condition
  if(!globalThis.autoAiEnabled()&&!force)return; // modo economia: n├úo gasta cr├®ditos no autom├ítico (force = a├º├úo expl├¡cita)
  const cache=_loadCtxCache();
  if(cache&&!force){const age=Date.now()-(cache.fetched_at||0);if(age<globalThis.CTX_TTL)return;}
  fetchTournamentCtxFromApi();
}
async function fetchTournamentCtxFromApi(){
  const apiKey=document.getElementById('api-key-input').value.trim();
  if(!globalThis.getWorkerUrl()&&!apiKey.startsWith('sk-'))return;
  const today=new Date().toISOString().slice(0,10);
  const _cl=globalThis.compLabel(globalThis._activeCompId);
  const SP=`${_cl} ÔÇö agente de contexto. Data: ${today}. Pesquise e retorne APENAS JSON v├ílido (sem markdown): {"fase_atual":"string (ex.: Rodada 15 / Fase de grupos)","standings":{"Tabela":[{"time":"","pts":0,"j":0,"v":0,"e":0,"d":0,"gp":0,"gc":0}]},"results":[{"data":"DD/MM","mandante":"","placar":"N-N","visitante":""}]}. Inclua a classifica├º├úo de ${_cl} e os ├║ltimos 12 resultados.`;
  const msgs=[{role:'user',content:`Tabela de classifica├º├úo e resultados recentes de ${_cl} at├® ${today}.`}];
  try{
    for(let i=0;i<4;i++){
      const res=await fetch(globalThis.getApiBase()+'/v1/messages',{method:'POST',headers:globalThis.getReqHeaders(apiKey),body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:3000,system:SP,messages:msgs,tools:[{type:'web_search_20250305',name:'web_search'}]})});
      globalThis.parseRateLimitHeaders(res);const data=await res.json();if(!res.ok)return;
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

export {
  _loadSchedCache,
  _saveSchedCache,
  _tagComp,
  _saveCompSched,
  _loadAllCompSchedCache,
  _rebuildUnionSchedule,
  _compLogo,
  _mergeKnownFixtures,
  loadSchedule,
  loadAllCompetitions,
  _countUpcoming,
  _setCompStatus,
  loadEspnComp,
  fetchScheduleFromApi,
  _kickMs,
  _chipTimeMeta,
  nearestMatches,
  renderScheduleChips,
  _loadCtxCache,
  _saveCtxCache,
  getTournamentCtxString,
  loadTournamentCtx,
  fetchTournamentCtxFromApi
};

expose({
  _loadSchedCache,
  _saveSchedCache,
  _tagComp,
  _saveCompSched,
  _loadAllCompSchedCache,
  _rebuildUnionSchedule,
  _compLogo,
  _mergeKnownFixtures,
  loadSchedule,
  loadAllCompetitions,
  _countUpcoming,
  _setCompStatus,
  loadEspnComp,
  fetchScheduleFromApi,
  _kickMs,
  _chipTimeMeta,
  nearestMatches,
  renderScheduleChips,
  _loadCtxCache,
  _saveCtxCache,
  getTournamentCtxString,
  loadTournamentCtx,
  fetchTournamentCtxFromApi
});
