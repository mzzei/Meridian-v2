# Fontes grátis + FactsMemory + anti-fantasma + cobertura (shell 60)

## FD via Worker (shell 60 — achado de probe)

- **Probe real 07/2026 (com chave de usuário):** as respostas GET do
  football-data.org **não trazem `Access-Control-Allow-Origin` em nenhuma
  origem** (o preflight OPTIONS até responde, mas o GET não) → browser direto
  SEMPRE falha com "Failed to fetch". Não é chave errada.
- Correção: rota `{worker}/fd/*` no Worker (chave via `?token=` do app ou
  secret `FD_KEY`; repassa headers de rate limit). `_fdUrl` prefere o Worker,
  como `_afUrl`. Status FD sem Worker agora explica o CORS.
- Consequência honesta: **FD e AF exigem Worker URL** no navegador. A cascata A
  sem Worker continua 100% ESPN (+ free registry).

## Novas fontes + health probe (shell 59)

- **FPL (Fantasy Premier League)** — só EPL, só com Worker URL (`{worker}/fpl/*`;
  a API oficial não manda CORS). `getFplContext(compId, teams)`: métricas de
  jogador (gols/assists/xG/xA/forma/minutos) + lesões/dúvidas com news. Sobe a
  camada **C** da cobertura para EPL sem gastar web_search. Cache 6h.
- **StatsBomb Open (histórico)** — `getStatsbombOpenContext(compId, query)`: só
  ativa quando a query cita um ano/temporada que EXISTE no open-data da liga
  (La Liga / Premier League / Champions). Bloco marcado como TEMPORADA PASSADA;
  nunca vira estado atual. Cache 7 dias. brsa/libertadores: sem cobertura → silent.
- **Health probe** (`js/data/source-health.js`) — testa as fontes free da liga
  ativa (getters reais com cache), pinta os status nos settings (`tsdb-status`,
  `of-status`, `scorebat-status`, `openliga-status`, `fpl-status`, `sbopen-status`),
  botão "Testar fontes agora", auto no load + a cada 30 min. INVARIANTE: saúde
  é UI/telemetria (`_sourceHealth` + sessionStorage) — **nunca** entra no prompt.
- **AF status** agora aponta o Worker quando a falha é CORS ("provável CORS —
  configure Worker URL"). Worker ganhou rota `/fpl/*` (ver `worker/README.md`).
- Registry: `getFreeSourcesBundle(compId, teams, query)` (teams p/ FPL, query
  p/ StatsBomb histórico).

## Cobertura A/B/C (shell 57)

| Camada | Significado | Alta quando |
|--------|-------------|-------------|
| **A** Campeonato | tabela, placares, próximos | ESPN/FD/TSDB/OF com classif. + jogos |
| **B** Time | técnico, escalação | AF coach/lineup ou blocos equivalentes |
| **C** Analítico | xG, métricas | raro na coleta estruturada → web_search |

- Badge no dock: `#data-coverage` (pills A/B/C).
- Bloco no prompt: `=== COBERTURA DE DADOS ===` orienta onde gastar busca.
- `globalThis._phase1Coverage`.

## Cobertura pós-busca (shell 58)

- `updateCoverageAfterSearch(rawFacts)` (source-telemetry) roda no fim do
  `gatherFacts`, depois do web_search: se os rawFacts trazem xG/métricas de
  jogador, **C sobe**; se trazem técnico dos dois times e/ou onze provável,
  **B sobe**. Nunca rebaixa (os blocos estruturados continuam valendo).
- Atualiza `_phase1Coverage`, o badge `#data-coverage` e o sessionStorage
  (`coverage.postSearch: true`); `summaryHuman` vira "Cobertura (pós-busca): …".
- Ajuda nos settings: hint `#cov-help` explica A grátis (ESPN) / B precisa AF /
  C vem da busca.

## AF free mínimo (shell 57)

- Cascata A: **FD → ESPN → AF full só se falhar** (não gasta cota free em standings se ESPN ok).
- Camada B: `afEnrichCoachLineupMinimal` = 1× fixtures (cache 15min) + 0–2 coaches (24h) + lineup **só &lt;36h** do kickoff.
- Cache keys por competição: `meridian_af_coach_{comp}_{teamId}`.

## Anti-fantasma (shell 56)

- Só fontes **ativas** entram no prompt.
- `=== REPERTOIRE ESTRUTURADO ATIVO ===`
- `silent[]` só na telemetria.
- UI: `[F1] Fontes: … · Cobertura: A alta · B média · C baixa`.

## Correções anteriores (ultra)

1. **Skip por times do jogo** — ambos os times do confronto.
2. **Sem ingest circular** — apiText ≠ memoryText.
3. **Scorebat estrito** — sem cross-liga.
4. **OpenLigaDB** — no-op se não mapeado.
5. **collectPhase1Context** unificado.
6. **cachedJsonFetch** + orçamento de chars.
7. **ESPN standings** parser `children[]` (shell 55).

## Arquivos

| Arquivo | Papel |
|---------|--------|
| `js/data/cached-fetch.js` | fetch JSON + TTL + join/parse times |
| `js/data/phase1-context.js` | orquestra cascata + free + memória |
| `js/data/free-sources.js` | registry TSDB + OpenFootball + Scorebat + OpenLiga |
| `js/data/facts-memory.js` | memória por entidade (time/liga) |
| `js/data/espn.js` | ESPN + `getTsdbContext` multi-liga |

## Fluxo Fase 1

```
collectPhase1Context(compId, query)
  ├─ parallel: free registry (TSDB, OF, Scorebat, OpenLiga?)
  ├─ cascade A: FD → ESPN → AF full (só se A ainda vazia)
  ├─ layer B: afEnrichCoachLineupMinimal (se AF key e cascade ≠ af)
  ├─ apiText = join(cascade, free, afB)  → factsMemIngestStructured(apiText)
  ├─ memoryText = factsMemBuildKnownBlock(compId, teamsFromQuery)
  ├─ agentLine (REPERTOIRE) + coverage A/B/C (covBlock)
  └─ fdCtx = join(agentLine, covBlock, apiText, memoryText)  // orçamento total

gatherFacts
  ├─ ctx = collectPhase1Context(...)
  ├─ topics = phase1FilterTopics(..., teams)  // skip seguro
  └─ LLM + web_search
       ├─ factsMemIngestRawFacts(rawFacts)      // por nome de time
       └─ updateCoverageAfterSearch(rawFacts)   // C/B sobem pós-busca (shell 58)
```

## Catálogo (`competitions.js`)

- `tsdb`, `openfootball`, `scorebat[]`, `openliga` (null se sem cobertura)
