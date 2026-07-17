# Correções pós code-review [ultra]

Atualizado: 2026-07-17 · HEAD após PR estrutural

## Achados do ultra → status

| # | Achado | Resolução |
|---|--------|-----------|
| 1 | Decomposição cosmetica | `normalize.js` + `history.js` + `football-apis.js`; ESPN completo em `espn.js` |
| 2 | `app.js` monólito | **~2640 LOC** (era ~5.9k); schedule + pipeline-facts/run extraídos (<1k cada) |
| 3 | normalize triplicado + muta | Schema `_schema:2`; migrate **uma vez**; render **não** normaliza |
| 4 | PDF CDN + dual path | Lib **local** `assets/vendor/html2pdf.bundle.min.js` |
| 5 | SW preferNetwork blanket | Network-first **só navigate**; `SHELL_VERSION` único |
| 6 | Tabs hardcodadas | `renderAnalysisTabShell` + `ANALYSIS_TAB_ORDER` |
| 7 | ESPN boundary podre | standings/results/news/chat scoreboards em `espn.js` |
| 8 | Harness routing | PASS em `tests/run.mjs` |

## Como validar

```bash
node tests/run.mjs
# ALL PASSED
```

Browser: `http://127.0.0.1:3457/?resetsw=1` → Exportar PDF (lib local) → reabrir histórico antigo.
