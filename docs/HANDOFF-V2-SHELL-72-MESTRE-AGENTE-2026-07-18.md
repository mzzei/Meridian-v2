# HANDOFF MESTRE — Meridian v2 · Agente e produto (shell 133)

**Data:** 2026-08-05 (canônico atual)  
**Branch:** `main` · **Repo:** https://github.com/mzzei/Meridian-v2  
**SHELL_VERSION:** `133` (`js/version.js` = `sw.js` = `index.html ?v=` ×2 — conferido no código E no Pages)  
**HEAD de referência (código):** `1c1f2d6` (shell 133 — motor versionado `MOTOR_VERSION='1.0.0'` + CHANGELOG do integrador) · `a2199ed` (132 — validação real do selo de âncora, descritor 12/12) · `13a0274` (132 — obviedade mediada) · `470dc41` (131) · `7a1029a` (130 — descritor estruturado de mercado) · `b1c0023`/`dacfb49` (129 — SSE do chat, validado com API real) · `56c28ac` (128) · `fc9e64b` (127) · `5692ef6` (126 — /code-review ultra). Trilha anterior (85–113) na linha do tempo da seção **Estado atual**.  
**Docs mestre:** tip de `main` · **PARTE IX FEITA (85)** · **PARTE X FEITA (87)** · **chat conversa em texto (88)**

**Nome do arquivo:** `docs/HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md` (nome histórico); **conteúdo canônico até shell 133**.

**Revisão de fidelidade (2026-08-05 · shell 133):** doc auditado claim-a-claim contra o código do shell 133. **Conferem** (verificado, não presumido): `SHELL_VERSION=133` nos 4 pontos; Pages servindo `?v=133` com `version.js` em 133; Worker `/health` → `meridian-v2-proxy` + `origin_gate:true` + `rate_limit:true`; `tests/run.mjs` **ALL PASSED** e `tests/motor.mjs` **MOTOR ALL PASSED**; ESM do boot (10 imports) idêntico ao §15; `MOTOR_VERSION='1.0.0'` em `motor/engine.mjs`; 36 invariantes. **Corrigidos nesta revisão** — todos eram drift de cabeçalho/mapa, nenhum de conteúdo técnico: (1) **o cabeçalho anunciava `SHELL_VERSION: 92` e HEAD do shell 91** — 42 shells atrás, contradizendo o próprio invariante 8 e o checklist logo abaixo (uma sessão nova que confiasse no topo bumparia de 92); (2) §15 dizia **16 classic** e omitia `js/demo.js`, enquanto o checklist já dizia 17 — o array real tem **17** (`CLASSIC.length` é o que o boot loga); (3) §17 e o fluxo do prompt-pronto mandavam rodar só `tests/run.mjs`, sem `tests/motor.mjs` (o motor é produto vendido — quebra nele não aparecia no fluxo obrigatório); (4) PARTE VI ainda se chamava "(1–20+)" com 36 invariantes; (5) PARTE VII (mapa de arquivos) **não tinha uma linha sequer do subsistema `motor/`** nem de `tools/package-motor.mjs`, apesar de 8 shells de trabalho nele — o mapa mandava a sessão nova acreditar que o repo é só o SPA; (6) checklist apontava `HEAD ≥ 2672b26` (shell 113); (7) item 16 dos próximos passos ainda pedia "reconferir" o Pages em `?v=91`.

**Revisão de fidelidade (2026-07-22, histórica):** doc auditado claim-a-claim contra o código do shell 91. Conferem: MODEL_PROFILES (budget 0, searches 1/2/3, default `claude-sonnet-5`), `_noThinkModel`/`_prefillOk` (**revisto no shell 95**: prefill só em Haiku), `var MODEL_PRICE`, resgate Opus, 35 invariantes, PARTE X (`lineup-confirmed.js` com `isMatchDayWindow`/`applyConfirmedLineups`/`refreshAnalysisLineups`), `buildEscalacaoTab`, testes ALL PASSED. Corrigidos nesta revisão: CLASSIC sem `lineup-confirmed.js` (16 arquivos), mapa de arquivos incompleto (lineup.js, tab-helpers.js, lineup-confirmed.js, report.js, schedule.js) e com linha duplicada, checklist preso no shell 87, e — mais grave — **o prompt "USAR ESTE AGORA" ainda mandava implementar a PARTE X já feita** (uma sessão nova refaria o shell 87 inteiro).

**Série dos "assassinos silenciosos" da decomposição do monólito (bugs onde um símbolo perdido derrubava um caminho inteiro):** MODEL_PRICE `const` classic (79), prefill Sonnet 5 (79), `ctSideSection`/`ctVanTag` (82), `_lvKey` em lineup.js (85), **`chatCardFrom`/`renderChatCard`/`cardToPlain` no chat (88)**. Mitigação estrutural no 88: teste de fumaça varre TODA `_h('x')` do pipeline-run e falha se a função não existir em nenhum classic/ESM — **corrigido no 89**, porque a 1ª versão do teste era um no-op (self-match: o próprio call site `_h('fn')` satisfazia o regex de "definido"). **Lição (invariante 35):** teste anti-regressão precisa de **meta-assert** provando que ele reprova o caso que deveria pegar — senão vira falsa segurança pior que não ter teste.

**Regra de manutenção:** atualizar este mestre **a cada implementação**. Início de sessão = ler este arquivo. Fim = handoff + commit + push.

Este é o **handoff detalhado e canônico** do agente Meridian v2. Não economizar páginas no que for crucial.

**Supersede** mestres 68 e 70 (históricos).

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

**7 abas obrigatórias** (AGENTS.md / render) — MESMAS nos dois modos do card (shell 76); no pós-jogo só os RÓTULOS re-semantizam (`ANALYSIS_TAB_LABELS_POS` em tab-helpers.js):

| # | Prévia | Pós-jogo |
|---|--------|----------|
| 1 | Resumo | Resumo do Jogo |
| 2 | Tática | Leitura Tática |
| 3 | Desempenho | Números do Jogo |
| 4 | Cartões & Faltas | Disciplina |
| 5 | **Escanteios** (nunca omitir) | **Escanteios** (nunca omitir) |
| 6 | Escalação (mapa de campo) | Escalações Utilizadas |
| 7 | Dados Avançados | Pós-Jogo & Mercados (retrospecto dos tickets) |

Modo vem de `parsed.contexto_analise` ('previa'|'pos_jogo'; normalize tolera variantes, default previa) — a Fase 2 preenche a partir de `[Contexto confirmado: …]` / `[MODO PÓS-JOGO]`. Selo `PRÉVIA ·` / `PÓS-JOGO ·` no `.a-subtitle`. Pós-jogo: `runAnalysis` roda `fetchVerifiedMatchFacts` ANTES da Fase 2 (placar sacro verificado no card; sem bloco → sem placar afirmado, vira lacuna).

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

## 7.5 Prefill JSON, resgate e bug MODEL_PRICE (shells 77–79) — CRUCIAL

### Problema de produto (print real do usuário)

Análise **padrão** (ex. Internacional × Cruzeiro, prévia) caía em:

- **Prosa** do Sonnet 5 (“jogo não aconteceu…”) em vez do JSON das 7 abas, **ou**
- **Modo simplificado** (card de texto) mesmo quando o modelo **já tinha** devolvido JSON válido.

Rodapé diagnóstico (shell 78) passou a mostrar: `shell N · diagnóstico [parse|error]: …` — essencial para achar a causa.

### Shell 77 — prefill `{`

Caminho enriquecido F2 (sem tools, thinking off):

```js
messages.push({ role: 'assistant', content: '{' });
// finalText = '{' + text da API
```

Obriga a API a **continuar um objeto JSON**. Prompts: “PRÉVIA É O CASO NORMAL”.  
`globalThis._lastAnalysisFail = { stage: 'parse'|'error', model, sample/msg }`.

**NÃO** usar prefill com tools nem com thinking ligado.

### Shell 78 — rodapé do modo simplificado

`_fallbackDiagLine()` no card fallback: shell + estágio + amostra/msg. Remove texto obsoleto “Leve/Médio”.

### Shell 79 — dois fixes (print + validação e2e)

**(1) Sonnet 5 rejeita prefill**

Erro real da API:  
`This model does not support assistant message prefill. The conversation must end with a user message.`

Código:

```js
function _prefillOk(m){ return !/claude-sonnet-5/.test(m||''); }  // Haiku/Opus: true
// F2: só preenche '{' se _prefillOk(currentModel)
// Auto-cura: se e2.message contém /prefill/i → pop do assistant '{' e repete sem prefill
// RESGATE FINAL (shell 80): se ainda sem parse E modelo sem prefill
//   → Opus 4.8 COM prefill monta o card (NUNCA Haiku — não rebaixar qualidade)
```

> ⚠️ **SUPERADO no shell 95 — não copiar o trecho acima.** Opus 4.8 (e 4.7/4.6, Sonnet 4.6, Fable 5) **também** rejeitam prefill; só Haiku aceita. Vigente: `_prefillOk = /claude-haiku/` e resgate com **structured outputs**. Ver inv. 30 e a linha do shell 95 na timeline.

Validado: Sonnet prosa 2× → resgate **Opus** → card 7 abas PRÉVIA.

**(2) Bug latente `MODEL_PRICE` (derrubava TODA análise)**

- `const MODEL_PRICE` em script **classic** → **não** vira `window.MODEL_PRICE`.
- ESM `pipeline-run` fazia `globalThis.MODEL_PRICE[currentModel]` na contabilidade **pós-Fase 2**, **antes** do `parseAnalysisJson`.
- `TypeError` → catch → modo simplificado **mesmo com JSON perfeito**.

Fix:

```js
// app.js — DEVE ser var (ou expose), nunca const/let para ponte classic→ESM
var MODEL_PRICE = { ... };
// pipeline-run:
const _mainP = (globalThis.MODEL_PRICE||{})[model] || (globalThis.MODEL_PRICE||{})['claude-sonnet-5'] || {crs:0};
```

**Invariante 31:** globais classic lidos pelo ESM = `var` / `function` / `expose()`. Testar `typeof globalThis.X`.

### Shell 80 — pendências do print (IMPLEMENTADAS)

1. **Resgate com Opus 4.8** (nunca rebaixar): `rescueBody.model = 'claude-opus-4-8'`, tier **acima** do Sonnet. Status UI: “Montando card (resgate Opus)…”. *(O “+ prefill `{`” original caiu no shell 95 — Opus 4.8 rejeita prefill; o resgate usa `output_config.format`.)*  
2. **Proibida autocorreção / monólogo** no texto final: regra nos **2 prompts F2**, persona do chat e `conversationalFallback` — sem hesitação do tipo *“retrospecto Gre-Nal… não, esse é outro clássico”* no card.

### Shells 81–84 (PDF, render, diag F1, hardening coleta)

| Shell | O quê |
|-------|--------|
| **81** | Export PDF: volta à lógica **v1** — `window.print` / Salvar como PDF **vetorial** (~14KB); remove raster html2pdf do fluxo (PDF do user quebrava em 47 páginas) |
| **82** | **ctSideSection / ctVanTag** recuperadas no `render.js` — perda na decomposição do monólito; **todo** card com `confronto_tatico` crashava no render → modo simplificado (3º assassino silencioso: MODEL_PRICE, prefill, ctSideSection) |
| **83** | **Diagnóstico da Fase 1**: se `rawFacts` nulo → `_coletaOk === false` → aba Escalação (e siblings) mostram **porquê**, não só “coleta falhou”. `_lastAnalysisFail` cobre `fase1-parse` \| `fase1-loop` \| `fase1-error`. Empty-state Escalação anexa `_fallbackDiagLine()`. |
| **84** | **Hardening da coleta F1** (causas achadas no código, sem esperar amostra do user): ver subseção abaixo |

### Shell 84 — hardening da coleta Fase 1 (CRUCIAL)

Causa raiz típica do empty Escalação **não era só “rede”** — três bugs de parsing/fluxo:

1. **`stop_reason: 'max_tokens'`** caía no `else break` do loop de `gatherFacts` e **descartava** JSON quase completo. Teto era **3000** (apertado p/ schema com onze+banco+métricas) → subiu p/ **5000**. `max_tokens` agora é **terminal** com parse robusto (igual `end_turn`).
2. **Parse ingênuo** (`match` + `JSON.parse` seco) falhava com fences markdown / JSON truncado. Agora `gatherFacts`, `fillDataGaps`, `verifyLineupNames` e `verifyAnalysis` usam **`parseAnalysisJson`** (strip ``` + `repairJson`).
3. **Retry de forma `_p1JsonRescue`**: se ainda sem JSON, 1 chamada **Haiku SEM tools + prefill `{`** (Haiku aceita prefill — inv. 30; **nunca** Sonnet 5) reescreve a resposta anterior como JSON puro. Status UI: *“Reformatando coleta…”*.

Diag `fase1-parse` pós-84 carimba:

`[stop=<end_turn|max_tokens>, retry de forma falhou] <amostra…>`

Código: `js/analysis/pipeline-facts.js` (`gatherFacts`, `_p1JsonRescue`, `parseAnalysisJson`, `repairJson`). Asserts em `tests/run.mjs`.

### Interpretação do empty-state Escalação (print shell 83 → mitigado no 84)

Mensagem típica:

> *“A pesquisa de dados desta partida não pôde ser concluída — a análise saiu direto do modelo…”*

Significa **`_coletaOk === false`** = **Fase 1 (`gatherFacts`) devolveu `rawFacts` nulo**. A Fase 2 montou tática/tickets do JSON dela; o **mapa de campo / escalação estruturada nasce da coleta** — sem coleta, a aba fica vazia (comportamento honesto).

| Era | Comportamento |
|-----|----------------|
| **Pré-83** | F1 morria **muda** — só F2 tinha diagnóstico |
| **83** | Empty-state mostra `diagnóstico [fase1-parse\|fase1-loop\|fase1-error]: …` |
| **84+** | Causas de código (max_tokens / parse seco / prosa) **mitigadas**; Escalação vazia deve ser **rara**. Se ainda cair, a amostra inclui `stop=` + “retry de forma falhou” |

| stage | Significado |
|-------|-------------|
| `fase1-parse` | Coleta terminal sem JSON útil (pós-retry de forma); amostra do texto Haiku |
| `fase1-loop` | 5 iterações tool_use/pause sem `end_turn` |
| `fase1-error` | Exceção API/rede na Fase 1 (`pipeline-run` catch) |

**Como depurar (shell 84 no rodapé):** hard reload → reanalisar.  
- Escalação **volta** → transitório (rede/rate limit) **ou** o 84 salvou o JSON que o 83 só diagnosticava.  
- Continua empty → copiar o texto completo do diagnóstico (não só o sintoma) e corrigir a **causa** residual.

Código: `normalize.js` `parsed._coletaOk = !!rawFacts`; `render.js` `_abaVaziaMsg` + `_fallbackDiagLine()` na Escalação; `pipeline-facts.js` registra F1 em `_lastAnalysisFail`.
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
12. Não voltar parse de LLM a `match`+`JSON.parse` seco; não tratar `max_tokens` na F1 como `break` silencioso; não remover `_p1JsonRescue` (shell 84).  

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
| Rate limit (92) | `RL_DATA` 30/min/IP por classe af/fd/fpl · `RL_AI` 30/min/IP no /v1 · 429 rate_limited · fail-open · health `rate_limit:true` |
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
| AF standings/fixtures 2026 | **Bloqueado no Free** (clubes) — ver PARTE IX P0 |
| Técnico determinístico | **AF free** via search teams+coachs |
| Escalação confirmada | **web_search** (Free AF) — P2: fallback JSON F2 no mapa |
| Métricas EPL | **FPL** (Worker) + busca |
| xG outras ligas | **web_search** |
| Histórico evento | StatsBomb Open se ano na query |
| Sem Anthropic | Sem análise/chat LLM completo |

**Paridade com V1 (próximo):** PARTE IX — cascata AF adaptativa + coverNote duro + `_lineups` de F2.

---

# PARTE IV — Arquitetura de código

## 15. Boot (`js/main.js`)

1. ESM: competitions, state, intent, tab-helpers, lineup, normalize, history, export, pipeline-facts, pipeline-run  
2. CLASSIC sequencial (`async=false`, `?v=SHELL`):  

```
prompts.js → render.js →
cached-fetch.js → source-telemetry.js → espn.js → football-apis.js →
free-sources.js → facts-memory.js → phase1-context.js → source-health.js →
schedule.js → live.js → lineup-confirmed.js → featured.js → library.js → app.js →
demo.js
```

**17 classic** — é literalmente `CLASSIC.length` que o boot loga (`[Meridian v2] shell N · … · classic: 17`);
confira pelo array em `js/main.js`, nunca pela memória. `lineup-confirmed.js` entrou no 87 e
`demo.js` no 98 — este vem **depois** do `app.js` de propósito (sobrescreve a chave restaurada e
o patch de fetch; o gate `?demo=1` é interno ao arquivo, por isso ele carrega sempre).
Ao adicionar classic novo: `main.js` CLASSIC **e** precache do `sw.js` **e** bump de shell.

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

**São DUAS suítes — rodar as duas, sempre:**

```bash
node tests/run.mjs     # ALL PASSED esperado        (app)
node tests/motor.mjs   # MOTOR ALL PASSED esperado  (pacote vendável)
```

`run.mjs` inclui intent, normalize, ownership, FactsMemory VM, coverage, worker allowlist strings,
AF free plan, FPL format, etc. `motor.mjs` roda uma análise COMPLETA headless em Node puro
(F1→gaps→verify→F2→normalize) + o chat do motor — é o que prova que `motor/engine.mjs` continua
integrável pelo cliente. Módulo compartilhado (normalize, pipeline-*, prompts) quebra o motor sem
quebrar o app: rodar só `run.mjs` deixa passar regressão no produto vendido.

## 18. Isolamento v1

- Repo/pasta/Worker/porta do v2 **nunca** sobrescrevem v1.  
- Worker name **somente** `meridian-v2-proxy`.  

---

# PARTE V — Linha do tempo do que foi crucial (shells)

> ⚠️ **Esta tabela vai só até o shell 84.** A continuação (85 → 133 — incluindo o pacote
> `motor/`, os passes de `/code-review ultra` e a obviedade mediada) vive na tabela da seção
> **Estado atual**, na PARTE VIII. Duas tabelas, uma linha do tempo — não procure o shell 12x aqui.

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
| **76** | **MODO PÓS-JOGO no card padrão** — mesma estética/7 abas, rótulos re-semantizados (`ANALYSIS_TAB_LABELS_POS`), selo PRÉVIA/PÓS-JOGO no subtítulo, campo `contexto_analise` no schema F2 (2 prompts) + regra "MODO PÓS-JOGO" (placar SÓ do bloco PLACARES VERIFICADOS; tickets viram retrospecto), `fetchVerifiedMatchFacts` antes da Fase 2 quando `[Contexto confirmado: …pós-jogo/já disputado]`; normalize default previa (cards antigos intactos). Validado no preview: os dois cards renderizam com 7 abas e selos corretos |
| **77** | **PREFILL '{' na Fase 2** — regra de prompt não bastou (shell 76 ainda caiu em prosa: Sonnet 5 recusou prévia de Inter x Cruzeiro "porque o jogo não aconteceu"). Solução por CONSTRUÇÃO: caminho enriquecido (sem tools, thinking off) empurra `{role:'assistant',content:'{'}` — a API é obrigada a CONTINUAR o objeto; `finalText='{'+text`. Retry idem + mensagem dura ("PRÉVIA não impede análise; recusar é falha total"). Prompts ganharam "PRÉVIA É O CASO NORMAL". Diagnóstico: `globalThis._lastAnalysisFail` {stage:'parse'\|'error', sample/msg} + console.warn sempre que a análise cai no modo simplificado — nunca mais depurar às cegas. NÃO usar prefill com tools nem com thinking ligado |
| **78** | **Rodapé diagnóstico no modo simplificado** — o `.disc` do fallback agora carimba `shell N · diagnóstico [parse\|error]: …` (via `_fallbackDiagLine()` lendo `_lastAnalysisFail`): o print do usuário passa a conter shell rodando + causa exata da queda (staleness de SW vs erro de API vs parse ficam distinguíveis à primeira vista). Texto obsoleto "raciocínio estendido Leve/Médio" removido do rodapé (seletor de esforço morreu no shell 70) |
| **79** | **DOIS achados críticos via rodapé diagnóstico**: (1) **Sonnet 5 REJEITA prefill** (400 real: "This model does not support assistant message prefill") → `_prefillOk(m)` gate, auto-cura no loop da F2 (remove o assistant '{' e repete) e **RESGATE FINAL**: se o modelo sem prefill insistir em prosa no retry, Haiku 4.5 COM prefill monta o card (7 abas do Haiku > modo simplificado). (2) **BUG LATENTE que derrubava TODA análise**: `const MODEL_PRICE` em classic não chega ao `window`; pipeline-run (ESM) lia `globalThis.MODEL_PRICE[...]` na contabilidade pós-Fase 2 → TypeError ANTES do parse → catch → modo simplificado MESMO com JSON perfeito (provável causa raiz das quedas desde a migração Sonnet 5). Fix: `var MODEL_PRICE` + acesso defensivo. Validado e2e: sonnet prosa 2× → resgate → card 7 abas PRÉVIA |
| **80** | Pedidos do usuário: (1) **resgate NUNCA rebaixa qualidade** — modelo do resgate trocado Haiku→**Opus 4.8** (aceita prefill; tier acima do Sonnet; caminho raríssimo pós-fix MODEL_PRICE, custo pontual aceito); (2) **escrita em versão final** — proibida autocorreção no meio do texto ("retrospecto Gre-Nal… não, esse é outro clássico"), hesitação e raciocínio em voz alta: regra nos 2 prompts F2 (LINGUAGEM), no persona do chat (`analystSystemPrompt`) e no pedido do `conversationalFallback`. Validado e2e: resgate Opus com prefill → card 7 abas |
| **81** | **Export PDF volta à lógica do v1 (impressão nativa)** — PDF real do usuário saiu QUEBRADO com 47 págs/4.6MB: o html2pdf rasterizava (html2canvas→JPEG→jsPDF) e `pagebreak avoid` num card de metros explodia a paginação. Removido o rasterizador; `format:'pdf'` agora abre o relatório HTML numa aba com `autoPrint` (window.print no load) → "Salvar como PDF" nativo: vetorial, ~14KB de HTML, quebras pelo `@media print` (print-report.css já tinha as regras e até o CSS dos botões v1 `.rep-print`). Relatório carrega botão próprio "Salvar como PDF" (`.rep-actions no-print`); popup bloqueado → baixa o HTML com o botão. `assets/vendor/html2pdf` ficou no disco mas SEM uso — não reintroduzir |
| **82** | **`ctSideSection`/`ctVanTag` RECUPERADAS** (achado do teste de fidelidade do export): a decomposição do monólito perdeu as duas funções do confronto tático; `renderResults` as chamava → **TODO card real crashava** com ReferenceError (schema F2 sempre traz `confronto_tatico`) → catch → modo simplificado. Terceiro assassino silencioso da série (MODEL_PRICE, prefill, ctSideSection). Recuperadas do commit `8f8aae2`; teste de fumaça novo: toda `ct*()` chamada no render deve ter `function ct*` definida. Fidelidade card→relatório validada: nenhuma perda de conteúdo por seção (só o disclaimer, removido de propósito — o relatório tem rodapé próprio) |
| **83** | **Diagnóstico da FASE 1** (caso real: card completo mas aba Escalação com "pesquisa não pôde ser concluída" = `rawFacts` nulo, Fase 1 morreu MUDA e a F2 pesquisou sozinha): `_lastAnalysisFail` agora cobre `fase1-parse` (end_turn sem JSON, com amostra do texto), `fase1-loop` (5 iterações sem convergir) e `fase1-error` (exceção de API/rede na coleta). O empty-state da aba Escalação mostra o diag (`_fallbackDiagLine`, agora exposta) quando `_coletaOk===false` — o print do usuário passa a dizer POR QUE a coleta falhou. Validado e2e: F1 prosa → card 7 abas entregue + aba com "diagnóstico [fase1-parse]: …" |
| **84** | **HARDENING DA COLETA F1** (causas achadas por CÓDIGO, sem esperar amostra do usuário): (1) `stop_reason:'max_tokens'` caía no `break` do loop e **jogava fora** um JSON quase completo (teto 3000 era apertado p/ schema com onze+banco+métricas) → agora max_tokens é TERMINAL com parse robusto e o teto subiu p/ **5000**; (2) parse ingênuo (`txt.match` + `JSON.parse` seco) → `gatherFacts`, `fillDataGaps`, `verifyLineupNames` e `verifyAnalysis` agora usam **`parseAnalysisJson`** (strip de cercas markdown + `repairJson`); (3) **retry de forma `_p1JsonRescue`**: se ainda sem JSON, 1 chamada **Haiku SEM tools com prefill `{`** (Haiku aceita prefill, inv. 30) reescreve a resposta anterior como JSON puro — espelha o retry da F2; status UI "Reformatando coleta…". Diag `fase1-parse` agora carimba `[stop=…, retry de forma falhou]`. 5 asserts novos. Pages conferido: serve `main` (auto-atualiza no push) |

---

# PARTE VI — Invariantes consolidados (1–36)

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
23. Profundidade da análise padrão = `modelProfile().searches` + capacidade do modelo; **budget thinking = 0 SEMPRE na F2** — o opt-in experimental dos shells 93–97 foi **REMOVIDO no shell 100** (ver inv. 36).  
24. Fase 1 / portões / verify continuam em Haiku (barato), independente do modelo da Fase 2.  
25. Default modelo: `claude-sonnet-5`.  
26. Sonnet 5: se thinking off, enviar `{type:'disabled'}` — omitir liga adaptive thinking.  
27. `runAnalysis` infere a competição da query (clube OU keyword) antes da coleta — não confiar só na liga ativa da UI (shell 74).  
28. Fase 2 nunca pergunta em prosa: ambiguidade = prévia com suposições declaradas no JSON ("ENTREGA OBRIGATÓRIA" nos prompts) — mas o caminho PREFERENCIAL é o gate resolver antes (inv. 29).  
29. Análise sem âncora em jogo real (agenda/scoreboard) → **popup de contexto ANTES do pipeline** (0 chamadas LLM até o usuário escolher); `[Contexto confirmado:]` e `PARTIDA:` pulam o gate; reenvio pós-popup volta para `runAnalysis` (`_ctxResumeMode`), nunca para o chat (shell 75).  
30. **Prefill `{` só em Haiku (shell 96)**: `_prefillOk = /claude-haiku/`. Sonnet 5, Sonnet 4.6, Opus 4.6/4.7/**4.8** e Fable 5 devolvem 400 (`does not support assistant message prefill`) — o substituto oficial nos modelos novos é **structured outputs** (`output_config.format`). Fase 2 enriquecida: sem tools, thinking off/disabled quando o opt-in está desligado, `'{'+text` no parse **só** quando o prefill foi realmente enviado. Modelo que insistir em prosa → resgate **Opus 4.8 com structured outputs** (nunca com prefill, nunca Haiku: resgate não rebaixa qualidade). Shells 77/79/80 descreviam o contrato antigo — 95 é o vigente.  
31. Globais de classic lidos via `globalThis` pelo ESM devem ser `var`/`function`/`expose()` — **`const`/`let` de script classic NÃO chegam ao window** (bug MODEL_PRICE, shell 79: derrubava toda análise pós-Fase 2). Ao criar ponte classic↔ESM, teste `typeof globalThis.X`.  
32. **Escalação empty com card completo ≠ bug de render tático**: significa `_coletaOk === false` (Fase 1 sem `rawFacts`). Diagnóstico obrigatório via `_lastAnalysisFail` stages `fase1-parse` \| `fase1-loop` \| `fase1-error` no empty-state (shell 83) — nunca silenciar a causa da coleta.  
33. **Todo parse de JSON vindo de LLM usa `parseAnalysisJson`** (fences + `repairJson`) — nunca `txt.match(/\{…\}/)` + `JSON.parse` seco (assert proíbe). `stop_reason:'max_tokens'` na F1 é terminal com salvage, não `break`. Retry de forma da F1 = `_p1JsonRescue` (Haiku + prefill `{`, sem tools) — shell 84.  
34. **Escalação = proveniência HONESTA (shell 87)**: precedência AF(api) > ESPN starters(api) > rawFacts(pesquisa) > F2(modelo) > geometria(inferida) > empty. Chip de formação só com fonte confiável — nunca rotular "4-2-3-1" de modelo/inferida como oficial; nunca **espelhar** a mesma formação nos dois times sem lastro próprio. Elenco confirmado de dia de jogo (`applyConfirmedLineups`/`refreshAnalysisLineups`) é **determinístico** — ZERO chamada Anthropic no enrich/poll. `live.js` nunca inventa `4-3-3` (mostra `n/d`).  
35. **Teste anti-regressão precisa de META-ASSERT (shell 89)**: todo smoke test que varre o código (ex.: "toda `_h('x')` existe") deve (a) **excluir o arquivo escaneado** da busca — senão o próprio call site "prova" a definição — e (b) trazer um assert que **prova que o teste reprova** um caso inexistente. Sem isso o teste é no-op e dá falsa segurança (a 1ª versão do teste do shell 88 teria passado com `chatCardFrom` removido). No chat: JSON nunca vai cru para a bolha (extrai texto ou pede reformulação), e o gate de suposição (inv. 18) roda no caminho de **prosa** com critério estrito — só confronto/placar explícito abre popup.  
36. **Thinking na Fase 2 NÃO EXISTE (removido no shell 100 a pedido do dono)** — era o opt-in dos shells 93–97 e exigia JSON por gramática (structured outputs). O acesso do dono recusou TODAS as gramáticas com "The compiled grammar is too large": schema ingênuo (93), compacto (93), $defs/$ref (96) e agrupado com topo de 5 props (97). **NÃO REINTRODUZIR** sem a API elevar o limite de gramática; thinking sem gramática na F2 é proibido para sempre (desastre de prosa dos shells 70/71). A F2 roda no caminho provado: `thinking:{type:'disabled'}` explícito no Sonnet 5, prompt-contrato + `parseAnalysisJson`, prefill `{` só onde o modelo aceita (inv. 30) e resgate Opus 4.8 sem prefill e sem SO. `FACTS_SCHEMA` da **Fase 1** é feature independente e CONTINUA em uso. Preferência/memo antigos (`meridian_f2_think`, `meridian_f2_grammar_blocked`) são limpos no boot.  

---

# PARTE VII — Arquivos-chave (mapa rápido)

| Arquivo | Papel no agente |
|---------|-----------------|
| `js/lib/intent.js` | **Roteamento** análise vs chat |
| `js/analysis/pipeline-run.js` | toggleRun, runAnalysis, runChat, stream |
| `js/analysis/pipeline-facts.js` | gatherFacts, `_p1JsonRescue`, `parseAnalysisJson`/`repairJson`, grounding, portões |
| `js/analysis/prompts.js` | system prompts F2 + persona do chat (`analystSystemPrompt`, MODO CONVERSA) |
| `js/analysis/render.js` | 7 abas; `buildEscalacaoTab` (re-render isolado da aba); `ctSideSection`/`ctVanTag`; empty Escalação + diag F1 |
| `js/analysis/normalize.js` | schema; `_coletaOk = !!rawFacts`; `contexto_analise`; proveniência `_lineupsFonte` |
| `js/analysis/lineup.js` | `buildPitchModel`, `normalizeLineupTeam`, `_luWorseFonte`, `_lvKey` (mapa de campo) |
| `js/analysis/tab-helpers.js` | `ANALYSIS_TAB_ORDER` + `ANALYSIS_TAB_LABELS_POS` (rótulos pós-jogo), empty states |
| `js/data/lineup-confirmed.js` | **XI confirmado match-day** (AF>ESPN), `isMatchDayWindow`, `applyConfirmedLineups`, `refreshAnalysisLineups` + auto-poll — ZERO Anthropic |
| `js/data/phase1-context.js` | coleta A/B + free + memória |
| `js/data/espn.js` | ESPN + TSDB |
| `js/data/football-apis.js` | FD/AF, ready, coach fallback |
| `js/data/free-sources.js` | registry free + FPL + SB Open |
| `js/data/facts-memory.js` | cache fatos / skip tópicos |
| `js/data/source-telemetry.js` | repertoire, coverage interna |
| `js/data/source-health.js` | probe UI |
| `js/app.js` | UI, keys, **MODEL_PROFILES** / `modelProfile()` (`var`!), `MODEL_PRICE` (`var`!), default Sonnet 5, gate de senha avançada |
| `worker/worker.js` | proxy CORS + origin gate; strip Origin/Referer no `/v1`; rotas `/af` `/fd` `/fpl` |
| `js/export/report.js` | export HTML + PDF por **impressão nativa** (sem html2pdf) |
| `js/data/schedule.js` | agenda multi-comp + `findScheduledMatchForAnalysis` (âncora do gate de contexto) |
| `js/demo.js` | modo `?demo=1` (fixtures locais, zero API) — classic, carrega **depois** do app.js |

**Subsistema `motor/` — o pacote vendável (não é parte do SPA).** Camada headless de COMPOSIÇÃO
que consome os mesmos módulos do app; por isso um módulo compartilhado quebra os dois. Sempre que
mexer em `normalize.js`, `pipeline-*.js` ou `prompts.js`, rodar `node tests/motor.mjs` **e**
regenerar o zip (`node tools/package-motor.mjs`).

| Arquivo | Papel |
|---------|-------|
| `motor/engine.mjs` | `createEngine(config)` → `analyzeMatch` / `chat` / `routeIntent` / `setCompetition` / `version`; `MOTOR_VERSION` (hoje `1.0.0`) |
| `motor/SKILL.md` | contrato canônico do integrador (input/output/garantias/handover) |
| `motor/CHANGELOG.md` | histórico versionado voltado ao integrador (shell 133) |
| `motor/MANIFEST.txt` | lista de arquivos do pacote (cabeçalho é reescrito na sanitização) |
| `motor/HANDOFF-ENGENHARIA.md` | regras de engenharia do pacote |
| `motor/exemplo-integracao.mjs` | exemplo mínimo de uso pelo cliente |
| `tools/package-motor.mjs` | empacotador **com sanitização** — reescreve termos internos e **ABORTA** se sobrar resíduo (shell 122) |
| `tests/motor.mjs` | prova de isolamento: análise completa + chat em Node puro |

---

# PARTE VIII — Como continuar

## Checklist ao retomar

- [ ] `git pull` · `SHELL_VERSION` **133** em version/sw/index ×2 (código: HEAD ≥ `1c1f2d6`; docs: este commit)  
- [ ] Ler **este** handoff (mestre canônico) — PARTES IX e X são **histórico FEITO**, não backlog  
- [ ] `node tests/run.mjs` → **ALL PASSED** · `node tests/motor.mjs` → **MOTOR ALL PASSED** (as duas)  
- [ ] Worker health: `curl https://meridian-v2-proxy.gcerqueira2012.workers.dev/health` → `meridian-v2-proxy` + `origin_gate:true`  
- [ ] Boot no preview: console `[Meridian v2] shell 133 · … · classic: 17`, sem erro  
- [ ] Intactos: dual-mode · prefill/`_prefillOk` · resgate **Opus** · PDF impressão nativa · SW network-first JS · proveniência de escalação  
- [ ] Ao mexer em classic novo: `main.js` CLASSIC + `sw.js` precache + bump ×4  

## Estado atual (revisão 2026-07-31 · shell 133)

| Shell | Entrega |
|-------|---------|
| 80–84 | Resgate Opus, PDF, ct*, diag F1, parse F1 — **FEITO** |
| **85** | PARTE IX paridade coleta — **FEITO** (`f24db4e`) |
| **86** | SW network-first para JS (staleness ESM) — **FEITO** (`6099fda`) |
| **87** | **PARTE X FEITA** — proveniência por time (api>pesquisa>modelo>inferida) + chip de formação honesto; elenco CONFIRMADO match-day (AF>ESPN) via lineup-confirmed.js; botão/auto-poll "Atualizar escalação" (zero LLM); live.js sem default 4-3-3. Ver PARTE X §0 |
| **88** | **Chat = conversa em TEXTO sucinta** — 5º assassino silencioso: `chatCardFrom`/`renderChatCard`/`cardToPlain` foram removidos na decomposição (26fbf9e) mas `runChat` os chamava via `_h()` (que LANÇA) → toda pergunta de chat morria com "host missing: chatCardFrom". Removido o caminho de CARD do chat (prosa, como o usuário quer); diretiva `MODO CONVERSA` no system do chat (1–4 frases, sem overthink/autocorreção/alucinação). Teste de fumaça novo varre TODA `_h('x')` do pipeline-run. |
| **89** | **Code-review `/ultra` — 4 achados corrigidos** (`88f7619`): (1) **o smoke test do 88 NUNCA podia falhar** — `allSrc` incluía o próprio `pipeline-run.js` e o fallback `['"]fn['"]` casava com o call site `_h('fn')`, então `defined` era sempre `true` (com `chatCardFrom` removido o teste teria PASSADO). Fix: exclui o arquivo escaneado + exige **definição real** (`function`/atribuição/global/shorthand em `expose`) + **meta-assert** provando que reprova nome inexistente (verificado: `chatCardFrom` → `false`, antes `true`). (2) **JSON despejado cru na bolha** — sem o consumidor de card, um retorno estruturado ia direto para `simpleMd`; agora `_chatLooksJson`/`_chatJsonToProse` extraem o campo de texto e, sem campo útil, pedem reformulação. (3) **gate de suposição (inv. 18) voltou ao caminho de prosa** — pergunta vaga + resposta que nomeia confronto/placar → popup; prosa genérica NÃO abre popup. (4) **`cardPresupposedVagueMatch` estava morto** (0 call sites após o 88) — generalizado para prosa OU card e religado. |
| **90** | **Code-review `high` dos shells 87–89 — 4 achados corrigidos** (`37ff562`): (1) **`applyConfirmedLineups` marcava `parsed._coletaOk=true`** ao aplicar o XI confirmado — o flag significa "a Fase 1 devolveu rawFacts" e alimenta o empty-state + diag `fase1-*` de **todas** as abas (inv. 32); forçá-lo fazia uma F1 falha exibir "pouca cobertura de imprensa" em Cartões/Escanteios e sumir com o `_fallbackDiagLine()`. Removido — a escalação confirmada já se anuncia por `_lineupsFonte='api'` + badge por time. (2) **`_chatJsonToProse` fazia `JSON.parse` cru** (violava inv. 33): JSON truncado no `max_tokens` lançava e o usuário recebia "reformule" perdendo texto recuperável → agora `parseAnalysisJson` (fences + `repairJson`); validado com `{"resposta":"…` sem fechar. (3) **botão "Atualizar escalação" ficava preso em "Atualizando…"** quando o refresh lançava ou o painel sumia → `finally` restaura rótulo e clique. (4) **auto-poll virava fetch órfão**: ao limpar a conversa o card saía do DOM mas a entrada seguia no `_history`, e o intervalo batia em ESPN/AF a cada 75s até o FT → encerra quando `#at-escalacao-<id>` não existe. **Abertos → FEITOS no shell 91.** |
| **91** | **Limpeza dos 4 achados de baixo risco do review 87–89** (`a824bdb`): (5) `_lcFindEspnEvent` agora **reusa `getEspnScoreboard(compId)`** (cache `meridian_espn_sb_` compartilhado com a UI e `findScheduledMatchForAnalysis`) — antes fazia um 2º fetch + 2º cache do mesmo scoreboard. (6) ESPN summary + AF lineups em **`Promise.all([_espnP,_afP])`** (antes em série, somando o timeout da ESPN ao throttle da AF no render). (7) **`opts.query` morto removido** dos 2 call sites — `applyConfirmedLineups` nunca lia (o match AF usa os nomes `nmM x nmV`). (8) **`source` acurado por lado** (`_srcBySide`) em vez de `usedSource` sobrescrito pelo 2º time; retorno combinado `'af'`/`'espn'`/`'af+espn'`. Sem mudança de comportamento observável; 4 asserts novos. |
| **92** | **UI de troca da senha avançada** — formulário dentro da própria seção destrancada (`#adv-pass-new`/`#adv-pass-conf` + "Salvar nova senha" / "Restaurar padrão"): `setAdvPassword` valida (≥4 chars, confirmação) e grava só o SHA-256 em `localStorage.meridian_adv_hash`; o gate compara contra `_advCurrentHash()` = override > `ADV_PASS_HASH`. Escopo honesto no hint: vale NESTE navegador; o status exibe o hash (público) para fixar em `ADV_PASS_HASH` se quiser valer no site publicado. `resetAdvPassword` volta ao padrão do código. Validado e2e no preview: troca → senha antiga rejeitada → nova abre → restaurar → padrão volta; curta/divergente rejeitadas. |
| **92·worker** | **Rate limit no Worker** (worker-only, sem bump de shell): binding nativo `[[ratelimits]]` — `RL_DATA` 30/min por IP para CADA classe af|fd|fpl (key `ip:classe`) e `RL_AI` 30/min por IP no `/v1`. Estouro → 429 `{code:"rate_limited"}` + `Retry-After:60` + CORS; **fail-open** se o binding faltar; `/health` expõe `rate_limit:true`. Contagem POR LOCALIZAÇÃO Cloudflare (backstop, não contador global — bursts paralelos podem espalhar por colos). **Validado em produção**: self-test do binding 31×true→4×false; burst HTTP numa mesma conexão/colo = 30×200 → 15×429. `namespace_id` 2101/2102 reservados ao v2 |
| **93** | **Thinking na F2 (OPT-IN experimental) — SÓ com structured outputs**: toggle `#f2-think-toggle` nos settings avançados (default OFF, inv. 23 preservado). Ligado + caminho enriquecido: `thinking enabled 6000` + `output_config json_schema` com **`F2_SCHEMA` compacto** (pipeline-facts; espelha o contrato textual, required em TODOS os campos — nenhuma aba some; sem enums/min/max, `additionalProperties:false`, anyOf p/ null) + `max_tokens 15000` + SEM prefill (incompatível). **Auto-cura no MESMO run**: 400 com grammar/format/thinking → desliga thinking+SO, restaura disabled/9000/prefill-se-aceito e continua; resultado em `globalThis._f2ThinkLast` + `#f2-think-status`. Retry/resgate sempre stripam `output_config`. O schema "ingênuo" de 07/2026 estourava a gramática — o compacto é a nova aposta e **o 1º run real do usuário é o reteste ao vivo** (instrumentado). Validado no preview (stub): A) aceita → body correto + card + ✓; B) 400 "compiled grammar is too large" → 2ª tentativa disabled/sem-SO/9000 → card entregue + motivo registrado; C) toggle OFF → caminho clássico intacto |
| **94** | **BUG DO USUÁRIO: "troquei a liga nas estatísticas durante a análise e travou"** — não era travamento do pipeline (a análise concluía normal): `renderEmptyStateFeatured` esconde o bloco featured quando existe conversa (sidebar vira contexto da partida — by design), e **o seletor de liga vive DENTRO de `#rs-copa-stats`** → ao escolher a liga, `setStatsComp` disparava o repaint que **sumia com o painel E com o próprio seletor**, sem volta até limpar a conversa. Fix: `setStatsComp` marca `fromSelector:true`; com o painel visível, a troca do USUÁRIO **mantém visível e repinta** na liga escolhida (enrich idem). Repaint automático com conversa continua escondendo (design preservado). Reproduzido e validado no preview: antes/durante = Libertadores visível → após troca = **Série A visível e repintado** (era `display:none`) |
| **95** | **CONTRATO DA API CORRIGIDO (erro real do usuário no toggle do 93)** — a API devolveu `"thinking.type.enabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort"`. Verificado no doc oficial (skill `claude-api`): em Sonnet 5 / Opus 4.8 / 4.7 / Fable 5 o `budget_tokens` é **rejeitado com 400** e os **sampling params** (temperature/top_p/top_k) também. Fix na F2 enriquecida: `thinking:{type:'adaptive'}` + `output_config:{effort:'high',format:json_schema(F2_SCHEMA)}` + `max_tokens 15000` + `delete temperature`. **2º bug latente, nunca disparado:** o resgate do shell 80 mandava **prefill em Opus 4.8**, que TAMBÉM rejeita prefill (só Haiku ainda aceita) — o resgate teria 400'ado no 1º uso real. `_prefillOk` agora é `/claude-haiku/`; o resgate usa **structured outputs** no lugar do prefill, com auto-cura (se o 400 anterior foi de gramática, refaz sem `output_config`). Asserts novos + validado no preview (stub) nos 3 caminhos: F2 = `adaptive`+`effort`+`format`, sem temperature, sem prefill → retry = `thinking:disabled` → resgate = `claude-opus-4-8` + `format`, sem prefill |

| **96** | **Gramática do F2_SCHEMA deduplicada ($defs) + memo da recusa + bug do card**: o 1º run real com o toggle ligado devolveu `The compiled grammar is too large` — a auto-cura funcionou (o card saiu via Sonnet), mas a gramática seguia estourando. Causa: a gramática compila o schema EXPANDIDO e cada `_soEvt()`/`_soTeamF2()`/… inlinava uma cópia nova (evt 3×, team 2×, tec 2×, ctSide 2×). Fix: `$defs`+`$ref` (suportados pelos structured outputs — doc verificado) → cada shape compila 1×, **sem podar nenhum campo** (podar seria pior: `additionalProperties:false` PROIBIRIA o modelo de emitir a seção e a aba sumiria). `F2_SCHEMA_ID=`96-defs`` + memo em `localStorage.meridian_f2_grammar_blocked`: recusa de gramática não é retentada a cada análise (economiza 1 request perdido + latência por run), e gramática nova (ID novo) volta a ser testada sozinha, sem o usuário limpar nada; só erro de **gramática** memoiza (demais 400 podem ser transitórios). **Bug do print (Flamengo × São Paulo):** aba Desempenho mostrava `★ [object Object] · [object Object]` — `jogadores_chave` chega como STRING (contrato F2) ou OBJETO (contrato F1, com nome/posição/stats) e o render mandava o item cru pro `esc()`; `_listLabel`/`_labelList` normalizam (também em `desfalques`). Validado no preview: card sem `[object Object]` (`★ Pedro (Abreu dos Santos) (ATACANTE) · Samuel Lino (EXTREMO)`), run1 tenta SO→recusa→auto-cura→card, run2 já nem tenta, run4 (ID novo) tenta de novo e ✓ |

| **97** | **Gramática por AGRUPAMENTO (última tentativa do opt-in)** — o $defs do 96 foi recusado com a MESMA mensagem, então a hipótese "custo = total de shapes" caiu. Hipótese revisada: o custo é dominado por **propriedades de UM MESMO objeto** (a gramática aceita as chaves em qualquer ordem → cresce combinatoriamente), o que bate com a nota do 93 ("só 15 dos 19 campos de topo cabiam" = teto por objeto, não global). Fix: os 19 campos de topo viraram 5 grupos (`cabecalho`/`times`/`mercados`/`leitura`/`secoes`) — **topo 19→5 props, maior objeto do schema = 9** (`team`). NENHUM campo perdido: só mudam de endereço, e `_f2Unnest` (pipeline-facts) devolve o formato PLANO logo após o parse, nos 3 pontos (principal/retry/resgate), de forma **idempotente** — sem opt-in o objeto passa intacto e o caminho provado segue byte a byte. O system ganha a instrução do formato agrupado só quando SO está ligado, e a auto-cura **restaura o system original**. `F2_SCHEMA_ID=`97-grouped`` → o memo do 96 se retesta sozinho. Validado no preview: modelo devolvendo AGRUPADO → card com as 7 abas, sem modo simplificado, Cartões/Escanteios/Tática com conteúdo real, sem `[object Object]`. **Se ainda estourar no acesso do usuário, o combinado é aposentar o opt-in — não podar campos** |

| **98** | **MODO DEMO para calls de handover** (`?demo=1`): novo classic `js/demo.js` (17º — CLASSIC do main.js + precache do sw.js). Intercepta `window.fetch` SÓ para `/v1/messages` e responde com fixtures locais — F1 devolve rawFacts completos (XI 11+banco+técnico dos dois lados, jogadores_chave com stats), F2 devolve o JSON PLANO das 7 abas, chat devolve prosa curta — com **streaming simulado** (ReadableStream + delays ~5s) para o contador de tokens e as fases andarem como ao vivo. Todo o resto do app roda REAL (agenda ESPN, render, Poisson, export). **Zero consumo de API e zero chave**: preenche o input com chave ilustrativa (SEM gravar no sessionStorage) e, mesmo com chave real no navegador, nenhuma chamada sai com `?demo=1`. Badge fixo "🎬 MODO DEMO" (**shell 99**: centralizado no TOPO da página — antes inferior esquerdo; pedido do dono). Prefill do input usa prefixo `PARTIDA:` de propósito — o jogo da demo é fictício e sem o prefixo o gate de contexto (shell 75) abriria popup no meio da call (comportamento correto do produto, verificado ao vivo). Fixtures se declaram demo nas lacunas. Sem o parâmetro, o arquivo é no-op (guard na 1ª linha). Validado e2e no preview: análise → card 7 abas (Escalação com XI "pesquisa", Poisson calculado do lambda) → pergunta de chat → prosa demo; `read_network_requests` = ZERO chamadas a /v1/messages. Nota: o card da demo é salvo na biblioteca como card normal (apagável). Console agora loga `classic: 17` |

| **100** | **Thinking na F2 REMOVIDO (a pedido do dono)** — o opt-in dos shells 93–97 custou 4 shells e o acesso recusou TODAS as gramáticas ("compiled grammar is too large"): ingênua, compacta, $defs (96) e agrupada (97). Excisão completa: toggle da UI (`#f2-think-toggle`/`#f2-think-status`), `getF2Think`/`setF2Think` (app.js), branch `_think` + auto-cura + memo de gramática (pipeline-run), `F2_SCHEMA`/`F2_SCHEMA_ID`/`F2_GROUPS`/`_f2Unnest` + helpers `_soEvt`/`_soTeamF2`/`_soTecF2`/`_soCtSide` (pipeline-facts). O resgate Opus 4.8 voltou ao prompt-contrato puro (sem SO). `FACTS_SCHEMA` da F1 preservado (feature independente). Boot limpa `meridian_f2_think` e `meridian_f2_grammar_blocked`. Asserts anti-reintrodução substituem os dos shells 93–97 (o fix do [object Object] no render fica). Invariantes 23 e 36 reescritos. Validado no preview: boot sem erro, toggle ausente, localStorage limpo, F2 stub = `thinking:disabled` + sem `output_config` + max_tokens 9000 → card renderiza |

| **101** | **Lacunas da auditoria real corrigidas NA COLETA** (print Botafogo × Vitória): (1) **causa raiz dos escanteios** — `FACTS_SCHEMA` (SO da F1) omitia `escanteios_por_jogo`/`escanteios_sofridos_por_jogo` que o template textual pede e normalize/facts-memory consomem; com `additionalProperties:false` o modelo ficava **PROIBIDO** de devolvê-los sempre que o caminho SO funcionava. Corrigido + **meta-assert de PARIDADE template↔schema** (toda chave do `_teamTpl` precisa existir no schema — mata a classe de drift). (2) **xG/escanteios em `_TEAM_CRITICAL`** — a auditoria pegou a F2 "estimando" xG sem lastro (grave); agora vazio dispara a passagem de gap (Sofascore/FBref públicos). (3) **placar exato**: `_teamResultsNeedScores` detecta forma qualitativa ("V,V,D"), o gap pede "últimos 5 COM placar exato" e o merge substitui SÓ qualitativo→com-placar (nunca regride); coverNote da coleta principal exige placar+mando. (4) **`faltas_cometidas_por_jogo` em `_PLAYER_CRITICAL`** (mercado disciplinar; mesma passagem, zero chamadas extras). Patch de gap transporta os campos novos. Validado no preview: body real da F1 com escanteios no schema + prompt com a regra de placar; card ok |

| **102·motor** | **Pacote vendável `motor/` (sem bump de shell — nada servido ao app muda)**: o dono quer vender só o "motor" (sem front/Worker/hosting). Em vez de duplicar ~5k linhas, `motor/engine.mjs` é uma camada de COMPOSIÇÃO headless que consome os módulos existentes: carrega os classic de dados via `vm.runInThisContext` (mesma ordem do CLASSIC), importa os ESM de domínio (lineup/tab-helpers são side-effect — sem eles `_lineups` sai vazio SEM erro), e sela o contrato `createEngine(config)` → `analyzeMatch(query)` → `{analysis, rawFacts, usage}`. Shims headless espelham as assinaturas do app.js (getReqHeaders etc.); UI vira callback (`onProgress`) ou no-op; storage plugável (memória em Node). Gate de ambiguidade fica no INTEGRADOR (query ancorada `PARTIDA:`). Contrato completo em `motor/SKILL.md` (input/output/garantias/handover). Prova de isolamento: `node tests/motor.mjs` roda análise COMPLETA em Node puro (F1→gaps→verify→F2→normalize, ESPN 404 degradando) — MOTOR ALL PASSED. App intocado |

| **102** | **Chat no motor vendável** (`engine.chat()` + `engine.routeIntent()`): o pacote passa a cobrir a interação do usuário final REUSANDO o chat calibrado do app — `CHAT_BREVITY`/`_chatLooksJson`/`_chatJsonToProse` foram içados p/ escopo de módulo e EXPORTADOS do pipeline-run (alias `_CHAT_BREVITY` preserva call sites; zero mudança de comportamento no app → é a única razão do bump p/ 102). O `chat()` espelha o `runChat`: persona `analystSystemPrompt` + MODO CONVERSA, blocos de grounding (COMPETIÇÕES INFERIDAS / PLACARES VERIFICADOS com regra de autoridade / ESPN / anexo), `fetchVerifiedMatchFacts`+`gatherEspnForChat` automáticos quando o host não injeta contexto, thinking disabled, web_search com os mesmos tetos, guards de saída (strip de raciocínio + JSON→prosa + `cardPresupposedVagueMatch`). Diferença headless: onde o app abre POPUP, o motor retorna `{type:'need_context', reason:'vague_query'|'presupposed_match'}` — o gate vago NÃO gasta LLM. `routeIntent` reexpõe `routeUserIntent` do intent.js. Shim novo: `personaBlock` (vivia no app.js). 15 asserts novos no tests/motor.mjs (gate sem custo, persona real no system, history+blocos no body, JSON nunca cru); SKILL.md com o contrato do chat; regra 9 nova no HANDOFF-ENGENHARIA. Zip 26 arquivos regenerado e revalidado por extração |

| **103** | **Auditoria Palmeiras × Atlético-MG: 2 achados corrigíveis corrigidos** (os demais — escalação não publicada, status de jogadores — são incerteza legítima bem declarada): (1) **lambda com rastro**: regra nova nos DOIS prompts F2 — xG estimado obriga `home_logic`/`away_logic` a se declararem "estimado por proxies…" e toda cifra derivada repete o rótulo ("cifra sem rótulo = estimativa como medição, proibido"); era o buraco entre a regra de estimativa (que já existia) e os campos do lambda. (2) **coerência de dupla chance POR CÓDIGO** (`_fixDoubleChanceCoherence` no normalize, antes da auditoria): o caso real "1X=0.78 mas V(0.55)+E(0.25)=0.80" é reconciliado deterministicamente para V+E **com nota no fundamento** ("[prob. reconciliada por código: V 55% + E 25% (era 78%)]" — documentado, não ad hoc); comparação em p.p. INTEIROS (float 0.80−0.79=0.0100…9 dispararia à toa); tolerância ≤1 p.p. não mexe; sem o trio completo não mexe (nunca inventa componente). 8 asserts novos incl. meta-assert do caso auditado. Bump 103; prompts.js e normalize.js estão no pacote vendável → zip regenerado |

| **104** | **Print real reincidente: "Escanteios · Coletados" só com um time e "10.5 a favor/jogo"** — dupla causa: (1) **plausibilidade**: 10.5/jogo por TIME não existe (é o total do JOGO); a busca trazia o número errado, nada validava, e o **facts-memory memorizava e re-servia** (por isso a reincidência). Fix: `_sanitizeCollectedStats` (pipeline-facts) — faixas por time/jogo (escanteios 1–9.9 · xG 0.1–4.5), fora = null + **lacuna declarada**; roda ANTES do `factsMemIngestRawFacts` (ordem coberta por assert) e também após o patch de gap. (2) **render capenga**: `_cornerChips` só desenhava o lado com dado → agora a seção SEMPRE mostra os DOIS times, lado vazio = "sem dado coletado nesta análise" nomeado (call site passa mandante/visitante). 10 asserts novos; validado no runtime do preview (Palmeiras "sem dado" + Atlético com chips). pipeline-facts está no pacote → zip regenerado |

| **105** | **Auditoria Corinthians × Remo: os 2 graves corrigidos** (as lacunas de escanteios/disciplina eram declaração honesta — coleta pediu, fontes não tinham): (1) **xG=0 fantasma**: o modelo preenchia 0 onde não sabia (o template JSON usa 0.0 como exemplo de FORMA) e 0 é lido como medição — contradizendo o lambda estimado (~1.0). Fix duplo: `_sanitizeAnalysisTeamXg` no normalize (xG do card fora de 0.1–4.5 → null → "—") + regra "XG NUMÉRICO: desconhecido = null, NUNCA 0" nos 2 prompts F2. (2) **Mercados de gols não decorriam dos lambdas**: `_poissonReconcileGoalMarkets` — a filosofia (modelo estima PARÂMETROS, código calcula PROBABILIDADES, como a aba Tática já fazia) estendida a eventos/tickets de mercados PUROS de gols: over/under total X.5, ambas marcam sim/não, "time marca/+0.5" (P≥1 pelo λ do lado). Recalcula por Poisson dos próprios lambdas com nota "[prob. recalculada por Poisson dos lambdas 1.6+1.0 (era 66%)]"; tolerância 1 p.p.; lambdas inválidos = não mexe; **mercados táticos (1X2, cartões, escanteios) ficam com o modelo** — ali contexto legitimamente desvia de Poisson. Ordem no attach: saneia xG → Poisson → dupla chance (103). 13 asserts com Poisson calculado independentemente no teste; validado no runtime do preview (U3.5 0.66→0.74 · BTTS-Não 0.52→0.50 · over do time 0.78→0.80 · xG 0→null). prompts+normalize no pacote → zip regenerado |

| **106** | **"xG marcado 0" ainda na UI (print real, painel Estatísticas Comparativas)** — o sanitizador do 105 corrige análises NOVAS, mas cards ANTIGOS salvos na biblioteca carregam o 0 gravado, e os dois pontos de exibição usavam `xg ?? '—'` — **nullish não pega zero**, então 0 passava direto. Fix na EXIBIÇÃO: `xgDisp` (render.js, mesma faixa 0.1–4.5 do sanitizador) aplicado no `tcard` (aba Desempenho) e nas 4 células do painel comparativo (app.js); assert varre que nenhum `xg??'—'` cru sobrou. Cobre para sempre os cards legados sem tocar no que está salvo. Validado no runtime: card com xG=0 gravado → "—"; 1.24 legítimo segue. App-only (render/app fora do pacote) → zip inalterado |

| **107** | **VARREDURA ANTI-VAZAMENTO DE EXIBIÇÃO generalizada** (pedido do dono: o padrão xgDisp+assert do 106 em toda exibição que precisa). Formatadores: `statDisp(v,lo,hi)` genérico (xgDisp vira wrapper), `pctDisp` (probabilidade ausente = "—", nunca "0%" fantasma; 0 REAL continua "0%"; `||0` fica só nas larguras de barra), `_cornerChips` plausível (0 legado = "sem dado"), `_bancoLbl` no lineup (banco objeto nunca vira [object Object]). **Testes varrem 7 arquivos de UI** (render/app/lineup/tab-helpers/featured/library/report) com 3 famílias proibidas: (A) stat sensível com fallback cru `??/||`, (B) `.map(esc)` sem coerção de rótulo, (C) `(probabilidade||0)*100}%` no texto — cada família com meta-assert provando que a varredura pega o padrão. **A varredura já se pagou na 1ª execução**: achou um 5º "0%" fantasma nos insights do painel lateral (app.js:1706) que o mapeamento manual não viu. Validado no runtime (corner 0→sem dado; pct 0.55→55%, null→—, 0 real→0%). lineup.js está no pacote → zip regenerado |

| **108** | **Auditoria Botafogo × Vitória: xG estimado fora do campo numérico + CONFIANÇA CALIBRADA POR CÓDIGO** — (1) revisão da regra do 105: campo `xg_marcado`/`xg_sofrido` é SÓ medição de fonte; estimativa NUNCA entra no campo (vive nos lambdas/`*_logic` com proxy explícito) — mata a classe "1.3 em B, null em A" que a auditoria cruza. (2) `_calibrateConfidence` no normalize (o dado de lastro é o rawFacts): teto geral (ticket ≤ `confianca_geral`: medio→máx media) + teto de mercado (escanteios sem médias plausíveis / cartões sem stats disciplinares / jogador citado sem números coletados → máx media), rebaixamento sempre ANOTADO no fundamento, e o motivo de MERCADO vence o genérico no empate (mais informativo). Análise bem lastreada com geral alto NÃO é punida (assert). + regra TETO DE CONFIANÇA nos 2 prompts (cinto e suspensório). 12 asserts; validado no runtime (dupla chance alta→media teto geral · escanteios alta→media motivo específico). prompts+normalize no pacote → zip regenerado |

| **109** | **Auditoria Corinthians × Remo: 2 corrigidos + 1 em que o AUDITOR errou** — (1) **prévia com "jogo encerrado 3-0" no contexto** (contaminação de retrospecto): `_sanitizePreviaContext` remove por código a sentença que afirma o jogo analisado como ocorrido (regex `_FINISHED_RE`) e declara a remoção nas lacunas; retrospecto ROTULADO ("no 1º turno…") sobrevive; pos_jogo intocado. + regra CONTEXTO DE PRÉVIA nos 2 prompts. (2) **desfalque × onze simultâneo (Marcelo Rangel) RESOLVIDO por código**: `_reconcileDesfalquesOnze` (roda após `_lineups`) — desfalque FIRME (suspenso/lesionado/cirurgia) sai do onze (vira "A confirmar (era X)") e fica em desfalques; desfalque INCERTO (dúvida/dept. médico/a confirmar) fica no onze, SAI de desfalques e vira item de incerteza impacto alto — um jogador nunca nas duas listas. (3) **o "erro aritmético" do Over 2.5 era do AUDITOR**: 0.53 está CORRETO para λ=2.8 (P(≤2)=e^-2.8·(1+2.8+3.92)=0.47); o auditor chutou ~0.58 sem calcular. Fix: REGRA DE ARITMÉTICA no prompt do `verifyAnalysis` — probabilidade com nota "[recalculada por código]" exige que o auditor REFAÇA a conta com os termos antes de acusar. 14 asserts; validado no runtime. prompts+normalize+pipeline-facts no pacote → zip regenerado |

| **110** | **Sinal de convergência da review corrigido: o AUDITOR virou fonte de falso positivo** — a review do 109 mostrou os "graves" migrando shell a shell (103→109) de defeito real do pipeline para borda cada vez mais fina até cair DENTRO do próprio auditor (ele "corrigiu" 0.53→0.58 de cabeça; 0.53 estava certo p/ λ=2.8). O 109 só remendou a aritmética pontual do Over 2.5 mandando o auditor "refazer a conta" — mas Haiku erra aritmética. Fix de **altitude certa** (filosofia do projeto: *código calcula probabilidade, o modelo não audita a conta*), em `pipeline-facts.js`, DUAS camadas: (1) **prompt** — critério #1 deixa de mandar recomputar e vira só checagem de FAIXA (1X2 soma ~90–110%, limites do critério 4); preâmbulo **"VALORES DECIDIDOS POR CÓDIGO"** declara Poisson/dupla chance/confiança/desfalque×onze como decisão final do código, fora do escopo do auditor. (2) **backstop determinístico** em `_applyAudit` (`_auditIsCodeFalsePositive` gated por carimbo): ressalva que ataca um valor carimbado por código (`recalculada por Poisson`, `reconciliada por código`, `confiança rebaixada por código`, `A confirmar (era … desfalque)`) é DESCARTADA antes de virar "Auditoria (grave):" no card, e rebaixar_confianca só vale se sobrou ressalva legítima. Cirúrgico por TÓPICO+CARIMBO (não número solto): critério (3) exige co-ocorrência desfalque+onze — o teste pegou que "desfalque" solto derrubava uma alucinação legítima sobre um desfalque. 7 asserts novos incl. **meta-assert** (sem carimbo a MESMA ressalva numérica sobrevive → prova que é gated, não cego) e teste que **prova que uma ressalva de lastro genuína NÃO é descartada**. Validado no runtime (v=110, verifyAnalysis exposto, 0 erro). pipeline-facts no pacote → zip regenerado |

| **111** | **Auditoria Coritiba (Robson): RISCO de suspensão ≠ ausência do jogo atual** — segunda classe de falso positivo do auditor (o 110 já cobria valores carimbados). O auditor marcou "contradição interna grave" porque o onze incluía Robson apesar da observação "risco de suspensão (3º amarelo)" — mas um jogador **pendurado** (a um amarelo) está DISPONÍVEL para ESTE jogo; o risco vale para o SEGUINTE (o próprio texto dizia "contra o Bragantino"). Incluí-lo no onze é correto, não contraditório — o modelo de dados já separa isso (`a_um_amarelo_da_suspensao` é campo distinto de `desfalques`, e o reconcile do 109 manteve o jogador no onze → titularidade é decisão do código). Fix em `pipeline-facts.js`, mesmas duas camadas do 110: (1) **prompt** — cláusula "RISCO DE SUSPENSÃO ≠ AUSÊNCIA" no preâmbulo (pendurado fica no onze; só suspensão CUMPRIDA neste jogo é ausência). (2) **backstop** — critério (4) em `_auditIsCodeFalsePositive`: descarta ressalva de "contradição/disponibilidade" com linguagem de RISCO (pendurado/a um amarelo/3º amarelo/pode estar fora), **gated pelos dados** (só se `a_um_amarelo_da_suspensao:true` ou nota "risco de suspensão" existe mesmo nos fatos). Preciso: uma suspensão CUMPRIDA no onze (sem linguagem de risco) **continua sendo apontada** (assert (g)). 4 asserts novos incl. meta-assert ((h): sem pendurado nos dados a mesma ressalva sobrevive → gated, não cego). Validado no runtime (v=111, 0 erro). pipeline-facts no pacote → zip regenerado |

| **112** | **Auditoria Santos × Chapecoense: a própria reconciliação Poisson inflava mercados E carimbava como autoridade** — o dono apontou "probabilidades exageradas se repetindo". Raiz em `_poissonReconcileGoalMarkets` (normalize.js): `calc` casava por palavra-chave sem validar (a) a LINHA de mercados por time — devolvia `1−e^−λ` = P(≥1) para QUALQUER "marca", então "Santos marca +1.5 gol" (≥2, ~57% p/ λ=1.9) saía **85%** (P≥1); e (b) o ESCOPO temporal — "Mais de 1.5 gol no **2º tempo**" caía no regex de total e virava P(total do jogo ≥2) = **82%** em vez de ~46%. Pior: ambos ganhavam o carimbo "[recalculada por Poisson dos lambdas…]", que o **backstop do shell 110 agora BLINDA** do auditor — carimbo indevido mascarando erro. Fix (regra-mãe contra a repetição): a reconciliação **só recalcula/carimba o que mapeia com CERTEZA** a uma fórmula de jogo inteiro. Mercado por time usa a LINHA → `P(time ≥ k)` (`+N.5`→≥N+1, "N ou mais"→≥N, "marca"/"+0.5"→≥1); mercado de PERÍODO (`tempo|intervalo|ht|1t|2t|etapa`) retorna null → **fica com o modelo, sem carimbo** (auditável). Nenhum cálculo novo arriscado: só corrige a linha ou devolve ao modelo — zero regressão (fixture Corinthians×Remo do 105 intacto). 6 asserts novos incl. meta ("85% sumiu, agora ~57%") + período intocado-e-sem-carimbo. Validado no runtime (85→57 carimbado; 2º tempo fica com o modelo; total 2.5 segue 60%). normalize.js no pacote → zip regenerado |

| **113** | **Descritividade dos cards não pode depender do modelo** — o dono notou o Opus escrevendo `fundamento`/`diagnostico` telegráficos vs. o Sonnet expansivo. Investigação: Opus e Sonnet recebem tratamento **byte a byte idêntico** na F2 (mesmo prompt `getSystemPromptPhase2` escolhido por `useEnriched`, não por modelo; max_tokens 9000; thinking disabled; prefill só Haiku). O único delta é `searches` (Opus 3 > Sonnet 2 → mais fatos, não menos). Causa raiz: o contrato dizia QUAIS campos e a exigência FACTUAL, mas nunca um **padrão de extensão** dos campos narrativos — então cada modelo caía no seu default (Opus conciso, Sonnet expansivo). Fix (contrato decide, não o default do modelo): regra "DESCRIÇÃO DOS CAMPOS NARRATIVOS" nos DOIS prompts F2 — `fundamento`/`diagnostico`/`filosofia`/`impacto_mercados`/`ajustes_recentes`/`conclusao` com 1–2 frases completas citando o dado específico + o porquê, nível de detalhe MESMO em qualquer modelo (alvo escolhido pelo dono: igualar ao Sonnet). Zero código de execução tocado. 2 asserts (padrão presente + model-independent nos dois prompts) |

| **114** | **Tema OURO (noir & dourado luxo)** — 4º tema, do mockup do dono (2026-07-24): base quase-preta quente (#0b0804/#241a0c), dourado champanhe (#e6c87a/#c9a24a) como acento único, blobs = luz de vela. Um tema novo exige **5 pontas** (agora com meta-assert): `THEME_IDS` + skin `SETTINGS_PANEL_SKINS` + meta theme-color (app.js) · script anti-flash pré-paint + botão do seletor (index.html) · 4 camadas CSS (`html[data-theme=ouro]` vars globais/spanel/elevação, `body`, `--acard-*`, `.theme-swatch-ouro`) — estrutura idêntica aos blocos verde/mono, herdando defaults Aurora (já âmbar) onde não sobrescreve. Painel de configurações champanhe→bronze com texto escuro. Validado no runtime: `setTheme(ouro)` aplica vars (`--honey #e6c87a`, `--acard-accent`), persiste, sobrevive a reload sem flash, botão ativo no seletor, meta color `#0b0804`. 11 asserts. UI-only (css/app/index fora do pacote vendável) → zip inalterado |

| **115** | **Mobile: puxador + gestos da gaveta lateral** (print do dono: seta na borda esquerda — o drawer existia via burger mas o acesso não era percebido/efetivo): (1) `#sb-edge-handle` — puxador fixo na borda esquerda, meio da tela, chevron dourado, pulso de glow 2× ao carregar; some com fade quando a gaveta abre e volta ao fechar (sincronizado nos DOIS caminhos: toggleSidebar E closeSidebar). Só existe ≤820px (base `display:none`). (2) **Gestos touch passivos** (`initSidebarSwipe`): swipe a partir da borda (início ≤28px, dx>44, horizontal dominante 1.4×) abre; swipe ← com a gaveta aberta fecha; gated a innerWidth≤820; `{passive:true}` não trava scroll. (3) **Animação de popup**: slide com leve mola (cubic-bezier .22,.9,.3,1.08) e backdrop com FADE+blur (antes era display on/off seco). Validado no preview 375px: ciclo completo tap-puxador→gaveta desliza+backdrop 0→1+puxador some → tap-backdrop→fecha+puxador volta; screenshot ok. 10 asserts. UI-only → pacote inalterado |

| **116** | **Review UI/UX completo (skill web-design-reviewer do dono)** — inspeção nos 4 viewports (375/768/1280/1920) + varredura programática (overflow/alt/aria/touch). Desktop/wide/settings/library limpos. 3 achados corrigidos: (P1) **gaveta mobile EMBAÇADA** (dono confirmou) — `.app` tem `z-index:1` (stacking context próprio), então o backdrop no body (z-150) pintava SOBRE o .app inteiro, incluindo a gaveta z-160 presa dentro; fix = backdrop movido para DENTRO do .app (mesmo contexto; medido: 3/3 pontos "BACKDROP"→"gaveta"). (P1) **badge demo estourava o viewport** (423px>375, left -24) e cobria o título — em ≤700px vira faixa fina full-width no topo + clearance do header (`body.demo-on`), estilo escopado no próprio demo.js. (P2) **touch targets 18–26px** → ≥28px em ≤640px (a-ic 21→28, ls-hist-item 26→34, #model-sel-btn 22→30 — era ID, não classe; a 1ª tentativa por classe falhou e foi pega na re-verificação). Nota de preview: cacheFirstAsset com ignoreSearch serve CSS velho ao trocar querystring — validar CSS exige limpar SW. 7 asserts; screenshots antes/depois |

| **117** | **Puxador da gaveta REMOVIDO (decisão de design do dono)** — "o acesso à barra lateral deve ser por scroll horizontal no mobile". Excisão completa do `#sb-edge-handle` (botão no index, regras+keyframes no css, sincronização no app.js) com **assert anti-reintrodução** nos 3 arquivos. O que FICA como acesso mobile: **swipe da borda** (gestos do 115, validado com TouchEvent simulado: touchstart x=10 → touchend x=120 abre a gaveta) + burger no header. Backdrop atrás da gaveta (fix 116) e slide com mola preservados por assert. Testes do 115 reescritos (115→117) |

| **118** | **Auditoria de DESIGN SYSTEM (skill ui-design-system do dono)** — auditoria programática de tokens/contraste/tipografia/hardcoded no css inteiro. Achados: paridade de tokens entre temas era PERFEITA (70 vars idênticas em verde/mono/ouro — validou o processo do shell 114); MAS (1) **`--dim` reprovava WCAG AA** para texto pequeno em aurora (3.26:1) e ouro (3.11:1) → `#758693` (4.76) e `#8a7a55` (4.59), `--acard-dim` junto; (2) **menu/toast/surface NÃO eram tematizados** (9 tokens só no :root — menus e toasts ficavam Aurora em todos os temas) → tematizados nos 3 + use-sites do toast trocam hardcoded por var. **Guard permanente nos testes**: paridade de tokens N×N entre temas (tema capenga reprova) + **contraste AA CALCULADO no teste** (deep/mid/muted/dim ≥4.5 sobre o card, por tema) + meta-assert provando que os valores antigos reprovariam. Recomendações registradas (não corrigidas por escopo): 39 font-sizes distintos sem escala modular; 157 hex hardcoded fora de tokens (maioria legítima em overrides de tema). Validado no runtime nos 4 temas |

| **119** | **Padronização de padrões + dark mode nativo (skill tailwind-design-system — CONCEITOS aplicados em CSS puro, sem migrar de stack)**: (1) **escala tipográfica** `--fs-3xs..--fs-xl` (9–18px) e **radius** `--radius-sm..--radius-pill` como tokens no :root; migração MECÂNICA de 234 font-sizes + 73 border-radius para `var()` — valores idênticos, zero drift visual (meias-medidas 8.5/10.5/12.5 preservadas de propósito); guard nos testes proíbe valor da escala cru voltar. Incidente no meio: o insert das definições falhou silencioso e 300+ usos apontavam para var inexistente — pego pelo próprio assert antes do commit. (2) **dark mode nativo**: `color-scheme:dark` (:root) / `light` (mono) — scrollbar/inputs/autofill do UA seguem o tema; `accent-color:var(--terra)` e `::selection` via tokens (1 regra serve os 4 temas — payoff da paridade do 118); `prefers-reduced-motion` GLOBAL (o antigo só cobria blobs); `<meta name=color-scheme>`. Validado no runtime (fs-2xs resolve 10px idêntico, radius por token, colorScheme dark, accent #d4a04a, ::selection presente) + screenshot sem drift. Recomendações p/ evolução registradas na conversa (OKLCH, camada semântica de superfície, @starting-style) |

| **120** | **OKLCH nos tokens + motion tokens + tipo fluida (3 skills do dono, sem quebrar estrutura)**: (1) **160 tokens de cor convertidos hex→`oklch()`** com matemática exata (Ottosson) e **anotação `/* #hex */` em cada um** (fonte da verdade sRGB); round-trip com **drift ZERO** validado no conversor E no teste (150+ tokens re-verificados a cada run); prova final por **pixel de canvas** nos 4 temas — 8/8 idênticos ao pré-conversão (o "drift" do mono era expectativa errada minha: `--deep` mono sempre foi #1a1a1a). O guard de contraste do 118 lê a anotação hex. (2) **Motion tokens** (animation-systems): `--dur-micro/ui/pop/drawer/enter` + `--ease-out/in/spring`; gaveta e backdrop LIGADOS aos tokens (valores idênticos); **entrada fade+rise do card** (`cardIn` 420ms, só transform+opacity — regra de performance do skill; reduced-motion global anula). (3) **Tipo fluida** (responsive-design): `.a-title` com `clamp(1.22rem→1.55rem)`; par `100dvh` no spanel (único sem fallback). **Progressive-blur: interpretado e NÃO implementado** — 6 camadas de backdrop-filter fixas custam GPU no mobile (pitfall admitido pelo próprio skill) e o app já usa blur no backdrop da gaveta; registrado como opção estética para o hero de landing futura, não para o app denso |

| **121** | **Gaveta lateral ELIMINADA do mobile (decisão do dono)** — "não seja demonstrada mais a barra e nem seja possível scrollar para o lado esquerdo; abaixo consta biblioteca, relatórios, config e chat". A bottom nav É a navegação mobile. Excisão: `.l-sb{display:none}` nos DOIS blocos mobile (820/640), regras `.l-sb.open`/burger mobile/backdrop-fade/mola removidas, gestos `initSidebarSwipe`+`openSidebar` removidos do app.js (toggle/close ficam — call sites de onclick). Testes 117 reescritos (117→121) com anti-reintrodução da FAMÍLIA inteira (handle+swipe+burger mobile) + presença obrigatória dos 4 destinos da bottom nav; asserts de wiring do drawer no bloco 120 ajustados. **Incidente**: regex de excisão comeu os blocos 116 (touch targets) e 119 (dark nativo) juntos — os asserts pegaram na hora e os blocos foram restaurados (guards se pagando de novo). Validado a 375px: sidebar/burger `none`, swipe inerte, `toggleSidebar` forçado não exibe nada, bottom nav com os 4 destinos; desktop 1100px intacto (sidebar inline 199px). O Histórico segue acessível em Relatórios Salvos |

| **122** | **Disclaimer "O agente pode cometer erros…" removido do MOBILE** (pedido do dono; espaço vertical escasso no dock): `.i-disc{display:none}` no media ≤640px. Desktop mantém (block). Validado no runtime: 375px=none · 1100px=block |

| **122·pkg** | **Empacotador com SANITIZAÇÃO** (`tools/package-motor.mjs` — docs/tooling, sem bump): o dono viu o cabeçalho do MANIFEST ("pacote de venda… ficam com o vendedor") no zip do cliente. O repo MANTÉM os comentários internos (histórico vale para manutenção aqui); o zip sai neutro: cabeçalho do MANIFEST reescrito, regex-subs em comentários ("do dono"→produto/API, "vendável" removido, "comprador"→integrador) e **auditoria pós-sanitização que ABORTA se sobrar termo interno** — pegou 2 variantes na 1ª rodada (padrão sem artigo + palavra quebrada em 2 linhas). Novo fluxo de release: `node tools/package-motor.mjs`. Validado: extração → MOTOR ALL PASSED + varredura independente = 0 resíduos |

| **122·pkg2** | **SKILL.md do pacote: "Handover técnico (roteiro da sessão)" → "Checklist de integração (self-service)"** (feedback de review externo: no modelo só-zip, "sessão" soava como call inclusa). Linha explícita: "não inclui call de handover nem suporte contínuo"; passos reescritos em voz self-service (exemplo-integracao.mjs + env ANTHROPIC_KEY). "roteiro da sessão" entrou no FORBIDDEN do empacotador (classe não volta). Zip regenerado e verificado |

| **122·pkg3** | **Falso alarme esclarecido**: o dono reviu "Handover técnico (roteiro da sessão)" — mas o SKILL.md canônico e o zip JÁ estavam corrigidos (122·pkg2); o texto antigo vivia nas pastas locais `_motor_zip_inspect2/3/4` (extrações de zips antigos, untracked). As 3 foram re-extraídas do zip atual. Lição p/ sessões futuras: antes de "corrigir" texto do pacote, conferir se a fonte é o canônico ou uma extração stale — `grep` no `motor/` + no zip decide em 10s |

| **123** | **Técnico não coletado (caso Vitória) + qualidade da justificativa dos cards** — (1) **RESGATE DE TÉCNICO** no fim do `fillDataGaps`: técnico de clube de 1ª divisão é dado PÚBLICO; se após a passagem de gaps seguir vazio, UMA busca dedicada por lado faltante (Haiku, 1 web_search, 400 tokens, "NUNCA invente nem devolva técnico antigo") — lacuna declarada só se até a busca focada falhar. (2) **RÉGUA DE CONCRETUDE** nos 2 prompts F2 (aperta o padrão do 113 que o Opus atendia frouxo): cada fundamento cita ≥2 números/fatos coletados; proxy nomeado com valor; PROIBIDO clichê sem número ("média contida", "jogo aberto"…, com os exemplos do card auditado). (3) **Notas do código separadas do texto**: `[prob. recalculada…]`/`[confiança rebaixada…]` poluíam o fundamento visível — `fundParts`/`fundHtml` no render extraem para linha `.ev-adj` discreta (`--fs-3xs`, itálica, ⚙, tooltip "ajustes deterministas — auditáveis") nos 4 pontos de exibição. 12 asserts; validado no runtime. prompts+pipeline-facts no pacote → zip regenerado pelo empacotador (146.9 KB, zero vazamentos) |

| **124** | **Tags `<cite>` do web_search vazando como texto (print Grêmio × Fluminense: `gols:<cite index=2-5>10</cite>` literal no card) — CONTENÇÃO EM PROFUNDIDADE, 4 camadas**: (1) **choke point** — `parseAnalysisJson` (por onde TODO JSON de LLM passa, inv. 33) ganha `stripCiteDeep` recursivo: strip da família cite/citation/source/ref/antml* mantendo o conteúdo; cobre TODAS as features estruturadas atuais e futuras POR CONSTRUÇÃO. (2) chat prosa (não passa pelo parse) → `stripCites` na saída. (3) render (classic) → `_stripCitesDeep(d)` na ENTRADA do renderResults — cobre cards LEGADOS salvos na biblioteca. (4) prompts (F1 coverNote + 2× F2): "VALORES LIMPOS — nunca copie tags de citação". + **respiro entre seções do card** (`.tab-s+.tab-s{margin-top:1.15rem}` — "Stats por Jogador" colava na seção acima). 12 asserts com o caso real ponta a ponta + `< >` legítimos intocados; validado no runtime (objeto legado limpo, respiro 18.4px). Nota de guerra: bash comeu `/` do regex 2× — a lição "regex por Edit/arquivo, nunca por bash -e" agora vale como regra de sessão |

| **125** | **`<cite>` no TÉCNICO mesmo após o 124 — o strip estava na camada errada.** Print real: `👔 Técnico: <cite index="3-7">Luís Castro</cite>` na aba Escalação. Causa: o poll/botão de escalação re-renderiza chamando `buildEscalacaoTab` **DIRETO** (lineup-confirmed.js:217), fora do `renderResults` onde o strip do 124 morava — mesma classe para cards legados e export. Fix no **CHOKE POINT DE EXIBIÇÃO**: `esc()` (app.js) — por onde passa TODO texto renderizado (~80 call sites em render/lineup/library) — remove a família de tags de citação ANTES do escape, com gate `indexOf('<')` para não pagar regex em texto comum; `escHtml` do export herda (e o fallback standalone ganhou o mesmo strip). Agora nenhum caminho de UI, atual ou futuro, exibe tag de citação. **Sem virar vetor de XSS**: `<script>` continua ESCAPADO (assert dedicado, verificado no DOM real). Validado no runtime reproduzindo o caminho do print (técnico, banco e XI de 11 sujos → todos limpos). Camada de dados (124) permanece — defesa em profundidade real: dados + exibição |

| **126** | **/code-review ultra (base b406494, shells 101–125): 5 achados, 5 corrigidos** — (normal) **bug_001**: guard do `_poissonReconcileGoalMarkets` só barrava "cartao" singular — "Mais de 4.5 cartões do Corinthians" caía no ramo de GOLS e saía ~2% CARIMBADO (e o carimbo é imune ao auditor pelo backstop do 110 — número errado blindado, a pior classe possível); guard agora inclui cartoes/amarelo. (normal) **bug_002**: tablets 641–820px ficavam SEM NENHUMA navegação (sidebar some em ≤820, bottom nav só ligava em ≤640) — `.m-nav{display:block}` + padding do main movidos para o bloco 820; assert novo CRUZA as larguras dos dois media queries (o que o 121 não fazia). (nit) **bug_003**: match desfalque×onze por `startsWith` bidirecional reetiquetava "Silva" saudável por causa de "Silva Jr (suspenso)" — agora igualdade EXATA de key(). (nit) **bug_004**: loop de chat do motor sobrescrevia `text` a cada iteração — prosa emitida antes de `pause_turn` era perdida; agora acumula (teste no motor.mjs com sequência pause_turn→end_turn). (nit) **bug_005**: regex de placar sem X maiúsculo/em-dash/dois-pontos nos 2 call sites → `[xX×–—:-]`. 14 asserts de regressão; validado no preview a 700px (nav visível, main com clearance). Branch `review-baseline` (commit raiz vazio) criado p/ reviews full-codebase futuros |

| **127** | **/code-review ultra (base 165ea68 → main, 2º passe sobre shells 101–126): 2 achados, 2 corrigidos** — (normal) **merged_bug_001**: dois furos no ramo POR-TIME do `_poissonReconcileGoalMarkets`, ambos saindo CARIMBADOS (imunes ao auditor pelo backstop do 110): (a) o guard era só DENYLIST (cartão/escanteio…) — "Chutes ao gol do Palmeiras mais de 5.5" (λ real ~15) caía como P(gols≥6)≈0.05% carimbado; agora o ramo exige palavra de gol/marca (ALLOWLIST, como o mOU já fazia) + chute/finaliz/impediment na denylist + `gols?` obrigatório no mMais; (b) "Fluminense NÃO marca" casava o fallback `/marca\b/` e devolvia P(≥1)=70% quando o correto é P(=0)=30% — inversão em `nao|sem` quando k=1, espelhando o que o ramo BTTS já fazia. (nit) **bug_002**: `_FINISHED_RE` ficou fora da ampliação de separadores do 126 — "terminou 3–0" (en-dash) escapava da sanitização de prévia (garantia do 109); classe unificada `[xX×–—:-]`. 9 asserts de regressão (stat markets intocados, inversão do não-marca, afirmativo preservado, linha legítima ainda reconciliada, en-dash sanitizado). Zip do motor regenerado (normalize.js está no MANIFEST). Cobertura de review: shells 101–127 já passaram por 2 passes; o que NUNCA foi revisado é o histórico d180928..165ea68 (~23,6k linhas), ACIMA do limite de 8k do ultrareview — o branch `review-baseline` existe mas não cabe; auditoria retroativa dessa base só por outro meio (workflow local) se um dia valer o custo |

| **128** | **Review LOCAL multi-agente da base histórica (~15,5k linhas nunca revisadas): 8 revisores por área → 22 achados brutos → verificação adversarial 3 lentes, votação 2-de-3 → 9 confirmados, 9 corrigidos.** (1) render.js: fallback do card de técnico era string de aspas simples — "${hn}"/"${an}" LITERAL na tela quando só um técnico vinha → template literal. (2) render.js: `d.partida` era o ÚNICO campo do card fora do esc() — '<' no título virava HTML vivo no innerHTML → esc() antes do replace do '×'. (3) render.js: faixa lo–hi do 1X2 invertida para Empate/Visitante (pL/pH são cenários da perspectiva do MANDANTE) → min/max por linha. (4) schedule.js: refresh forçado removia chaves AF MORTAS ('brsa_af_fixtures_v1'…) — o cache real é 'meridian_af_fx_'+comp → agenda velha sobrevivia ao refresh explícito. (5) espn.js: chaves datadas (results_<ymd>, espn_<from>_<to>) nasciam por dia/liga e nunca morriam — localStorage até estourar quota (silenciado) → varredura no boot (cuidado real: a janela viva termina em hoje+60, não hoje). (6) featured.js: esc() não escapa aspa simples — "Nott'm Forest" quebrava o onclick (card morto) → escape JS antes do esc(), nos 2 branches. (7) featured.js: _relTime(119.6)="em 1h 60min" → arredonda antes de decompor. (8) library.js: findIndex com fallback assimétrico de comp_id fazia o item duplicar A SI MESMO na união → indexOf primeiro + fallback simétrico. (9) sw.js: matchCache devolvia index.html para QUALQUER miss (JS offline fora do precache recebia HTML como módulo — "MIME text/html") → index-fallback é opt-in só da navegação. 17 asserts novos; validado no runtime (título escapado, _relTime, boot limpo). Zip regenerado. **Pendência**: 10 achados do review ficaram SEM verificação (limite de sessão dos verificadores, reset 19:40) — estão listados como "descartados" no output do workflow mas NÃO foram refutados: streaming UTF-8 do chat, theme-ouro no _syncSettingsTheme, print-report sem tema ouro, JSON.parse cru no fetchVerifiedMatchFacts (inv. 33!), clearAll duplicado, etc. Re-verificar num próximo passe — **FEITO no 129** |

| **129** | **Fechamento da pendência do 128: os 10 achados sem veredito, verificados À MÃO no código (mais barato e mais confiável que outro passe de agentes) → 9 reais corrigidos, 1 falso positivo.** (1+2) **SSE do chat, o mais grave**: `dec.decode(value)` SEM `{stream:true}` e `split('\n')` sem buffer de linha, nos 2 loops (runChat e conversationalFallback) — (a) acento partido entre chunks virava U+FFFD (pt-BR é cheio de multibyte: "análise"→"an�lise") e (b) evento SSE partido entre chunks era **perdido inteiro em silêncio** (metade 1 não parseia → cai no `catch{}`; metade 2 não começa com "data:" → é pulada). O `streamOnce` (F1/F2) já fazia certo desde sempre — só os dois caminhos de CHAT estavam errados. Teste funcional com corte DENTRO do "á" + no meio do evento, mais meta-assert provando que o padrão antigo perdia tudo. (3) **inv. 33 violado** em `fetchVerifiedMatchFacts` (`JSON.parse` cru) justo no caminho alimentado por web_search — DE ONDE vêm as tags `<cite>`; agora `parseAnalysisJson` (ganha strip de cite + reparo de truncado). (4) **cobertura de busca mentia**: `hasStructured` era UM booleano ("veio algum bloco") e cobria tabela E resultados/forma — só com a CLASSIFICAÇÃO na mão, resultados/forma eram marcados cobertos, as buscas puladas E o prompt mandava confiar em "DADOS DA API" inexistentes; agora é por marcador de bloco (`=== CLASSIFICAÇÃO` / `=== RESULTADOS`), com texto vazio → cobre nada → busca tudo (fail-safe). (5) tema **ouro** ficava grudado no painel de Configurações (lista fixa de 3) → derivada de THEME_IDS, à prova do 5º tema. (6) **tranca avançada abria sem senha** se `sessionStorage` jogasse (cookies bloqueados): a leitura estava FORA do try, o handler estourava antes do `det.open=false`. (7) fallback de `comp_id` divergente no featured (`||''` vs `||_activeCompId`) → card de Estatísticas dizia "sem jogos" com o calendário da MESMA liga logo abaixo. (8) print-report sem regra de fundo para o ouro. (9) `clearAll` duplicado na ponte HTML (cosmético). **Falso positivo**: `cardByHid` "sem CSS.escape" — o código JÁ usa CSS.escape e os hid são alfanuméricos por construção; nada a fazer. 20 asserts novos. Lição: verificação adversarial por agentes é boa para TRIAR, mas quando o passe morre no meio, ler o código à mão fecha mais rápido que re-rodar a frota. **VALIDADO COM API REAL** (`motor-real-test/run-streaming-real.mjs`, gitignored): o script EXTRAI o loop do pipeline-run.js em vez de reimplementá-lo, reconstrói o pré-fix pelo inverso das 2 mudanças e passa os dois pelos mesmos bytes. Resultado (43 chunks, 8311 bytes, 2371 chars, 83 acentuados): passada 1 (chunks reais) — **os DOIS íntegros**, a API entregou ~193 B/chunk alinhado com os eventos; passada 2 (re-chunk de 1 byte) — novo íntegro, **pré-fix devolveu 0 chars (perda TOTAL)**. Leitura honesta: o bug é LATENTE e condicional à fragmentação, não "sempre quebrado" — mas quando um evento parte (rede lenta, mobile, re-buffer do proxy Worker no meio), o pré-fix não degradava, ele **perdia tudo em silêncio**. Por isso o teste de 1 byte existe: uma resposta só não prova ausência do bug |

| **130** | **3 das 4 frentes recomendadas, executadas juntas (a 4ª — review do app.js — roda em workflow).** **(F2 → descritor estruturado de mercado)**: a F2 agora emite `"mercado":{tipo,time,linha,direcao,negacao,periodo}` em CADA evento/ticket (regra + schema nos 2 prompts), e `_poissonReconcileGoalMarkets` casa POR CAMPO (`calcDesc`) — a escada de regex furada 3× (112/126/127) virou fallback SÓ para cards legados sem descritor; com descritor presente a regex NUNCA opina (nem quando o texto casaria). REGRA-MÃE preservada nos 2 caminhos: período≠jogo, linha inteira de total (push), tipo fora de gols, descritor incompleto → null → valor do modelo fica. 20 asserts de comportamento incluindo os 3 casos exatos que furaram os reviews. **(Testes de comportamento)**: asserts de regex sobre invariantes convertidos em execução real onde extraível — `_luWorseFonte` (ranking de fonte da escalação provado por resultado), `_relTime` (boundary de 60min provado por chamada); os sweeps de lint com meta-assert (104-107) ficam, são outra categoria. **(Contador de falhas silenciosas)**: `meridianFail(tag)`/`meridianFailText()` em source-telemetry.js, linha "Falhas silenciosas (sessão)" no painel avançado (`#fail-counters`), fiado nos catches que já esconderam bug real: 2× SSE do chat + streamOnce (`sse-chat-parse`/`sse-f2-parse`), quota de cache (espn/cached-fetch → `cache-write`), memória de fatos (`facts-mem-write`). Chamada sempre `globalThis.meridianFail?.()` — opcional, nunca lança, ordem de carga irrelevante. Validado no runtime: descritor "não marca"→0.30 ao vivo, contador chega ao painel. Zip 152.1 KB |

| **131** | **Frente 4/4: 2º passe de review no app.js POR ÁREA (4 revisores × verify 3 lentes, 34 agentes) → 10 achados, 10 CONFIRMADOS (zero descartados — densidade 5× o passe único do 128, hipótese "cobertura rala nos arquivos grandes" confirmada), 10 corrigidos.** (1) alias de 1ª palavra em `_registerTeamLogo` dava o brasão do Atlético-MG ao Atlético Nacional (Série A+Libertadores coexistem) — alias REMOVIDO, só chave exata + aliases explícitos do seed. (2) URL de brasão de API externa crua em `src="${url}"` → esc() nos 2 builders. (3) `_ctxResumeMode` não resetava no cancelamento do popup — chat vago posterior herdava 'analysis' e pergunta de opinião virava card completo; agora cancel reseta, destino fica guardado em `_lastCtxPromptPayload._dest` e o reopen restaura. (4) pops do `_chatThread` em ordem fixa deixavam user duplicado no fio no caminho cancelar→reabrir → poda de stubs em LOOP. (5) trocar idioma com Configurações abertas deixava PT/EN invertidos (inline !important do skin vence a classe) → applyLang repinta o painel visível. (6) initDataKeys tinha as 4 ÚNICAS leituras de localStorage sem try do arquivo — storage bloqueado matava TODO o script clássico dali pra baixo (textarea/histórico/tema mortos) → `_lsGet` tolerante. (7) teto de 6 anexos burlável por seleção múltipla (checagem síncrona × push assíncrono do FileReader) → checagem movida para `_pushAtt`. (8) modo desempenho auto-ativava por falso positivo ao trocar de aba durante a amostra de FPS (rAF pausa → delta gigante = "engasgo") → aba oculta/delta>1s descarta a amostra. (9) tranca avançada: senha CERTA não destravava com storage bloqueado (setItem lançava antes do det.open=true) → destrave primeiro, persistência opcional em try próprio. (10) timer do stopThinking lia a variável global — startThinking em <1s (clique rápido no popup) perdia o indicador da execução NOVA → captura o elemento no closure. 24 asserts (brasões, teto de anexos, timer stale e poda do fio POR COMPORTAMENTO — extração com stubs); validado no runtime (alias morto, src escapado, 10 pushes→6). Zip regenerado |

| **132** | **Obviedade mediada (dor do dono, prints Corinthians×Athletico: "Ambos batem ao menos 1 escanteio 86%" vendido como insight).** O problema não é o número — é o card não se dar conta da obviedade, frustrando quem opera o agente. Duas camadas, no padrão do produto (prompt orienta, código GARANTE): **(código)** `_tagObviousMarkets` no normalize (roda DEPOIS do Poisson, sobre a prob final): prob ≥0.80 OU estrutura trivial ("ao/pelo menos 1/um…", "mais de 0.5") → `e._obvio`, nas 4 listas (eventos, tickets, cartões, escanteios); pós-jogo fica de fora (prob 1.0 lá é retrospecto). Render: `obvChip` → selo discreto "âncora · odd baixa" (tooltip explica: segurança para múltipla, não o diferencial da análise) nos 4 construtores de linha; estilo `.ev-anchor` rebaixado de propósito (aviso, não destaque). **(prompt)** "RÉGUA DE VALOR" nas 2 variantes F2: máx UM mercado-âncora por seção; fundamento ABRE reconhecendo a obviedade; PROIBIDO "probabilidade alta por padrão/lógica de confronto" como fundamento; o valor da análise vive na faixa ~45–75%. E o exemplo trivial "Ambos os times batem ao menos 1 escanteio" SAIU do cardápio de escanteios dos prompts (o prompt CONVIDAVA o problema) → substituído por "Mais de 2.5 escanteios de cada time". 12 asserts com os 3 casos exatos dos prints (86% marca; 72% "ao menos um cartão" marca POR ESTRUTURA mesmo <0.80; 74% "menos de 3.5" NÃO marca — linha informativa); validado no runtime (2 selos no card de teste, linha informativa limpa). Nota de guerra: o lint de radius do 119 pegou meu `border-radius:999px` cru → token `--radius-pill` (o guard funciona). Zip 152.8 KB. **VALIDADO COM API REAL** (`motor-real-test/run-ancora.mjs`, gitignored · Corinthians×Athletico-PR, 24 mercados, 228s): **(C) 12/12 eventos+tickets com descritor `mercado`** — validação mais forte da rodada, prova que alteração de prompt da F2 CHEGA e é obedecida em produção (o descritor do 130 substituindo a regex reincidente funcionou em 100%). **(A) 0 de 24 marcados como âncora** — NÃO é bug: rodei `_tagObviousMarkets` contra a cópia exata que o teste usou e ela acende nos casos dos prints (86% e 72% marcam, 74% não), logo zero = o modelo não propôs obviedade. Antes do 132 o mesmo tipo de confronto produzia "ao menos 1 escanteio 86%" — a régua funcionou NA ORIGEM, evitando a obviedade em vez de precisar rotulá-la. **(B) os três ✅ da régua passaram VACUAMENTE** — sem âncora não havia o que violar; a obediência às sub-regras (máx 1/seção, fundamento assume, sem clichê) segue NÃO exercitada em produção, só em teste unitário. **Pendência honesta**: a distribuição por faixa não foi conferida nesta rodada (saída recortada no print) — o script foi ajustado para imprimir máxima/mediana/faixas e se auto-declarar CONCLUSIVO (nada ≥80% nem trivial) ou FALHA DO MARCADOR, sem depender de scrollback. **Armadilha real do preparo**: `motor-real-test/` tinha cópia própria do motor parada no shell ~112 — sem `_tagObviousMarkets` nem a régua; rodar assim daria "0 âncoras" por CÓDIGO VELHO e eu teria lido como obediência. 23 arquivos sincronizados antes de rodar. Regra que fica: **em pasta espelhada, `diff` contra o canônico ANTES de qualquer teste real** (mesma classe do falso alarme do SKILL) |

| **133** | **Frente 1 (a última das 5 recomendadas): motor VERSIONADO + CHANGELOG do integrador.** O problema: o pacote não tinha carimbo nenhum — o cliente não sabia qual build tinha e nós não tínhamos como dizer "atualize, sua versão erra probabilidade de mercado de cartão". Desde o zip entregue, 126/127 corrigiram probabilidades ERRADAS (cartões por time ~2%; "não marca" invertido 70%↔30%) e 129 corrigiu perda de texto no chat — tudo silencioso para quem estava com cópia velha. Agora: **`MOTOR_VERSION = '1.0.0'`** exportado do engine (fonte única) + `createEngine()` devolve `version` (checagem em runtime, sem ler arquivo); **`motor/CHANGELOG.md`** na língua do integrador — sem numeração de shell, sem vocabulário interno, agrupado por impacto, com ⚠ nas correções que MUDAM NÚMEROS (avisando que diffs de snapshot são legítimos) e um aviso no topo: "se o seu engine.mjs não exporta MOTOR_VERSION, você está numa cópia anterior"; empacotador lê a versão do engine e **carimba no cabeçalho do MANIFEST**, com DOIS guardas que abortam o build (exit=1, testados): engine sem MOTOR_VERSION, e CHANGELOG cujo topo não documenta a versão atual — carimbo sem nota do que mudou é metade do valor. 8 asserts no motor.mjs (semver, runtime, CHANGELOG no MANIFEST e sincronizado, linguagem limpa, ⚠ presente, guardas do empacotador). **Achado de brinde**: escrever o teste revelou que `createEngine()` só roda UMA VEZ POR PROCESSO (os classic reavaliam no mesmo contexto VM → `SyntaxError: Identifier already declared` na 2ª chamada) — restrição real de integração que NÃO estava documentada; agora está no SKILL, com a orientação de reusar a instância e usar `setCompetition()` em vez de criar outro motor. Zip 156.5 KB · 27 arquivos · auditado extraído (versão no MANIFEST e no engine, CHANGELOG presente, zero vocabulário interno) |

| **133·docs** | **Revisão de fidelidade do mestre (docs/tooling, sem bump — nada servido muda).** Gatilho: o dono pediu "revise handoff" ao trocar de modelo. O corpo técnico estava íntegro (linha do tempo, invariantes e Estado atual mantidos pelas sessões 114–133), mas o **cabeçalho tinha apodrecido**: anunciava `SHELL_VERSION: 92` e HEAD do shell 91 — **42 shells atrás** — bem acima de um checklist que já dizia 133. Uma sessão nova que confiasse no topo (o lugar que todo mundo lê primeiro) bumparia de 92. Também: §15 dizia 16 classic e omitia `demo.js` **contradizendo a própria linha do tempo do 98** (`classic: 17`); §17 e o prompt-pronto mandavam rodar só `run.mjs`, deixando `motor.mjs` — o produto VENDIDO — fora do fluxo obrigatório; PARTE VII não tinha **uma linha sequer** do subsistema `motor/` após 8 shells de trabalho nele; PARTE VI dizia "(1–20+)" com 36 invariantes; PARTE V parava no 84 sem apontar a continuação. Tudo verificado contra o código, não presumido (Pages `?v=133`, Worker `/health` com origin_gate+rate_limit, as 2 suítes verdes, `CLASSIC.length`, `MOTOR_VERSION`). Lição que fica: **o cabeçalho é a parte que mais mente** — quem atualiza a linha do tempo esquece o topo, e o topo é o que a sessão nova lê primeiro. No fim de cada shell, conferir versão/HEAD do cabeçalho junto com o bump |

**Dor do dono (print `suigsuigns.png` · Coritiba×Palmeiras) — RESOLVIDA no shell 87:** o mapa aparecia com ambos em `4-2-3-1` e elenco especulativo. Hoje: proveniência por time (badge api/pesquisa/modelo/inferida), chip de formação só com fonte confiável, proibição de espelhar formação sem lastro, e XI **confirmado** substituindo o especulativo na janela de jogo (AF > ESPN starters), com botão/auto-poll determinístico. Se reaparecer formação idêntica nos dois times **sem** badge `api`, é regressão do invariante 34 — investigar `_luWorseFonte`/coverNote, não "ajustar o prompt".

**Não reabrir:** resgate Haiku F2, monólogo, html2pdf, badge A/B/C dock, budget>0 F2, V1/`meridian-proxy`, reimplementar PARTE IX do zero.

## Prompt pronto — **USE ESTE** (sessão nova, shell 133)

⚠️ **Os prompts de PARTE IX e PARTE X saíram daqui de propósito** — ambas estão **FEITAS** (shells 85 e 87). Colar aquele prompt de novo faria a sessão reimplementar o que já existe. Os textos originais seguem no git history (`git show d0cec90` / `f24db4e`) e as especificações continuam nas PARTES IX/X abaixo, como **referência histórica**.

```text
Abra C:\Users\Gabriel\Projetos\Meridian-v2 (branch main, shell 133).

Leia OBRIGATORIAMENTE, antes de tocar em código:
docs/HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md  (mestre canônico até o shell 133)
Se a tarefa for de Worker/secrets, leia também HANDOFF-V2-SHELL-65 e 67.

Contexto em uma frase: SPA de futebol multi-liga, ESM + classic sem bundler, dual-mode
(análise padrão de 7 abas via runAnalysis × chat em prosa via runChat, roteado por
código em intent.js), coleta estruturada anti-fantasma (A/B/C), Worker Cloudflare real
(meridian-v2-proxy) com secrets AF/FD e chave Anthropic por navegador.

Estado: PARTES IX (paridade de coleta) e X (escalação honesta + XI confirmado
match-day) estão FEITAS — são histórico, não backlog. Não reimplementar.

Invariantes duros (lista completa na PARTE VI — os que mais quebram):
- v1 / meridian-proxy intocáveis; nunca deployar worker com o nome do v1.
- Dual-mode: intent.js decide; chat nunca vira card de 7 abas.
- MODEL_PROFILES budget 0; default claude-sonnet-5; thinking {type:'disabled'} explícito.
- Prefill '{' SÓ em Haiku (_prefillOk=/claude-haiku/); todos os outros dão 400 → use
  structured outputs. Thinking = {type:'adaptive'} + output_config.effort (budget_tokens
  e temperature dão 400 nos modelos atuais). Resgate = Opus 4.8 com SO, sem prefill.
- Ponte classic→ESM só com var/function/expose (const classic não chega ao window).
- Todo parse de JSON de LLM via parseAnalysisJson.
- Escalação: proveniência honesta (api>pesquisa>modelo>inferida); poll sem Anthropic.
- Teste anti-regressão precisa de meta-assert que prove que ele reprova.

Fluxo obrigatório da sessão:
1. node tests/run.mjs (ALL PASSED) E node tests/motor.mjs (MOTOR ALL PASSED) antes de
   mudar qualquer coisa.
2. Implementar o objetivo abaixo.
3. Bump SHELL_VERSION em 4 pontos (version.js, sw.js, index.html ?v= ×2) se mexer em
   asset servido; classic novo → main.js CLASSIC + sw.js precache.
4. As DUAS suítes de novo + validar no preview (console limpo). Se tocou em módulo
   compartilhado (normalize/pipeline-*/prompts), regenerar o zip:
   node tools/package-motor.mjs
5. Atualizar ESTE handoff (timeline + invariante novo se houver) no MESMO push.
6. commit + push origin main; me informar path do handoff + hash.

Quero que você: [OBJETIVO AQUI]
```

## Próximos passos (produto)

| # | Item | Status |
|---|------|--------|
| 1–6 | Shells 80–84 | **FEITO** |
| 7 | PARTE IX paridade coleta | **FEITO** shell 85 |
| 8 | SW network-first JS | **FEITO** shell 86 |
| **9** | **PARTE X — proveniência + elenco match-day/live** | **FEITO** shell 87 (`d0cec90`) |
| 10 | Code-review 87–89: achados médios (4) | **FEITO** shell 90 (`37ff562`) |
| 11 | Code-review 87–89: achados baixos (4) | **FEITO** shell 91 (`a824bdb`) |
| 12 | UI para trocar a senha avançada | **FEITO** shell 92 (override `meridian_adv_hash` no localStorage; hash público exibido p/ fixar no código) |
| 13 | Rate-limit no Worker | **FEITO** 92·worker (binding nativo; validado em produção 30×200→429) |
| 14 | Regenerar secrets AF/FD (zelo — passaram por conversa) | aberto (a chave ANTHROPIC do teste do motor já foi rotacionada em 2026-07-23; AF/FD seguem pendentes) |
| 15 | Thinking na F2 com structured outputs | shells 93–97 → **REMOVIDO no shell 100** a pedido do dono (todas as gramáticas recusadas; ver inv. 36) |
| 16 | Pages servindo a shell corrente | **CONFIRMADO 2026-08-05 em `?v=133`** — `mzzei.github.io/Meridian-v2` serve `?v=133` e `js/version.js` com `SHELL_VERSION='133'`; Worker `/health` → `origin_gate:true` + `rate_limit:true`. O Pages segue `main` (auto-deploy no push, ~1–2 min). Conferência: `curl -s https://mzzei.github.io/Meridian-v2/ \| grep -o "?v=[0-9]*" \| sort -u` — **reconferir a cada push**, é o único jeito de flagrar deploy parado |
| 17 | Freeze ao trocar liga das estatísticas durante a análise | **FEITO** shell 94 (`fromSelector` em `setStatsComp`) |
| 18 | Contrato da API (adaptive thinking + prefill só Haiku) | **FEITO** shell 95 — inv. 30 e 36 reescritos; 3 caminhos validados no preview (stub) |
| 19 | "compiled grammar is too large" no F2_SCHEMA | encerrado: recurso **REMOVIDO no shell 100** (96=$defs e 97=agrupamento também recusados) |
| 20 | `★ [object Object]` na aba Desempenho | **FEITO** shell 96 (`_listLabel` em jogadores_chave/desfalques) |
| 21 | Demo para calls de handover | **FEITO** shell 98 (`?demo=1` — fixtures locais, zero API, badge, streaming simulado) · roteiro da call em `docs/DEMO-ROTEIRO-HANDOVER.md` (ordem das telas, fala por aba, perguntas prováveis, plano B em camadas) |
| 22 | Lacunas da auditoria (escanteios/xG/placar exato/faltas) | **FEITO** shell 101 (coleta + gap pass + paridade template↔schema) |
| 23 | Substituir Meridian v1 pelo v2 (pós-Copa) | **DECIDIDO 2026-07-23**: privar o repo do v1 no GitHub (desliga o Pages — sem redirect, link antigo vira 404) e deixar o worker `meridian-proxy` de pé por ora. Pendência de zelo SEM prazo: o worker v1 não tem trava de Origin e carrega secrets AF/FD (mesmas chaves do v2 → cota compartilhada) — quando o dono quiser, `npx wrangler delete meridian-proxy` ou `wrangler secret delete AF_KEY/FD_KEY --name meridian-proxy` (login dele; NUNCA por sessão do agente). v2 intocado |
| 24 | Pacote de venda do motor (Skill/Input/Output/handover) |**FEITO + VALIDADO COM ANÁLISE REAL (2026-07-23)**: pacote extraído do zip rodou Botafogo × Vitória ao vivo em Node — ANÁLISE REAL OK, 123s, coletaOk true, fonte pesquisa, 7 tickets, 3 lacunas declaradas (vs ~7 da auditoria de ontem; placar exato OK, xG declarado como estimado; escanteios ainda null neste run — busca não trouxe, lacuna declarada). `motor/exemplo-integracao.mjs` entrou no pacote (26 arquivos). Chave do teste **JÁ ROTACIONADA** pelo dono (2026-07-23) · **shell 102**: chat do aluno no pacote (engine.chat/routeIntent, reuso do runChat) |

---

# PARTE IX — Plano de paridade de coleta V1 → V2 (IMPLEMENTADO — shell 85, `f24db4e`)

**Status:** **IMPLEMENTADO no shell 85** (P0–P3 abaixo viraram código; este texto permanece como especificação/racional).

## 0. O que o shell 85 entregou (resumo de implementação)

| Fase | Entregue |
|------|----------|
| **P0** | Cascata ADAPTATIVA em `_phase1CascadeLayerA`: **AF full primeiro** quando `afReady()` e `!afSeasonBlocked(comp)` (com `afEnrichCoachLineup` no caminho, espírito V1) → FD → ESPN (rede de segurança imutável). `afSeasonBlocked`/`_afMarkSeasonBlocked` em football-apis (mem + sessionStorage; `var`, inv. 31), marcada pelo próprio `fetchAf` quando o Free devolve "not have access to this season" — não re-gasta cota na mesma sessão. Throttle `AF_MIN_GAP_MS` intacto. Camada B (minimal/coach-only) inalterada. |
| **P1** | coverNote DURO (paridade V1): tecnico+formacao+onze(11)+banco+desfalques dos DOIS times = prioridade máxima; vazio = falha de busca; proibido inventar nome. `fillDataGaps` agora tem `_teamLineupGaps` (dispara com técnico vazio OU onze<11 OU banco vazio), schema do patch com tecnico/formacao/onze_provavel/banco, merge via `_TEAM_LINEUP_FILL`, `max_tokens` 2500. Floor de 2 buscas na F1 quando o perfil pede 1 e cobertura B/C baixa (`_bcLow`). |
| **P2** | `attachAnalysisDerived`: onze/banco também do **JSON F2** (preferência rawFacts F1 > F2 > vazio; nunca inventa). `parsed._lineupsFonte` = `'pesquisa'`\|`'modelo'`; render mostra o mapa com disclaimer "Estimativa do modelo…" quando fonte=modelo, em vez de empty injusto. Empty + diag continua quando NINGUÉM trouxe onze. |
| **P2-bug** | **4º ASSASSINO SILENCIOSO:** `lineup.js` referenciava `_lvKey` (que vive no MÓDULO pipeline-facts, não no global) → `normalizeLineupTeam` **SEMPRE** lançava ReferenceError → try/catch do attach engolia → `_lineups` **nunca** era montado → **aba Escalação vazia MESMO com dados** (explica os prints dos shells 83–84!). Fix: `_luKey` local em lineup.js. Série completa: MODEL_PRICE (79), prefill (79), ctSideSection (82), _lvKey (85). |
| **P3** | Status F1 já listava fontes (`Fontes: … · API-Football (técnico/escalação)`). 15 asserts novos em tests/run.mjs (cascata AF-first, flag season, coverNote, floor, lineup gaps, onze F2, fonte, _luKey local). Shell 85; ALL PASSED; validado e2e no preview (F2-only → mapa fonte 'modelo'; rawFacts → 'pesquisa'). |

**Staleness de SW — RESOLVIDO no shell 86 (`6099fda`):** os imports ESM internos (lineup.js etc.) não carregam `?v=` e o cache-first servia módulo VELHO na transição de SW — caso real: o fix do `_lvKey` (85) não chegou ao usuário (print Coritiba x Palmeiras 23:49, Escalação ainda vazia) até `?resetsw=1`. Fix definitivo: `networkFirstJs` no sw.js — **todo `.js` é network-first** (online = fresco; offline = cache, PWA preservado); demais assets seguem cache-first. Uma última recarga dupla pode ser necessária para o PRÓPRIO sw.js 86 assumir; daí em diante a classe de bug morre. Nota: "PRÉVIA" no card Coritiba x Palmeiras estava CORRETO (ESPN: jogo 22/07, status pre).

---

Especificação original (mantida como referência):

**Implementação:** FEITA no shell 85 (`f24db4e`) — texto abaixo é referência histórica; o prompt original saiu da PARTE VIII para não ser reexecutado (está no git history).
**V1:** só leitura em `C:\Users\Gabriel\.claude\projects\Agente Copa 2026\index.html`. **Nunca** mergear v1 no v2.

## 1. Por que o V1 “coletava impecável” e o V2 não

| Fator | V1 (Copa) | V2 (multi-liga) hoje |
|-------|-----------|----------------------|
| Escopo | 1 torneio | 5 ligas de clubes |
| Cascata A | **AF → FD → ESPN** | **FD → ESPN → AF full só se A vazia** |
| AF season 2026 | Útil na Copa | Free costuma **bloquear** season de clubes |
| Técnico/lineup | `afEnrichCoachLineup` no caminho AF | Minimal / coach-only; lineup raro |
| Buscas F1 | tópicos WC densos + coverNote duro | 1–3 buscas; coverNote mais brando |
| Escalação UI | alimentada por rawFacts AF+busca | `_lineups` **só** de rawFacts F1 (`attachAnalysisDerived`) — F2 com onze não salva a aba se F1 nula |
| Código | monólito estável | modular + regressões 79–84 (mitigadas) |

**Conclusão:** gap principal não é “Haiku pior”; é **fonte determinística B fraca** + **mapa de Escalação sem fallback F2** + cascata que **economiza AF** demais.

## 2. Objetivo de produto (aceitação)

1. Quando AF estiver útil (chave/Worker e season acessível): **técnico ± lineup** no bloco API com frequência próxima do V1.  
2. Quando AF Free bloquear season: **coach via `/teams`+`/coachs`** sempre tentado; ESPN garante A; web_search cobre resto.  
3. Aba **Escalação** renderiza se **qualquer** de: AF lineups, rawFacts F1, ou onze no JSON F2 (com disclaimer honesto).  
4. Empty Escalação só se **ninguém** trouxe onze — com diag se F1 falhou.  
5. Sem regressão dual-mode / F2 Opus rescue / PDF / tests.

## 3. Arquivos a tocar (implementação)

| Arquivo | Mudança |
|---------|---------|
| `js/data/phase1-context.js` | Cascata adaptativa AF; flag season blocked; status human |
| `js/data/football-apis.js` | Detecção erro season Free; enrich sempre que possível; cache flag |
| `js/analysis/pipeline-facts.js` | coverNote duro; floor searches; fillDataGaps mais agressivo |
| `js/analysis/normalize.js` | `_lineups` também do JSON F2 |
| `js/analysis/render.js` | empty-state só se sem lineups de verdade; disclaimer fonte |
| `js/analysis/lineup.js` | helpers se precisar derivar pitch do F2 |
| `tests/run.mjs` | asserts P0–P2 |
| `js/version.js` + `sw.js` + `index.html` | shell **85** |
| este handoff | pós-implementação |

## 4. Fases (ordem obrigatória)

### P0 — Cascata / AF (maior ROI)

**Hoje** (`phase1-context.js`):

```
FD → ESPN → AF full só se !fdCtx
(+ em paralelo free registry)
(+ AF layer B minimal se cascade ≠ af)
```

**Alvo (espírito V1, multi-liga safe):**

```
1. free registry (paralelo, como hoje)
2. Se afReady && !afSeasonBlocked[comp]:
     tentar AF standings+fixtures
     se texto útil → source=af + afEnrichCoachLineup (full)
3. Se A ainda fraca/vazia → FD (se ready)
4. Se A ainda fraca/vazia → ESPN (rede de segurança)
5. Se source ≠ af full → afEnrichCoachLineupMinimal (coach+lineup perto do jogo)
   senão se fixtures vazias por Free → _afCoachOnlyFallback
6. Se AF retornar erro de season → set afSeasonBlocked[comp]=true (session/localStorage curto)
```

**Regras:**

- Não chamar standings AF em loop se blocked.  
- Throttle `AF_MIN_GAP_MS` intacto.  
- ESPN **nunca** deixa de ser fallback.  
- Anti-fantasma: silent ≠ lacuna.

### P1 — Fase 1 LLM mais completa

Em `gatherFacts` / system prompt F1:

- Prioridade máxima: `tecnico`, `formacao`, `onze_provavel` (11), `banco`, desfalques.  
- Texto no espírito V1: vazio nesses campos = **falha de busca** se a página tinha o dado; **proibido inventar nome**.  
- `fillDataGaps`: disparar quando técnico vazio **ou** onze com length &lt; 11 em qualquer time.  
- Floor de buscas: se `effort.searches < 2` e cobertura B ou C baixa pré-busca, usar `max(searches, 2)` (só F1; sem UI de esforço).

### P2 — Escalação resiliente

`attachAnalysisDerived(parsed, rawFacts)` hoje monta `_lineups` **só** de `rawFacts`.

**Alvo:**

```
_lineups =
  fromAfBlock se existir
  || fromRawFacts(rawFacts.mandante/visitante)
  || fromParsedF2(parsed.mandante/visitante)  // NOVO
  || null
```

Render:

- Se `_lineups` ok → mapa (disclaimer: “API confirmada” vs “pesquisa F1” vs “estimativa do modelo F2”).  
- Se null e `_coletaOk===false` → empty + `_fallbackDiagLine`.  
- Se null e coleta ok → empty “sem cobertura de imprensa” (como hoje).

### P3 — Testes, shell, handoff

- Asserts de string/fluxo (cascata, derived F2, proibições).  
- Shell 85.  
- Atualizar PARTE VIII/IX status → FEITO onde couber.  
- commit + push.

## 5. O que NÃO fazer nesta feature

- Plano pago AF obrigatório (código deve **aproveitar** se existir, degradar se Free).  
- Copiar monólito V1.  
- `allowed_domains`.  
- Thinking budget F2.  
- Mentir cobertura (anti-fantasma).

## 6. Critérios de teste manual (dono / Claude)

1. Hard reload shell 85.  
2. `Flamengo x Palmeiras` (brsa) com Worker+AF: ver status F1 com fontes; aba Escalação com mapa **ou** diag honesto.  
3. Mesmo jogo sem AF key: ESPN + busca; não crash.  
4. Caso F1 falhe parse mas F2 JSON tenha onze: **mapa deve aparecer** (P2).  
5. `node tests/run.mjs` PASS.

## 7. Estimativa de shells

| Shell | Conteúdo sugerido |
|-------|-------------------|
| **85** | P0+P1+P2+P3 mínimos (paridade utilizável) |
| **86** | SW network-first JS — **FEITO** |
| **87+** | PARTE X (proveniência + match-day/live) — ver **PARTE X** |
| depois | senha avançada, rate-limit Worker |

---

# PARTE X — Escalação honesta + elenco match-day / ao vivo (FEITO · shell 87, `d0cec90`)

**Status:** **IMPLEMENTADO no shell 87** (Q0–Q4). Texto abaixo mantido como especificação/racional.

## 0. O que o shell 87 entregou

| Fase | Entregue |
|------|----------|
| **Q0** | Proveniência POR TIME (`api`>`pesquisa`>`modelo`>`inferida`). `normalize.attachAnalysisDerived` calcula `fonte` + `formacaoFonte` de cada time (rawFacts confirmado=api · rawFacts web=pesquisa · só F2=modelo · nada=inferida); `parsed._lineupsFonte` = **pior** dos dois (`_luWorseFonte` em lineup.js). `_pitchTeam`: badge de fonte (`.pitch-src-*`) + chip de formação HONESTO — número só com fonte confiável; `modelo` → "4-2-3-1 · não confirmada"; `inferida` → **sem chip** (não inventa número). coverNote F1 + fillDataGaps proíbem **espelhar** a mesma formação nos dois times sem lastro próprio. |
| **Q1/Q2** | `js/data/lineup-confirmed.js` (novo classic, **ZERO Anthropic**): `espnStartersFromSummary(summary)` + `getAfLineups(fixtureId)`; precedência **AF confirmada > ESPN starters > especulativo**; banco da fonte confirmada. `isMatchDayWindow` = −6h…FT+2.5h ou status ESPN `in`. `applyConfirmedLineups(parsed)` roda no `runAnalysis` **após** attach e **antes** do render (determinístico); TTL curto 45s na janela, 15min fora. `refreshAnalysisLineups(hid,cardId)`: botão "↻ Atualizar escalação" + **auto-poll 75s** (para em FT), re-render SÓ da aba via `buildEscalacaoTab` isolado, persiste no history. **Nunca** reabre F1/F2. |
| **Q3** | `live.js`: removido o default enganoso `'4-3-3'` (mostra `n/d` quando a fonte não traz formação); reusa `espnStartersFromSummary` (DRY); geometria neutra (`_lv_lines`) só p/ desenhar os pontos, sem rotular formação fantasma. |
| **Q4** | 20 asserts novos; SHELL_VERSION 86→87; novo classic no boot (main.js CLASSIC), no precache (sw.js SHELL). Validado e2e no preview: mandante pesquisa + visitante modelo → rodapé modelo, chip "não confirmada"; AF>ESPN comprovado; janela live/futuro OK; console limpo. |

**Precedência final do mapa (invariante nova 34):** AF lineups (`fonte:api`) > ESPN starters (`fonte:api`) > rawFacts F1 (`pesquisa`) > JSON F2 (`modelo`) > geometria (`inferida`) > empty+diag. Nunca inventar nome para completar 11; API com 11 vence rawFacts.

**Aviso:** o botão/poll só aparece quando `parsed._espnEventId` foi ancorado (evento no scoreboard ESPN). Fora da janela o botão faz refresh manual; na janela, auto-poll.

---

Especificação original (referência):

**JÁ IMPLEMENTADA no shell 87 (`d0cec90`) — não reexecutar.** O prompt de implementação saiu da PARTE VIII de propósito (está no git history). O texto abaixo é a especificação original, mantida como racional/referência.  
**Pedido do dono (2026-07-20):** (1) não confiar em formação “padrão” sem fonte; (2) em **dia de jogo** o elenco deve **atualizar** e deixar de ser só especulativo Sofascore; (3) coleta/refresh **ao vivo** no card de análise.

## 1. Problema (print `suigsuigns.png`)

| Sintoma | Interpretação |
|---------|----------------|
| Mapa Escalação **aparece** | Shell 85/86 ok (PARTE IX + SW) |
| Ambos times `4-2-3-1` | Pode ser real **ou** viés do LLM / fonte de previsão |
| Banco truncado (1 suplente) | Coleta web **incompleta**, não XI oficial |
| Rodapé “prováveis da pesquisa” | Honesto, mas **não** é match-day confirmado |
| Expectativa vs V1 | V1 perto do apito: **AF lineups** (`formation` + XI + coach) |

**O app NÃO hardcoda `4-2-3-1` no card de análise** (`lineup.js` último recurso = geometria 1-4-3-3 sem label oficial).  
**O painel live.js** ainda faz `formation || '4-3-3'` — default **enganoso** (Q3).

## 2. Objetivo de produto

1. **Prévia (D−n):** mapa pode ser pesquisa/modelo; badge **nunca** “confirmada”.  
2. **Match day (−6h → FT):** quando ESPN e/ou AF publicarem XI, o card **substitui** o especulativo pelo confirmado (onze + formação + banco da fonte).  
3. **Ao vivo:** poll determinístico (sem LLM) atualiza a aba Escalação.  
4. **Formação:** só exibe chip numérico se veio de fonte confiável; senão “não confirmada” / omitido.  
5. **Mesma formação nos dois times:** só se **ambas** as fontes trouxerem.

## 3. Precedência de fontes (invariante nova)

```
AF lineups (confirmada)  >
ESPN summary starters + formation  >
rawFacts F1 (web_search / Sofascore previsão)  >
JSON F2 (modelo)  >
inferida (buckets / 1-4-3-3 sem chip oficial)  >
empty + diag
```

Nunca inventar nomes para “completar 11” se a API já trouxe 11.  
API com 11 **vence** rawFacts especulativo.

## 4. Janela de jogo

| Fase | Critério | Comportamento |
|------|----------|----------------|
| Prévia fria | kickoff > 6h no futuro | Só F1/F2; cache longo; badge pesquisa/modelo |
| Match window | kickoff −6h … FT+30min | Enrich ESPN summary + AF lineups; TTL curto 45–60s |
| Live | ESPN status `in` / intervalo | Auto-poll 60–90s no card (só Escalação) |
| FT | status post / FT | Para poll; fixa último XI confirmado |

Helper sugerido: `isMatchDayWindow({kickoffIso, espnStatus})` em `schedule.js` ou `espn.js`.

## 5. Fases de implementação (Q0–Q4)

### Q0 — Proveniência (UI + prompts)

**Arquivos:** `lineup.js`, `normalize.js`, `render.js`, `pipeline-facts.js`

- Por time: `_lineups.mandante.fonte` ∈ `api|pesquisa|modelo|inferida`.  
- Chip `pitch-form`: só se fonte ∈ `api|pesquisa` **e** string de formação veio da fonte (não do fallback).  
- coverNote F1: proibir espelhar formação entre mandante/visitante sem lastro.  
- Rodapé: pior nível dos dois times.

### Q1 — Match-day preferir confirmado

**Arquivos:** `phase1-context.js`, `football-apis.js`, `espn.js`, `pipeline-facts.js`

- Bloco texto: `=== ESCALAÇÕES CONFIRMADAS (ESPN) ===` e/ou AF (já existe AF no V1 path).  
- `_afLineupWorthFetch`: alinhar à janela −6h…FT (hoje <36h absoluto + live status).  
- Parse ESPN `summary.rosters` → onze + formation + bench (espelhar lógica de `live.js` em helper compartilhado).  
- Ao anexar em rawFacts / attachAnalysisDerived: precedência §3.

### Q2 — Refresh no card de análise

**Arquivos:** `pipeline-run.js` ou módulo novo `js/analysis/lineup-refresh.js`, `render.js`, history/card state

- `refreshAnalysisLineups(parsed, {eventId, teams})` — **zero** Anthropic.  
- UI: botão “Atualizar escalação” + auto-poll se window live.  
- Patch `parsed._lineups` + re-render aba; persistir no history se o card estiver salvo.  
- Cache key: `meridian_lu_live_{eventId}` TTL 45–60s.

### Q3 — live.js DRY + sem default mentiroso

**Arquivos:** `live.js`, helper compartilhado

- Remover `formation || '4-3-3'`.  
- Mesmo conversor roster→lineup do Q1.

### Q4 — Testes / shell / handoff

- Asserts de precedência, default live removido, refresh sem `/v1/messages`.  
- Shell **87** (ou 87=Q0, 88=Q1–Q2).  
- Atualizar este mestre + push.

## 6. Arquivos-alvo (checklist)

| Arquivo | Papel X |
|---------|---------|
| `js/analysis/lineup.js` | fonte por time; chip formacao; buildPitchModel |
| `js/analysis/normalize.js` | attachAnalysisDerived precedência + fonte |
| `js/analysis/render.js` | badge + botão refresh + disclaimer |
| `js/analysis/lineup-refresh.js` | **novo** (opcional) poll/patch |
| `js/data/espn.js` | fetch summary multi-liga; format confirmed XI |
| `js/data/football-apis.js` | lineup window; bench; block text |
| `js/data/live.js` | sem default 4-3-3; DRY helper |
| `js/data/phase1-context.js` | inject confirmed block na janela |
| `js/analysis/pipeline-facts.js` | coverNote anti-espelho; consumir bloco |
| `tests/run.mjs` | asserts Q0–Q3 |
| version/sw/index | shell 87+ |

## 7. O que NÃO fazer

- Poll de LLM no loop (custo).  
- Mentir badge `api`.  
- Inventar formação “porque 4-2-3-1 é comum”.  
- Dependência de AF pago (deve degradar para ESPN).  
- Tocar V1 / `meridian-proxy`.

## 8. Critérios de aceite manual

1. Análise **D−3**: badge pesquisa/modelo; sem “confirmada”.  
2. **Match day** com ESPN XI: botão/poll → mapa muda para XI da ESPN; banco completo se a API trouxe.  
3. Dois times: formações diferentes se as fontes diferirem; iguais só se ambas confirmarem.  
4. live.js: sem formation → “n/d”, não 4-3-3 fantasma.  
5. Network tab no poll: só ESPN/AF, **zero** `/v1/messages`.  
6. `node tests/run.mjs` PASS; rodapé shell 87+.

## 9. Relação com shells anteriores

| Shell | Papel |
|-------|--------|
| 85 | Mapa aparece (PARTE IX) |
| 86 | SW serve JS fresco |
| **87+** | Mapa **confiável** + **atualiza** no dia do jogo (PARTE X) |

---

**Fim do handoff mestre (shell 86 + PARTE IX feita + PARTE X planejada; arquivo `…SHELL-72-MESTRE…`).**  
Quem não souber dual-mode, F1/F2, `_coletaOk`, PARTE IX, **ou o plano de Escalação match-day PARTE X** — **não leu este arquivo**.
