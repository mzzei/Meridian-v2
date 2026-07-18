# Fontes grátis + FactsMemory (shell 54)

## Correções do code-review ultra

1. **Skip por times do jogo** — dimensão de time (técnico, escalação…) só é “coberta” se **ambos** os times do confronto tiverem entrada fresca. Sem times parseados → sem skip de time (fail-safe).
2. **Sem ingest circular** — `apiText` (APIs) e `memoryText` separados; só `apiText` é ingerido.
3. **Scorebat estrito** — keys específicas (`brazil:`, …); **sem** fallback de outras ligas; sem `'serie a'` solto.
4. **OpenLigaDB** — no-op se `openliga` for null no catálogo (sem teatro).
5. **Coleta unificada** — `collectPhase1Context` em `phase1-context.js`.
6. **`cachedJsonFetch`** canônico + `joinContextBlocks` com teto de chars.
7. **Dedupe** de linhas de placar no OpenFootball.

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
