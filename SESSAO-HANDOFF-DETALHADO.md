# Handoff detalhado — sessão Meridian v2

**Projeto:** Meridian multi-campeonato (Meridian v2)  
**Pasta local:** `C:\Users\Gabriel\Projetos\Meridian-v2`  
**NÃO é** o Meridian v1 (v1 / Copa / WorldCupAgent, porta 3456)  
**Porta local:** **3457**  
**Fonte da verdade:** **arquivos nesta pasta** (+ backup `D:\Meridian-v2-*`). O Meridian v2 **ainda não está no git**.  
**Data de referência:** 2026-07-15 (atualizado na continuação Grok)  
**Leia também:** `ISOLAMENTO.md`, `HANDOFF-v2.md`, `AGENTS.md`

---

## 1. Como usar este arquivo

1. Trabalhe **só** na pasta do Meridian v2 (nunca por cima da v1).
2. Subir o app:
   - `Iniciar Meridian v2.bat`, **ou**
   - `Abrir-Meridian-v2.vbs` (atalho **Meridian v2**), **ou**
   - `node serve.js` (default **3457**)
3. URL: http://localhost:3457/
4. Para IA: *“Lê SESSAO-HANDOFF-DETALHADO.md + HANDOFF-v2.md + ISOLAMENTO.md. Continua no Meridian v2 3457. Não mexa na v1. Verdade = disco local.”*

### Porta (CMD vs PowerShell)
- **PowerShell:** `$env:PORT='3457'; node serve.js`
- **CMD:** `set PORT=3457` depois `node serve.js`
- No Meridian v2 o default de `serve.js` já é **3457**.

---

## 2. Identidade (crítico)

| | Meridian v1 (v1) | O Meridian v2 |
|--|------------------------|------------|
| Pasta | `...\.claude\sessions\WorldCupAgent` | `...\Projetos\Meridian-v2` |
| Porta | 3456 | **3457** |
| UI | monólito `index.html` | `index.html` + `css/app.css` + `js/app.js` |
| Atalho | **Meridian** | **Meridian v2** |
| Git | repo oficial / monólito | **ainda sem git próprio**; `.git-heranca-v1-IGNORAR` = lixo da cópia |

**Proibido:** merge em `main` da v1 · restaurar Meridian v2 a partir do monólito GitHub · misturar pastas.

Estrutura atual:

```text
Meridian-v2/
  index.html
  css/app.css
  js/app.js              # COMPETITIONS + CompContext + pipeline
  serve.js               # PORT default 3457
  sw.js                  # cache meridian-v2-v6
  assets/                # logo-aurora, ícones PWA, wc-trophy
  ISOLAMENTO.md
  HANDOFF-v2.md
  SESSAO-HANDOFF-DETALHADO.md
  AGENTS.md
  Abrir-Meridian-v2.vbs
  Iniciar-Servidor-v2.bat
  Iniciar Meridian v2.bat
  Copiar-Para-Drive.ps1
  LEIA-ME-DRIVE.md
```

Backup canônico se C: corromper: **`D:\Meridian-v2`** (+ zip).

---

## 3. Arquitetura multi-campeonato

### Competições (`COMPETITIONS` + `COMP_ORDER`)
- `brsa` — Brasileirão Série A  
- `libertadores`  
- `epl` — Premier League  
- `laliga`  
- `ucl` — Champions League  

### CompContext — três contextos (não misturar)

| Contexto | Variável | API | Função |
|----------|----------|-----|--------|
| **analysis** | `_activeCompId` | `setAnalysisComp` | Prompts, AF/FD, `fillMatch` |
| **stats** | `_statsCompId` | `setStatsComp` | Featured / classificação / clubes / próximos |
| **library** | `_libCompId` | `setLibComp` / `openLibComp` | Grade vs lista de jogos |

Regras (implementadas em `js/app.js`):
- `fillMatch` → só **analysis** (comentado no código).
- `openLibComp` → `setLibComp` + `setAnalysisComp`, **sem** `setStatsComp`.
- Featured da sidebar direita usa **`_statsCompId`**.

### Agenda / featured
- `_schedByComp` + `_schedule` (união)
- `nearestMatches` + `_kickMs` — chips top 5 multi-liga por kickoff BRT
- Standings/results **por `compId`** (`_loadCompStandings`, `_loadCompResults`) — não misturar com ctx de análise
- `scheduleFeaturedPaint` / `_paintFeaturedHosts` + portal `#rs-stats-comp-pop-portal`

---

## 4. UI / temas

| Tema | ID | Notas |
|------|-----|--------|
| **Aurora** | `aurora` | Padrão; âmbar → ciano/menta |
| **Verde** | `verde` | Clássico Meridian |
| **B&W** | `mono` | Chat `.main` preto = rail; Analisar = cinza metálico do avatar |

- `localStorage` `meridian_ui_theme` · `html[data-theme]`
- Aplicação no `<head>` (anti-flash)
- Controles no estilo Analisar: seletor de liga, dropdown portal, classificação, ntick, cards biblioteca (menos neon)
- Logo Aurora: `assets/logo-aurora.png` · Verde: `wc-trophy.png` · B&W: grayscale no logo
- Chat: sem subtítulo “Converse com…” (`m-sub` display none na view chat)

---

## 5. Continuação desta sessão (Grok) — o que foi feito

Além do estado do handoff original:

1. Isolamento reforçado: `ISOLAMENTO.md`, launchers só com **v2**, sem `Iniciar WorldCup Agent.bat`.
2. `.git` herdado → `.git-heranca-v1-IGNORAR` (Meridian v2 **não** publicado no git).
3. Multi-liga nos textos/coleta que ainda diziam só “Série A”:
   - fallback de agenda Haiku
   - tópicos de `web_search` da Fase 1 (`compLabel(_activeCompId)`)
   - export/relatório, subtítulo da análise, stats por jogador, saved list, anexos
4. Ícones PWA a partir de `width_800.png` (quando aplicados nesta pasta).
5. Atalhos desktop separados: **Meridian** (v1) vs **Meridian v2**.

### Ainda herdado / backlog honesto
- Vários trechos de prompt/comentário ainda falam “Brasileirão” em funções legadas (AF coach keys, sanity-check Série A 38 rodadas, etc.) — priorizar refator por `compId` quando tocar naquela área.
- Docs `docs/`, `supabase/`, `worker/` ainda com texto da era Copa (design).
- **Não** mergear com v1.

---

## 6. Checklist de verificação

- [x] http://localhost:3457 abre multi-campeonato (`js/app.js` + `css/app.css`)
- [x] CompContext: analysis / stats / library separados no código
- [x] Temas Aurora / Verde / B&W em Configurações → Cor
- [x] Launchers e docs de identidade do Meridian v2
- [x] Verdade = disco local (não git)
- [x] Smoke UI 2026-07-16 (Downloads): servidor 3457, ESPN 5 ligas, 5 chips, featured Série A, temas CSS, roteamento `Time x Time?` → padrão  
- [x] Estrutura análise padrão alinhada ao PDF Copa 2026 + v1: **7 abas** (incl. **Escanteios**), mapa de escalação por formação, cache `?v=34` / SW `v19`

---

## 7. Prompt sugerido

```text
Estou no Meridian v2 Meridian-v2 (NÃO no Meridian v1).
Porta 3457. Lê SESSAO-HANDOFF-DETALHADO.md e HANDOFF-v2.md por completo.
Respeita CompContext (analysis / stats / library), os três temas de cor, e não merges em main do Meridian oficial.
Continua a partir do estado descrito no handoff. Mude ou atualize o que for necessário.
Verdade = arquivos locais (Meridian v2 ainda sem git próprio).
```

---

*Priorizar `js/app.js` + `css/app.css` + `ISOLAMENTO.md` sobre memórias do monólito v1.*
