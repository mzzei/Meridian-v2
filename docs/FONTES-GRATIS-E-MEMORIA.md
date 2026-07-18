# Fontes grátis + FactsMemory + anti-fantasma + cobertura (shell 57)

## Cobertura A/B/C (shell 57)

| Camada | Significado | Alta quando |
|--------|-------------|-------------|
| **A** Campeonato | tabela, placares, próximos | ESPN/FD/TSDB/OF com classif. + jogos |
| **B** Time | técnico, escalação | AF coach/lineup ou blocos equivalentes |
| **C** Analítico | xG, métricas | raro na coleta estruturada → web_search |

- Badge no dock: `#data-coverage` (pills A/B/C).
- Bloco no prompt: `=== COBERTURA DE DADOS ===` orienta onde gastar busca.
- `globalThis._phase1Coverage`.

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
