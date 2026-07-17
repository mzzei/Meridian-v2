/* ESM low-risk — js/ui/featured.js */
import { expose } from '../expose.js';

function _esAnalyze(query){
  const inp=document.getElementById('match-input');
  inp.value=query;inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,220)+'px';inp.focus();
  if(typeof globalThis.toggleRun==='function')globalThis.toggleRun();
}
// Time awareness: combine data_iso + hora_brt (Bras├¡lia UTC-3) into a kickoff Date
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

/* ESPN standings/results ÔåÆ js/data/espn.js */

/**
 * Card de Estat├¡sticas (featured) ÔÇö SOMENTE dados da liga do seletor (globalThis._statsCompId):
 * results: globalThis._compResults[id] | standings/fase: globalThis._compStandings[id] | agenda: _schedForStatsComp
 * N├âO usa _loadCtxCache / contexto de an├ílise.
 */
function _copaStatsHTML(compId){
  const id=compId||globalThis._statsCompId||globalThis._activeCompId;
  const results=globalThis._compResults[id]||[];
  const pack=globalThis._getCompStandings(id);
  const standings=(pack&&pack.standings&&Object.keys(pack.standings).length)?pack.standings:null;
  let faseAtual=(pack&&pack.faseAtual)||'';
  if(!faseAtual){
    const rl=(typeof globalThis._inferCompRound==='function')?globalThis._inferCompRound(id):'';
    if(rl)faseAtual=rl;
  }
  const st=globalThis._compStatus[id]||{};

  // Jogos disputados / agendados ÔÇö filtrados pelo campeonato do seletor
  const sched=(globalThis._schedByComp[id]&&globalThis._schedByComp[id].length)?globalThis._schedByComp[id]:globalThis._schedule.filter(m=>(m.comp_id||'')===id);
  const jogados=results.length;
  const liveNow=sched.filter(m=>_matchState(m).state==='live').length;
  const futuros=sched.filter(m=>{const s=_matchState(m).state;return s==='upcoming';}).length;

  // Gols por clube: prioriza classifica├º├Áes (gp); sen├úo soma a partir dos resultados
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

  // Maiores diferen├ºas de gols (goleadas) a partir dos resultados, deduplicadas
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
  // Goleada de verdade = 3+ de saldo; se houver poucas, mostra as maiores vit├│rias dispon├¡veis
  const reais=goleadas.filter(g=>g.dif>=3);
  goleadas=(reais.length>=2?reais:goleadas.filter(g=>g.dif>=2)).slice(0,10);

  const hasStandings=!!(standings&&Object.keys(standings).length);
  const hasData=jogados>0||topGols.length>0||!!faseAtual||futuros>0||liveNow>0||hasStandings;
  if(!hasData){
    if(st.soon)return`<div class="rs-cs-empty"><b>${globalThis.esc(globalThis.compLabel(id))}</b> ainda n├úo tem jogos na janela atual.<br><span style="color:var(--muted)">Status: em breve</span><br><span style="color:var(--terra);cursor:pointer" onclick="globalThis.loadEspnComp('${id}',true).then(()=>globalThis.scheduleFeaturedPaint({immediate:true,enrich:true}))">Ôå╗ Verificar de novo</span></div>`;
    if(st.loading)return`<div class="rs-cs-empty">Verificando disponibilidade de <b>${globalThis.esc(globalThis.compLabel(id))}</b>ÔÇª</div>`;
    return`<div class="rs-cs-empty">As estat├¡sticas de <b>${globalThis.esc(globalThis.compLabel(id))}</b> aparecem quando houver dados.<br><span style="color:var(--terra);cursor:pointer" onclick="setStatsComp('${id}');Promise.all([globalThis.loadEspnComp('${id}',true),globalThis._loadCompResults('${id}'),globalThis._loadCompStandings('${id}',true)]).then(()=>{globalThis._rebuildUnionSchedule();globalThis.scheduleFeaturedPaint({immediate:true});})">Ôå╗ Carregar agora</span></div>`;
  }

  let html=`<div class="rs-cs-grid">
    <div class="rs-cs-cell"><span class="rs-cs-num">${jogados}</span><span class="rs-cs-lbl">Jogos disputados</span></div>
    <div class="rs-cs-cell"><span class="rs-cs-num">${liveNow>0?liveNow:futuros}</span><span class="rs-cs-lbl">${liveNow>0?'Ao vivo agora':'Pr├│ximos jogos'}</span></div>
  </div>`;

  if(topGols.length){
    html+=`<div class="rs-cs-sec"><div class="rs-cs-sec-lbl">ÔÜ¢ Mais gols marcados</div>${
      topGols.map(([team,g],i)=>{
        const flag=globalThis.teamBadge(team,14);
        return`<div class="rs-cs-row"><span class="rs-cs-rank">${i+1}</span><span class="rs-cs-team">${flag} ${globalThis.esc(team)}</span><span class="rs-cs-val">${g}</span></div>`;
      }).join('')
    }</div>`;
  }

  if(goleadas.length){
    html+=`<div class="rs-cs-sec"><div class="rs-cs-sec-lbl">­ƒöÑ Maiores goleadas</div>${
      goleadas.map(g=>{
        const flag=globalThis.teamBadge(g.venc,14);
        return`<div class="rs-cs-row"><span class="rs-cs-team">${flag} ${globalThis.esc(g.venc)} <span style="color:var(--muted)">vs ${globalThis.esc(g.perd)}</span></span><span class="rs-cs-val">${globalThis.esc(g.placar)}</span></div>`;
      }).join('')
    }</div>`;
  }

  if(faseAtual){
    html+=`<div class="rs-cs-sec"><div class="rs-cs-sec-lbl">­ƒÅå Fase atual</div><div class="rs-cs-phase"><b>${globalThis.esc(faseAtual)}</b></div></div>`;
  }

  // Classifica├º├úo por grupo (dados gratuitos do ESPN) ÔÇö recolh├¡vel p/ n├úo ocupar o card todo
  if(standings&&Object.keys(standings).length){
    const grpHtml=Object.entries(standings).map(([gname,rows])=>{
      if(!rows||!rows.length)return'';
      const head=`<div class="rs-cl-row rs-cl-head"><span class="rs-cl-pos">#</span><span class="rs-cl-team">Time</span><span class="rs-cl-n">P</span><span class="rs-cl-n">SG</span><span class="rs-cl-pts">Pts</span></div>`;
      const body=rows.map((r,i)=>{
        const flag=globalThis.teamBadge(r.time,12);
        const sg=(r.sg>0?'+':'')+r.sg;
        return`<div class="rs-cl-row${i<2?' rs-cl-q':''}"><span class="rs-cl-pos">${r.rank||i+1}</span><span class="rs-cl-team">${flag} ${globalThis.esc(r.time)}</span><span class="rs-cl-n">${r.j}</span><span class="rs-cl-n">${sg}</span><span class="rs-cl-pts">${r.pts}</span></div>`;
      }).join('');
      return`<div class="rs-cl-grp"><div class="rs-cl-gh">${globalThis.esc(gname).replace(/^Group/i,'Grupo')}</div>${head}${body}</div>`;
    }).join('');
    if(grpHtml)html+=`<div class="rs-cs-sec rs-cs-sec-cl">
      <details class="rs-cl">
        <summary class="rs-cl-sum" aria-label="Abrir classifica├º├úo da liga">
          <span class="rs-cl-sum-ico" aria-hidden="true">­ƒôï</span>
          <span class="rs-cl-sum-txt">
            <span class="rs-cl-sum-title">Classifica├º├úo</span>
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
/** Agenda da liga do seletor de Estat├¡sticas (mesma regra do card de stats). */
function _schedForStatsComp(compId){
  const id=compId||globalThis._statsCompId||globalThis._activeCompId;
  if(globalThis._schedByComp[id]&&globalThis._schedByComp[id].length)return globalThis._schedByComp[id];
  return (globalThis._schedule||[]).filter(m=>(m.comp_id||globalThis._activeCompId)===id);
}
function _teamsHTML(compId){
  const id=compId||globalThis._statsCompId||globalThis._activeCompId;
  const nearest=globalThis.nearestMatches(_schedForStatsComp(id),12,id);
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
    return '<div class="rs-feat-empty">Nenhum clube em destaque em <b>'+globalThis.esc(globalThis.compLabel(id))+'</b> no momento.</div>';
  }
  return '<div class="rs-tg">'+teams.slice(0,6).map(function(team){
    const crest=globalThis.teamBadge(team,32);
    return '<div class="rs-team-badge" onclick="_esAnalyze(\'Analise '+globalThis.esc(team)+'\')"><span class="rs-team-emblem">'+crest+'</span><span class="rs-team-name">'+globalThis.esc(team)+'</span></div>';
  }).join('')+'</div>';
}
function _calendarHTML(compId){
  const id=compId||globalThis._statsCompId||globalThis._activeCompId;
  const nearest=globalThis.nearestMatches(_schedForStatsComp(id),6,id);
  if(!nearest.length){
    return '<div class="rs-feat-empty">Sem jogos futuros em <b>'+globalThis.esc(globalThis.compLabel(id))+'</b>.</div>';
  }
  return nearest.map(function(row){
    const m=row.j,s=row.s;
    const d=s.k.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const dateHtml=s.state==='live'
      ?'<span class="rs-cal-livedot"></span><span class="rs-cal-livetag">AO VIVO</span>'
      :(globalThis.esc(d)+(m.hora_brt?' <span class="rs-cal-time">'+globalThis.esc(m.hora_brt)+'</span>':''));
    const mh=globalThis.esc((m.mandante||'').replace(/'/g,"\\'"));
    const vh=globalThis.esc((m.visitante||'').replace(/'/g,"\\'"));
    const click=s.state==='live'
      ?('openLiveByTeams(\''+mh+'\',\''+vh+'\')')
      :('_esAnalyze(\'Analise '+globalThis.esc(m.mandante||'')+' vs '+globalThis.esc(m.visitante||'')+'\')');
    return '<div class="rs-cal-item" onclick="'+click+'">'
      +'<span class="rs-cal-date">'+dateHtml+'</span>'
      +'<span class="rs-cal-teams">'+globalThis.esc(m.mandante||'?')+' ├ù '+globalThis.esc(m.visitante||'?')+'</span>'
      +'</div>';
  }).join('');
}

/** HTML dos 3 cards featured/** HTML dos 3 cards featured (stats + clubes + pr├│ximos). Sem pop in-tree ÔÇö portal global. */
function _featuredCardsHTML(statsId,statsHTML,teamsHTML,calHTML){
  const short=globalThis.getComp(statsId).short||globalThis.getComp(statsId).name||'';
  return '<div class="rs-block rs-block-featured">'
    +'<div class="rs-stats-hdr">'
    +'<div class="rs-lbl">­ƒôè Estat├¡sticas</div>'
    +'<button type="button" class="rs-stats-sel" onclick="toggleStatsCompPop(event)" aria-haspopup="listbox" aria-expanded="false">'
    +'<span class="rs-stats-sel-name">'+globalThis.esc(short)+'</span>'
    +'<svg viewBox="0 0 10 6" fill="currentColor" width="10" height="10" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>'
    +'</button></div>'
    +'<div class="rs-featured-stats-body">'+statsHTML+'</div></div>'
    +'<div class="rs-block rs-block-featured"><div class="rs-lbl">Ô¡É Clubes em Destaque ┬À '+globalThis.esc(short)+'</div>'+teamsHTML+'</div>'
    +'<div class="rs-block rs-block-featured"><div class="rs-lbl">­ƒôà Pr├│ximos Jogos ┬À '+globalThis.esc(short)+'</div>'+calHTML+'</div>';
}
function _paintFeaturedHosts(statsId,statsHTML,teamsHTML,calHTML){
  const short=globalThis.getComp(statsId).short||globalThis.getComp(statsId).name||'';
  const body=document.getElementById('rs-copa-stats-body');if(body)body.innerHTML=statsHTML;
  const tg=document.getElementById('rs-teams-grid');if(tg)tg.innerHTML=teamsHTML;
  const cl=document.getElementById('rs-calendar-list');if(cl)cl.innerHTML=calHTML;
  const teamsBlk=document.getElementById('rs-teams');
  if(teamsBlk){const tLbl=teamsBlk.querySelector('.rs-lbl');if(tLbl)tLbl.textContent='Ô¡É Clubes em Destaque ┬À '+short;}
  const calBlk=document.getElementById('rs-calendar');
  if(calBlk){const cLbl=calBlk.querySelector('.rs-lbl');if(cLbl)cLbl.textContent='­ƒôà Pr├│ximos Jogos ┬À '+short;}
  globalThis._syncStatsSelLabels(statsId);
  const mob=document.getElementById('es-mobile-featured');
  if(mob)mob.innerHTML=_featuredCardsHTML(statsId,statsHTML,teamsHTML,calHTML);
}
function renderEmptyStateFeatured(opts){
  opts=opts||{};
  if(!opts.keepPop)globalThis.closeStatsCompPop();
  const convo=document.getElementById('conversation');
  const hasConvo=convo&&convo.children.length>0;
  const showStats=!hasConvo;
  const statsId=globalThis._statsCompId||globalThis._activeCompId;
  const gen=++globalThis._featuredPaintGen;
  const statsEl=document.getElementById('rs-copa-stats');
  if(statsEl)statsEl.style.display=showStats?'block':'none';
  ['rs-teams','rs-calendar'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=showStats?'block':'none';
  });
  const mob=document.getElementById('es-mobile-featured');
  if(!showStats){if(mob)mob.innerHTML='';return;}

  _paintFeaturedHosts(statsId,_copaStatsHTML(statsId),_teamsHTML(statsId),_calendarHTML(statsId));

  if(opts.enrich!==false){
    // results + standings da MESMA liga do seletor (nunca ctx de an├ílise)
    Promise.all([
      globalThis._loadCompResults(statsId),
      globalThis._loadCompStandings(statsId,false)
    ]).then(()=>{
      if(gen!==globalThis._featuredPaintGen)return;
      const c2=document.getElementById('conversation');
      if(c2&&c2.children.length>0)return;
      if((globalThis._statsCompId||globalThis._activeCompId)!==statsId)return;
      _paintFeaturedHosts(statsId,_copaStatsHTML(statsId),_teamsHTML(statsId),_calendarHTML(statsId));
    }).catch(()=>{});
  }
}

// Refresh time-aware featured every 60s so countdowns/live state stay current
setInterval(()=>{const es=document.getElementById('empty-state');if(es&&es.style.display!=='none')globalThis.scheduleFeaturedPaint({keepPop:true,enrich:false});},60*1000);

export {
  _esAnalyze,
  _matchKick,
  _matchState,
  _relTime,
  _copaStatsHTML,
  _schedForStatsComp,
  _teamsHTML,
  _calendarHTML,
  _featuredCardsHTML,
  _paintFeaturedHosts,
  renderEmptyStateFeatured
};

expose({
  _esAnalyze,
  _matchKick,
  _matchState,
  _relTime,
  _copaStatsHTML,
  _schedForStatsComp,
  _teamsHTML,
  _calendarHTML,
  _featuredCardsHTML,
  _paintFeaturedHosts,
  renderEmptyStateFeatured
});
