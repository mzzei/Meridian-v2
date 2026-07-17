# Arquitetura Meridian v2

## Entry (ES modules)

```html
<script type="module" src="js/main.js?v=…"></script>
```

`js/main.js`:
1. **import** módulos puros (ESM): `intent`, `tab-helpers`, `lineup`, `normalize` (+ `version`, `expose`)
2. **loadClassic** (scripts sem `type=module`) na ordem do pipeline/UI — mantém globais para `onclick` do HTML

`js/version.js` exporta `SHELL_VERSION` (única fonte; `sw.js` espelha).

`js/expose.js` — `expose({...})` grava no `globalThis` para interop HTML/clássicos.

## Módulos

| Camada | Arquivos |
|--------|----------|
| ESM puro | `lib/intent`, `analysis/{tab-helpers,lineup,normalize}` |
| Clássico data | `data/{espn,football-apis,schedule,live,history}` |
| Clássico analysis | `prompts`, `render`, `pipeline-facts`, `pipeline-run` |
| Clássico UI | `ui/{featured,library}`, `export/report`, `app` |

## Write path

```
gatherFacts → parse → attachAnalysisDerived → verify
           → finalizeAnalysisPads → renderResults → save
```

## Testes

```bash
node tests/run.mjs
```

## Porta

`http://127.0.0.1:3457/`
