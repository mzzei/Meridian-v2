/* js/data/live.js — painel ao vivo do jogo */
// ─── Live match panel ────────────────────────────────────────────────────
let _liveInterval=null,_activeLiveId=null,_liveTab='formation',_liveEvtData=null;
const LV_REFRESH=30*1000;

function _lv_abbr(name){name=name||'';const w=name.trim().split(/\s+/);return w.length>1?w[w.length-1]:name.slice(0,3);}
function _lv_flag(name,sz){
  sz=sz||13;
  // Brasão de clube (Série A) tem prioridade sobre bandeira de seleção
  const crest=_teamCrest(name,Math.max(sz+4,18));
  if(crest)return crest;
  const code=FLAGS[name]||FLAGS[_normTeamKey(name)]||'';
  if(!code)return'';
  return'<img src="https://flagcdn.com/w20/'+code+'.png" width="'+sz+'" height="'+Math.round(sz*.75)+'" style="border-radius:1px;vertical-align:middle" onerror="this.remove()" alt="">';
}
function _lv_hex(c){if(!c)return'#6ba8a0';return c.startsWith('#')?c:'#'+c.replace(/[^0-9a-fA-F]/g,'').slice(0,6);}

async function openLivePanel(eventId){
  _activeLiveId=eventId;_liveTab='formation';
  document.getElementById('lpov').style.display='flex';
  document.getElementById('lpanel').innerHTML='<div class="lp-loading"><span class="ldot" style="margin:4px"></span> Carregando…</div>';
  await _renderLivePanel(eventId);
  if(_liveInterval)clearInterval(_liveInterval);
  _liveInterval=setInterval(function(){if(_activeLiveId)_renderLivePanel(_activeLiveId);},LV_REFRESH);
}
function closeLivePanel(){
  document.getElementById('lpov').style.display='none';
  _activeLiveId=null;
  if(_liveInterval){clearInterval(_liveInterval);_liveInterval=null;}
}
function switchLiveTab(tab){
  _liveTab=tab;
  document.querySelectorAll('.lp-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab===tab);});
  _renderLiveTab();
}

async function _renderLivePanel(eventId){
  var lpanel=document.getElementById('lpanel');if(!lpanel)return;
  var results=await Promise.all([
    fetchEspn('/scoreboard','brsa_sb_live',25000),
    fetchEspn('/summary?event='+eventId,'brsa_live_'+eventId,LV_REFRESH)
  ]);
  var sb=results[0],summary=results[1];
  var evt=(sb&&sb.events||[]).find(function(e){return String(e.id)===String(eventId);});
  var comp=(evt&&evt.competitions&&evt.competitions[0])||(summary&&summary.header&&summary.header.competitions&&summary.header.competitions[0]);
  if(!comp&&!summary){lpanel.innerHTML='<div class="lp-empty">Dados indisponíveis para esta partida.</div>';return;}
  var comps=comp&&comp.competitors||[];
  var h=comps.find(function(x){return x.homeAway==='home';});
  var a=comps.find(function(x){return x.homeAway==='away';});
  var state=(comp&&comp.status&&comp.status.type&&comp.status.type.state)||'';
  var clk=(comp&&comp.status&&comp.status.displayClock)||'';
  var detail=(comp&&comp.status&&comp.status.type&&comp.status.type.shortDetail)||'';
  var isLive=state==='in';
  var typeId=String((comp&&comp.status&&comp.status.type&&comp.status.type.id)||'');
  var typeName=(comp&&comp.status&&comp.status.type&&comp.status.type.name)||'';
  var isHalf=typeName==='halftime'||typeId==='6';
  var hn=(h&&h.team&&h.team.displayName)||'Casa';
  var an=(a&&a.team&&a.team.displayName)||'Fora';
  var hc=_lv_hex(h&&h.team&&(h.team.color||h.team.alternateColor));
  var ac=_lv_hex(a&&a.team&&(a.team.color||a.team.alternateColor));
  var hScore=h&&h.score!=null?h.score:0;
  var aScore=a&&a.score!=null?a.score:0;
  _liveEvtData={summary:summary,h:h,a:a,hn:hn,an:an,hc:hc,ac:ac,hScore:hScore,aScore:aScore,isLive:isLive,isHalf:isHalf};
  var badgeHtml='';
  if(isLive)badgeHtml='<div class="lp-live-badge"><span class="ls-live-pulse"></span>&nbsp;'+esc(clk)+'\'</div>';
  else if(isHalf)badgeHtml='<div class="lp-live-badge" style="color:var(--lime)">Intervalo</div>';
  else badgeHtml='<div class="lp-minute">'+esc(detail)+'</div>';
  var tabs=['formation','stats','h2h'];
  var tabLabels=['Escalação','Estatísticas','H2H'];
  var tabsHtml=tabs.map(function(tab,i){return'<button class="lp-tab'+(_liveTab===tab?' active':'')+'" data-tab="'+tab+'" onclick="switchLiveTab(\''+tab+'\')">'+tabLabels[i]+'</button>';}).join('');
  lpanel.innerHTML='<div class="lp-hdr"><div class="lp-scoreline"><div class="lp-team">'+_lv_flag(hn,15)+'<span class="lp-tname">'+esc(hn)+'</span></div><div class="lp-score-box"><div class="lp-score">'+hScore+'&thinsp;—&thinsp;'+aScore+'</div>'+badgeHtml+'</div><div class="lp-team r">'+_lv_flag(an,15)+'<span class="lp-tname">'+esc(an)+'</span></div></div><button class="lp-close" onclick="closeLivePanel()">✕</button></div><div class="lp-tabs">'+tabsHtml+'</div><div class="lp-body" id="lp-body"></div>';
  _renderLiveTab();
}

function _renderLiveTab(){
  var body=document.getElementById('lp-body');if(!body||!_liveEvtData)return;
  var d=_liveEvtData;
  if(_liveTab==='formation')body.innerHTML=_lv_formationHTML(d.summary,d.h,d.a,d.hn,d.an,d.hc,d.ac);
  else if(_liveTab==='stats')body.innerHTML=_lv_statsHTML(d.summary,d.hn,d.an,d.hc,d.ac);
  else if(_liveTab==='h2h'){body.innerHTML='<div class="lp-loading"><span class="ldot" style="margin:4px"></span> Buscando H2H…</div>';_lv_h2hHTML(d.h,d.a,d.hn,d.an,d.hc,d.ac).then(function(html){var b=document.getElementById('lp-body');if(b&&_liveTab==='h2h')b.innerHTML=html;});}
}

// Linhas da formação para geometria. Sem formação de fonte, NÃO inventa "4-3-3" como
// rótulo (Q3) — distribui os titulares numa disposição neutra só para desenhar os pontos.
function _lv_lines(formation,count){
  var lines=String(formation||'').split('-').map(Number).filter(function(n){return n>0;});
  if(lines.length>=2&&lines.reduce(function(a,b){return a+b;},0)>=9)return lines;
  var out=Math.max(3,(count||11)-1);
  var d=Math.round(out*0.4),m=Math.round(out*0.3),f=out-d-m;
  return [d,m,f].filter(function(n){return n>0;});
}
function _lv_formPositions(formation,isHome,FW,halfFH,count){
  var lines=_lv_lines(formation,count);
  var pts=[];
  pts.push([FW/2,isHome?halfFH-14:14]);
  var totalL=lines.length;
  lines.forEach(function(cnt,li){
    var prog=(li+1)/(totalL+1);
    var y=isHome?(halfFH-14)-prog*(halfFH-28):14+prog*(halfFH-28);
    for(var xi=0;xi<cnt;xi++){pts.push([(xi+1)/(cnt+1)*FW,y]);}
  });
  return pts;
}

function _lv_playerSvg(p,x,y,color,nameAbove){
  var name=(p&&p.athlete&&p.athlete.displayName)||'';
  var num=(p&&p.athlete&&p.athlete.jersey)||'';
  var sname=(name.split(' ').pop()||name).slice(0,10);
  var stats=p&&p.statistics||[];
  var hasY=(p&&p.yellowCards>0)||(Array.isArray(stats)&&stats.some(function(s){return s.name==='yellowCards'&&parseFloat(s.value||'0')>0;}));
  var hasR=(p&&p.redCards>0)||(Array.isArray(stats)&&stats.some(function(s){return s.name==='redCards'&&parseFloat(s.value||'0')>0;}));
  var r=10;
  var ny=nameAbove?y-r-5:y+r+9;
  var cardSvg='';
  if(hasR)cardSvg='<rect x="'+(x+r-4)+'" y="'+(y-r-6)+'" width="5" height="7" rx="0.5" fill="#e84040"/>';
  else if(hasY)cardSvg='<rect x="'+(x+r-4)+'" y="'+(y-r-6)+'" width="5" height="7" rx="0.5" fill="#f5d327"/>';
  return'<g>'
    +'<circle cx="'+x+'" cy="'+y+'" r="'+(r+1.5)+'" fill="rgba(0,0,0,.32)"/>'
    +'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+color+'" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>'
    +'<text x="'+x+'" y="'+(y+3.5)+'" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,.95)" font-family="system-ui,sans-serif">'+esc(num)+'</text>'
    +cardSvg
    +'<text x="'+x+'" y="'+ny+'" text-anchor="middle" font-size="6.5" fill="rgba(255,255,255,.72)" font-family="system-ui,sans-serif">'+esc(sname)+'</text>'
    +'</g>';
}

function _lv_formationHTML(summary,h,a,hn,an,hc,ac){
  // Helper compartilhado (Q3 DRY): mesma extração que o card de análise usa.
  var sides=(typeof espnStartersFromSummary==='function')?espnStartersFromSummary(summary):null;
  var hSide=sides&&sides.home,aSide=sides&&sides.away;
  var hRoster=hSide&&hSide.raw,aRoster=aSide&&aSide.raw;
  var hFormation=(hSide&&hSide.formation)||'';   // vazio = não veio da fonte (mostra "n/d")
  var aFormation=(aSide&&aSide.formation)||'';
  var hPlayers=(hSide&&hSide.starters)||[];
  var aPlayers=(aSide&&aSide.starters)||[];
  if(!hPlayers.length&&!aPlayers.length){
    return'<div class="lp-form"><div class="lp-empty">Escalação ainda não disponível.<br>Os dados aparecem assim que a partida começar.</div></div>';
  }
  var PW=320,PH=430,M=10,FW=PW-2*M,FH=PH-2*M,hfH=FH/2-1;
  var svg='<svg viewBox="0 0 '+PW+' '+PH+'" xmlns="http://www.w3.org/2000/svg" class="lp-pitch-svg">';
  svg+='<rect x="'+M+'" y="'+M+'" width="'+FW+'" height="'+FH+'" rx="5" fill="#1b4e30"/>';
  for(var si=0;si<7;si++){var sw=FW/7;svg+='<rect x="'+(M+si*sw)+'" y="'+M+'" width="'+sw+'" height="'+FH+'" fill="'+(si%2===0?'rgba(255,255,255,.022)':'transparent')+'"/>';}
  svg+='<rect x="'+M+'" y="'+M+'" width="'+FW+'" height="'+FH+'" rx="5" fill="none" stroke="rgba(255,255,255,.38)" stroke-width="1.5"/>';
  svg+='<line x1="'+M+'" y1="'+(PH/2)+'" x2="'+(PW-M)+'" y2="'+(PH/2)+'" stroke="rgba(255,255,255,.28)" stroke-width="1"/>';
  var cr=FH*0.09;
  svg+='<circle cx="'+(PW/2)+'" cy="'+(PH/2)+'" r="'+cr+'" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>';
  svg+='<circle cx="'+(PW/2)+'" cy="'+(PH/2)+'" r="2" fill="rgba(255,255,255,.32)"/>';
  var pbW=FW*0.62,pbH=FH*0.165,pbX=M+(FW-pbW)/2;
  svg+='<rect x="'+pbX+'" y="'+M+'" width="'+pbW+'" height="'+pbH+'" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>';
  svg+='<rect x="'+pbX+'" y="'+(PH-M-pbH)+'" width="'+pbW+'" height="'+pbH+'" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>';
  var gaW=FW*0.32,gaH=FH*0.07,gaX=M+(FW-gaW)/2;
  svg+='<rect x="'+gaX+'" y="'+M+'" width="'+gaW+'" height="'+gaH+'" fill="none" stroke="rgba(255,255,255,.17)" stroke-width="1"/>';
  svg+='<rect x="'+gaX+'" y="'+(PH-M-gaH)+'" width="'+gaW+'" height="'+gaH+'" fill="none" stroke="rgba(255,255,255,.17)" stroke-width="1"/>';
  var gw=gaW*0.55,gx=M+(FW-gw)/2;
  svg+='<rect x="'+gx+'" y="'+(M-7)+'" width="'+gw+'" height="7" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1.5"/>';
  svg+='<rect x="'+gx+'" y="'+(PH-M)+'" width="'+gw+'" height="7" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1.5"/>';
  svg+='<circle cx="'+(PW/2)+'" cy="'+(M+pbH*.72)+'" r="1.5" fill="rgba(255,255,255,.38)"/>';
  svg+='<circle cx="'+(PW/2)+'" cy="'+(PH-M-pbH*.72)+'" r="1.5" fill="rgba(255,255,255,.38)"/>';
  var al=_lv_abbr(an).toUpperCase().slice(0,3),hl=_lv_abbr(hn).toUpperCase().slice(0,3);
  svg+='<text x="'+(PW/2)+'" y="'+(M+9)+'" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.28)" font-family="system-ui">'+esc(al)+' '+esc(aFormation||'n/d')+'</text>';
  svg+='<text x="'+(PW/2)+'" y="'+(PH-M-3)+'" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.28)" font-family="system-ui">'+esc(hl)+' '+esc(hFormation||'n/d')+'</text>';
  var hPos=_lv_formPositions(hFormation,true,FW,hfH,hPlayers.length);
  var aPos=_lv_formPositions(aFormation,false,FW,hfH,aPlayers.length);
  aPlayers.forEach(function(p,i){if(i>=aPos.length)return;var pos=aPos[i];svg+=_lv_playerSvg(p,M+pos[0],M+pos[1],ac,false);});
  hPlayers.forEach(function(p,i){if(i>=hPos.length)return;var pos=hPos[i];svg+=_lv_playerSvg(p,M+pos[0],PH/2+pos[1],hc,true);});
  svg+='</svg>';
  var hSubs=(hRoster&&hRoster.roster||[]).filter(function(p){return!p.starter&&p.active!==false;}).slice(0,6);
  var aSubs=(aRoster&&aRoster.roster||[]).filter(function(p){return!p.starter&&p.active!==false;}).slice(0,6);
  function subRow(players,color){return players.map(function(p){var nm=(p&&p.athlete&&p.athlete.displayName)||'';var num=(p&&p.athlete&&p.athlete.jersey)||'';var pos=(p&&p.position&&p.position.abbreviation)||'';return'<div class="lp-sub-player"><span class="lp-sub-num" style="background:'+color+'">'+esc(num)+'</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(nm)+'</span><span class="lp-sub-pos">'+esc(pos)+'</span></div>';}).join('');}
  var subsHtml='';
  if(hSubs.length||aSubs.length){subsHtml='<div class="lp-subs"><div><div class="lp-sub-hdr">'+esc(hn)+' · Suplentes</div>'+(subRow(hSubs,hc)||'<div class="lp-sub-player" style="color:var(--dim)">—</div>')+'</div><div><div class="lp-sub-hdr">'+esc(an)+' · Suplentes</div>'+(subRow(aSubs,ac)||'<div class="lp-sub-player" style="color:var(--dim)">—</div>')+'</div></div>';}
  return'<div class="lp-form">'+svg+'<div class="lp-form-legend"><div class="lp-leg"><span class="lp-leg-dot" style="background:'+hc+'"></span>'+esc(hn)+'</div><div class="lp-leg"><span class="lp-leg-dot" style="background:'+ac+'"></span>'+esc(an)+'</div></div>'+subsHtml+'</div>';
}

function _lv_statsHTML(summary,hn,an,hc,ac){
  var teams=(summary&&summary.boxscore&&summary.boxscore.teams)||[];
  var hTeam=teams.find(function(t){return t.team&&t.team.homeAway==='home';})||teams[0];
  var aTeam=teams.find(function(t){return t.team&&t.team.homeAway==='away';})||teams[1];
  if(!hTeam&&!aTeam)return'<div class="lp-empty">Estatísticas ainda não disponíveis.<br>Os dados aparecem durante a partida.</div>';
  function statMap(team){var m={};(team&&team.statistics||[]).forEach(function(s){m[s.name||s.label||'']=s.displayValue||String(s.value!=null?s.value:'0');});return m;}
  var hS=statMap(hTeam),aS=statMap(aTeam);
  var KEYS=[{k:'possessionPct',lbl:'Posse de Bola'},{k:'totalShots',lbl:'Chutes Totais'},{k:'shotsOnTarget',lbl:'No Alvo'},{k:'cornerKicks',lbl:'Escanteios'},{k:'foulsCommitted',lbl:'Faltas'},{k:'yellowCards',lbl:'Cartões Amarelos'},{k:'redCards',lbl:'Cartões Vermelhos'},{k:'offsides',lbl:'Impedimentos'},{k:'saves',lbl:'Defesas'},{k:'blockedShots',lbl:'Chutes Bloqueados'},{k:'totalPasses',lbl:'Passes'}];
  var rows='';
  KEYS.forEach(function(item){
    var hv=hS[item.k]||hS[item.k.toLowerCase()]||'';
    var av=aS[item.k]||aS[item.k.toLowerCase()]||'';
    if(!hv&&!av){var alt=Object.keys(hS).find(function(x){return x.toLowerCase()===item.k.toLowerCase();});if(alt){hv=hS[alt];av=aS[alt]||'';}}
    if(!hv&&!av)return;
    hv=hv||'0';av=av||'0';
    var hN=parseFloat(hv.replace('%','').replace(',','.'))||0;
    var aN=parseFloat(av.replace('%','').replace(',','.'))||0;
    var tot=hN+aN;
    var hPct=tot>0?Math.round(hN/tot*100):50;
    var aPct=100-hPct;
    rows+='<div class="lp-stat-row"><div class="lp-sv a">'+esc(hv)+'</div><div class="lp-sbar-wrap"><div class="lp-sbar-lbl">'+esc(item.lbl)+'</div><div class="lp-sbar"><div class="lp-sbar-h" style="width:'+hPct+'%;background:'+hc+'88"></div><div class="lp-sbar-a" style="width:'+aPct+'%;background:'+ac+'88"></div></div></div><div class="lp-sv b">'+esc(av)+'</div></div>';
  });
  if(!rows)return'<div class="lp-empty">Estatísticas não disponíveis para esta partida.</div>';
  return'<div class="lp-stats"><div class="lp-stat-team-hdr"><div class="lp-sth-name">'+_lv_flag(hn)+' '+esc(hn)+'</div><div class="lp-sth-name" style="text-align:right">'+_lv_flag(an)+' '+esc(an)+'</div></div>'+rows+'</div>';
}

function _lv_evtType(p){
  var txt=((p.type&&p.type.text)||(p.type&&p.type.name)||p.text||'').toLowerCase();
  var id=String((p.type&&p.type.id)||'');
  if(/own.?goal/.test(txt)||id==='1007')return'owngoal';
  if((/penalty.*(goal|scored)|scored.*penalty/.test(txt))||id==='1009'||id==='1044')return'pgoal';
  if(/goal/.test(txt)||id==='1004')return'goal';
  if(/yellow.red|yellowred|2nd.yellow|second.yellow/.test(txt)||id==='1024')return'yr';
  if(/red.card/.test(txt)||id==='1006')return'red';
  if(/yellow.card/.test(txt)||id==='1005'||id==='1025')return'yellow';
  if((/penalty.miss|missed.penalty/.test(txt))||id==='1008')return'pmiss';
  if(/sub|replac/.test(txt)||id==='1023')return'sub';
  return null;
}
function _lv_evtIcon(type){var m={goal:'⚽',owngoal:'⚽🔴',pgoal:'⚽⚡',pmiss:'❌',yellow:'🟨',red:'🟥',yr:'🟥',sub:'🔄'};return m[type]||'📋';}

function _lv_eventsHTML(summary,hn,an,hc,ac){
  var allPlays=(summary&&summary.plays)||[];
  var events=allPlays.filter(function(p){return _lv_evtType(p)!==null;}).slice().sort(function(a,b){var ta=parseFloat((a.clock&&a.clock.value)||(a.clock&&a.clock.displayValue)||'0');var tb=parseFloat((b.clock&&b.clock.value)||(b.clock&&b.clock.displayValue)||'0');return tb-ta;});
  if(!events.length){
    var recent=allPlays.filter(function(p){return(p.text||p.type&&p.type.text||'').length>3;}).slice(-20);
    if(!recent.length)return'<div class="lp-empty">Nenhum evento relevante ainda.<br>Os eventos aparecerão durante a partida.</div>';
    return'<div class="lp-events">'+recent.map(function(p){var clk=(p.clock&&p.clock.displayValue)||'';return'<div class="lp-evt"><div class="lp-evt-time">'+esc(clk)+(clk?"'":'--')+'</div><div class="lp-evt-icon">📋</div><div class="lp-evt-body"><div class="lp-evt-txt">'+esc(p.text||(p.type&&p.type.text)||'')+'</div></div></div>';}).join('')+'</div>';
  }
  var hId=_liveEvtData&&_liveEvtData.h&&_liveEvtData.h.team&&_liveEvtData.h.team.id;
  return'<div class="lp-events">'+events.map(function(p){
    var evType=_lv_evtType(p);
    var teamId=String((p.team&&p.team.id)||(p.athleteId&&p.athleteId.teamId)||'');
    var isHome=teamId===String(hId||'@@');
    var teamColor=isHome?hc:ac;
    var teamName=isHome?hn:an;
    var clk=(p.clock&&p.clock.displayValue)||'';
    var txt=p.text||(p.type&&p.type.text)||evType||'';
    return'<div class="lp-evt"><div class="lp-evt-time">'+esc(clk)+(clk?"'":'--')+'</div><div class="lp-evt-icon">'+_lv_evtIcon(evType)+'</div><div class="lp-evt-body"><div class="lp-evt-txt">'+esc(txt)+'</div><span class="lp-evt-team" style="color:'+teamColor+'">'+esc(teamName)+'</span></div></div>';
  }).join('')+'</div>';
}

function _lv_commentaryHTML(summary){
  var plays=((summary&&summary.plays)||[]).filter(function(p){return((p.text||p.commentary||'').length>2);}).slice().reverse();
  if(!plays.length)return'<div class="lp-empty">Narração não disponível.<br>Os comentários aparecem durante a partida.</div>';
  return'<div class="lp-comm">'+plays.slice(0,80).map(function(p){
    var clk=(p.clock&&p.clock.displayValue)||'';
    var txt=p.text||p.commentary||'';
    var isKey=_lv_evtType(p)!==null;
    return'<div class="lp-cm"><div class="lp-cm-t">'+esc(clk)+(clk?"'":'--')+'</div><div class="lp-cm-txt'+(isKey?' key':'')+'">'+esc(txt)+'</div></div>';
  }).join('')+'</div>';
}

async function _lv_h2hHTML(h,a,hn,an,hc,ac){
  var hId=h&&h.team&&h.team.id;
  var aId=a&&a.team&&a.team.id;
  if(!hId||!aId)return'<div class="lp-empty">Dados H2H não disponíveis.</div>';
  var data=null;
  try{data=await fetchEspn('/teams/'+hId+'/schedule','brsa_h2h_'+hId+'_'+aId,300000);}catch(e){}
  var matches=[];
  if(data&&data.events){
    matches=data.events.filter(function(e){
      if(!e.status||!e.status.type||!e.status.type.completed)return false;
      var comps=(e.competitions&&e.competitions[0]&&e.competitions[0].competitors)||[];
      return comps.some(function(c){return String(c.team&&c.team.id)===String(aId);});
    });
  }
  var hW=0,aW=0,draws=0;
  matches.forEach(function(e){
    var comps=(e.competitions&&e.competitions[0]&&e.competitions[0].competitors)||[];
    var hComp=comps.find(function(c){return String(c.team&&c.team.id)===String(hId);});
    var aComp=comps.find(function(c){return String(c.team&&c.team.id)===String(aId);});
    if(!hComp||!aComp)return;
    var hs=parseInt(hComp.score)||0,as2=parseInt(aComp.score)||0;
    if(hs>as2)hW++;else if(as2>hs)aW++;else draws++;
  });
  var total=matches.length;
  var summaryHtml='<div class="lp-h2h-summary">'
    +'<div class="lp-h2h-wins"><div class="lp-h2h-wn">'+hW+'</div><div class="lp-h2h-wlbl">'+esc(_lv_abbr(hn))+'</div></div>'
    +'<div class="lp-h2h-draws"><div class="lp-h2h-dn">'+draws+'</div><div class="lp-h2h-dlbl">Empates</div></div>'
    +'<div class="lp-h2h-wins"><div class="lp-h2h-wn">'+aW+'</div><div class="lp-h2h-wlbl">'+esc(_lv_abbr(an))+'</div></div>'
    +'</div>';
  if(!total)return'<div class="lp-h2h">'+summaryHtml+'<div class="lp-empty" style="padding:1.2rem">Sem confrontos diretos registrados nesta competição.</div></div>';
  var matchesHtml=matches.slice().reverse().slice(0,10).map(function(e){
    var comp=e.competitions&&e.competitions[0];
    var comps=(comp&&comp.competitors)||[];
    var hComp=comps.find(function(c){return String(c.team&&c.team.id)===String(hId);})||comps[0];
    var aComp=comps.find(function(c){return String(c.team&&c.team.id)===String(aId);})||comps[1];
    if(!hComp||!aComp)return'';
    var hs=parseInt(hComp.score)||0,as2=parseInt(aComp.score)||0;
    var hWin=hs>as2,aWin=as2>hs;
    var dateStr='';
    try{var d=new Date(e.date||comp&&comp.date);dateStr=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});}catch(err){}
    var compName=(comp&&comp.season&&comp.season.year)||'';
    return'<div class="lp-h2h-match">'
      +'<div class="lp-h2h-date">'+esc(dateStr)+'</div>'
      +'<div class="lp-h2h-teams">'
        +'<div class="lp-h2h-trow"><span class="lp-h2h-tname">'+_lv_flag(hn,10)+' '+esc(hn)+'</span><span class="lp-h2h-score'+(hWin?' win':aWin?' loss':'')+'">'+hs+'</span></div>'
        +'<div class="lp-h2h-trow"><span class="lp-h2h-tname">'+_lv_flag(an,10)+' '+esc(an)+'</span><span class="lp-h2h-score'+(aWin?' win':hWin?' loss':'')+'">'+as2+'</span></div>'
      +'</div>'
      +'<div class="lp-h2h-comp">'+esc(String(compName))+'</div>'
    +'</div>';
  }).join('');
  return'<div class="lp-h2h">'+summaryHtml+'<div class="lp-h2h-hdr">Últimos '+Math.min(total,10)+' confrontos</div>'+matchesHtml+'</div>';
}

// Abre o painel ao vivo detalhado a partir dos nomes dos times (cards "Próximos Jogos")
async function openLiveByTeams(home,away){
  try{
    const sb=await fetchEspn('/scoreboard','brsa_sb_live',25000);
    const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const h=norm(home),a=norm(away);
    const ev=(sb&&sb.events||[]).find(e=>{
      const c=e.competitions&&e.competitions[0];const cs=(c&&c.competitors)||[];
      const names=cs.map(x=>norm(x.team&&x.team.displayName));
      return names.some(n=>n&&(n.includes(h)||h.includes(n)))&&names.some(n=>n&&(n.includes(a)||a.includes(n)));
    });
    if(ev){openLivePanel(ev.id);return;}
  }catch(e){}
  _esAnalyze('Analise '+home+' vs '+away);
}

