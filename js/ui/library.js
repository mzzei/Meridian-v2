/* ESM low-risk — js/ui/library.js */
import { expose } from '../expose.js';

// ÔöÇÔöÇÔöÇ Biblioteca de Jogos ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
function showView(view){
  globalThis._currentView=view;
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
    mTitle.textContent=globalThis.t('title_library');
    if(mSub){mSub.textContent=globalThis.t('sub_library');mSub.style.display='';}
    renderLibrary();
  }else if(view==='saved'){
    savedEl.style.display='flex';navSaved.classList.add('active');
    mTitle.textContent=globalThis.t('title_saved');
    if(mSub){mSub.textContent=globalThis.t('sub_saved');mSub.style.display='';}
    renderSavedReports();
  }else{
    chatEl.style.display='';dockEl.style.display='';navChat.classList.add('active');
    mTitle.textContent=globalThis.t('title_chat');
    if(mSub){mSub.textContent='';mSub.style.display='none';}
  }
  ['chat','library','saved'].forEach(v=>{const b=document.getElementById('mnav-'+v);if(b)b.classList.toggle('active',v===view);});
  const mSet=document.getElementById('mnav-settings');if(mSet)mSet.classList.remove('active');
}
function renderSavedReports(){
  const listEl=document.getElementById('saved-list');
  const clrBtn=document.getElementById('saved-clear-btn');
  if(clrBtn)clrBtn.style.display=globalThis._history.length?'inline-flex':'none';
  if(!globalThis._history.length){
    listEl.innerHTML=`<div class="lib-empty">${globalThis.t('saved_empty')}</div>`;
    return;
  }
  listEl.innerHTML=globalThis._history.map(a=>`
    <div class="lib-match" onclick="openSaved('${a.hid}')">
      <div style="flex:1;min-width:0">
        <div class="lib-match-teams">${globalThis.esc(a.title)}</div>
        <div class="lib-match-meta">${globalThis.esc(a.fase||a.comp_label||globalThis.compLabel(a.comp_id||globalThis._activeCompId))} ┬À ${globalThis.esc(a.ts)}</div>
      </div>
      <button class="lib-match-btn" onclick="event.stopPropagation();openSaved('${a.hid}')">${globalThis.t('saved_open')}</button>
    </div>`).join('');
}
function openSaved(hid){
  showView('chat');
  globalThis.openHistory(hid);
}
function setLibFilter(f){
  globalThis._libFilter=f;
  document.querySelectorAll('#lib-match-filters .lib-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.f===f));
  renderLibrary();
}
function libBackToComps(){
  globalThis._libCompId=null;
  renderLibrary();
}
function openLibComp(compId){
  if(!globalThis.COMPETITIONS[compId])return;
  globalThis.setLibComp(compId);
  // Foca o agente nesta liga para an├ílises a partir da lista ÔÇö N├âO mexe no seletor de Estat├¡sticas
  globalThis.setAnalysisComp(compId);
  const st=globalThis._compStatus[compId]||{};
  if(!st.checked||st.loading||!(st.upcoming>0)){
    globalThis._setCompStatus(compId,{loading:true});
    globalThis.loadEspnComp(compId,true).then(()=>{
      globalThis._rebuildUnionSchedule();
      if(globalThis._libCompId===compId)renderLibrary();
      // n├úo repinta featured (stats ├® independente)
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

  // ÔöÇÔöÇ N├¡vel 1: cards de campeonato ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  if(!globalThis._libCompId){
    if(back)back.style.display='none';
    if(flbl){flbl.style.display='';flbl.textContent='Campeonatos';}
    if(mfilters)mfilters.style.display='none';
    // Sempre revalida disponibilidade ao abrir a grade (for├ºa checagem se ainda n├úo checked)
    const needCheck=globalThis.COMP_ORDER.some(id=>!(globalThis._compStatus[id]&&globalThis._compStatus[id].checked)&&!(globalThis._compStatus[id]&&globalThis._compStatus[id].loading));
    if(needCheck){
      globalThis.COMP_ORDER.forEach(id=>{if(!(globalThis._compStatus[id]&&globalThis._compStatus[id].checked))globalThis._setCompStatus(id,{loading:true});});
      globalThis.loadAllCompetitions(false).then(()=>{if(globalThis._currentView==='library'&&!globalThis._libCompId)renderLibrary();});
    }
    const today=new Date();today.setHours(0,0,0,0);
    const notPast=j=>{if(!j.data_iso)return true;return new Date(j.data_iso+'T12:00:00')>=today;};
    let html='<div class="lib-comp-grid">';
    globalThis.COMP_ORDER.forEach(id=>{
      const c=globalThis.COMPETITIONS[id];
      const st=globalThis._compStatus[id]||{};
      const jogos=(globalThis._schedByComp[id]||[]).filter(notPast);
      const n=st.upcoming!=null&&st.checked?st.upcoming:jogos.length;
      let countHtml;
      if(st.loading||(!st.checked&&!(globalThis._schedByComp[id]||[]).length)){
        countHtml=`<div class="lib-comp-count loading">verificandoÔÇª</div>`;
      }else if(st.soon||(st.checked&&!n&&!(globalThis._schedByComp[id]||[]).length)){
        countHtml=`<div class="lib-comp-count soon">Em breve</div>`;
      }else if(st.checked&&!n){
        countHtml=`<div class="lib-comp-count soon">Sem jogos pr├│ximos</div>`;
      }else{
        countHtml=`<div class="lib-comp-count">${n} jogo${n===1?'':'s'} ├á frente</div>`;
      }
      const soonCls=(st.soon||(st.checked&&!n&&!(globalThis._schedByComp[id]||[]).length))?' soon':'';
      html+=`<button type="button" class="lib-comp-card${soonCls}" onclick="openLibComp('${id}')">
        ${_compLogo(id)}
        <div class="lib-comp-name">${globalThis.esc(c.name)}</div>
        <div class="lib-comp-meta">${globalThis.esc(compMetaLine(id))}</div>
        ${countHtml}
      </button>`;
    });
    html+='</div>';
    libMatches.innerHTML=html;
    if(note){
      const total=globalThis.COMP_ORDER.reduce((a,id)=>a+((globalThis._schedByComp[id]||[]).length),0);
      const soonN=globalThis.COMP_ORDER.filter(id=>(globalThis._compStatus[id]||{}).soon).length;
      const loading=globalThis.COMP_ORDER.some(id=>(globalThis._compStatus[id]||{}).loading);
      note.textContent=loading
        ?`Verificando disponibilidade dos ${globalThis.COMP_ORDER.length} campeonatosÔÇª`
        :`${globalThis.COMP_ORDER.length} campeonatos ┬À ${total} jogos em agenda${soonN?` ┬À ${soonN} em breve`:''}`;
    }
    return;
  }

  // ÔöÇÔöÇ N├¡vel 2: jogos do campeonato ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const comp=globalThis.getComp(globalThis._libCompId);
  if(back)back.style.display='inline-flex';
  if(flbl){flbl.style.display='none';}
  if(mfilters)mfilters.style.display='inline-flex';
  document.querySelectorAll('#lib-match-filters .lib-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.f===globalThis._libFilter));
  const st=globalThis._compStatus[globalThis._libCompId]||{};
  const jogos=(globalThis._schedByComp[globalThis._libCompId]&&globalThis._schedByComp[globalThis._libCompId].length)?globalThis._schedByComp[globalThis._libCompId]:globalThis._schedule.filter(j=>(j.comp_id||globalThis._activeCompId)===globalThis._libCompId);
  if(!jogos.length){
    const soon=st.soon||(st.checked&&!st.upcoming);
    const loading=st.loading||!st.checked;
    libMatches.innerHTML=`<div class="lib-comp-hdr"><img src="${globalThis.esc(comp.logo||'')}" alt="" width="28" height="28" style="object-fit:contain;background:transparent;padding:0;box-shadow:none;border-radius:0" onerror="this.remove()"><div class="lib-comp-hdr-title">${globalThis.esc(comp.name)}</div></div>
      <div class="lib-empty">${loading
        ?`Verificando disponibilidade de jogosÔÇª`
        :soon
          ?`<b>Em breve</b><br>Este campeonato ainda n├úo tem jogos na janela atual (temporada n├úo iniciada ou hiato).<br><button class="chip chip-cta" style="margin-top:10px" onclick="globalThis.loadEspnComp('${globalThis._libCompId}',true).then(()=>{globalThis._rebuildUnionSchedule();renderLibrary();})">Ôå╗ Verificar de novo</button>`
          :`Sem jogos pr├│ximos neste campeonato.<br><button class="chip chip-cta" style="margin-top:10px" onclick="globalThis.loadEspnComp('${globalThis._libCompId}',true).then(()=>{globalThis._rebuildUnionSchedule();renderLibrary();})">Ôå╗ Buscar agora</button>`
      }</div>`;
    if(note)note.textContent=soon?`${comp.name} ┬À em breve`:comp.name;
    return;
  }
  const today=new Date();today.setHours(0,0,0,0);
  const notPast=j=>{if(!j.data_iso)return true;return new Date(j.data_iso+'T12:00:00')>=today;};
  let filtered=jogos.filter(notPast);
  if(globalThis._libFilter==='hoje')filtered=filtered.filter(j=>dateLabelFromISO(j.data_iso)==='hoje');
  else if(globalThis._libFilter==='amanha')filtered=filtered.filter(j=>dateLabelFromISO(j.data_iso)==='amanh├ú');
  else if(globalThis._libFilter==='semana'){const lim=new Date(today.getTime()+7*864e5);filtered=filtered.filter(j=>{if(!j.data_iso)return false;const d=new Date(j.data_iso+'T12:00:00');return d<lim;});}
  if(!filtered.length){libMatches.innerHTML=`<div class="lib-comp-hdr"><img src="${globalThis.esc(comp.logo||'')}" alt="" width="28" height="28" style="object-fit:contain;border-radius:6px" onerror="this.remove()"><div class="lib-comp-hdr-title">${globalThis.esc(comp.name)}</div></div><div class="lib-empty">Nenhuma partida neste filtro.</div>`;return;}
  const grp={};filtered.forEach(j=>{const k=j.data_iso||'outros';if(!grp[k])grp[k]=[];grp[k].push(j);});
  let html=`<div class="lib-comp-hdr"><img src="${globalThis.esc(comp.logo||'')}" alt="" width="28" height="28" style="object-fit:contain;border-radius:6px" onerror="this.remove()"><div class="lib-comp-hdr-title">${globalThis.esc(comp.name)}</div></div>`;
  Object.keys(grp).sort().forEach(dateKey=>{
    const lbl=dateLabelFromISO(dateKey);
    const full=dateKey!=='outros'?new Date(dateKey+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}):'';
    const hdr=lbl==='hoje'?`Hoje ┬À ${full}`:lbl==='amanh├ú'?`Amanh├ú ┬À ${full}`:full||dateKey;
    html+=`<div class="lib-day-hdr">${globalThis.esc(hdr)}</div>`;
    grp[dateKey].forEach(j=>{
      // index na uni├úo globalThis._schedule (globalThis.fillMatch)
      let idx=globalThis._schedule.findIndex(x=>x.mandante===j.mandante&&x.visitante===j.visitante&&x.data_iso===j.data_iso&&(x.comp_id||'')===(j.comp_id||globalThis._libCompId));
      if(idx<0){// garante presen├ºa
        j.comp_id=j.comp_id||globalThis._libCompId;globalThis._schedule.push(j);idx=globalThis._schedule.length-1;
      }
      const crestH=globalThis.teamBadge(j.mandante,18),crestA=globalThis.teamBadge(j.visitante,18);
      html+=`<div class="lib-match" onclick="globalThis.fillMatch(${idx})">
        <div style="flex:1;min-width:0">
          <div class="lib-match-teams" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${crestH}<span>${globalThis.esc(j.mandante)}</span> <span style="color:var(--muted);font-weight:400">├ù</span> ${crestA}<span>${globalThis.esc(j.visitante)}</span></div>
          <div class="lib-match-meta">${globalThis.esc(j.fase||globalThis.compLabel(j.comp_id||globalThis._libCompId))}${j.sede?` ┬À ${globalThis.esc(j.sede)}`:''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-right:8px">
          <div class="lib-match-time">${globalThis.esc(j.hora_brt||'ÔÇô:ÔÇôÔÇô')} BRT</div>
        </div>
        <button class="lib-match-btn" onclick="event.stopPropagation();globalThis.fillMatch(${idx})">Analisar</button>
      </div>`;
    });
  });
  libMatches.innerHTML=html;
  if(note)note.textContent=`${comp.name} ┬À ${filtered.length} partida${filtered.length===1?'':'s'} ┬À filtros acima`;
}

export {
  showView,
  renderSavedReports,
  openSaved,
  setLibFilter,
  libBackToComps,
  openLibComp,
  renderLibrary
};

expose({
  showView,
  renderSavedReports,
  openSaved,
  setLibFilter,
  libBackToComps,
  openLibComp,
  renderLibrary
});
