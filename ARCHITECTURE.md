# Arquitetura Meridian v2

## Entry

```html
<script type="module" src="js/main.js?v=…"></script>
```

| Arquivo | Papel |
|---------|--------|
| `js/version.js` | `SHELL_VERSION` |
| `js/expose.js` | `expose({…})` → `globalThis` (HTML onclick) |
| `js/runtime.js` | `host` / `hostFn` — **só bordas** ESM↔shell |

## ESM real (import nomeado de deps)

- `lib/intent.js`
- `analysis/tab-helpers.js`, `lineup.js`, `normalize.js`
- `data/history.js` → `import { migrateAnalysisPayload } from normalize`
- `export/report.js` → `hostFn` para toast/esc (borda)

## Classic (globais limpos, sem `globalThis.` no corpo)

- `prompts`, `render`, `espn`, `football-apis`, `schedule`, `live`
- `ui/featured`, `ui/library`
- `pipeline-facts`, `pipeline-run`, `app`

**Regra de migração:** só sai de classic se o arquivo passar a **importar** deps de verdade.  
Prefixar tudo com `globalThis.` **não** conta como ESM.

## State compartilhado

Símbolos lidos/escritos por ESM (`_history`, `HIST_KEY`, …) usam `var` no `app.js` para o mesmo slot de `globalThis`.

## Write path do agente

```
gatherFacts → parse → attachAnalysisDerived → verify
           → finalizeAnalysisPads → renderResults → saveAnalysis
```

## Testes

```bash
node tests/run.mjs
```
