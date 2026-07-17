# Arquitetura Meridian v2

## Módulos JS (`defer`, ordem fixa)

| # | Arquivo | Papel |
|--:|---------|--------|
| 1 | `js/lib/intent.js` | Roteamento chat vs análise |
| 2 | `js/analysis/tab-helpers.js` | Registry 7 abas |
| 3 | `js/analysis/lineup.js` | Mapa de campo |
| 4 | `js/analysis/normalize.js` | Schema `_schema:2`, attach/migrate/pads |
| 5 | `js/analysis/prompts.js` | System prompts |
| 6 | `js/analysis/render.js` | Cards de análise |
| 7 | `js/export/report.js` | HTML/PDF |
| 8 | `js/data/espn.js` | ESPN + TSDB + standings/news/chat boards |
| 9 | `js/data/football-apis.js` | API-Football + football-data.org |
| 10 | `js/data/schedule.js` | Agenda multi-liga + ctx torneio |
| 11 | `js/data/live.js` | Painel ao vivo |
| 12 | `js/data/history.js` | Histórico persistente |
| 13 | `js/analysis/pipeline-facts.js` | Grounding, gatherFacts, verify, placares |
| 14 | `js/analysis/pipeline-run.js` | runChat, runAnalysis, streamOnce |
| 15 | `js/app.js` | UI shell, settings, CompContext, biblioteca |

## Write path

```
gatherFacts → parse → attachAnalysisDerived → verifyAnalysis
           → finalizeAnalysisPads → renderResults → saveAnalysis
```

## Service Worker

`SHELL_VERSION` único · navigate network-first · assets cache-first

## Testes

```bash
node tests/run.mjs
```

## Porta

`http://127.0.0.1:3457/`
