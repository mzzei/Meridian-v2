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

console.log(failed ? `\n${failed} FAILED` : '\nMOTOR ALL PASSED');
process.exit(failed ? 1 : 0);
