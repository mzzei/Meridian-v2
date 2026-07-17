# Arquitetura Meridian v2 (pós code-review)

## Módulos JS (carregamento clássico + `defer`, ordem fixa)

| Ordem | Arquivo | Responsabilidade |
|------:|---------|------------------|
| 1 | `js/lib/intent.js` | `looksLikeMatchQuery`, `routeUserIntent` |
| 2 | `js/analysis/tab-helpers.js` | registry 7 abas, empty states |
| 3 | `js/analysis/lineup.js` | mapa de campo, `buildPitchModel` |
| 4 | `js/analysis/prompts.js` | system prompts análise/chat |
| 5 | `js/export/report.js` | export HTML/PDF |
| 6 | `js/app.js` | orquestração, UI, pipeline, dados |

## CSS

| Arquivo | Papel |
|---------|--------|
| `css/app.css` | UI app + tokens semânticos (`--menu-bg`, `--toast-bg`, …) |
| `css/print-report.css` | relatório/impressão (export) |

## Testes

```bash
node tests/run.mjs
```

## Porta

`serve.js` → `http://127.0.0.1:3457/`

## Regra

Novas features: **módulo dedicado** se &gt; ~150 linhas ou domínio claro. Evitar re-inchar só o `app.js`.
