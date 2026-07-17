# Arquitetura Meridian v2

## Entry (ES modules)

```html
<script type="module" src="js/main.js?v=…"></script>
```

`js/main.js`:
1. **import** módulos ESM (export + `expose` no `globalThis`)
2. **loadClassic** o restante (pipeline/UI/app) — globais para `onclick` HTML

| Arquivo | Papel |
|---------|--------|
| `js/version.js` | `SHELL_VERSION` (única fonte) |
| `js/expose.js` | `expose({…})` → `globalThis` |
| `js/runtime.js` | `host()` / `hostFn()` — borda ESM ↔ shell clássico |

## Camada ESM (import real)

- `lib/intent.js`
- `analysis/tab-helpers.js`, `lineup.js`, `normalize.js`
- `data/history.js` — usa `migrateAnalysisPayload` via **import**
- `export/report.js` — PDF/HTML; host só em call-time (`toast`, `esc`, …)

## Camada clássica (ainda em CLASSIC)

- `prompts`, `render`, `espn`, `football-apis`, `schedule`, `live`
- `ui/featured`, `ui/library`
- `pipeline-facts`, `pipeline-run`, `app`

## Migração segura (arquivo a arquivo)

1. `import` deps + `export` API + `expose` público  
2. Bordas ao app: `host()` / `hostFn()`, não nomes soltos  
3. Sair de `CLASSIC` no `main.js`  
4. Bump `SHELL_VERSION` + teste  

## Write path do agente (inalterado)

```
gatherFacts → parse → attachAnalysisDerived → verify
           → finalizeAnalysisPads → renderResults → saveAnalysis
```

## Testes

```bash
node tests/run.mjs
```

## Porta

`http://127.0.0.1:3457/`
