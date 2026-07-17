# Correções pós code-review [ultra]

Atualizado: 2026-07-17 · HEAD após PR estrutural

## Achados do ultra → status

| # | Achado | Resolução |
|---|--------|-----------|
| 1 | Decomposição cosmetica | `normalize.js` + `history.js` com ownership; pipeline usa `attachAnalysisDerived` / `finalizeAnalysisPads` |
| 2 | `app.js` monólito | History saiu; still large mas write-path de análise unificado |
| 3 | normalize triplicado + muta | Schema `_schema:2`; migrate **uma vez** em `loadHistory`; render **não** normaliza |
| 4 | PDF CDN + dual path | Lib **local** `assets/vendor/html2pdf.bundle.min.js`; fallback HTML (sem print dual) |
| 5 | SW preferNetwork blanket | Network-first **só navigate**; assets cache-first; `SHELL_VERSION` único; reload só se já havia controller |
| 6 | Tabs hardcodadas | `renderAnalysisTabShell` + `ANALYSIS_TAB_ORDER` |
| 7 | Harness routing | Mantido PASS em `tests/run.mjs` |

## Como validar

```bash
node tests/run.mjs
# ALL PASSED
```

Browser: `http://127.0.0.1:3457/?resetsw=1` → Exportar PDF (lib local) → reabrir histórico antigo.
