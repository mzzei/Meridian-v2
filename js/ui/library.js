/* js/ui/library.js — views chat/library/saved + grade de partidas */
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
