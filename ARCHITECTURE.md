# Arquitetura Meridian v2 (pós code-review ultra)

## Módulos JS (clássico + `defer`, ordem fixa)

| Ordem | Arquivo | Responsabilidade |
|------:|---------|------------------|
| 1 | `js/lib/intent.js` | `routeUserIntent`, match vs chat |
| 2 | `js/analysis/tab-helpers.js` | `ANALYSIS_TAB_ORDER`, empty states |
| 3 | `js/analysis/lineup.js` | `buildPitchModel`, mapa de campo |
| 4 | `js/analysis/normalize.js` | schema `_schema:2`, attach/migrate/pads |
| 5 | `js/analysis/prompts.js` | system prompts |
| 6 | `js/analysis/render.js` | Poisson, cards, `renderResults` |
| 7 | `js/export/report.js` | HTML + PDF (`assets/vendor/html2pdf`) |
| 8 | `js/data/espn.js` | ESPN + TSDB + standings/results + news + chat scoreboards |
| 9 | `js/data/football-apis.js` | football-data.org + API-Football |
| 10 | `js/data/live.js` | painel ao vivo |
| 11 | `js/data/history.js` | load/save/open histórico |
| 12 | `js/app.js` | UI, schedule/library, pipeline `gatherFacts`/`runChat`/`runAnalysis` |

## Write path da análise

```
parse → attachAnalysisDerived(parsed, rawFacts)
      → verifyAnalysis
      → finalizeAnalysisPads(parsed)
      → renderResults(parsed)
      → saveAnalysis (schema 2)
```

Histórico: `loadHistory` migra só se `_schema !== 2`.

## Service Worker

- `SHELL_VERSION` (= `?v=` do shell)
- navigate → network-first
- assets → cache-first
- reload cliente só se já havia controller

## Testes

```bash
node tests/run.mjs
```

## Porta

`serve.js` → `http://127.0.0.1:3457/`

## Regra

Novas features: módulo dedicado se domínio claro. Meta: não re-inchar `app.js` (hoje ~4k LOC de orquestração/UI/pipeline).
