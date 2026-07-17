/* js/data/espn.js — ESPN unofficial API helpers */
// ─── ESPN unofficial API (gratuito · sem key · Brasileirão bra.1) ────────
let _espnLastError='';
async function fetchEspn(path,cacheKey,ttl=ESPN_TTL){
  let stale=null;
  try{const c=JSON.parse(localStorage.getItem(cacheKey)||'null');if(c){if((Date.now()-c.ts)<ttl)return c.data;stale=c.data;}}catch{}
  const direct=path.startsWith('http')?path:`${ESPN_BASE}${path}`;
  // Em http(s) tenta direto; se direto falhar, tenta proxies CORS como rede de segurança (não só em file://)
  const proxies=[direct,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(direct)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(direct)}`];
  for(const url of proxies){
    const ctl=new AbortController();const tid=setTimeout(()=>ctl.abort(),8000); // não trava pra sempre
    try{
      const res=await fetch(url,{signal:ctl.signal});
      clearTimeout(tid);
      if(!res.ok){_espnLastError=`HTTP ${res.status}`;continue;}
      const data=await res.json();
      try{localStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),data}));}catch{}
      return data;
    }catch(e){clearTimeout(tid);_espnLastError=e?.name==='AbortError'?'timeout (8s)':`rede: ${e?.message||'falha'}`;}
  }
  return stale; // rede falhou: usa cache antigo (se houver) em vez de deixar travado em "Carregando…"
}
async function getEspnStandings(compId){
  const id=compId||_activeCompId;
  return fetchEspn(espnStandingsUrl(id),'meridian_espn_st_'+id);
}
async function getEspnScoreboard(compId){
  const id=compId||_activeCompId;
  const from=new Date().toISOString().slice(0,10).replace(/-/g,'');
  const to=new Date(Date.now()+14*864e5).toISOString().slice(0,10).replace(/-/g,'');
  return fetchEspn(`${espnBase(id)}/scoreboard?dates=${from}-${to}&limit=50`,'meridian_espn_sb_'+id,ESPN_TTL);
}
function formatEspnContext(sData,sbData){
  const lines=[];
  // Standings
  if(sData?.standings?.[0]?.entries?.length){
    lines.push('=== CLASSIFICAÇÃO (ESPN) ===');
    const groups={};
    sData.standings[0].entries.forEach(e=>{
      const g=e.team?.group?.displayName||e.group?.displayName||'Grupo';
      if(!groups[g])groups[g]=[];
      const stats=Object.fromEntries((e.stats||[]).map(s=>[s.name,s.value]));
      groups[g].push(`  ${e.team.displayName} — Pts:${stats.points??'?'} J:${stats.gamesPlayed??'?'} V:${stats.wins??'?'} E:${stats.ties??'?'} D:${stats.losses??'?'} GP:${stats.pointsFor??'?'} GC:${stats.pointsAgainst??'?'}`);
    });
    Object.entries(groups).forEach(([g,rows])=>{lines.push(g+':');rows.forEach(r=>lines.push(r));});
  }
  // Scoreboard
  if(sbData?.events?.length){
    const finished=sbData.events.filter(e=>e.status?.type?.completed);
    if(finished.length){
      lines.push('\n=== RESULTADOS RECENTES ===');
      finished.slice(-15).forEach(e=>{
        const c=e.competitions?.[0];const comps=c?.competitors||[];
        const home=comps.find(x=>x.homeAway==='home');const away=comps.find(x=>x.homeAway==='away');
        if(home&&away)lines.push(`${e.shortName||''} ${home?.team?.displayName} ${home?.score}-${away?.score} ${away?.team?.displayName}`);
      });
    }
    const live=sbData.events.filter(e=>e.status?.type?.state==='in');
    if(live.length){
      lines.push('\n=== AO VIVO ===');
      live.forEach(e=>{
        const c=e.competitions?.[0];const comps=c?.competitors||[];
        const home=comps.find(x=>x.homeAway==='home');const away=comps.find(x=>x.homeAway==='away');
        if(home&&away)lines.push(`${home?.team?.displayName} ${home?.score||0}-${away?.score||0} ${away?.team?.displayName} [${c?.status?.displayClock}]`);
      });
    }
    const sched=sbData.events.filter(e=>e.status?.type?.state==='pre').slice(0,10);
    if(sched.length){
      lines.push('\n=== PRÓXIMAS PARTIDAS ===');
      sched.forEach(e=>{
        const d=new Date(e.date);const brt=new Date(d.getTime()-3*3600000);
        const c=e.competitions?.[0];const comps=c?.competitors||[];
        const home=comps.find(x=>x.homeAway==='home');const away=comps.find(x=>x.homeAway==='away');
        if(home&&away)lines.push(`${String(brt.getUTCDate()).padStart(2,'0')}/${String(brt.getUTCMonth()+1).padStart(2,'0')} ${home?.team?.displayName} x ${away?.team?.displayName}`);
      });
    }
  }
  return lines.join('\n');
}
// ─── TheSportsDB (grátis · CORS aberto · Brasileirão Série A = liga 4351) ─
// 2ª fonte ESTRUTURADA e independente da ESPN: placares confirmados, rodada e
// próximos jogos. Validado ao vivo (07/2026): cobre a temporada 2026 completa e
// responde com Access-Control-Allow-Origin:* — chamada direta do navegador, sem
// passar pelo Worker. Uso: validação cruzada de resultados + fallback da ESPN.
const TSDB_BASE='https://www.thesportsdb.com/api/v1/json/123';
const TSDB_TTL=15*60*1000;
async function fetchTsdb(path,cacheKey){
  try{const raw=localStorage.getItem(cacheKey);if(raw){const c=JSON.parse(raw);if(c&&Date.now()-c.t<TSDB_TTL)return c.d;}}catch{}
  const ctl=new AbortController();const tid=setTimeout(()=>ctl.abort(),8000);
  try{
    const res=await fetch(TSDB_BASE+path,{signal:ctl.signal});
    if(!res.ok)return null;
    const d=await res.json();
    try{localStorage.setItem(cacheKey,JSON.stringify({t:Date.now(),d}));}catch{}
    return d;
  }catch{return null;}
  finally{clearTimeout(tid);}
}
function _tsdbLine(e){
  const sc=(e.intHomeScore!=null&&e.intAwayScore!=null)?`${e.intHomeScore}x${e.intAwayScore}`:'—';
  const rd=e.intRound?` (rodada ${e.intRound})`:'';
  return `${e.dateEvent||''} · ${e.strHomeTeam} ${sc} ${e.strAwayTeam}${rd}`;
}
async function getTsdbContext(){
  const[past,next]=await Promise.all([
    fetchTsdb('/eventspastleague.php?id=4351','brsa_tsdb_past_v1'),
    fetchTsdb('/eventsnextleague.php?id=4351','brsa_tsdb_next_v1')
  ]);
  const L=[];
  if(past?.events?.length){L.push('=== RESULTADOS CONFIRMADOS (TheSportsDB · fonte estruturada independente — use para VALIDAÇÃO CRUZADA de placares/datas) ===');past.events.slice(0,15).forEach(e=>L.push(_tsdbLine(e)));}
  if(next?.events?.length){L.push('=== PRÓXIMOS JOGOS (TheSportsDB) ===');next.events.slice(0,10).forEach(e=>L.push(_tsdbLine(e)));}
  return L.join('\n');
}

// Nomes de confronto "a definir" que a ESPN publica em inglês para o mata-mata
// (ex.: "Semifinal 1 Loser"). Traduz pra pt-BR — sem isso, "Semifinal 1 Loser ×
// Semifinal 2 Loser" (que é só a disputa de 3º lugar) parece uma losers bracket,
// que NÃO existe no Brasileirão (mata-mata é eliminação simples + 1 jogo de 3º lugar).
function _ptPlaceholderTeam(n){
  let s=String(n||'').trim();
  if(!s)return s;
  const round=r=>r.replace(/round of 16/i,'Oitavas').replace(/round of 32/i,'32-avos')
    .replace(/quarter-?final/i,'Quartas').replace(/semi-?final/i,'Semifinal').replace(/\bfinal\b/i,'Final');
  // "Group A Winner" / "Group A Runner-up"
  let m=s.match(/^group\s+([a-l])\s+(winner|runner-?up)$/i);
  if(m)return (/winner/i.test(m[2])?'1º ':'2º ')+'Grupo '+m[1].toUpperCase();
  // "<Fase> <n> Winner|Loser"  (formato do print) e "Winner|Loser <Fase> <n>"
  m=s.match(/^(.*?)\s*(\d+)\s+(winner|loser)$/i)||s.match(/^(winner|loser)\s+(.*?)\s*(\d+)$/i);
  if(m){
    const wl=/winner/i.test(s)?'Vencedor':'Perdedor';
    const parts=[m[1],m[2],m[3]].filter(x=>x&&!/^(winner|loser)$/i.test(x));
    return wl+' '+round(parts[0])+' '+parts[1];
  }
  return s;
}
function espnScoreboardToSchedule(sbData,compId){
  if(!sbData?.events?.length)return[];
  const _cid=compId||_activeCompId;
  return sbData.events.map(e=>{
    const c=e.competitions?.[0];const comps=c?.competitors||[];
    const home=comps.find(x=>x.homeAway==='home');const away=comps.find(x=>x.homeAway==='away');
    if(!home||!away)return null;
    const d=new Date(e.date);const brt=new Date(d.getTime()-3*3600000);
    // Rodada: NUNCA usar e.name ("Santos at Botafogo") — só notes/type/week estruturados
    let roundRaw=(c?.notes||[]).map(n=>n.headline||n.text||'').find(t=>t&&!/\bat\b|\bvs\.?\b|×|@/i.test(t))
      ||(c?.type&&(c.type.detail||c.type.text))||e.week||'';
    if(roundRaw&&(/\bat\b|\bvs\.?\b|×|@/i.test(String(roundRaw))||String(roundRaw)===e.name))roundRaw='';
    const hn=home.team.displayName,an=away.team.displayName;
    // Captura brasões (scoreboard: team.logo · standings: team.logos[])
    const hLogo=home.team.logo||home.team.logos?.[0]?.href||(home.team.id?_ESPN_CREST(home.team.id):'');
    const aLogo=away.team.logo||away.team.logos?.[0]?.href||(away.team.id?_ESPN_CREST(away.team.id):'');
    _registerTeamLogo(hn,hLogo);_registerTeamLogo(an,aLogo);
    const semiLoser=x=>/semi-?final/i.test(x)&&/loser/i.test(x);
    const semiWinner=x=>/semi-?final/i.test(x)&&/winner/i.test(x);
    let round=roundRaw||'';
    if(semiLoser(hn)&&semiLoser(an))round='Disputa de 3º lugar';
    else if(semiWinner(hn)&&semiWinner(an))round='Final';
    const faseLab=_parseRoundLabel(round)||''; // só "Rodada N" / fases; vazio se não houver
    const isGroup=/group/i.test(String(round))||/grupo/i.test(String(round));
    return{
      mandante:_ptPlaceholderTeam(hn),visitante:_ptPlaceholderTeam(an),
      fase:faseLab, // vazio se ESPN não trouxe rodada (não grava nome do jogo)
      grupo:isGroup&&faseLab?faseLab:null,
      data_iso:brt.toISOString().slice(0,10),
      hora_brt:`${String(brt.getUTCHours()).padStart(2,'0')}:${String(brt.getUTCMinutes()).padStart(2,'0')}`,
      sede:c?.venue?.fullName||'',
      mandante_logo:hLogo||'',visitante_logo:aLogo||'',
      comp_id:_cid
    };
  }).filter(Boolean);
}
async function loadEspnData(force){
  if(force){try{['brsa_espn_standings_v1','brsa_espn_standings_v2','brsa_espn_scores_v1','brsa_espn_scores_v2'].forEach(k=>localStorage.removeItem(k));}catch{}}
  // Stale-while-revalidate: pinta a última agenda salva IMEDIATAMENTE, depois atualiza com dados frescos
  if(!force&&!_schedule.length){try{const sc=_loadSchedCache();if(sc?.jogos?.length){_schedule=sc.jogos;renderScheduleChips(_schedule);if(_currentView==='library')renderLibrary();}}catch{}}
  const espnEl=document.getElementById('espn-status');
  // Dispara as duas chamadas em paralelo, mas renderiza a AGENDA assim que o scoreboard chega —
  // sem bloquear no /standings (que vem vazio e lento). Standings só alimenta o contexto.
  const scoreboardP=getEspnScoreboard(),standingsP=getEspnStandings();
  const scoreboard=await scoreboardP;
  const sbOk=!!(scoreboard?.events?.length);
  if(sbOk){
    const jogos=espnScoreboardToSchedule(scoreboard);
    if(jogos.length){_saveSchedCache(jogos);_schedule=jogos;renderScheduleChips(_schedule);if(_currentView==='library')renderLibrary();}
  }
  // Status reflete a REALIDADE do scoreboard (não um "ativo" fixo)
  if(espnEl){espnEl.textContent=sbOk?'ativo':(_espnLastError||'indisponível');espnEl.className='ds-status '+(sbOk?'ok':'err');}
  const standings=await standingsP;
  // Se a agenda continua vazia, NUNCA deixa travado em "Carregando…": mostra o erro real + tentar de novo
  if(!_schedule.length){
    const ch=document.getElementById('ex-chips');
    if(ch)ch.innerHTML=`<span class="ex-auto-hint">Não foi possível carregar a agenda${_espnLastError?` (${esc(_espnLastError)})`:''} · <button class="chip chip-cta" onclick="loadSchedule(true)">↻ tentar de novo</button>${autoAiEnabled()?'':` <button class="chip chip-cta" onclick="fetchScheduleFromApi(false)">buscar via IA →</button>`}</span>`;
    if(typeof renderLibrary==='function'&&_currentView==='library')renderLibrary();
    if(autoAiEnabled())fetchScheduleFromApi(false);
    return;
  }
  // Contexto do torneio p/ o AGENTE (análise) — separado do seletor de Estatísticas
  const ctx={fase_atual:'',standings:{},results:[]};
  const parsed=_parseEspnStandingsPayload(standings,scoreboard);
  if(parsed.groups&&Object.keys(parsed.groups).length)ctx.standings=parsed.groups;
  if(parsed.faseAtual)ctx.fase_atual=parsed.faseAtual;
  if(scoreboard?.events){
    ctx.results=scoreboard.events.filter(e=>e.status?.type?.completed).slice(-120).map(e=>{
      const c=e.competitions?.[0];const comps=c?.competitors||[];
      const home=comps.find(x=>x.homeAway==='home');const away=comps.find(x=>x.homeAway==='away');
      const d=new Date(e.date);
      return{data:`${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`,mandante:home?.team?.displayName||'',placar:`${home?.score||0}-${away?.score||0}`,visitante:away?.team?.displayName||''};
    });
    if(!ctx.fase_atual){
      const live=scoreboard.events.find(e=>e.status?.type?.state==='in');
      const next=scoreboard.events.find(e=>e.status?.type?.state==='pre');
      if(live||next)ctx.fase_atual=(live||next).competitions?.[0]?.notes?.[0]?.headline||'';
    }
  }
  _saveCtxCache(ctx);
  // Também grava no cache por liga (featured stats usa isto, não o ctx de análise)
  _setCompStandings(_activeCompId,{groups:ctx.standings,faseAtual:ctx.fase_atual});
  scheduleFeaturedPaint();
}

