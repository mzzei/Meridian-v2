/**
 * Smoke test do MOTOR — análise completa em Node puro, sem navegador.
 * node tests/motor.mjs
 *
 * Stub de fetch: /v1/messages devolve fixtures (F1 rawFacts, F2 card);
 * chamadas externas (ESPN etc.) devolvem 404 — o motor precisa degradar
 * sem quebrar. Se este teste passa, o pacote é integrável fora do app.
 */
import { createEngine } from '../motor/engine.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let failed = 0;
const assert = (c, m) => { if (!c) { console.error('FAIL', m); failed++; } else console.log('PASS', m); };

// ── Manifesto do pacote: todo arquivo listado precisa existir ──
{
  const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = fs.readFileSync(path.join(ROOT, 'motor/MANIFEST.txt'), 'utf8')
    .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const missing = manifest.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
  assert(manifest.length >= 20 && missing.length === 0,
    `package manifest complete (${manifest.length} files${missing.length ? '; MISSING: ' + missing.join(', ') : ''})`);
}

const F1 = JSON.stringify({
  mandante: { nome: 'Flamengo', tecnico: 'Filipe Luís', xg_marcado: 1.7, xg_sofrido: 1.0, resultados_recentes: ['V 2x0 Fluminense'], jogadores_chave: [{ nome: 'Pedro', posicao: 'ATA', gols: 12, cartoes_amarelos: 2, finalizacoes_no_gol_por_jogo: 1.5, faltas_cometidas_por_jogo: 0.8, rating_medio: 7.5 }], onze_provavel: Array.from({ length: 11 }, (_, i) => ({ nome: 'J' + i, posicao: 'P' })), banco: ['B1'], formacao: '4-2-3-1', escanteios_por_jogo: 6.1, escanteios_sofridos_por_jogo: 3.9 },
  visitante: { nome: 'Palmeiras', tecnico: 'Abel', xg_marcado: 1.5, xg_sofrido: 0.9, resultados_recentes: ['V 1x0 Corinthians'], jogadores_chave: [{ nome: 'Estêvão', posicao: 'PD', gols: 8, cartoes_amarelos: 3, finalizacoes_no_gol_por_jogo: 1.2, faltas_cometidas_por_jogo: 0.9, rating_medio: 7.7 }], onze_provavel: Array.from({ length: 11 }, (_, i) => ({ nome: 'V' + i, posicao: 'P' })), banco: ['B2'], formacao: '4-2-3-1', escanteios_por_jogo: 5.2, escanteios_sofridos_por_jogo: 4.1 },
  contexto_fase: 'Rodada 19', grupo_classificacao: '', lacunas: [],
});

const F2 = JSON.stringify({
  contexto_analise: 'previa', partida: 'Flamengo × Palmeiras', fase: 'Brasileirão Série A', confianca_geral: 'medio',
  mandante: { nome: 'Flamengo', xg_marcado: 1.7, xg_sofrido: 1.0, escalacao_status: 'provavel', jogadores_chave: ['Pedro'] },
  visitante: { nome: 'Palmeiras', xg_marcado: 1.5, xg_sofrido: 0.9, escalacao_status: 'provavel', jogadores_chave: ['Estêvão'] },
  lambda: { home_low: 1.1, home_mid: 1.5, home_high: 1.9, home_logic: 'x', away_low: 0.8, away_mid: 1.1, away_high: 1.4, away_logic: 'y' },
  eventos_provaveis: [{ evento: 'Under 3.5', probabilidade: 0.65, fundamento: 'f' }],
  sugestoes_ticket: [{ descricao: 'Under 3.5', probabilidade: 0.65, fundamento: 'f', confianca: 'alta' }],
  tendencias: ['t'], fatores_decisivos: ['fd'], incerteza: [{ fator: 'x', impacto: 'medio' }],
  lacunas: [],
});

const sse = (text) => {
  const events = [
    { type: 'message_start', message: { usage: { input_tokens: 100 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', usage: { output_tokens: 200 }, delta: { stop_reason: 'end_turn' } },
  ];
  const body = events.map((e) => 'data: ' + JSON.stringify(e)).join('\n\n') + '\n\n';
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
};

let anthropicCalls = 0;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('/v1/messages')) {
    anthropicCalls++;
    let b = null; try { b = JSON.parse(opts.body); } catch {}
    if (b && b.stream) return sse(F2);
    return new Response(JSON.stringify({ stop_reason: 'end_turn', usage: { input_tokens: 50, output_tokens: 80 }, content: [{ type: 'text', text: F1 }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  // ESPN/AF/FD indisponíveis: o motor degrada, não quebra
  return new Response('', { status: 404 });
};

const progress = [];
const engine = await createEngine({
  apiKey: 'sk-ant-motor-smoke-test',
  model: 'claude-sonnet-5',
  competition: 'brsa',
  searches: 1,
  onProgress: (u) => { if (u && u.status) progress.push(u.status); },
  log: () => {},
});
assert(typeof engine.analyzeMatch === 'function', 'engine created headless (no browser globals required)');

const { analysis, rawFacts, usage } = await engine.analyzeMatch('PARTIDA: Flamengo x Palmeiras');

assert(analysis && analysis.partida === 'Flamengo × Palmeiras', 'analysis JSON returned');
assert(analysis.mandante && analysis.mandante.nome === 'Flamengo', 'mandante present');
assert(Array.isArray(analysis.sugestoes_ticket) && analysis.sugestoes_ticket.length > 0, 'ticket suggestions present');
assert(analysis._coletaOk === true, 'F1 collection succeeded and flagged');
assert(rawFacts && rawFacts.mandante.escanteios_por_jogo === 6.1, 'rawFacts flow through (incl. escanteios — shell 101)');
assert(analysis._lineups && analysis._lineupsFonte, 'normalize attached lineups + proveniência (' + (analysis._lineupsFonte || '?') + ')');
assert(usage.p1In > 0 && usage.p2Out > 0, 'usage accounted per phase');
assert(progress.some((s) => /Coleta/i.test(s)) && progress.some((s) => /Raciocinando/i.test(s)), 'onProgress callback received both phases');
assert(anthropicCalls >= 2, 'F1 + F2 called the API (' + anthropicCalls + ' calls)');
assert(typeof document === 'object' && document.getElementById('x') === null, 'document is the headless stub (no real DOM)');

// ── Chat + routeIntent (mesmo comportamento do app, headless) ──
{
  // roteamento espelha intent.js
  assert(engine.routeIntent('PARTIDA: Flamengo x Palmeiras').mode === 'analysis', 'routeIntent: query ancorada → analysis');
  assert(engine.routeIntent('qual a filosofia do Abel Ferreira?').mode === 'chat', 'routeIntent: pergunta → chat');
  const rNeed = engine.routeIntent('análise completa');
  assert(rNeed.mode === 'need_teams' || rNeed.mode === 'chat', 'routeIntent: pedido sem times → need_teams/chat (' + rNeed.mode + ')');

  // gate de ambiguidade: pergunta vaga SEM âncora → need_context SEM gastar LLM
  const before = anthropicCalls;
  const vague = await engine.chat('qual sua opinião sobre o jogo de hoje?');
  assert(vague.type === 'need_context' && vague.reason === 'vague_query', 'chat: vago sem âncora → need_context');
  assert(anthropicCalls === before, 'chat: gate NÃO gastou chamada de API');

  // chat ancorado: responde em prosa com a persona + MODO CONVERSA no system
  let chatBody = null;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('/v1/messages')) {
      let b = null; try { b = JSON.parse(opts.body); } catch {}
      if (b && Array.isArray(b.system) && b.system.some((s) => /MODO CONVERSA/.test(s.text || ''))) {
        chatBody = b;
        return sse('O clássico tende a poucos gols; o mercado de cartões costuma pagar melhor.');
      }
    }
    return prevFetch(url, opts);
  };
  const reply = await engine.chat('Flamengo x Palmeiras: qual mercado tem melhor valor?', {
    history: [{ role: 'user', content: 'contexto anterior' }, { role: 'assistant', content: 'ok' }],
    context: { placaresVerificados: '=== PLACARES VERIFICADOS ===\n• Flamengo 2 x 1 Palmeiras | FT\n=== FIM ===' },
  });
  globalThis.fetch = prevFetch;
  assert(reply.type === 'text' && /cartões/.test(reply.text), 'chat: resposta em prosa entregue');
  assert(reply.usage.outTokens > 0, 'chat: usage contabilizado');
  assert(chatBody && chatBody.system.length === 2 && /ANALISTA|analista|futebol/i.test(chatBody.system[0].text), 'chat: persona real do app no system[0]');
  assert(chatBody.thinking && chatBody.thinking.type === 'disabled', 'chat: thinking desligado (Sonnet 5)');
  assert(chatBody.messages.length === 3, 'chat: history (2) + turno atual');
  assert(/PLACARES VERIFICADOS/.test(chatBody.messages[2].content) && /autoridade máxima/.test(chatBody.messages[2].content), 'chat: bloco de placares injetado + regra de autoridade');
  assert(chatBody.tools && chatBody.tools[0].name === 'web_search', 'chat: web_search disponível');

  // resposta em JSON nunca vaza crua: extrai prosa (guard do app)
  globalThis.fetch = async (url, opts) => {
    let b = null; try { b = JSON.parse(opts.body); } catch {}
    if (b && Array.isArray(b.system) && b.system.some((s) => /MODO CONVERSA/.test(s.text || '')))
      return sse('{"resposta":"O favoritismo é do mandante pelo retrospecto recente no clássico."}');
    return prevFetch(url, opts);
  };
  const jsonReply = await engine.chat('Flamengo x Palmeiras: quem é favorito?');
  globalThis.fetch = prevFetch;
  assert(jsonReply.type === 'text' && /favoritismo é do mandante/.test(jsonReply.text) && !/[{}"]/.test(jsonReply.text.slice(0, 5)), 'chat: JSON do modelo vira prosa (nunca cru)');
}

console.log(failed ? `\n${failed} FAILED` : '\nMOTOR ALL PASSED');
process.exit(failed ? 1 : 0);
