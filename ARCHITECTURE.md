# Arquitetura Meridian v2 (pós code-review ultra)

## Módulos JS (clássico + `defer`, ordem fixa)

| Ordem | Arquivo | Responsabilidade |
|------:|---------|------------------|
| 1 | `js/lib/intent.js` | `routeUserIntent`, match vs chat |
| 2 | `js/analysis/tab-helpers.js` | `ANALYSIS_TAB_ORDER`, empty states |
| 3 | `js/analysis/lineup.js` | `buildPitchModel`, mapa de campo |
| 4 | `js/analysis/normalize.js` | schema `_schema:2`, `attachAnalysisDerived`, migrate, pads |
| 5 | `js/analysis/prompts.js` | system prompts |
| 6 | `js/analysis/render.js` | Poisson, cards, `renderResults` (usa shell de abas) |
| 7 | `js/export/report.js` | HTML + PDF one-click (`assets/vendor/html2pdf`) |
| 8 | `js/data/espn.js` | fetch ESPN |
| 9 | `js/data/live.js` | painel ao vivo |
| 10 | `js/data/history.js` | load/save/open histórico (migrate once) |
| 11 | `js/app.js` | UI, pipeline, AF/FD, orquestração |

## Write path da análise

```
parse JSON → attachAnalysisDerived(parsed, rawFacts)
          → verifyAnalysis (auditor)
          → finalizeAnalysisPads(parsed)
          → renderResults(parsed)   // não normaliza
          → saveAnalysis (schema 2)
```

Histórico antigo: `loadHistory` chama `migrateAnalysisPayload` só se `_schema !== 2`.

## Service Worker

- `SHELL_VERSION` único (= `?v=` do shell)
- navigate → network-first
- assets → cache-first por URL
- reload do cliente só em `controllerchange` se **já havia** controller

## Testes

```bash
node tests/run.mjs
```

## Porta

`serve.js` → `http://127.0.0.1:3457/`

## Regra

Novas features: módulo dedicado se domínio claro. Evitar re-inchar só o `app.js`.
