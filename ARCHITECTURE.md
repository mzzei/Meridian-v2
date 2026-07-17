# Arquitetura Meridian v2

## Entry

```html
<script type="module" src="js/main.js?v=…"></script>
```

Ordem no `main.js`:

1. `competitions.js` + `state.js` (fundação)  
2. ESM real (intent, normalize, history, export, …)  
3. Classic (schedule, UI, pipeline, app)  
4. `html-bridge` (onclick do HTML)

## Fundações (recomendações 1–3)

| Arquivo | Papel |
|---------|--------|
| `js/comp/competitions.js` | Catálogo de ligas + season/API helpers |
| `js/state.js` | Estado + **setters** (`setSchedule`, `setAnalysisCompId`, …) + bridges `_schedule`/`_history` |
| `js/html-bridge.js` | Lista canônica do que o HTML chama |

## ESM real

intent · tab-helpers · lineup · normalize · history · export · competitions · state · html-bridge

## Classic

prompts · render · espn · football-apis · schedule · live · featured · library · pipeline-* · app

## Write path do agente

```
gatherFacts → attachAnalysisDerived → verify → finalizeAnalysisPads → render → save
```

## Próximo passo (recomendação 4)

Ver `docs/GUIA-ESM-PIPELINE.md` (passo a passo em linguagem simples).

## Testes

```bash
node tests/run.mjs
```
