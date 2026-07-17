# Meridian v2 — memória de produto (local)

> Documento do **Meridian v2 multi-campeonato** (pasta local, porta **3457**).  
> **Não** é o Meridian v1 / Copa / monólito. Ver `../ISOLAMENTO.md`.  
> Fonte da verdade: arquivos desta pasta (+ backup `D:\Meridian-v2-*`). Meridian v2 **ainda sem git próprio**.

---

## 1. Produto

| Campo | Valor |
|--------|--------|
| Nome | **Meridian v2** (multi-campeonato) |
| Path típico | `C:\Users\Gabriel\Projetos\Meridian-v2` |
| Forma | SPA: `index.html` + `css/app.css` + `js/app.js` + PWA |
| Porta | **3457** (v1 usa 3456 em outra pasta) |
| Modelo de negócio | **BYOK** (chave Anthropic do usuário) |
| Conta | Supabase desenhado (schema pronto); cliente ainda opt-in/pendente |

### Propósito

Análises precisas de partidas das ligas embutidas (Série A, Libertadores, EPL, LaLiga, UCL) para tickets de aposta: grounding em fatos + Poisson/xG, sem inventar escalação/técnico.

### Campeonatos

`brsa` · `libertadores` · `epl` · `laliga` · `ucl` — ver `COMPETITIONS` em `js/app.js`.

### CompContext (não misturar)

| Contexto | Variável | Uso |
|----------|----------|-----|
| analysis | `_activeCompId` | prompts, fillMatch, AF/FD |
| stats | `_statsCompId` | featured / classificação |
| library | `_libCompId` | biblioteca de jogos |

---

## 2. Pipeline (browser)

```
Usuário → gatherFacts (Haiku/Sonnet + web_search + APIs)
        → portões (completude + nomes)
        → runAnalysis (Sonnet/Opus + Poisson cliente)
        → verifyAnalysis (Haiku audita, não reescreve)
        → renderResults
```

Chat livre: `runChat` + ESPN multi-liga + double-check de contexto (perguntar se ambíguo).

### Fontes (prioridade)

1. **P1:** BBC Sport, Guardian, Sky Sports, The Athletic, ESPN FC, Reuters; Sofascore/FotMob/FBref/Opta; oficiais  
2. **P2:** Transfermarkt, GE/Lance (BR), Marca/AS/L’Équipe, etc. — usar se necessário; não descartar por não ser P1  
3. Nunca bookmakers como fonte de fato no “fundamento”

### Faixas de sanity (`COMP_SANITY`)

- Ligas (brsa/epl/laliga): **20 clubes, 38 jogos** de liga por clube  
- Copas (libertadores/ucl): **~6–17 jogos** no torneio; não aplicar “38 rodadas”

---

## 3. UI

- Temas: `aurora` | `verde` | `mono` (`meridian_ui_theme`)  
- Logo Aurora: `assets/logo-aurora.png`  
- Launchers: `*v2*` apenas  

---

## 4. Infra opcional

- **Worker** Cloudflare: proxy CORS AF + Anthropic (`worker/`)  
- **Supabase**: `profiles` + `predictions` + RLS (`supabase/`) — fiação cliente pendente  
- **Backtester**: design em `backtester-design.md`  

---

## 5. Decisões fechadas

| Tema | Decisão |
|------|---------|
| Meridian v2 vs v1 | Pastas, portas e atalhos **separados**; nunca mergear |
| Verdade do Meridian v2 | Disco local; não GitHub monólito |
| Verificador | Haiku audita, fusão determinística |
| Structured outputs | Fase 1 sim; Fase 2 não (grammar) |
| Histórico | localStorage por origem |

---

## 6. Manter memória

- Atualizar este arquivo / `SESSAO-HANDOFF-DETALHADO.md` após decisões grandes  
- Backup: `Copiar-Para-Drive.ps1` / `D:\Meridian-v2-*`  
