# HANDOFF MESTRE — Meridian v2 · Agente e produto (shell 72)

**Data:** 2026-07-18 (atualizado no shell 73)  
**Branch:** `main` · **Repo:** https://github.com/mzzei/Meridian-v2  
**SHELL_VERSION:** `73` (`js/version.js` = `sw.js` = `index.html ?v=` ×2)  
**HEAD de referência:** shell 73 (botão Analisar largo) · `d2fd1db` (72) · `89b0b1c` (71) · `a900abe` (70)

**Regra de manutenção (pedido do usuário, shell 73):** este handoff mestre é atualizado **a cada implementação** (não só no fim da sessão) — timeline + invariantes no mesmo push da mudança.

Este é o **handoff detalhado e canônico** para contextualizar qualquer agente (Claude, Grok, etc.) sobre **tudo o que é crucial no desenvolvimento do Meridian v2**, em especial o **agente de análise**. Não economizar páginas: se faltar detalhe operacional, o próximo dev regride.

**Supersede** os mestres 68 e 70 (mantidos como histórico; use **este** arquivo).

**Documentos satélites (ler se precisar de mais profundidade de sessão):**

| Arquivo | Conteúdo |
|---------|----------|
| `docs/HANDOFF-V2-SHELL-57-…` | Base multi-fonte, anti-fantasma, cobertura A/B/C, FactsMemory, AF minimal |
| `docs/HANDOFF-V2-SHELL-65-…` | Worker real, secrets, FD CORS, AF Free sem temporada 2026, senha avançada |
| `docs/HANDOFF-V2-SHELL-66-…` | Limpeza UI (auto-IA, dynsearch, etc.), label Worker v2 |
| `docs/HANDOFF-V2-SHELL-67-…` | Allowlist Origin Worker, health AF/FD, FPL element-summary |
| `docs/FONTES-GRATIS-E-MEMORIA.md` | Fontes free + memória (pode estar levemente defasado vs código) |
| `AGENTS.md` | Regras de sessão: ler handoff no início; handoff+commit+push no fim |
| `ISOLAMENTO.md` | v2 ≠ v1 (nunca misturar) |

---

# PARTE I — O produto

## 1. O que é o Meridian v2

- SPA de **futebol multi-liga** (Brasileirão, Libertadores, Premier League, LaLiga, Champions).
- **Não é** Meridian v1 / WorldCupAgent / Copa 2026 monólito.
- Porta local típica: **3457** (`node serve.js`).
- Sem bundler: **ESM entry** + scripts **classic** carregados em ordem.
- Usuário digita no input e envia → o app **roteia** para um de dois modos:
  1. **Análise padrão** (`runAnalysis`) — relatório estruturado de 7 abas  
  2. **Chat livre** (`runChat`) — conversa flexível em bolha  

Esse dual-mode é **parte central do produto**. Misturar os dois é bug de produto (já corrigido no v1 e proibido regredir no v2).

## 2. Competições (`js/comp/competitions.js`)

| id | Nome | espn | af | fd | tsdb | openfootball | scorebat (keys) | openliga |
|----|------|------|----|----|------|--------------|-----------------|----------|
| brsa | Brasileirão Série A | bra.1 | 71 | BSA | 4351 | br.1 | brazil:, brasileir… | null |
| libertadores | Libertadores | conmebol.libertadores | 13 | CLI | null | copa.l | libertadores… | null |
| epl | Premier League | eng.1 | 39 | PL | 4328 | en.1 | premier league… | null |
| laliga | LaLiga | esp.1 | 140 | PD | 4335 | es.1 | la liga… | null |
| ucl | Champions | uefa.champions | 2 | CL | 4480 | uefa.cl | champions… | null |

Helpers: `getComp`, `compLabel`, `compSeasonLabel`, `tsdbLeague`, `afLeague`, `fdCode`, etc. Expostos via `expose()` para classic.

---

# PARTE II — Análise padrão × chat livre (CRUCIAL)

## 3. Por que existem dois modos

| | **Análise padrão** | **Chat livre** |
|--|--------------------|----------------|
| **Função** | `runAnalysis()` | `runChat()` |
| **Produto** | Relatório “Meridian” completo | Conversa / recorte / opinião |
| **Saída UI** | **7 abas fixas** | Bolha de agente (card flexível) |
| **Pipeline de dados** | Coleta estruturada + Fase 1 + portões + Fase 2 + verify | Stream de chat + tools opcionais; **sem** as 7 abas |
| **Decisão** | **Código** (`routeUserIntent`), não o LLM | idem |
| **Arquivo roteador** | `js/lib/intent.js` | idem |
| **Dispatcher** | `toggleRun()` em `js/analysis/pipeline-run.js` | idem |

**Regra de ouro:** chat **nunca** deve ser “análise padrão disfarçada” (sem forçar schema de 7 abas). Análise padrão **nunca** deve colapsar abas ou omitir Escanteios.

## 4. Fluxo do botão enviar (`toggleRun`)

```
usuário clica enviar / toggleRun()
  │
  ├─ q = texto do #match-input
  ├─ route = routeUserIntent(q, { hasAttachments: !!attachments })
  │
  ├─ mode === 'need_teams'
  │     → toast: "Para análise completa, diga os times: ex. Flamengo x Palmeiras"
  │     → NÃO chama LLM
  │
  ├─ mode === 'analysis'
  │     → (se reason explicit_full) toast "Gerando análise padrão (7 abas)…"
  │     → runAnalysis()
  │
  └─ mode === 'chat' (default)
        → runChat()
```

Código: `js/analysis/pipeline-run.js` ≈ linhas do `toggleRun`.

## 5. Algoritmo de `routeUserIntent` (intent.js) — comportamento exato

Ordem de decisão:

### 5.1 Anexos → sempre chat

```js
if (opts.hasAttachments) return { mode: 'chat', reason: 'attachments' };
```

PDF, imagem, etc. **nunca** disparam o pipeline de 7 abas automaticamente.

### 5.2 Pedido explícito de relatório completo

Regex de `isExplicitFullAnalysisAsk`:

- `análise completa` / `analise completa`
- `análise padrão` / `analise padrao`
- `relatório completo` / `relatorio completo`
- `pipeline completo`

Então:

- Se o texto **também** tem padrão de confronto (`A x B` / vs / × / versus / contra) → `{ mode: 'analysis', reason: 'explicit_full' }`
- Se **não** tem times → `{ mode: 'need_teams', reason: 'explicit_full_no_match' }`  
  **Não inventar jogo.** Usuário deve digitar os times.

### 5.3 Confronto de times → análise padrão

`isStandardAnalysisIntent` = `looksLikeMatchQuery`:

1. Texto trim; se `length <= 8` → false.  
2. Se contém `\bPARTIDA\b` → true (caminho especial).  
3. Formação pura tipo `4-3-3` **sem** nomes de times → false (não é análise de partida).  
4. Precisa casar `_hasMatchVsPattern`:  
   `TimeA (até ~4 palavras) + (x|vs|×|versus|contra) + TimeB`  
5. Se casou o confronto:
   - Se já pede análise/relatório/escanteios/cartões/poisson/ticket/etc. → true  
   - Se contém `analis` → true  
   - Se **começa** com opinião/recorte (`qual`, `quais`, `o que`, `como foi`, `por que`, `opinião`, `me fala`, `só os gols`, `só o placar`…) → **false** (vai pro chat)  
   - Se contém opinião/como foi/só os gols **e** não contém `analis` → **false**  
   - Caso contrário → **true** (análise padrão)

### 5.4 Default → chat

```js
return { mode: 'chat', reason: 'default' };
```

## 6. Tabela de exemplos (testes espelham isso)

| Entrada | Modo | Motivo |
|---------|------|--------|
| `Flamengo x Palmeiras` | **analysis** | match_query |
| `Arsenal vs Chelsea amanhã` | **analysis** | match_query |
| `análise completa Flamengo x Botafogo` | **analysis** | explicit_full |
| `análise completa` (sem times) | **need_teams** | toast, sem LLM |
| `como foi o Flamengo?` | **chat** | opinião/recorte |
| `qual sua opinião sobre o jogo` | **chat** | vague path no chat + gate |
| `só os gols do clássico` | **chat** | recorte |
| `4-3-3 vs 4-4-2` | **chat** | formação, não clubes |
| Query + PDF anexado | **chat** | attachments |
| `PARTIDA ...` (flag) | tende **analysis** se PARTIDA | regra especial |

Testes: `tests/run.mjs` — casos `match → analysis`, `opinião → chat`, `formação → chat`, `análise completa + times`, `sem times`, `attachments → chat`.

## 7. O que cada modo executa (agente)

### 7.1 Análise padrão — `runAnalysis` (pipeline do “agente de relatório”)

```
runAnalysis
  ├─ validação de chave Anthropic (browser; Worker só repassa se configurado)
  ├─ effort = modelProfile()   // shell 70–72: searches vêm do MODELO; budget thinking = 0
  ├─ collectPhase1Context  (dados estruturados — ver Parte III)
  ├─ gatherFacts(..., maxSearches = effort.searches)  // Fase 1: SEMPRE Haiku + web_search
  ├─ updateCoverageAfterSearch (B/C sobem se a busca trouxe técnico/xG; só sobe, nunca rebaixa)
  ├─ fillDataGaps          (stats de jogador / ranking faltantes; Haiku)
  ├─ verifyLineupNames     (anti-alucinação de elenco; Haiku)
  ├─ Fase 2                (modelo escolhido; thinking OFF; streamOnce; JSON via prompt-contrato)
  ├─ verifyAnalysis        (crítico Haiku barato)
  └─ normalize + render 7 abas + save history
```

**Importante (shell 70–72):** trocar Haiku/Sonnet/Opus muda **buscas na coleta** + **capacidade da Fase 2**, não “thinking budget”. Thinking na Fase 2 está **desligado** (ver §7.3).

**7 abas obrigatórias** (AGENTS.md / render):

1. Resumo  
2. Tática  
3. Desempenho  
4. Cartões & Faltas  
5. **Escanteios** (nunca omitir)  
6. Escalação (mapa de campo)  
7. Dados Avançados  

Arquivos: `pipeline-run.js`, `pipeline-facts.js`, `prompts.js`, `render.js`, `normalize.js`, `phase1-context.js`.

### 7.2 Chat livre — `runChat` (agente conversacional)

```
runChat
  ├─ bolha do usuário
  ├─ GATE DE AMBIGUIDADE (cliente, ANTES do LLM):
  │     se isVagueMatchQuery(query)
  │     e sem âncora de jogo no histórico/contexto
  │     e sem anexos
  │     → openMatchPickerPopup / openContextPromptPopup
  │     → ZERO suposição de partida; ZERO monólogo de tool no chat
  │
  ├─ stream chat com tools (web_search, dados ESPN multi-liga, etc.)
  ├─ thinking estendido: SEMPRE OFF no chat (shell 70 — UX; sem monólogo na bolha)
  ├─ regras anti-ruído: não vazar thinking/web_search plans na bolha
  └─ card flexível / texto (NÃO as 7 abas)
```

Funções críticas de ambiguidade (pipeline-facts / espn):

- `hasExplicitMatchAnchor(q)` — há times/confronto explícito?  
- `isVagueMatchQuery(q)` — “opinião sobre o jogo de hoje” sem times?  

Se vago: **popup primeiro**, modelo depois.

## 7.3 Perfil de análise por modelo (shell 70–72) — CRUCIAL

**Removido (shell 70):** seletor de “Esforço”, `EFFORT_LEVELS`, `EFFORT_SEARCHES`, `currentEffort`, `setEffort` / `pickEffort`, popup `#effort-pop`.

**Adicionado:** `MODEL_PROFILES` + `modelProfile()` em `js/app.js`.

### Estado ATUAL (shell 72) — copiar isto, não o 70

| Modelo ID | Label UI | Thinking budget Fase 2 | Buscas Fase 1 | Default |
|-----------|----------|------------------------|---------------|---------|
| `claude-haiku-4-5-20251001` | Rápido | **0** | **1** | |
| `claude-sonnet-5` | Padrão | **0** | **2** | **sim** (`currentModel`) |
| `claude-opus-4-8` | Profundo | **0** | **3** | |

```js
// shell 72 — budget:0 em TODOS (shell 71). NÃO reativar budget>0 sem resolver JSON vs thinking.
var MODEL_PROFILES = {
  'claude-haiku-4-5-20251001': { label: 'Rápido', budget: 0, searches: 1 },
  'claude-sonnet-5':           { label: 'Padrão', budget: 0, searches: 2 },
  'claude-opus-4-8':           { label: 'Profundo', budget: 0, searches: 3 }
};
function modelProfile() {
  return MODEL_PROFILES[currentModel] || MODEL_PROFILES['claude-sonnet-5'];
}
// currentModel default = 'claude-sonnet-5'
// MODEL_CTX sonnet-5 / opus: 1000000; haiku: 200000
// MODEL_PRICE sonnet-5: i:3 o:15 crs:2.70 (mesma faixa do 4.6)
```

**Onde usa:**

- `runAnalysis`: `effort = modelProfile()` → `gatherFacts(..., effort.searches)`; Fase 2 **sem** thinking budget.
- UI: labels falam em “N buscas na coleta”, **não** “raciocínio ~5k” (claims removidos no 71).
- **Chat:** thinking estendido off; Sonnet 5 recebe `thinking: { type: 'disabled' }` explícito.
- Fase 1 / fillDataGaps / verify* = **Haiku**, independente do seletor.

### Shell 71 — por que budget voltou a 0 (REGRESSÃO do 70)

- Shell 70 ligou `budget: 5000` no Sonnet e `16000` no Opus.
- Fase 2 usa **JSON via prompt-contrato** (não structured outputs — schema das 7 abas excede limite de gramática da API).
- Com **thinking ligado**, o modelo respondia em **PROSA** → parse JSON falhava → **toda** análise padrão caía no **modo simplificado** (`conversationalFallback`).
- **Decisão:** `budget: 0` em todos os perfis. Diferenciação real = **searches 1/2/3** + capacidade Haiku/Sonnet/Opus na leitura tática.
- Teste: `assert` proíbe `budget > 0` dentro de `MODEL_PROFILES`.

**Não regredir:** reativar `budget > 0` na Fase 2 **sem** structured outputs / schema compatível com thinking; reintroduzir seletor de esforço; ligar thinking no chat “porque Opus”.

### Shell 72 — Sonnet 5 + adaptive thinking

- Default e perfil “Padrão”: **`claude-sonnet-5`** (não mais `claude-sonnet-4-6`).
- **Crítico:** Sonnet 5 liga **adaptive thinking** se o campo `thinking` for **OMITIDO** (no 4.6, omitir = off).
- Helper `_noThinkModel(id)` → true para Sonnet 5 (e futuros que se comportem assim).
- Bodies que usam `currentModel` e precisam de JSON/chat limpo enviam:
  `thinking: { type: 'disabled' }`
  em: **chat**, **Fase 2**, **retry Fase 2**, **conversationalFallback**.
- Haiku / modelos antigos: **omitir** o campo (enviar `disabled` pode 400 em modelos que não aceitam).
- Co-authored na época: Claude Fable 5 / Opus em commits de pipeline.

## 7.4 Stream thinking + signature (shell 69) — ainda válido se thinking voltar

**Bug original:** ao retomar após `tool_use`, a API exige **`signature`** em blocos `thinking`. Sem capturar `signature_delta` → 400 → modo simplificado.

**Fix em `streamOnce`:** `curSig`, `signature_delta`, reenvio `{ type:'thinking', thinking, signature }`, `redacted_thinking` íntegro.

Mesmo com thinking **desligado** na Fase 2 (71+), o código de signature **permanece** — necessário se thinking for reativado com cuidado, ou se algum path ainda emitir thinking.

Relacionado (shell 68 Worker): `/v1` **remove Origin/Referer** no repasse à Anthropic.

## 8. Grounding e regras de verdade (ambos os modos; mais rígidas na análise)

Definidas em `pipeline-facts.js` (`GROUNDING_RULE`, `SOURCE_RULE`) e prompts:

- Fatos voláteis (placar, técnico, escalação, lesões, tabela atual) **só** de dados/busca **desta** mensagem — **nunca** memória de treino do modelo.  
- **Placar é sacro** — zero alucinação; bloco PLACARES VERIFICADOS se existir.  
- Se memória de treino diverge dos dados → **dados vencem**.  
- Odds como insumo genérico; **não** citar casa de apostas no fundamento.  
- Fontes P1/P2 (BBC, Guardian, Sofascore, FBref…) = **orientação de prompt**, **não** `allowed_domains` (allowlist de domínio **já quebrou** o pipeline 2×).  
- Anti-fantasma de fontes: só blocos **ativos** no `DADOS DA API` / REPERTOIRE; fontes silent **não** viram “lacuna” no prompt.

## 9. O que NÃO regredir (dual-mode)

1. Não deixar o LLM escolher entre análise e chat.  
2. Não renderizar 7 abas no `runChat`.  
3. Não omitir aba Escanteios no `runAnalysis`.  
4. Não supor “o jogo de hoje” no chat sem popup/âncora.  
5. Não rotear anexos para análise padrão.  
6. Alterar intent.js → atualizar testes em `tests/run.mjs`.  
7. Não reintroduzir seletor de esforço desacoplado do modelo (shell 70).  
8. Não ligar thinking estendido no chat “para igualar Opus”.  
9. Não stripar `signature` dos blocos thinking no stream (shell 69).  
10. Não reativar `budget > 0` na Fase 2 sem resolver conflito JSON vs prosa (shell 71).  
11. Em Sonnet 5+, se thinking deve ficar off: enviar `thinking: {type:'disabled'}` — **não omitir** (shell 72).

---

# PARTE III — Coleta estruturada e fontes (cérebro de dados da análise padrão)

## 10. Camadas A / B / C (modelo mental de confiança)

| Camada | Significado | Como sobe |
|--------|-------------|-----------|
| **A** Campeonato | tabela, placares, próximos | ESPN (sempre free), FD via Worker, TSDB/OF no registry |
| **B** Time | técnico, escalação | AF (técnico free via /teams+/coachs); escalação 2026 **só web_search** no Free AF |
| **C** Analítico | xG, métricas jogador | web_search; EPL também FPL via Worker |

- Badge visual A/B/C no dock foi **removido no shell 68** (`#data-coverage` saiu do HTML). As chamadas `renderCoverageBadge(...)` que restam em pipeline-facts/source-telemetry são **no-op inofensivo** (o elemento não existe) — não "consertar" reintroduzindo o badge sem pedido do usuário.  
- **Telemetria interna mantida:** `_phase1Coverage`, sessionStorage, status pós-busca, REPERTOIRE/COBERTURA no **prompt** do agente (confirmado no phase1-context atual).  
- Hint `#cov-help` nos settings explica A/B/C **sem** depender do badge.

## 11. Cascata e registry (phase1-context.js)

**Camada A (campeonato):**

```
FD (se fdReady: chave local OU Worker+secret) 
  → ESPN (grátis, multi-liga)
  → AF full standings+fixtures SÓ se A ainda vazia
```

**Importante AF Free (achado shell 64):**  
plano Free **não acessa temporada atual (2026)** em fixtures/standings/lineups.  
Resgate B: `_afTeamIdByName` + `_afCoachOnlyFallback` (`/teams?search` + `/coachs` — sem trava de temporada).  
**Escalação confirmada no Free = impossível** (precisa fixture id atual) → web_search.

**Camada B (quando A não foi AF full):**  
`afEnrichCoachLineupMinimal` — fixtures em cache se possível + coaches 24h + lineup só se jogo &lt;36h (raramente no Free 2026).

**Registry free paralelo** (`getFreeSourcesBundle(compId, teams, query)`):

1. TheSportsDB (multi-liga; free truncado; season/table ajudam)  
2. OpenFootball (GitHub JSON estático)  
3. Scorebat (EU; BR costuma silent)  
4. OpenLiga (só se `openliga` mapeado — hoje null)  
5. FPL (só **epl** + Worker) — bootstrap + opcional element-summary dos top do jogo  
6. StatsBomb Open — **só histórico** se query cita ano existente no open-data  

**Anti-fantasma:**

- `active[]` = chars &gt; 0 → entra no prompt + REPERTOIRE  
- `silent[]` = tentou e vazio → **só telemetria**, nunca lacuna  
- Memória (`facts-memory.js`): skip de tópicos de time só se **ambos** os times do confronto têm dim fresca; sem times parseados → não skipa  

**FactsMemory:**

- Store `meridian_facts_mem_v1`  
- Ingest estruturado **sem** re-ingerir bloco de memória (evita circular)  
- Ingest rawFacts por nome de time após Fase 1  

## 12. Worker Cloudflare (infra real)

| Item | Valor |
|------|--------|
| Nome | `meridian-v2-proxy` (**nunca** `meridian-proxy` = v1) |
| URL | `https://meridian-v2-proxy.gcerqueira2012.workers.dev` |
| Rotas | `/v1/*` Anthropic · `/af/*` · `/fd/*` · `/fpl/*` · `/health` |
| Secrets típicos | `AF_KEY`, `FD_KEY` — **sem** `ANTHROPIC_KEY` (decisão: chave por usuário no browser) |
| Anthropic | app manda `x-api-key`; Worker repassa; se secret existisse, prevaleceria |
| Origin allowlist (67) | default Pages + localhost/127.0.0.1:3457 e :8787; evil origin → 403; sem Origin (curl/health) passa; `Origin: null` (file://) bloqueado salvo `ALLOW_NULL_ORIGIN=1` |
| Fix shell ~68 | `/v1` **remove Origin/Referer** no repasse — Anthropic quebrava Fase 2 exigindo dangerous-direct quando Origin ia junto |

**FD:** GET real **sem CORS** no browser → proxy obrigatório.  
**AF:** CORS bloqueado no browser → proxy obrigatório.  
**FPL:** sem CORS → proxy.

Deploy: `cd worker && npx.cmd wrangler deploy` (PowerShell: `npx.cmd`, não `npx.ps1`).

## 13. Saúde de fontes (source-health.js)

- Probe UI-only; **NUNCA no prompt**.  
- Auto 4s + 30min: free sources.  
- Botão “Testar fontes agora” (`probeSourcesHealthFull`): free + AF `/status` + FD `/competitions`.  
- Auto **não** sobrescreve status rico de `loadAfData`/`loadFdData`.

## 14. Quadro honesto de capacidades (atual)

| Capacidade | Realidade |
|------------|-----------|
| Tabela/jogos temporada atual | **ESPN** + **FD** (Worker) |
| AF standings/fixtures 2026 | **Bloqueado no Free** |
| Técnico determinístico | **AF free** via search teams+coachs |
| Escalação confirmada | **web_search** (Free AF) |
| Métricas EPL | **FPL** (Worker) + busca |
| xG outras ligas | **web_search** |
| Histórico evento | StatsBomb Open se ano na query |
| Sem Anthropic | Sem análise/chat LLM completo |

---

# PARTE IV — Arquitetura de código

## 15. Boot (`js/main.js`)

1. ESM: competitions, state, intent, tab-helpers, lineup, normalize, history, export, pipeline-facts, pipeline-run  
2. CLASSIC sequencial (`async=false`, `?v=SHELL`):  

```
prompts.js → render.js →
cached-fetch.js → source-telemetry.js → espn.js → football-apis.js →
free-sources.js → facts-memory.js → phase1-context.js → source-health.js →
schedule.js → live.js → featured.js → library.js → app.js
```

3. `installHtmlBridge()`

- Classic: APIs de dados + UI monólito parcial (UTF-8; evitar globalThis soup).  
- ESM: pipeline, intent, competitions, state.  
- `_h('fn')` / `host()`: classic resolvido em **call-time**.

## 16. Versionamento

- `js/version.js` `SHELL_VERSION`  
- `sw.js` mesmo número  
- `index.html` `?v=` em css e main.js  
- Bump em qualquer asset servido  

## 17. Testes

```bash
node tests/run.mjs   # ALL PASSED esperado
```

Inclui intent, normalize, ownership, FactsMemory VM, coverage, worker allowlist strings, AF free plan, FPL format, etc.

## 18. Isolamento v1

- Repo/pasta/Worker/porta do v2 **nunca** sobrescrevem v1.  
- Worker name **somente** `meridian-v2-proxy`.  

---

# PARTE V — Linha do tempo do que foi crucial (shells)

| Shell | O que importou |
|-------|----------------|
| …52 | ESM pipeline, competitions, state, html-bridge, classic UI UTF-8 |
| **53** | Multi-fonte free + FactsMemory (primeira versão) |
| **54** | Fix ultra: skip por **times do jogo**, sem circular, Scorebat estrito, phase1 unificado, cached-fetch |
| **55** | ESPN standings no agente (`children[]`); TSDB season/table |
| **56** | Anti-fantasma REPERTOIRE; silent só telemetria |
| **57** | Cobertura A/B/C + AF coach minimal; cascata FD→ESPN→AF last |
| **58** | Cobertura **pós-busca** (B/C sobem com rawFacts) |
| **59** | FPL + StatsBomb Open + source-health |
| **60** | FD via Worker (CORS impossível no browser) |
| **61** | AF `/status` (quota sem gastar cota dia) |
| **62** | Deploy Worker; Anthropic key do cliente com Worker |
| **63** | Secrets no Worker; campos de chave vazios no browser |
| **64** | AF Free sem temporada 2026; fallback técnico |
| **65** | Senha configs avançadas; Worker URL trancada |
| **66** | Remove auto-IA, dynsearch, uso API settings, hints PWA; Fase 1 fixa Haiku |
| **67** | Origin allowlist Worker; health AF/FD no botão; FPL element-summary |
| **68** | Remove badge Dados A/B/C do dock; fix Worker strip Origin/Referer no `/v1` |
| **69** | `streamOnce` preserva `signature` / `redacted_thinking` |
| **70** | `MODEL_PROFILES`; seletor de esforço removido; chat thinking off; (tentou budget>0 — revertido no 71) |
| **71** | `budget:0` em todos os perfis — thinking na Fase 2 quebrava JSON das 7 abas |
| **72** | Default **Sonnet 5** (`claude-sonnet-5`); `_noThinkModel` + `thinking: disabled` explícito |
| **73** | UI dock: botão Analisar/Enviar largo — `.i-tok-mini` `flex:0 1 auto` (encolhe ao conteúdo) e `.i-analyze` `flex:1 1 14rem`; botão preenche a linha e alinha a borda direita com o `#match-input` (validado: btnRight === inputRight) |
| **74** | Card SEMPRE entrega: (a) `runAnalysis` infere a competição da PRÓPRIA query (`inferCompIdsFromText` ganhou camada de CLUBES — "Flamengo x Palmeiras" → brsa mesmo com a UI em outra liga; antes colava tabela da liga errada e a Fase 2 travava pedindo esclarecimento → modo simplificado); (b) regra "ENTREGA OBRIGATÓRIA" nos DOIS prompts F2: ambiguidade vira PRÉVIA com suposições em lacunas/incerteza dentro do JSON — pergunta em prosa é proibida no modo análise |
| **75** | **GATE DE CONTEXTO DA ANÁLISE** (pedido do usuário: pergunta de contexto é POPUP, nunca texto corrido) — estende o princípio popup-first do chat (§7.2/inv.18) à análise padrão: `findScheduledMatchForAnalysis(teams, compId)` (schedule.js) procura o confronto na agenda-união + scoreboard ESPN; **achou** → injeta `[Jogo identificado na agenda: …]` na query e segue direto; **não achou** → `openContextPromptPopup` (prévia × pós-jogo × Outro) ANTES de qualquer chamada LLM (0 tokens gastos), e a escolha reenvia para `runAnalysis` via `_ctxResumeMode='analysis'` com `[Contexto confirmado: …]` (que pula o gate). Bolha não duplica no reenvio (`_skipNextUserBubble` agora vale na análise). Prefixo "análise completa/padrão" é limpo antes do parse de times (a guarda anti-lixo do parse descartava o par). Validado e2e no preview: popup abre com 0 calls; escolha → F1 recebe o contexto confirmado; par real da agenda (Botafogo x Santos) passa direto |

---

# PARTE VI — Invariantes consolidados (1–20+)

1. v2 ≠ v1 (código, Worker, porta, handoffs).  
2. Nunca `meridian-proxy` no deploy do v2.  
3. Sem `ANTHROPIC_KEY` secret no Worker (política atual).  
4. Saúde de fontes nunca no prompt.  
5. REPERTOIRE só ativos; silent ≠ lacuna.  
6. FactsMemory skip time só com **ambos** times.  
7. Sem `allowed_domains` no web_search.  
8. `SHELL_VERSION` sincronizado em 4 pontos.  
9. PowerShell: `npx.cmd`.  
10. Classic schedule/featured/library sem globalThis soup.  
11. AF Free “no access to this season” ≠ secret inválida.  
12. StatsBomb Open só com ano histórico na query.  
13. Senha avançada só hash no repo.  
14. Análise = 7 abas; chat = bolha.  
15. Roteamento por `intent.js`, não pelo modelo.  
16. Anexos → chat.  
17. Análise completa sem times → need_teams.  
18. Chat vago sem times → popup.  
19. Origin allowlist no Worker (browser).  
20. Fim de sessão: handoff + commit + push (`AGENTS.md`).  
21. Worker `/v1` não repassa Origin/Referer para Anthropic.  
22. Thinking no stream: **sempre** reenviar `signature` com o bloco thinking (se thinking existir).  
23. Profundidade da análise padrão = `modelProfile().searches` + capacidade do modelo; **budget thinking = 0**.  
24. Fase 1 / portões / verify continuam em Haiku (barato), independente do modelo da Fase 2.  
25. Default modelo: `claude-sonnet-5`.  
26. Sonnet 5: se thinking off, enviar `{type:'disabled'}` — omitir liga adaptive thinking.  
27. `runAnalysis` infere a competição da query (clube OU keyword) antes da coleta — não confiar só na liga ativa da UI (shell 74).  
28. Fase 2 nunca pergunta em prosa: ambiguidade = prévia com suposições declaradas no JSON ("ENTREGA OBRIGATÓRIA" nos prompts) — mas o caminho PREFERENCIAL é o gate resolver antes (inv. 29).  
29. Análise sem âncora em jogo real (agenda/scoreboard) → **popup de contexto ANTES do pipeline** (0 chamadas LLM até o usuário escolher); `[Contexto confirmado:]` e `PARTIDA:` pulam o gate; reenvio pós-popup volta para `runAnalysis` (`_ctxResumeMode`), nunca para o chat (shell 75).  

---

# PARTE VII — Arquivos-chave (mapa rápido)

| Arquivo | Papel no agente |
|---------|-----------------|
| `js/lib/intent.js` | **Roteamento** análise vs chat |
| `js/analysis/pipeline-run.js` | toggleRun, runAnalysis, runChat, stream |
| `js/analysis/pipeline-facts.js` | gatherFacts, grounding, vague/anchor, portões |
| `js/analysis/prompts.js` | system prompts F2 |
| `js/analysis/render.js` | 7 abas |
| `js/analysis/normalize.js` | schema |
| `js/data/phase1-context.js` | coleta A/B + free + memória |
| `js/data/espn.js` | ESPN + TSDB |
| `js/data/football-apis.js` | FD/AF, ready, coach fallback |
| `js/data/free-sources.js` | registry free + FPL + SB Open |
| `js/data/facts-memory.js` | cache fatos / skip tópicos |
| `js/data/source-telemetry.js` | repertoire, coverage interna |
| `js/data/source-health.js` | probe UI |
| `js/app.js` | UI, keys, **MODEL_PROFILES** / `modelProfile()`, default Sonnet 5 |
| `js/analysis/pipeline-run.js` | runAnalysis/runChat, `_noThinkModel`, streamOnce signature |
| `worker/worker.js` | proxy CORS + origin gate; strip Origin/Referer no `/v1` |

---

# PARTE VIII — Como continuar

## Checklist ao retomar

- [ ] `git pull` · `SHELL_VERSION` **atual** (ver topo deste doc) em version/sw/index  
- [ ] Ler **este** handoff mestre (+ 65/67 se for mexer em Worker)  
- [ ] `node tests/run.mjs`  
- [ ] Worker health: `service: meridian-v2-proxy`, `origin_gate: true`  
- [ ] Análise: `Flamengo x Palmeiras` → 7 abas (JSON, não prosa)  
- [ ] Chat: `como foi o jogo de hoje?` → popup, não inventa times  
- [ ] Anexos → chat  
- [ ] Sem seletor de “Esforço”; modelos Haiku / **Sonnet 5** / Opus  
- [ ] `MODEL_PROFILES.*.budget === 0`  
- [ ] Sonnet 5: bodies com `thinking: {type:'disabled'}` onde aplicável  

## Prompt pronto

```text
Abra C:\Users\Gabriel\Projetos\Meridian-v2 (main; shell = SHELL_VERSION no topo deste doc).

Leia OBRIGATORIAMENTE:
docs/HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md

Se for mexer em Worker/secrets, leia também HANDOFF 65 e 67.

Regras:
- Dual-mode: intent.js decide analysis vs chat; não misturar 7 abas com bolha.
- MODEL_PROFILES: budget 0; searches 1/2/3; default claude-sonnet-5.
- Não ligar thinking na Fase 2 sem resolver JSON das 7 abas.
- Sonnet 5: thinking disabled explícito (omitir = adaptive on).
- v1 e meridian-proxy intocáveis.
- Fim de sessão: handoff + commit + push.
- node tests/run.mjs antes de push.

Quero: [OBJETIVO]
```

## Próximos passos ainda abertos (produto)

1. UI troca de senha avançada.  
2. Confirmar Pages com `?v=72` após deploy.  
3. Regenerar secrets AF/FD se zelo.  
4. Rate-limit Worker (além de Origin).  
5. (Opcional) reintroduzir badge A/B/C se o usuário pedir.  
6. (Opcional) thinking na Fase 2 **só** se houver structured outputs / schema compatível.

---

**Fim do handoff mestre (shell 72).**  
Qualquer sessão futura que “não saiba” análise vs chat, Sonnet 5, budget 0, signature, grounding, Free AF, Worker ou anti-fantasma **não leu este arquivo**.
