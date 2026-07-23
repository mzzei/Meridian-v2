/* js/demo.js — MODO DEMO (shell 98) — para calls de handover/apresentação.
 *
 * Ativação: abrir o app com ?demo=1 (ex.: https://…/Meridian-v2/?demo=1).
 * Sem o parâmetro, este arquivo NÃO faz nada (guard no topo) — custo zero.
 *
 * O que faz:
 * - Intercepta window.fetch APENAS para '/v1/messages' (Anthropic) e responde com
 *   fixtures locais: F1 (coleta) devolve rawFacts completos, F2 devolve o JSON
 *   PLANO da análise (7 abas), chat devolve prosa curta. TODO o resto do app roda
 *   de verdade — agenda ESPN, render, Poisson, abas, export — porque a demo deve
 *   demonstrar o produto real, não um vídeo.
 * - Zero consumo de API e zero necessidade de chave: preenche o campo com uma
 *   chave ilustrativa (não gravada no sessionStorage) só para passar os gates.
 *   Mesmo que exista chave real no navegador, NENHUMA chamada sai para a
 *   Anthropic com ?demo=1 — o interceptor engole todas.
 * - Streaming SIMULADO (ReadableStream com chunks + delays) para o contador de
 *   tokens e as fases anduarem como numa análise real (~5s no total).
 * - Badge fixo "MODO DEMO" para ninguém confundir dados ilustrativos com reais.
 *
 * Atenção (comportamento herdado, proposital): o card da demo é salvo na
 * biblioteca como um card normal — apagável pela própria UI.
 */
(function () {
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (!q.has('demo')) return;

  window.MERIDIAN_DEMO = true;

  // ── Fixtures ─────────────────────────────────────────────────────────────
  // Prefixo "PARTIDA:" pula o gate de contexto (shell 75) de propósito: o jogo da
  // demo é fictício e não está na agenda ESPN real — sem o prefixo, o popup de
  // contexto abriria no meio da call. Com ele, a análise dispara direto.
  var DEMO_MATCH = 'PARTIDA: Flamengo x Palmeiras (prévia · demo)';

  var XI_FLA = [
    { nome: 'Rossi', posicao: 'GOL' }, { nome: 'Varela', posicao: 'LD' },
    { nome: 'Léo Pereira', posicao: 'ZAG' }, { nome: 'Danilo', posicao: 'ZAG' },
    { nome: 'Ayrton Lucas', posicao: 'LE' }, { nome: 'Pulgar', posicao: 'VOL' },
    { nome: 'Jorginho', posicao: 'VOL' }, { nome: 'Arrascaeta', posicao: 'MEI' },
    { nome: 'Luiz Araújo', posicao: 'PD' }, { nome: 'Samuel Lino', posicao: 'PE' },
    { nome: 'Pedro', posicao: 'ATA' },
  ];
  var XI_PAL = [
    { nome: 'Weverton', posicao: 'GOL' }, { nome: 'Khellven', posicao: 'LD' },
    { nome: 'Gómez', posicao: 'ZAG' }, { nome: 'Murilo', posicao: 'ZAG' },
    { nome: 'Piquerez', posicao: 'LE' }, { nome: 'Aníbal Moreno', posicao: 'VOL' },
    { nome: 'Lucas Evangelista', posicao: 'VOL' }, { nome: 'Maurício', posicao: 'MEI' },
    { nome: 'Estêvão', posicao: 'PD' }, { nome: 'Facundo Torres', posicao: 'PE' },
    { nome: 'Vitor Roque', posicao: 'ATA' },
  ];

  var F1_FACTS = {
    mandante: {
      nome: 'Flamengo', tecnico: 'Filipe Luís', ranking_fifa: '2º · 41 pts',
      resultados_recentes: ['V 2x0 Fluminense', 'V 3x1 Botafogo', 'E 1x1 Cruzeiro', 'V 2x1 Grêmio', 'D 0x1 Bragantino'],
      xg_marcado: 1.74, xg_sofrido: 0.98,
      desfalques: ['Léo Ortiz (lesão)', 'Lucas Paquetá (lesão)'],
      escalacao_provavel: 'Rossi; Varela, Léo Pereira, Danilo, Ayrton Lucas; Pulgar, Jorginho; Arrascaeta; Luiz Araújo, Samuel Lino; Pedro',
      formacao: '4-2-3-1', onze_provavel: XI_FLA,
      banco: ['Matheus Cunha', 'Wesley', 'Allan', 'Gerson', 'Bruno Henrique', 'Everton Cebolinha', 'Juninho'],
      jogadores_chave: [
        { nome: 'Pedro', posicao: 'ATA', jogos: 18, minutos: 1490, gols: 12, assistencias: 3, finalizacoes_por_jogo: 3.1, finalizacoes_no_gol_por_jogo: 1.6, grandes_chances_ou_passes_decisivos_por_jogo: 0.9, cartoes_amarelos: 2, cartoes_vermelhos: 0, a_um_amarelo_da_suspensao: false, faltas_cometidas_por_jogo: 0.8, faltas_sofridas_por_jogo: 1.9, desarmes_por_jogo: 0.3, cobra_penaltis_ou_faltas: 'pênaltis', rating_medio: 7.6, observacao: 'Artilheiro do time na Série A (demo)' },
        { nome: 'Arrascaeta', posicao: 'MEI', jogos: 17, minutos: 1380, gols: 5, assistencias: 8, finalizacoes_por_jogo: 1.8, finalizacoes_no_gol_por_jogo: 0.7, grandes_chances_ou_passes_decisivos_por_jogo: 1.4, cartoes_amarelos: 4, cartoes_vermelhos: 0, a_um_amarelo_da_suspensao: true, faltas_cometidas_por_jogo: 1.1, faltas_sofridas_por_jogo: 2.2, desarmes_por_jogo: 0.9, cobra_penaltis_ou_faltas: 'faltas', rating_medio: 7.8, observacao: 'A um amarelo da suspensão (demo)' },
      ],
      estilo_ofensivo: 'Posse alta, construção pelo meio com Arrascaeta entre linhas e amplitude com Samuel Lino.',
      vulnerabilidades_defensivas: ['Espaço nas costas dos laterais em transição', 'Bola aérea defensiva sem Léo Ortiz'],
    },
    visitante: {
      nome: 'Palmeiras', tecnico: 'Abel Ferreira', ranking_fifa: '3º · 39 pts',
      resultados_recentes: ['V 1x0 Corinthians', 'V 2x0 Vitória', 'V 3x0 Juventude', 'E 0x0 Internacional', 'V 2x1 São Paulo'],
      xg_marcado: 1.52, xg_sofrido: 0.86,
      desfalques: ['Paulinho (transição física)'],
      escalacao_provavel: 'Weverton; Khellven, Gómez, Murilo, Piquerez; Aníbal Moreno, Lucas Evangelista; Maurício; Estêvão, Facundo Torres; Vitor Roque',
      formacao: '4-2-3-1', onze_provavel: XI_PAL,
      banco: ['Marcelo Lomba', 'Bruno Fuchs', 'Vanderlan', 'Emiliano Martínez', 'Felipe Anderson', 'Rony', 'Flaco López'],
      jogadores_chave: [
        { nome: 'Estêvão', posicao: 'PD', jogos: 18, minutos: 1350, gols: 8, assistencias: 6, finalizacoes_por_jogo: 2.7, finalizacoes_no_gol_por_jogo: 1.2, grandes_chances_ou_passes_decisivos_por_jogo: 1.1, cartoes_amarelos: 3, cartoes_vermelhos: 0, a_um_amarelo_da_suspensao: false, faltas_cometidas_por_jogo: 0.9, faltas_sofridas_por_jogo: 2.8, desarmes_por_jogo: 0.6, cobra_penaltis_ou_faltas: 'faltas', rating_medio: 7.7, observacao: 'Mais driblado e mais sofredor de faltas do elenco (demo)' },
        { nome: 'Vitor Roque', posicao: 'ATA', jogos: 17, minutos: 1280, gols: 9, assistencias: 2, finalizacoes_por_jogo: 2.9, finalizacoes_no_gol_por_jogo: 1.3, grandes_chances_ou_passes_decisivos_por_jogo: 0.7, cartoes_amarelos: 5, cartoes_vermelhos: 0, a_um_amarelo_da_suspensao: false, faltas_cometidas_por_jogo: 1.4, faltas_sofridas_por_jogo: 1.6, desarmes_por_jogo: 0.4, cobra_penaltis_ou_faltas: 'não', rating_medio: 7.3, observacao: '5 amarelos — risco disciplinar (demo)' },
      ],
      estilo_ofensivo: 'Bloco médio, verticalização rápida por Estêvão e bolas paradas trabalhadas.',
      vulnerabilidades_defensivas: ['Saída de bola pressionada no lado esquerdo'],
    },
    contexto_fase: 'Rodada 19 do Brasileirão Série A — confronto direto pelo topo da tabela (dados ilustrativos de demo).',
    grupo_classificacao: '2º x 3º · 41 x 39 pts',
    lacunas: ['DEMO: todos os números desta análise são ilustrativos'],
  };

  var F2_JSON = {
    contexto_analise: 'previa', partida: 'Flamengo × Palmeiras', fase: 'Brasileirão Série A',
    grupo: null, data_hora: 'Domingo, 21:30 (BRT)', sede: 'Maracanã, Rio de Janeiro',
    contexto_fase: 'Rodada 19 — 2º contra 3º; quem vencer dorme na cola do líder.',
    confianca_geral: 'medio',
    mandante: { nome: 'Flamengo', ranking_fifa: '2º · 41 pts', forma_recente: 'V V E V D', xg_marcado: 1.74, xg_sofrido: 0.98, desfalques: ['Léo Ortiz (lesão)', 'Lucas Paquetá (lesão)'], escalacao_status: 'provavel', escalacao: '4-2-3-1: Rossi; Varela, Léo Pereira, Danilo, Ayrton Lucas; Pulgar, Jorginho; Arrascaeta; Luiz Araújo, Samuel Lino; Pedro', jogadores_chave: ['Pedro (12 gols)', 'Arrascaeta (8 assistências, pendurado)'] },
    visitante: { nome: 'Palmeiras', ranking_fifa: '3º · 39 pts', forma_recente: 'V V V E V', xg_marcado: 1.52, xg_sofrido: 0.86, desfalques: ['Paulinho (transição física)'], escalacao_status: 'provavel', escalacao: '4-2-3-1: Weverton; Khellven, Gómez, Murilo, Piquerez; Aníbal Moreno, Lucas Evangelista; Maurício; Estêvão, Facundo Torres; Vitor Roque', jogadores_chave: ['Estêvão (8G/6A)', 'Vitor Roque (9 gols, 5 amarelos)'] },
    tecnico_mandante: { nome: 'Filipe Luís', formacao: '4-2-3-1', filosofia: 'Posse e pressão pós-perda; construção curta desde o goleiro.', ajustes_recentes: 'Jorginho entrou para dar saída limpa contra pressão alta.', impacto_mercados: 'Tende a elevar posse e escanteios a favor no Maracanã.' },
    tecnico_visitante: { nome: 'Abel Ferreira', formacao: '4-2-3-1', filosofia: 'Bloco médio compacto e transição vertical em 3 passes.', ajustes_recentes: 'Estêvão liberado para flutuar por dentro no último jogo.', impacto_mercados: 'Jogos do Palmeiras fora têm tendência de under e muitos cartões.' },
    lambda: { home_low: 1.1, home_mid: 1.45, home_high: 1.8, home_logic: 'xG casa 1.74 ajustado pela defesa de melhor xGA do returno.', away_low: 0.7, away_mid: 1.0, away_high: 1.35, away_logic: 'xG fora 1.28 do Palmeiras contra defesa desfalcada de Léo Ortiz.', },
    eventos_provaveis: [
      { evento: 'Menos de 3.5 gols', probabilidade: 0.68, fundamento: 'Clássico entre as duas melhores defesas do campeonato; últimos 6 confrontos com média 2.0 gols.' },
      { evento: 'Pedro marca a qualquer momento', probabilidade: 0.38, fundamento: '12 gols em 18 jogos; 3.1 finalizações/jogo diante de defesa sem o zagueiro titular… (demo)' },
      { evento: 'Ambas marcam — NÃO', probabilidade: 0.56, fundamento: 'Palmeiras sofreu gol em só 2 dos últimos 7; Flamengo tem o melhor xGA como mandante.' },
    ],
    sugestoes_ticket: [
      { descricao: 'Under 3.5 gols', probabilidade: 0.68, fundamento: 'Perfil defensivo dos dois + histórico recente do confronto.', confianca: 'alta' },
      { descricao: 'Mais de 4.5 cartões', probabilidade: 0.61, fundamento: 'Clássico, árbitro de média alta e 9 pendurados somados (demo).', confianca: 'media' },
      { descricao: 'Flamengo ou empate (dupla chance)', probabilidade: 0.74, fundamento: 'Mando forte + desfalque ofensivo do visitante.', confianca: 'media' },
    ],
    tendencias: ['Flamengo: 8 jogos seguidos marcando como mandante', 'Palmeiras: melhor defesa fora (0.7 gols sofridos/jogo)', 'Confronto: 4 dos últimos 5 com menos de 2.5 gols'],
    fatores_decisivos: ['Duelo Estêvão × Ayrton Lucas no lado direito do ataque visitante', 'Bola aérea ofensiva do Palmeiras contra defesa sem Léo Ortiz', 'Arrascaeta pendurado — risco de perder o clássico seguinte'],
    incerteza: [
      { fator: 'Escalações não confirmadas (demo)', impacto: 'alto' },
      { fator: 'Clima: previsão de chuva forte no Rio', impacto: 'medio' },
    ],
    confronto_tatico: {
      atq_mand_def_vis: { diagnostico: 'Posse do Flamengo contra bloco médio bem treinado; Arrascaeta entre linhas é a chave contra a dupla de volantes.', vantagem: 'equilibrado', pontos_exploracao: ['Infiltração de Samuel Lino nas costas de Khellven', 'Pedro no primeiro pau em cruzamentos'], bloqueios: ['Gómez impecável no jogo aéreo', 'Aníbal Moreno fechando o corredor central'] },
      atq_vis_def_mand: { diagnostico: 'Transições de 3 passes com Estêvão; a ausência de Léo Ortiz muda a cobertura da última linha do Flamengo.', vantagem: 'visitante', pontos_exploracao: ['Costas de Varela quando o Flamengo sobe em bloco', 'Bolas paradas: 5 gols do Palmeiras no returno'], bloqueios: ['Pulgar como primeiro filtro de transição'] },
      duelos_chave: [
        { confronto: 'Estêvão × Ayrton Lucas', setor: 'lado direito ofensivo do Palmeiras', favorito: 'Estêvão', impacto: 'alto' },
        { confronto: 'Pedro × Gómez', setor: 'área central', favorito: 'equilibrado', impacto: 'alto' },
      ],
      conclusao: 'Jogo de margens finas: o Flamengo deve dominar posse, mas a transição do Palmeiras é o caminho mais curto até o gol. (demo)',
    },
    cartoes_faltas: {
      analise: 'Clássico com média histórica de 5.2 cartões; arbitragem provável de perfil rigoroso. 9 pendurados somados. (demo)',
      eventos: [
        { evento: 'Mais de 4.5 cartões totais', probabilidade: 0.61, fundamento: 'Média do confronto + perfil do árbitro (demo).' },
        { evento: 'Cartão para Vitor Roque', probabilidade: 0.34, fundamento: '5 amarelos em 17 jogos; duelo físico com Danilo.' },
      ],
      jogadores_risco: [
        { nome: 'Arrascaeta', time: 'Flamengo', motivo: 'Pendurado (4 amarelos)' },
        { nome: 'Vitor Roque', time: 'Palmeiras', motivo: '5 amarelos — maior média de faltas do ataque' },
      ],
      conclusao: 'Mercado de cartões é o de melhor valor do jogo. (demo)',
    },
    escanteios: {
      analise: 'Flamengo força 6.1 escanteios/jogo em casa; Palmeiras cede poucos, mas cruza muito em bola parada. (demo)',
      eventos: [
        { evento: 'Mais de 8.5 escanteios', probabilidade: 0.55, fundamento: 'Média combinada 9.4 nos mandos do Flamengo (demo).' },
        { evento: 'Flamengo mais escanteios', probabilidade: 0.63, fundamento: 'Posse projetada acima de 55%.' },
      ],
      conclusao: 'Linha de 8.5 é o corte justo; acima disso o valor cai. (demo)',
    },
    lacunas: ['DEMO: análise ilustrativa gerada sem consumo de API — números não refletem a rodada real'],
  };

  var CHAT_PROSE = 'MODO DEMO — resposta ilustrativa: o clássico Flamengo × Palmeiras deste domingo opõe as duas melhores defesas da Série A, e o histórico recente aponta jogo de poucos gols. O mercado de cartões costuma ser o de melhor valor nesse confronto. (Nenhuma chamada de API foi feita.)';

  // ── SSE simulado (streaming com delays p/ contador de tokens andar) ─────
  function sseStream(text, chunks, gapMs) {
    var deltas = [];
    var step = Math.ceil(text.length / chunks);
    for (var i = 0; i < text.length; i += step) deltas.push(text.slice(i, i + step));
    var events = [{ type: 'message_start', message: { usage: { input_tokens: 2400 } } },
      { type: 'content_block_start', index: 0, content_block: { type: 'text' } }];
    deltas.forEach(function (d) { events.push({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: d } }); });
    events.push({ type: 'content_block_stop', index: 0 });
    events.push({ type: 'message_delta', usage: { output_tokens: Math.round(text.length / 4) }, delta: { stop_reason: 'end_turn' } });
    var enc = new TextEncoder();
    var k = 0;
    var stream = new ReadableStream({
      pull: function (ctrl) {
        if (k >= events.length) { ctrl.close(); return; }
        var payload = 'data: ' + JSON.stringify(events[k++]) + '\n\n';
        return new Promise(function (res) {
          setTimeout(function () { ctrl.enqueue(enc.encode(payload)); res(); }, gapMs);
        });
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }

  // ── Interceptor: SÓ '/v1/messages' — o resto do app segue real ──────────
  var _origFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    if (String(url).indexOf('/v1/messages') === -1) return _origFetch(url, opts);
    var body = null;
    try { body = JSON.parse(opts && opts.body); } catch (e) {}
    if (!body) return _origFetch(url, opts);
    var sys = '';
    try { sys = (typeof body.system === 'string') ? body.system : (body.system || []).map(function (s) { return s.text || ''; }).join(' '); } catch (e) {}
    if (body.stream) {
      // chat (prosa) × Fase 2 (JSON do card)
      if (/MODO CONVERSA/.test(sys)) return Promise.resolve(sseStream(CHAT_PROSE, 8, 180));
      return Promise.resolve(sseStream(JSON.stringify(F2_JSON), 24, 190));
    }
    // Fase 1 (coleta não-stream): rawFacts completos após uma pausa "de pesquisa"
    return new Promise(function (res) {
      setTimeout(function () {
        res(new Response(JSON.stringify({
          stop_reason: 'end_turn',
          usage: { input_tokens: 1800, output_tokens: 950 },
          content: [{ type: 'text', text: JSON.stringify(F1_FACTS) }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }, 1400);
    });
  };

  // ── UI: badge + chave ilustrativa + partida sugerida ────────────────────
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () {
    var b = document.createElement('div');
    b.id = 'demo-badge';
    b.textContent = '🎬 MODO DEMO — dados ilustrativos · nenhuma chamada de API é feita';
    b.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:9999;background:#e8b44a;color:#141414;' +
      'font:600 12px/1.4 system-ui;padding:6px 12px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.4);pointer-events:none';
    document.body.appendChild(b);
    // chave ilustrativa direto no input (setar .value NÃO dispara o listener de
    // 'input' → nada é gravado no sessionStorage; ao sair do modo demo, some)
    var k = document.getElementById('api-key-input');
    if (k && !k.value) k.value = 'sk-ant-demo-modo-apresentacao-000000000000';
    var m = document.getElementById('match-input');
    if (m && !m.value) m.value = DEMO_MATCH;
  });
})();
