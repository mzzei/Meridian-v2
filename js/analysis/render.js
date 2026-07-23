/* js/analysis/render.js — Poisson, cards de análise/chat e renderResults */
// ─── Render results ───────────────────────────────────────────────────────
function pct(v){return Math.round(v*100)+'%';}
function poissonPMF(k,lam){if(lam<=0)return k===0?1:0;let lp=-lam+k*Math.log(lam);for(let i=1;i<=k;i++)lp-=Math.log(i);return Math.exp(lp);}
function calcPoisson(lh,la){
  const N=9,ph=Array.from({length:N+1},(_,i)=>poissonPMF(i,lh)),pa=Array.from({length:N+1},(_,i)=>poissonPMF(i,la));
  let home=0,draw=0,away=0,btts=0,over=0;const sc=[];
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){const p=ph[i]*pa[j];if(i>j)home+=p;else if(i===j)draw+=p;else away+=p;if(i>=1&&j>=1)btts+=p;if(i+j>2.5)over+=p;sc.push({s:`${i}-${j}`,p});}
  sc.sort((a,b)=>b.p-a.p);return{home,draw,away,btts,over,under:1-over,top:sc.slice(0,5)};
}

// Item de lista que pode chegar como STRING (contrato da F2) ou OBJETO (contrato da
// F1 / structured outputs, com nome+posição+stats). Antes ia cru pro esc() e o card
// exibia "★ [object Object] · [object Object]" (print do usuário, shell 96).
function _listLabel(x){
  if(x===null||x===undefined)return '';
  if(typeof x==='string')return x;
  if(typeof x!=='object')return String(x);
  const nome=x.nome||x.jogador||x.player||x.descricao||'';
  const det=x.posicao||x.motivo||x.observacao||'';
  if(!nome)return det||'';
  return det?`${nome} (${det})`:nome;
}
function _labelList(arr){return (Array.isArray(arr)?arr:[]).map(_listLabel).filter(Boolean);}

function tcard(t){
  if(!t)return '';
  return `<div class="tname">${esc(t.nome||'—')}</div>
    <div class="irow"><span class="ilbl">Posição na tabela</span><span class="ival">${esc(teamTablePos(t))}</span></div>
    <div class="irow"><span class="ilbl">Forma</span><span class="ival" style="font-family:monospace;font-size:11px">${esc(t.forma_recente||'—')}</span></div>
    <div class="irow"><span class="ilbl">xG marc.</span><span class="ival">${esc(t.xg_marcado??'—')}</span></div>
    <div class="irow"><span class="ilbl">xG sofr.</span><span class="ival">${esc(t.xg_sofrido??'—')}</span></div>
    ${_labelList(t.desfalques).length?`<div class="irow"><span class="ilbl">Desf.</span><span class="ival">${_labelList(t.desfalques).map(esc).join(', ')}</span></div>`:''}
    <span class="spill ${t.escalacao_status==='confirmada'?'sp-ok':'sp-warn'}">${esc(t.escalacao_status)}</span>
    ${t.escalacao?`<div class="tesc">${esc(t.escalacao)}</div>`:''}
    ${_labelList(t.jogadores_chave).length?`<div class="tkeys">★ ${_labelList(t.jogadores_chave).map(esc).join(' · ')}</div>`:''}`;
}
// ── Card de stats fundamentais de UM jogador (dados estruturados da Fase 1) ──
function _pstatCard(p){
  if(!p||typeof p!=='object')return '';
  const has=v=>v!==null&&v!==undefined&&v!=='';
  const cells=[],add=(v,l)=>{if(has(v))cells.push(`<div class="pstat-cell"><div class="pstat-v">${esc(v)}</div><div class="pstat-l">${l}</div></div>`);};
  add(p.jogos,'jogos');add(p.minutos,'min');add(p.gols,'gols');add(p.assistencias,'assist');
  add(p.finalizacoes_por_jogo,'fin/j');add(p.finalizacoes_no_gol_por_jogo,'no gol/j');
  add(p.grandes_chances_ou_passes_decisivos_por_jogo,'GC-PD/j');
  add(p.desarmes_por_jogo,'desarm/j');add(p.faltas_cometidas_por_jogo,'faltas/j');add(p.faltas_sofridas_por_jogo,'sofr/j');
  const cds=[];
  if(has(p.cartoes_amarelos))cds.push(`🟨 ${esc(p.cartoes_amarelos)}`);
  if(has(p.cartoes_vermelhos))cds.push(`🟥 ${esc(p.cartoes_vermelhos)}`);
  const susp=(p.a_um_amarelo_da_suspensao===true||/^(true|sim|yes)$/i.test(String(p.a_um_amarelo_da_suspensao||'')))?'<span class="pstat-susp">⚠ a 1 amarelo da suspensão</span>':'';
  const cardsRow=(cds.length||susp)?`<div class="pstat-cards">${cds.join('&nbsp;&nbsp;')}${susp}</div>`:'';
  const pen=(has(p.cobra_penaltis_ou_faltas)&&!/^n[ãa]o$/i.test(String(p.cobra_penaltis_ou_faltas).trim()))?`<div class="pstat-note">🎯 Cobra: ${esc(p.cobra_penaltis_ou_faltas)}</div>`:'';
  const obs=has(p.observacao)?`<div class="pstat-note">${esc(p.observacao)}</div>`:'';
  return `<div class="pstat"><div class="pstat-hd"><span class="pstat-nome">${esc(p.nome||'—')}</span>${p.posicao?`<span class="pstat-pos">${esc(p.posicao)}</span>`:''}${has(p.rating_medio)?`<span class="pstat-rating">${esc(p.rating_medio)}</span>`:''}</div>${cells.length?`<div class="pstat-grid">${cells.join('')}</div>`:''}${cardsRow}${pen}${obs}</div>`;
}
function _pstatTeam(nome,arr){
  const hasVal=v=>v!==null&&v!==undefined&&v!=='';
  // Só renderiza jogador que tenha ao menos UM stat além do nome/posição —
  // evita cards vazios quando nem o portão conseguiu preencher nada.
  const players=(Array.isArray(arr)?arr:[]).filter(p=>p&&typeof p==='object'&&p.nome
    &&Object.keys(p).some(k=>k!=='nome'&&k!=='posicao'&&hasVal(p[k])));
  if(!players.length)return '';
  return `<div class="pstat-team"><div class="tname">${esc(nome)}</div>${players.map(_pstatCard).join('')}</div>`;
}

/* lineup: js/analysis/lineup.js */
// Resumo disciplinar por time a partir dos stats já coletados (_pstats): chips de
// cartões/faltas por jogador — dados REAIS anexados por código, o modelo não re-digita.
function _cfStatsChips(nome,arr){
  const has=v=>v!==null&&v!==undefined&&v!=='';
  const rel=(Array.isArray(arr)?arr:[]).filter(p=>p&&p.nome&&(has(p.cartoes_amarelos)||has(p.cartoes_vermelhos)||has(p.faltas_cometidas_por_jogo)||p.a_um_amarelo_da_suspensao===true));
  if(!rel.length)return '';
  return `<div class="pstat-team"><div class="tname">${esc(nome)}</div><div>${rel.map(p=>{
    const parts=[];
    if(has(p.cartoes_amarelos)&&Number(p.cartoes_amarelos)>0)parts.push(`🟨${esc(p.cartoes_amarelos)}`);
    if(has(p.cartoes_vermelhos)&&Number(p.cartoes_vermelhos)>0)parts.push(`🟥${esc(p.cartoes_vermelhos)}`);
    if(has(p.faltas_cometidas_por_jogo))parts.push(`${esc(p.faltas_cometidas_por_jogo)} faltas/j`);
    const susp=(p.a_um_amarelo_da_suspensao===true)?'<span class="cf-susp">⚠ pendurado</span>':'';
    if(!parts.length&&!susp)return '';
    return `<span class="cf-chip"><b>${esc(p.nome)}</b> ${parts.join(' · ')}${susp}</span>`;
  }).filter(Boolean).join('')}</div></div>`;
}
// Escanteios/jogo por time (dados REAIS da Fase 1 via _corners): média a favor e sofrida.
// shell 104 (print real: só o Atlético aparecia): se a seção existe, SEMPRE mostra os
// DOIS times — o lado sem dado ganha "sem dado coletado" em vez de sumir e deixar a
// seção capenga. Nomes vêm do card (hn/vn) para o lado ausente ter identidade.
function _cornerChips(corners,hn,vn){
  if(!corners)return '';
  const has=v=>v!==null&&v!==undefined&&v!=='';
  const one=(t,fallbackNome)=>{
    const nome=(t&&t.nome)||fallbackNome||'—';
    if(!t||(!has(t.feitos)&&!has(t.sofridos)))
      return `<div class="pstat-team"><div class="tname">${esc(nome)}</div><div><span class="cf-chip" style="opacity:.55">sem dado coletado nesta análise</span></div></div>`;
    const parts=[];
    if(has(t.feitos))parts.push(`<span class="cf-chip">🚩 ${esc(t.feitos)} a favor/jogo</span>`);
    if(has(t.sofridos))parts.push(`<span class="cf-chip">🛡️ ${esc(t.sofridos)} sofridos/jogo</span>`);
    return `<div class="pstat-team"><div class="tname">${esc(nome)}</div><div>${parts.join('')}</div></div>`;
  };
  return one(corners.mandante,hn)+one(corners.visitante,vn);
}
// ── Confronto tático (RECUPERADAS do commit 8f8aae2 — shell 82) ──────────────
// Perdidas num refactor da decomposição do monólito: renderResults as chamava mas
// a definição sumiu → TODO card real (schema F2 sempre traz confronto_tatico)
// crashava com ReferenceError e caía no modo simplificado.
function ctVanTag(v,hn,an){
  if(!v||v==='equilibrado')return `<span class="ct-van ct-van-e">Equilibrado</span>`;
  if(v==='mandante')return `<span class="ct-van ct-van-m">Vantagem ${hn}</span>`;
  return `<span class="ct-van ct-van-a">Vantagem ${an}</span>`;
}
function ctSideSection(s,hn,an,atkN,defN){
  if(!s)return '';
  return `<div class="tab-s"><div class="tab-h">Ataque ${atkN} × Defesa ${defN}</div>`+
    ctVanTag(s.vantagem,hn,an)+
    (s.diagnostico?`<p class="ct-diag">${esc(s.diagnostico)}</p>`:'')+
    (s.pontos_exploracao?.length?`<div class="ct-group"><div class="ct-glbl">Pontos de exploração</div>${s.pontos_exploracao.map(p=>`<div class="ct-item ct-atk">${esc(textFrom(p))}</div>`).join('')}</div>`:'')+
    (s.bloqueios?.length?`<div class="ct-group"><div class="ct-glbl">Bloqueios previstos</div>${s.bloqueios.map(b=>`<div class="ct-item ct-def">${esc(textFrom(b))}</div>`).join('')}</div>`:'')+
    '</div>';
}

// ── Aba Escalação (PARTE X) — builder isolado: reusado pelo render inicial E pelo
// refresh ao vivo (refreshAnalysisLineups patch-a só este painel, sem re-rodar F2). ──
// Disclaimer honesto pelo PIOR nível dos dois times; botão "Atualizar escalação" quando
// o jogo tem âncora ESPN (match-day/live) — o poll/patch é 100% determinístico (zero LLM).
function buildEscalacaoTab(d,cardId){
  const lu=d._lineups;
  if(!(lu&&(lu.mandante||lu.visitante))){
    const msg=(typeof _abaVaziaMsg==='function')?_abaVaziaMsg(d._featLineups,d._coletaOk,'Escalações não disponíveis — esta análise foi gerada antes do recurso. Rode uma nova análise para obtê-las.','A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo. Rode novamente para tentar coletar as escalações.','Dados de escalação não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa. Rode uma nova análise para tentar novamente.'):'Escalações não disponíveis.';
    const diag=(d._coletaOk===false&&typeof _fallbackDiagLine==='function')?_fallbackDiagLine():'';
    return `<div class="tab-s"><p class="tab-body" style="color:var(--muted)">${msg}${diag}</p>${_escRefreshBtn(d,cardId)}</div>`;
  }
  const worst=d._lineupsFonte||'pesquisa';
  const SRC_TXT={
    api:'Escalações CONFIRMADAS (API-Football / ESPN) — XI oficial do dia do jogo',
    pesquisa:'Escalações prováveis coletadas na pesquisa — podem mudar até o apito inicial',
    modelo:'Estimativa do modelo — a pesquisa estruturada não trouxe escalação; NÃO confirmadas',
    inferida:'Disposição inferida (sem formação de fonte confiável) — meramente ilustrativa'
  };
  return `<div class="tab-s">
      <div class="tab-h">Escalações${worst==='api'?' Confirmadas':' Prováveis'}</div>
      <div class="teams-full">${_pitchTeam(lu.mandante)}${_pitchTeam(lu.visitante)}</div>
      <div class="pstat-src">${SRC_TXT[worst]||SRC_TXT.pesquisa}</div>
      ${_escRefreshBtn(d,cardId)}
    </div>`;
}
// Botão de atualização de escalação — só quando há evento ESPN ancorado (match-day/live).
function _escRefreshBtn(d,cardId){
  if(!d._espnEventId)return '';
  const live=d._matchWindow?' · ao vivo':'';
  return `<div class="esc-refresh"><button type="button" class="chip chip-cta" onclick="refreshAnalysisLineups('${esc(d._hid||'')}',${cardId||0})">↻ Atualizar escalação${live}</button></div>`;
}
if(typeof window!=='undefined'){window.buildEscalacaoTab=buildEscalacaoTab;}

function renderResults(d,opts){
  opts=opts||{};
  _cardCount++;
  const id=_cardCount;
  // hid ANTES de montar as abas: a aba Escalação usa d._hid no botão de refresh.
  const hid=opts.hid||('h'+Date.now().toString(36)+id);
  d._hid=hid;
  const now=new Date();
  const ts=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const lmh=d.lambda?.home_mid||1.5,lma=d.lambda?.away_mid||1.0;
  const prob=calcPoisson(lmh,lma),pL=calcPoisson(d.lambda?.home_low||lmh*.8,d.lambda?.away_high||lma*1.2),pH=calcPoisson(d.lambda?.home_high||lmh*1.2,d.lambda?.away_low||lma*.8);
  const cM={alto:'b-ok',medio:'b-warn',baixo:'b-warn'},cL={alto:'alta confiança nos dados',medio:'confiança média nos dados',baixo:'baixa confiança nos dados'};
  const hn=esc(d.mandante?.nome||'Mandante'),an=esc(d.visitante?.nome||'Visitante');
  const lm=d.lambda;
  const ct=d.confronto_tatico;
  const confrontoHtml=ct?
    ctSideSection(ct.atq_mand_def_vis,hn,an,hn,an)+
    ctSideSection(ct.atq_vis_def_mand,hn,an,an,hn)+
    (ct.duelos_chave?.length?`<div class="tab-s"><div class="tab-h">Duelos-chave</div>${ct.duelos_chave.map(du=>`<div class="duelo-row"><span class="duelo-txt">${esc(du.confronto)}</span>${du.setor?`<span class="duelo-setor">${esc(du.setor)}</span>`:''}<div class="duelo-det">${du.favorito?'★ '+esc(du.favorito)+' · ':''}${esc(du.impacto||'')}</div></div>`).join('')}</div>`:'')+
    (ct.conclusao?`<div class="tab-s"><div class="tab-h">Síntese Tática</div><p class="ct-diag">${esc(ct.conclusao)}</p></div>`:'')
  :'';

  // ── Tab: Resumo ──
  const tabResumo=`
    ${d.contexto_fase||d.confianca_geral?`<div class="tab-s">
      <div class="tab-h">1. Resumo</div>
      <span class="badge ${cM[d.confianca_geral]||'b-warn'}">${cL[d.confianca_geral]||esc(d.confianca_geral)}</span>${d._audit?`<span class="badge ${d._audit.n?'b-warn':'b-ok'}" style="margin-left:6px" title="Verificação automática de consistência antes da entrega">⚖ auditada${d._audit.n?` · ${d._audit.n} ressalva${d._audit.n>1?'s':''}`:' · sem ressalvas'}</span>`:''}
      ${d.contexto_fase?`<p class="tab-body">${esc(d.contexto_fase)}</p>`:''}
    </div>`:''}
    ${d.fatores_decisivos?.length?`<div class="tab-s">
      <div class="tab-h">2. Fatores Decisivos</div>
      ${d.fatores_decisivos.map((f,i)=>`<div class="frow"><span class="fnum">${i+1}</span><span>${esc(textFrom(f))}</span></div>`).join('')}
    </div>`:''}
    ${d.tendencias?.length?`<div class="tab-s">
      <div class="tab-h">3. Tendências Recentes</div>
      ${d.tendencias.map(t=>`<div class="tend-item"><span class="tend-dot"></span><span>${esc(textFrom(t))}</span></div>`).join('')}
    </div>`:''}
    ${d.sugestoes_ticket?.length?`<div class="tab-s">
      <div class="tab-h">4. Sugestões de Ticket</div>
      ${d.sugestoes_ticket.map(t=>`<div class="ticket"><div class="ticket-head"><span class="ticket-desc">${esc(t.descricao)}</span><span class="ticket-prob">${Math.round((t.probabilidade||0)*100)}%</span></div><div class="ticket-reason">${esc(t.fundamento||'')}</div><span class="ticket-conf conf-${esc(t.confianca||'media')}">${esc(t.confianca||'média')} confiança</span></div>`).join('')}
    </div>`:''}`;

  // ── Tab: Tática ──
  const tabTatica=`
    <div class="tab-s">
      <div class="tab-h">1. Probabilidades · Resultado</div>
      ${[{lbl:hn,v:prob.home,lo:pL.home,hi:pH.home},{lbl:'Empate',v:prob.draw,lo:pL.draw,hi:pH.draw},{lbl:an,v:prob.away,lo:pL.away,hi:pH.away}].map(b=>`<div class="prow"><div class="pmeta"><span class="pname">${b.lbl}</span><span class="ppct">${pct(b.v)}</span></div><div class="btrack"><div class="bfill" data-w="${Math.round(b.v*100)}" style="transform:scaleX(0)"></div></div><div class="prange">faixa ${pct(b.lo)}–${pct(b.hi)}</div></div>`).join('')}
    </div>
    <div class="tab-s">
      <div class="tab-h">2. Mercados de Gols</div>
      <div class="s3">
        <div class="stile"><div class="slbl">over 2.5</div><div class="sval">${pct(prob.over)}</div></div>
        <div class="stile"><div class="slbl">under 2.5</div><div class="sval">${pct(prob.under)}</div></div>
        <div class="stile"><div class="slbl">ambas marcam</div><div class="sval">${pct(prob.btts)}</div></div>
      </div>
    </div>
    ${lm?`<div class="tab-s">
      <div class="tab-h">3. Gols Esperados · Lambda Poisson</div>
      <div class="lrow"><span style="color:var(--mid)">${hn}</span><span style="font-family:monospace;font-size:12px">${lm.home_low} · <strong>${lm.home_mid}</strong> · ${lm.home_high}</span></div>
      ${lm.home_logic?`<div class="llogic">${esc(lm.home_logic)}</div>`:''}
      <div class="lrow"><span style="color:var(--mid)">${an}</span><span style="font-family:monospace;font-size:12px">${lm.away_low} · <strong>${lm.away_mid}</strong> · ${lm.away_high}</span></div>
      ${lm.away_logic?`<div class="llogic">${esc(lm.away_logic)}</div>`:''}
      <div class="lhint">baixo · <strong>central</strong> · alto</div>
    </div>`:''}
    ${d.eventos_provaveis?.length?`<div class="tab-s">
      <div class="tab-h">4. Eventos Prováveis</div>
      ${d.eventos_provaveis.map(e=>`<div class="ev-row"><div class="ev-head"><span class="ev-nome">${esc(e.evento)}</span><span class="ev-pct">${Math.round((e.probabilidade||0)*100)}%</span></div><div class="ev-bar-track"><div class="ev-bar-fill" data-w="${Math.round((e.probabilidade||0)*100)}" style="transform:scaleX(0)"></div></div><div class="ev-reason">${esc(e.fundamento||'')}</div></div>`).join('')}
    </div>`:''}
    ${(d.tecnico_mandante?.nome||d.tecnico_visitante?.nome)?`<div class="tab-s">
      <div class="tab-h">5. Perfil dos Técnicos</div>
      <div class="teams-full">
        ${d.tecnico_mandante?.nome?`<div class="tcard">
          <div class="tname">${hn}</div>
          <div class="irow"><span class="ilbl">Treinador</span><span class="ival">${esc(d.tecnico_mandante.nome)}</span></div>
          <div class="irow"><span class="ilbl">Formação</span><span class="ival">${esc(d.tecnico_mandante.formacao||'—')}</span></div>
          ${d.tecnico_mandante.filosofia?`<div class="irow"><span class="ilbl">Filosofia</span><span class="ival">${esc(d.tecnico_mandante.filosofia)}</span></div>`:''}
          ${d.tecnico_mandante.ajustes_recentes?`<div class="tesc">${esc(d.tecnico_mandante.ajustes_recentes)}</div>`:''}
          ${d.tecnico_mandante.impacto_mercados?`<div class="tkeys">↪ ${esc(d.tecnico_mandante.impacto_mercados)}</div>`:''}
        </div>`:'<div class="tcard"><div class="tname">${hn}</div><p class="tesc">Dados do técnico não disponíveis</p></div>'}
        ${d.tecnico_visitante?.nome?`<div class="tcard">
          <div class="tname">${an}</div>
          <div class="irow"><span class="ilbl">Treinador</span><span class="ival">${esc(d.tecnico_visitante.nome)}</span></div>
          <div class="irow"><span class="ilbl">Formação</span><span class="ival">${esc(d.tecnico_visitante.formacao||'—')}</span></div>
          ${d.tecnico_visitante.filosofia?`<div class="irow"><span class="ilbl">Filosofia</span><span class="ival">${esc(d.tecnico_visitante.filosofia)}</span></div>`:''}
          ${d.tecnico_visitante.ajustes_recentes?`<div class="tesc">${esc(d.tecnico_visitante.ajustes_recentes)}</div>`:''}
          ${d.tecnico_visitante.impacto_mercados?`<div class="tkeys">↪ ${esc(d.tecnico_visitante.impacto_mercados)}</div>`:''}
        </div>`:'<div class="tcard"><div class="tname">${an}</div><p class="tesc">Dados do técnico não disponíveis</p></div>'}
      </div>
    </div>`:''}
    ${confrontoHtml}`;


  // ── Tab: Individual ──
  const _ps=d._pstats;
  const _psHas=_ps&&((Array.isArray(_ps.mandante)&&_ps.mandante.length)||(Array.isArray(_ps.visitante)&&_ps.visitante.length));
  const _compLblUi=esc(d.comp_label||compLabel(d.comp_id||_activeCompId));
  const statsSection=_psHas?`<div class="tab-s"><div class="tab-h">Stats por Jogador · ${_compLblUi}</div><div class="teams-full">${_pstatTeam(d.mandante?.nome||'Mandante',_ps.mandante)}${_pstatTeam(d.visitante?.nome||'Visitante',_ps.visitante)}</div><div class="pstat-src">Números reais coletados na competição (pesquisa Sofascore/FotMob/FBref)</div></div>`:'';
  const tabIndividual=`<div class="teams-full"><div class="tcard">${tcard(d.mandante)}</div><div class="tcard">${tcard(d.visitante)}</div></div>${statsSection}`;

  // ── Tab: Cartões & Faltas ──
  const cf=d.cartoes_faltas;
  const cfEventos=Array.isArray(cf?.eventos)?cf.eventos.filter(e=>e&&e.evento):[];
  const cfRisco=Array.isArray(cf?.jogadores_risco)?cf.jogadores_risco.filter(j=>j&&j.nome):[];
  const cfStats=_psHas?(_cfStatsChips(d.mandante?.nome||'Mandante',_ps.mandante)+_cfStatsChips(d.visitante?.nome||'Visitante',_ps.visitante)):'';
  const tabCartoes=(cf&&(cfEventos.length||cf.analise||cfRisco.length))?`
    ${cf.analise?`<div class="tab-s">
      <div class="tab-h">1. Leitura Disciplinar</div>
      <p class="tab-body">${esc(textFrom(cf.analise))}</p>
    </div>`:''}
    ${cfEventos.length?`<div class="tab-s">
      <div class="tab-h">2. Eventos Prováveis</div>
      ${cfEventos.map(e=>`<div class="ev-row"><div class="ev-head"><span class="ev-nome">${esc(e.evento)}</span><span class="ev-pct">${Math.round((e.probabilidade||0)*100)}%</span></div><div class="ev-bar-track"><div class="ev-bar-fill" data-w="${Math.round((e.probabilidade||0)*100)}" style="transform:scaleX(0)"></div></div><div class="ev-reason">${esc(textFrom(e.fundamento||''))}</div></div>`).join('')}
    </div>`:''}
    ${cfRisco.length?`<div class="tab-s">
      <div class="tab-h">3. Jogadores sob Risco</div>
      ${cfRisco.map(j=>`<div class="urow"><span class="udot"></span><span><strong>${esc(j.nome)}</strong>${j.time?` (${esc(textFrom(j.time))})`:''} — ${esc(textFrom(j.motivo||''))}</span></div>`).join('')}
    </div>`:''}
    ${cfStats?`<div class="tab-s">
      <div class="tab-h">Cartões e Faltas Acumulados · Coletados</div>
      <div class="teams-full">${cfStats}</div>
      <div class="pstat-src">Números reais da competição (pesquisa Sofascore/FotMob)</div>
    </div>`:''}
    ${cf.conclusao?`<div class="tab-s">
      <div class="tab-h">Síntese</div>
      <p class="ct-diag">${esc(textFrom(cf.conclusao))}</p>
    </div>`:''}`
  :`<div class="tab-s"><p class="tab-body" style="color:var(--muted)">${_abaVaziaMsg(d._featCartoes,d._coletaOk,'Análise disciplinar não disponível — esta análise foi gerada antes do recurso. Rode uma nova análise para obtê-la.','A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo. Rode novamente para tentar coletar cartões e faltas.','Dados de cartões e faltas não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa. Rode uma nova análise para tentar novamente.')}</p></div>${cfStats?`<div class="tab-s"><div class="tab-h">Cartões e Faltas Acumulados · Coletados</div><div class="teams-full">${cfStats}</div></div>`:''}`;

  // ── Tab: Escanteios (estrutura PDF referência / Meridian v1 — seção própria, não misturar em Tática) ──
  const ec=d.escanteios;
  const ecEventos=Array.isArray(ec?.eventos)?ec.eventos.filter(e=>e&&e.evento):[];
  const ecStats=_cornerChips(d._corners,d.mandante?.nome,d.visitante?.nome);
  const tabEscanteios=(ec&&(ecEventos.length||ec.analise))?`
    ${ec.analise?`<div class="tab-s">
      <div class="tab-h">1. Leitura de Escanteios</div>
      <p class="tab-body">${esc(textFrom(ec.analise))}</p>
    </div>`:''}
    ${ecEventos.length?`<div class="tab-s">
      <div class="tab-h">2. Eventos Prováveis</div>
      ${ecEventos.map(e=>`<div class="ev-row"><div class="ev-head"><span class="ev-nome">${esc(e.evento)}</span><span class="ev-pct">${Math.round((e.probabilidade||0)*100)}%</span></div><div class="ev-bar-track"><div class="ev-bar-fill" data-w="${Math.round((e.probabilidade||0)*100)}" style="transform:scaleX(0)"></div></div><div class="ev-reason">${esc(textFrom(e.fundamento||''))}</div></div>`).join('')}
    </div>`:''}
    ${ecStats?`<div class="tab-s">
      <div class="tab-h">Escanteios por Jogo · Coletados</div>
      <div class="teams-full">${ecStats}</div>
      <div class="pstat-src">Médias reais da competição (pesquisa Sofascore/FotMob)</div>
    </div>`:''}
    ${ec.conclusao?`<div class="tab-s">
      <div class="tab-h">Síntese</div>
      <p class="ct-diag">${esc(textFrom(ec.conclusao))}</p>
    </div>`:''}`
  :(typeof featureEmptyHtml==='function'?featureEmptyHtml(d._featEscanteios,d._coletaOk,'escanteios',ecStats?`<div class="tab-s"><div class="tab-h">Escanteios por Jogo · Coletados</div><div class="teams-full">${ecStats}</div></div>`:''):`<div class="tab-s"><p class="tab-body" style="color:var(--muted)">${_abaVaziaMsg(d._featEscanteios,d._coletaOk,'Análise de escanteios não disponível — esta análise foi gerada antes do recurso. Rode uma nova análise para obtê-la.','A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo. Rode novamente para tentar coletar escanteios.','Dados de escanteios não encontrados na coleta desta partida — pode ser um confronto com pouca cobertura de imprensa. Rode uma nova análise para tentar novamente.')}</p></div>${ecStats?`<div class="tab-s"><div class="tab-h">Escanteios por Jogo · Coletados</div><div class="teams-full">${ecStats}</div></div>`:''}`);

  // ── Tab: Escalação (mapa de campo — via _lineups; builder reusado no refresh ao vivo) ──
  const tabEscalacao=buildEscalacaoTab(d,id);

  // ── Tab: Avançado ──
  const tabAvancado=`
    <div class="tab-s">
      <div class="tab-h">Placares Mais Prováveis</div>
      <div>${prob.top.map(s=>`<span class="sc">${s.s} <strong>${Math.round(s.p*100)}%</strong></span>`).join('')}</div>
    </div>
    ${d.incerteza?.length?`<div class="tab-s">
      <div class="tab-h">Incerteza · O que Ainda Pode Mudar</div>
      ${d.incerteza.map(u=>`<div class="urow"><span class="udot"></span><span><strong>${esc(u.fator)}</strong> — ${esc(u.impacto)}</span></div>`).join('')}
    </div>`:''}
    <div class="tab-s">
      <div class="tab-h">Lacunas de Dados</div>
      ${d.lacunas?.length?d.lacunas.map(g=>`<div class="gitem">· ${esc(textFrom(g))}</div>`).join(''):'<span style="font-size:12px;color:var(--muted)">Nenhuma lacuna crítica declarada</span>'}
    </div>
    <div class="disc">Análise estatística baseada em modelo de Poisson e dados reais · não é recomendação financeira</div>`;

  // ── Full card ──
  const titleHtml=(d.partida||'Análise').replace(/×/g,'<span class="wc-gold">×</span>');
  // Modo do card (shell 76): MESMO shell/estética; pós-jogo só re-rotula abas + selo.
  const _mode=d.contexto_analise==='pos_jogo'?'pos_jogo':'previa';
  const _modeBadge=_mode==='pos_jogo'?'PÓS-JOGO':'PRÉVIA';
  const shell=renderAnalysisTabShell(id,{
    resumo:tabResumo,
    tatica:tabTatica,
    individual:tabIndividual,
    cartoes:tabCartoes,
    escanteios:tabEscanteios,
    escalacao:tabEscalacao,
    avancado:tabAvancado
  },_mode);
  const el=document.createElement('div');
  el.innerHTML=`<div class="a-card" id="acard-${id}">
    <div class="a-hdr">
      <div class="a-agent">
        <div class="a-ball a-ball-plain">${brandStar()}</div>
      </div>
      <div class="a-hdr-r">
        <span class="a-ts">${ts}</span>
        <button class="a-ic" onclick="copyAnalysis(${id})" title="Copiar análise">
          <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
    <div class="a-status">Análise concluída com sucesso</div>
    <div class="a-subtitle">${_modeBadge} · ${esc(d.fase||d.comp_label||compLabel(d.comp_id||_activeCompId))}</div>
    <div class="a-title">${titleHtml}</div>
    <div class="a-tabs">
      <div class="a-tab-pill"></div>
      ${shell.buttons}
    </div>
    ${shell.panels}
  </div>`;
  const cardEl=el.firstElementChild;
  cardEl.dataset.hid=hid;
  document.getElementById('conversation').appendChild(cardEl);
  // Animate bars from 0→value and init tab pill
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      cardEl.querySelectorAll('.bfill[data-w],.ev-bar-fill[data-w]').forEach(b=>b.style.transform=`scaleX(${b.dataset.w/100})`);
      initTabPill(cardEl);
    });
  });

  updateRightSidebar(d,prob);
  if(opts.save!==false)saveAnalysis(hid,d);
  else renderRecentAnalyses();
  scrollChat();
}

if(typeof window!=='undefined'){window.renderResults=renderResults;window.calcPoisson=calcPoisson;window.pct=pct;}
