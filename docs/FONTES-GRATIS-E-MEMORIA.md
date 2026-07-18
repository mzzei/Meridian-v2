# Fontes grátis + FactsMemory + anti-fantasma (shell 56)

## Anti-fantasma (shell 56)

- Só fontes **ativas** (chars > 0) entram no prompt.
- Bloco `=== REPERTOIRE ESTRUTURADO ATIVO ===` no topo de `DADOS DA API` com benefício de cada uma.
- Fontes vazias → `silent[]` na telemetria (`_phase1Telemetry`) — **não** viram lacuna no agente.
- UI thinking: `[F1] Fontes: ESPN · TheSportsDB · OpenFootball`.
- `sessionStorage.meridian_phase1_sources_v1` para debug.

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
  ├─ cascade: AF → FD → ESPN
  ├─ apiText = join(cascade, free)  → factsMemIngestStructured(apiText)
  ├─ memoryText = factsMemBuildKnownBlock(compId, teamsFromQuery)
  └─ fdCtx = join(apiText, memoryText)  // orçamento total

gatherFacts
  ├─ ctx = collectPhase1Context(...)
  ├─ topics = phase1FilterTopics(..., teams)  // skip seguro
  └─ LLM + web_search
       └─ factsMemIngestRawFacts(rawFacts)  // por nome de time
```

## Catálogo (`competitions.js`)

- `tsdb`, `openfootball`, `scorebat[]`, `openliga` (null se sem cobertura)
