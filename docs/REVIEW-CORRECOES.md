# Revisão das correções — Meridian v2

Atualizado: 2026-07-17 · harness `tests/run.mjs` + residual risks

## Status residual (pontuações “ainda honestas”)

| # | Risco | Status | Como foi corrigido |
|---|--------|--------|---------------------|
| 1 | PDF one-click sem diálogo de impressão | **OK** | `html2pdf.js` (CDN) gera `.pdf` e baixa; fallback `window.print` se CDN/DOM falhar |
| 2 | SW cache serve shell antigo | **OK** | Network-first p/ HTML/JS/CSS online; `SW_ACTIVATED` + reload; `?resetsw=1` limpa tudo; `v28` / `?v=42` |
| 3 | E2E render/export sem browser real | **OK (smoke)** | Testes de `normalizeAnalysisPayload`, helpers de export, 7 abas, SW/cache-bust em `tests/run.mjs` |
| 4 | Modularização incompleta | **OK** | `render.js` / `espn.js` / `live.js` (commit anterior) |
| 5 | Histórico antigo sem escanteios/`_corners` | **OK** | `normalizeAnalysisPayload` na carga, save e render — reconstrói corners, migra tickets, pad eventos |
| 6 | Harness `routing-question-mark` FAIL | **OK** | Assert explícito no harness; `routeUserIntent` / `looksLikeMatchQuery` em `js/lib/intent.js` |

## Harness automatizado

```bash
node tests/run.mjs
```

IDs cobertos (entre outros): `routing-question-mark`, `export-pdf-oneclick`, `cache-bust`, `analysis-7-tabs`, lineup, legacy escanteios.

## Nota sobre PDF

Browsers **não permitem** PDF silencioso nativo sem diálogo. O one-click usa geração client-side (`html2pdf` → download do arquivo). Requer rede na 1ª carga da lib (análises já exigem internet). Offline → fallback impressão.
