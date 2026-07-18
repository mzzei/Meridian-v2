/* js/analysis/pipeline-run.js — runChat, runAnalysis, streamOnce */
async function runChat(){
  if(_running)return; // state.running via bridge
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

  _abort=new AbortController();_pendingQuery=query;
  if(typeof setRunning==='function')setRunning(true,_abort,query);else _running=true;
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
    if(typeof setRunning==='function')setRunning(false,null,'');
    else{_running=false;_abort=null;}
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

