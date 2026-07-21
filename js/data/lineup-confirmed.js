/* js/data/lineup-confirmed.js — PARTE X (shell 87)
 *
 * Escalação CONFIRMADA de dia de jogo, 100% determinística (ZERO Anthropic):
 *   - ESPN summary?event= → titulares + formação + banco (mesmo payload do painel live.js)
 *   - API-Football getAfLineups(fixtureId) quando afReady e fixture da season acessível
 * Precedência ao aplicar no card de análise: AF confirmada > ESPN starters > (mantém o
 * especulativo prévio da F1/F2). Substitui o "provável" pelo XI oficial na janela de jogo.
 *
 * Também: refreshAnalysisLineups() (botão/poll) e o helper compartilhado
 * espnStartersFromSummary() reusado por live.js (DRY — Q3).
 */

function _lcNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function _lcHit(a,b){a=_lcNorm(a);b=_lcNorm(b);return !!(a&&b&&(a.includes(b)||b.includes(a)));}

// Janela de jogo (PARTE X §4): −6h (kickoff) até FT+~30min, OU status ESPN pre/in/post.
function isMatchDayWindow(ev){
  if(!ev)return false;
  const st=String(ev.state||'').toLowerCase();
  if(st==='in')return true;              // ao vivo — sempre janela
  if(ev.kickoffMs){
    const dt=ev.kickoffMs-Date.now();
    // de 6h ANTES do apito até 2.5h DEPOIS (cobre jogo + acréscimos + intervalo pós-FT)
    if(dt<=6*3600*1000 && dt>=-2.5*3600*1000)return true;
  }
  return false;
}

// ESPN summary → titulares/formação/banco por lado. Helper compartilhado (live.js reusa).
// Retorna {home:{team,formation,starters:[{name,jersey,pos,formationPlace,starter,active,...raw}],bench:[...]}, away:{...}}
function espnStartersFromSummary(summary){
  const rosters=(summary&&summary.rosters)||[];
  if(!rosters.length)return null;
  const pick=want=>rosters.find(r=>r.home===want)||null;
  const side=(roster,fallback)=>{
    const R=roster||rosters[fallback]||null;
    if(!R)return null;
    const all=Array.isArray(R.roster)?R.roster:[];
    const starters=all.filter(p=>p&&p.starter).sort((x,y)=>((x.formationPlace==null?99:x.formationPlace)-(y.formationPlace==null?99:y.formationPlace)));
    const bench=all.filter(p=>p&&!p.starter&&p.active!==false);
    return {
      team:(R.team&&(R.team.displayName||R.team.shortDisplayName||R.team.name))||'',
      formation:R.formation||'',   // vazio = não veio da fonte (NÃO inventar)
      starters, bench, raw:R
    };
  };
  return {home:side(pick(true),0), away:side(pick(false),1)};
}
// Converte um lado ESPN → shape de escalação da análise {formacao,onze:[{nome,posicao}],banco:[nomes]}.
function _lcEspnSideToLineup(side){
  if(!side||!side.starters||!side.starters.length)return null;
  const nm=p=>(p&&p.athlete&&p.athlete.displayName)||'';
  const pos=p=>(p&&p.position&&(p.position.abbreviation||p.position.name))||'';
  const onze=side.starters.map(p=>({nome:nm(p),posicao:pos(p)})).filter(p=>p.nome).slice(0,11);
  if(onze.length<7)return null;
  const banco=(side.bench||[]).map(nm).filter(Boolean);
  return {formacao:side.formation||'',onze,banco};
}

// AF getAfLineups → por lado, casando com os times da query. Só na janela e se afReady.
async function _lcAfConfirmed(query,compId){
  try{
    if(typeof afReady!=='function'||!afReady())return null;
    if(typeof afSeasonBlocked==='function'&&afSeasonBlocked(compId))return null;
    if(typeof getAfFixtures!=='function'||typeof _afMatchIds!=='function'||typeof getAfLineups!=='function')return null;
    const fData=await getAfFixtures();
    if(!fData||!fData.response||!fData.response.length)return null;
    const ids=_afMatchIds(query,fData);
    if(!ids||!ids.fixtureId)return null;
    const lu=await getAfLineups(ids.fixtureId);
    if(!lu||!lu.length)return null;
    // lu: [{team, coach, formation, xi:['7 Nome',...]}]
    const byTeam=lu.map(t=>({
      team:t.team||'',
      formacao:t.formation||'',
      onze:(t.xi||[]).map(s=>({nome:String(s).replace(/^\s*\d+\s*/,'').trim(),posicao:''})).filter(p=>p.nome).slice(0,11),
      banco:[]
    })).filter(t=>t.onze.length>=7);
    return byTeam.length?{source:'af',teams:byTeam}:null;
  }catch{return null;}
}

// Acha o evento ESPN do confronto (para eventId + janela).
async function _lcFindEspnEvent(teams,compId){
  try{
    if(typeof fetchEspn!=='function'||typeof espnBase!=='function')return null;
    const base=espnBase(compId);
    const from=new Date(Date.now()-2*864e5).toISOString().slice(0,10).replace(/-/g,'');
    const to=new Date(Date.now()+30*864e5).toISOString().slice(0,10).replace(/-/g,'');
    const sb=await fetchEspn(base+'/scoreboard?dates='+from+'-'+to+'&limit=100','meridian_lc_sb_'+compId,10*60*1000);
    const evs=(sb&&sb.events)||[];
    const ev=evs.find(e=>{
      const c=e&&e.competitions&&e.competitions[0];const cs=(c&&c.competitors)||[];
      if(cs.length<2)return false;
      const n=i=>cs[i]&&cs[i].team&&(cs[i].team.displayName||cs[i].team.shortDisplayName||cs[i].team.name);
      return (_lcHit(n(0),teams[0])&&_lcHit(n(1),teams[1]))||(_lcHit(n(0),teams[1])&&_lcHit(n(1),teams[0]));
    });
    if(!ev)return null;
    const c=ev.competitions&&ev.competitions[0];
    const state=(c&&c.status&&c.status.type&&c.status.type.state)||(ev.status&&ev.status.type&&ev.status.type.state)||'';
    const dateIso=ev.date||(c&&c.date)||'';
    return {eventId:String(ev.id),kickoffMs:dateIso?new Date(dateIso).getTime():0,state,dateIso};
  }catch{return null;}
}

// Escolhe, para um nome de time, a melhor fonte confirmada (AF > ESPN). Retorna {conf,source} ou null.
function _lcPickConfirmed(teamName,af,espnSides){
  // AF primeiro
  if(af&&af.teams){
    const m=af.teams.find(t=>_lcHit(t.team,teamName));
    if(m)return {conf:{formacao:m.formacao,onze:m.onze,banco:m.banco},source:'af'};
  }
  // ESPN
  if(espnSides){
    const sides=[espnSides.home,espnSides.away].filter(Boolean);
    const m=sides.find(s=>_lcHit(s.team,teamName));
    if(m){const c=_lcEspnSideToLineup(m);if(c)return {conf:c,source:'espn'};}
  }
  return null;
}

/**
 * Aplica escalação CONFIRMADA no `parsed` (card). Determinístico, sem LLM.
 * - Seta parsed._espnEventId / parsed._matchWindow (para o botão/poll).
 * - Na janela (ou force): busca ESPN summary + AF lineups e SUBSTITUI _lineups[side]
 *   pelo XI confirmado (fonte 'api'), respeitando precedência AF>ESPN.
 * @returns {{changed:boolean, source:string, eventId?:string, window:boolean}}
 */
async function applyConfirmedLineups(parsed,opts){
  opts=opts||{};
  const compId=opts.compId||parsed.comp_id||(typeof _activeCompId!=='undefined'?_activeCompId:'brsa');
  const nmM=parsed&&parsed.mandante&&parsed.mandante.nome;
  const nmV=parsed&&parsed.visitante&&parsed.visitante.nome;
  if(!nmM||!nmV)return {changed:false,source:'',window:false};
  const ev=await _lcFindEspnEvent([nmM,nmV],compId);
  if(ev&&ev.eventId)parsed._espnEventId=ev.eventId;
  const inWindow=ev?isMatchDayWindow(ev):false;
  parsed._matchWindow=inWindow;
  if(ev&&(ev.state==='post'))parsed._matchOver=true;
  if(!inWindow&&!opts.force)return {changed:false,source:'',eventId:ev&&ev.eventId,window:false};

  // Fontes confirmadas (TTL curto na janela; cache longo fora)
  const ttl=inWindow?45*1000:15*60*1000;
  let espnSides=null,af=null;
  if(ev&&ev.eventId&&typeof fetchEspn==='function'&&typeof espnBase==='function'){
    try{
      const summary=await fetchEspn(espnBase(compId)+'/summary?event='+ev.eventId,'meridian_lu_live_'+ev.eventId,ttl);
      if(summary)espnSides=espnStartersFromSummary(summary);
    }catch{}
  }
  af=await _lcAfConfirmed(nmM+' x '+nmV,compId);

  if(!espnSides&&!af)return {changed:false,source:'',eventId:ev&&ev.eventId,window:inWindow};
  if(!parsed._lineups)parsed._lineups={mandante:null,visitante:null};
  let changed=false,usedSource='';
  const applySide=(sideKey,tecKey,teamName)=>{
    const pick=_lcPickConfirmed(teamName,af,espnSides);
    if(!pick)return;
    const tecnico=(parsed[tecKey]&&parsed[tecKey].nome)||(parsed._lineups[sideKey]&&parsed._lineups[sideKey].tecnico)||'';
    const built=(typeof normalizeLineupTeam==='function')?normalizeLineupTeam({
      nome:teamName,
      formacao:pick.conf.formacao||'',
      tecnico,
      banco:pick.conf.banco||[],
      escalacao_str:'',
      onze:pick.conf.onze||[],
      rows:null,
      fonte:'api',
      formacaoFonte:pick.conf.formacao?'api':'inferida'
    }):null;
    if(built){parsed._lineups[sideKey]=built;changed=true;usedSource=pick.source;}
  };
  applySide('mandante','tecnico_mandante',nmM);
  applySide('visitante','tecnico_visitante',nmV);
  if(changed){
    // rodapé: pior nível entre os dois lados (um pode ter confirmado e o outro não)
    const fm=parsed._lineups.mandante&&parsed._lineups.mandante.fonte;
    const fv=parsed._lineups.visitante&&parsed._lineups.visitante.fonte;
    parsed._lineupsFonte=(typeof _luWorseFonte==='function')?_luWorseFonte(fm,fv):(fm||fv||'pesquisa');
    // NÃO tocar em _coletaOk (shell 90): ele significa "a Fase 1 devolveu rawFacts" e
    // alimenta o empty-state + diagnóstico fase1-* de TODAS as abas (invariante 32).
    // Marcá-lo true aqui só porque a ESPN/AF publicou o XI escondia a falha real da
    // coleta em Cartões/Escanteios. A escalação confirmada já se anuncia por
    // _lineupsFonte='api' e pelo badge por time — não precisa mentir sobre a coleta.
  }
  return {changed,source:usedSource,eventId:ev&&ev.eventId,window:inWindow};
}

// Poll registry (evita múltiplos intervalos por card).
var _lcPolls={};
function _lcStopPoll(hid){if(_lcPolls[hid]){clearInterval(_lcPolls[hid]);delete _lcPolls[hid];}}
function startLineupAutoPoll(hid,cardId){
  if(!hid||_lcPolls[hid])return;
  _lcPolls[hid]=setInterval(function(){refreshAnalysisLineups(hid,cardId,true);},75*1000);
}

/** Botão "Atualizar escalação" / poll ao vivo — re-renderiza SÓ a aba, zero LLM. */
async function refreshAnalysisLineups(hid,cardId,silent){
  const panelId='at-escalacao-'+(cardId||0);
  const btnSel='#'+panelId+' .esc-refresh button';
  let btnLabel='';
  try{
    const hist=(typeof globalThis!=='undefined'&&Array.isArray(globalThis._history))?globalThis._history:[];
    const entry=hist.find(h=>h&&h.hid===hid);
    const d=entry?entry.data:null;
    // Card fora do DOM (nova análise / conversa limpa) = nada para atualizar. Sem isto o
    // intervalo virava fetch órfão a cada 75s até o FT, invisível ao usuário (shell 90).
    if(!d||!document.getElementById(panelId)){_lcStopPoll(hid);return;}
    const btn=document.querySelector(btnSel);
    if(btn&&!silent){btnLabel=btn.textContent;btn.disabled=true;btn.textContent='Atualizando…';}
    const res=await applyConfirmedLineups(d,{compId:d.comp_id||_activeCompId,query:(d.partida||''),force:true});
    const panel=document.getElementById(panelId);
    if(panel&&typeof buildEscalacaoTab==='function')panel.innerHTML=buildEscalacaoTab(d,cardId);
    if(typeof persistHistory==='function'){try{persistHistory();}catch{}}
    // fora da janela / jogo terminado → para o poll (fixa o último XI)
    if(!res.window||d._matchOver)_lcStopPoll(hid);
    if(!res.changed&&!silent&&typeof toast==='function')toast(res.window?'Escalação ainda não publicada — tente novamente perto do apito.':'Escalação confirmada só fica disponível perto do jogo.');
  }catch(e){_lcStopPoll(hid);}
  finally{
    // Botão nunca fica preso em "Atualizando…" (shell 90): se o painel NÃO foi
    // re-renderizado (erro de rede, painel sumiu), restaura o rótulo e o clique.
    // Quando o painel é re-renderizado, buildEscalacaoTab já cria um botão novo e ativo.
    const stuck=document.querySelector(btnSel);
    if(stuck&&stuck.disabled){stuck.disabled=false;stuck.textContent=btnLabel||'↻ Atualizar escalação';}
  }
}

if(typeof window!=='undefined'){
  window.isMatchDayWindow=isMatchDayWindow;
  window.espnStartersFromSummary=espnStartersFromSummary;
  window.applyConfirmedLineups=applyConfirmedLineups;
  window.refreshAnalysisLineups=refreshAnalysisLineups;
  window.startLineupAutoPoll=startLineupAutoPoll;
}
