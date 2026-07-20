# HANDOFF MESTRE — Meridian v2 · Agente e produto (shell 86)

**Data:** 2026-07-19 (canônico atual)  
**Branch:** `main` · **Repo:** https://github.com/mzzei/Meridian-v2  
**SHELL_VERSION:** `86` (`js/version.js` = `sw.js` = `index.html ?v=` ×2)  
**HEAD de referência (código):** `6099fda` (shell 86 — SW network-first JS) · `f24db4e` (85 — PARTE IX) · `f0e957a` (84) · `11ed7c3` (83) · `5e08d8b` (82)  
**Docs mestre:** tip de `main` · **PARTE IX = paridade de coleta V1→V2 — IMPLEMENTADA no shell 85 (P0–P3)**

**Nome do arquivo:** `docs/HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md` (nome histórico); **conteúdo canônico até shell 85**.

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

1. **Resgate com Opus 4.8** (nunca rebaixar): `rescueBody.model = 'claude-opus-4-8'` + prefill `{`. Aceita prefill e é tier **acima** do Sonnet. Status UI: “Montando card (resgate Opus)…”.  
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
30. Fase 2 enriquecida usa **prefill `{`** (assistant) — JSON por construção — **SÓ em modelos que aceitam** (`_prefillOk`; **Sonnet 5 rejeita com 400**). Sem tools, thinking off/disabled, `'{'+text` no parse. Modelo sem prefill que insistir em prosa → resgate **Opus 4.8** com prefill (shells 77/79/80 — nunca Haiku: resgate não rebaixa qualidade).  
31. Globais de classic lidos via `globalThis` pelo ESM devem ser `var`/`function`/`expose()` — **`const`/`let` de script classic NÃO chegam ao window** (bug MODEL_PRICE, shell 79: derrubava toda análise pós-Fase 2). Ao criar ponte classic↔ESM, teste `typeof globalThis.X`.  
32. **Escalação empty com card completo ≠ bug de render tático**: significa `_coletaOk === false` (Fase 1 sem `rawFacts`). Diagnóstico obrigatório via `_lastAnalysisFail` stages `fase1-parse` \| `fase1-loop` \| `fase1-error` no empty-state (shell 83) — nunca silenciar a causa da coleta.  
33. **Todo parse de JSON vindo de LLM usa `parseAnalysisJson`** (fences + `repairJson`) — nunca `txt.match(/\{…\}/)` + `JSON.parse` seco (assert proíbe). `stop_reason:'max_tokens'` na F1 é terminal com salvage, não `break`. Retry de forma da F1 = `_p1JsonRescue` (Haiku + prefill `{`, sem tools) — shell 84.  

---

# PARTE VII — Arquivos-chave (mapa rápido)

| Arquivo | Papel no agente |
|---------|-----------------|
| `js/lib/intent.js` | **Roteamento** análise vs chat |
| `js/analysis/pipeline-run.js` | toggleRun, runAnalysis, runChat, stream |
| `js/analysis/pipeline-facts.js` | gatherFacts, `_p1JsonRescue`, `parseAnalysisJson`/`repairJson`, grounding, portões |
| `js/analysis/prompts.js` | system prompts F2 |
| `js/analysis/render.js` | 7 abas; `ctSideSection`/`ctVanTag`; empty Escalação + diag F1 |
| `js/analysis/normalize.js` | schema; `_coletaOk = !!rawFacts` |
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

- [ ] `git pull` · `SHELL_VERSION` **85** em version/sw/index (HEAD ≥ `f24db4e`)  
- [ ] HEAD ≥ `f0e957a` (código 84) · ler **este** handoff completo, **especialmente PARTE IX**  
- [ ] `node tests/run.mjs`  
- [ ] Worker health: `meridian-v2-proxy` + `origin_gate`  
- [ ] Console: `typeof globalThis.MODEL_PRICE === 'object'`  
- [ ] Dual-mode / prefill / resgate Opus / PDF nativo intactos  
- [ ] Se implementar paridade: seguir P0→P3 da PARTE IX; bump shell; asserts; handoff+push  

## Estado atual (revisão 2026-07-19)

| Shell | Entrega |
|-------|---------|
| 80–84 | Resgate Opus, PDF nativo, ct*, diag F1, hardening parse F1 — **FEITO** |
| **85** | **Paridade de coleta V1→V2 IMPLEMENTADA (PARTE IX P0–P3)** — cascata AF-first adaptativa + afSeasonBlocked; coverNote duro + lineup gaps + floor 2 buscas; _lineups também da F2 com fonte honesta; **4º assassino: _lvKey em lineup.js** (Escalação vazia MESMO com dados) corrigido com _luKey local. Ver PARTE IX §0 |

**Diagnóstico de produto (por que V2 coleta pior que V1):** ver PARTE IX §1. Resumo: domínio multi-liga + AF Free bloqueada + cascata que **evita** AF + Escalação amarrada só a rawFacts F1 + migração com bugs (já mitigados). V1 = Copa + AF-first + monólito estável.

**Não reabrir:** resgate Haiku F2, monólogo, html2pdf, badge A/B/C dock, budget>0 F2, mexer no V1/`meridian-proxy`.

## Prompt pronto — sessão genérica

```text
Abra C:\Users\Gabriel\Projetos\Meridian-v2 (main, shell 84+).
Leia docs/HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md (até PARTE IX).
Regras: inv. 1–33; dual-mode; v1 intocável; handoff+commit+push; tests.
Quero: [OBJETIVO]
```

## Prompt pronto — **IMPLEMENTAR paridade de coleta (Claude)** ← USAR ESTE

Cole **inteiro** na sessão Claude Code / Claude. É o pedido canônico.

```text
Abra C:\Users\Gabriel\Projetos\Meridian-v2 (branch main).

Leia OBRIGATORIAMENTE na íntegra:
docs/HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md
Foque em: PARTE III (fontes), §7.5 (F1/F2), PARTE IX (plano paridade coleta V1→V2).

Contexto: o dono quer a coleta do Meridian v2 tão sólida quanto a do Meridian v1
(Copa monólito). V1 não era mágica — era AF-first + 1 competição + enrich técnico/lineup.
V2 multi-liga no Free + cascata FD→ESPN→AF last deixa camada B/C fraca e Escalação
vazia quando rawFacts da F1 falha (mesmo com card tático ok).

TAREFA: implementar a PARTE IX na ordem P0 → P1 → P2 → P3 (não pular; não só docs).

P0 — Cascata e AF (phase1-context.js + football-apis.js):
1) Cascata adaptativa: se afReady() E a última AF não reportou "no access to this season"
   para a liga ativa, tentar AF full (standings+fixtures + afEnrichCoachLineup) ANTES ou
   em paralelo útil com ESPN — espelhar espírito V1 (AF preferida quando útil).
2) Se AF full falhar por plano Free / season: NÃO silenciar — cair em ESPN/FD e SEMPRE
   rodar afEnrichCoachLineupMinimal + _afCoachOnlyFallback (já existe).
3) Detectar e cachear flag por liga: afSeasonBlocked[compId] quando erro típico Free,
   para não gastar cota em standings inúteis na mesma sessão.
4) Manter throttle AF_MIN_GAP_MS; não estourar Free.

P1 — Profundidade da Fase 1 (pipeline-facts.js):
5) Endurecer _coverNote da coleta no espírito V1: técnico + formacao + onze_provavel
   (11) + banco = prioridade máxima; vazio = falha de busca, não lacuna legítima
   (sem inventar nomes — grounding/evidence continua).
6) Aumentar utilidade de fillDataGaps: se rawFacts existe mas onze_provavel de um dos
   times tem <11 ou técnico vazio, forçar passagem de gap (já existe skeleton — garantir
   que dispara e mergeia).
7) Opcional seguro: se modelProfile().searches===1 e cobertura B/C baixa, permitir
   floor de 2 buscas na F1 para partidas multi-liga (não reativar effort UI).

P2 — Escalação não morre só porque F1 falhou (normalize.js + render.js + lineup.js):
8) attachAnalysisDerived: além de rawFacts, se parsed (JSON F2) tiver
   mandante/visitante.onze_provavel ou escalacao, DERIVAR _lineups dali.
9) Ordem de preferência: AF confirmada (bloco API) > rawFacts F1 > JSON F2 >
   empty + diag. Nunca inventar nomes.
10) Empty-state Escalação: se _coletaOk false mas F2 trouxe onze, NÃO mostrar
    "pesquisa não pôde ser concluída" — mostrar o mapa com disclaimer "estimativa F2".

P3 — Telemetria, testes, shell, handoff:
11) Status F1 humano deve listar o que entrou: "Fontes: espn+af_b coach" etc.
12) Asserts em tests/run.mjs: cascata tenta AF quando ready; attachAnalysisDerived
    aceita onze da F2; strings críticas do plano não regrediram.
13) Bump SHELL_VERSION 84→85 (version.js = sw.js = index.html ?v= ×2).
14) node tests/run.mjs ALL PASSED.
15) Atualizar ESTE handoff mestre: shell 85, o que mudou, o que resta; commit + push origin main.

PROIBIDO:
- Tocar pasta/código do Meridian v1 / WorldCupAgent / worker meridian-proxy.
- Reativar budget>0 na F2, prefill em Sonnet 5, resgate Haiku na F2.
- allowed_domains no web_search.
- Badge A/B/C no dock.
- Inventar jogadores sem lastro.
- Commit sem testes; push sem handoff atualizado.

Referência V1 (só LEITURA, se precisar copiar lógica):
C:\Users\Gabriel\.claude\projects\Agente Copa 2026\index.html
  — gatherFacts ~4827 (cascata AF→FD→ESPN), afEnrichCoachLineup ~3623, _coverNote ~4890.
NÃO copiar monólito inteiro; NÃO misturar repositórios.

Critério de aceite:
- Com Worker+AF: técnico dos 2 times aparece com frequência alta na F1 (bloco API ou rawFacts).
- Aba Escalação: se F1 ou F2 trouxe onze_provavel, o mapa renderiza (não empty injusto).
- Sem AF: ESPN+web_search continua; diag fase1-* permanece se rawFacts nulo E F2 sem onze.
- tests verdes; shell 85 no rodapé.

Implemente agora P0–P3. Ao final: resumo + hash do commit + confirmação de push.
```

## Próximos passos (produto)

| # | Item | Status |
|---|------|--------|
| 1–6 | Shells 80–84 (Opus, PDF, ct*, diag F1, parse F1) | **FEITO** |
| 7 | Validação de campo pós-84 | aberto (manual) |
| **8** | **Paridade coleta V1→V2 (PARTE IX)** | **FEITO** shell 85 (`f24db4e`) |
| 9 | UI senha avançada | aberto |
| 10 | Pages `?v=` | FEITO (serve main) |
| 11 | Secrets AF/FD / rate-limit Worker | aberto |
| 12 | Thinking F2 + schema | aberto (budget 0) |

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

**Implementação:** prompt da PARTE VIII no Claude → shell **85+**.  
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
| 86 | (se precisar) telemetria/UI “fonte da escalação” / polish coverNote |
| depois | senha avançada, rate-limit Worker |

---

**Fim do handoff mestre (shell 84 + plano paridade IX; arquivo `…SHELL-72-MESTRE…`).**  
Quem não souber dual-mode, F1/F2, `_coletaOk`, **ou o plano de paridade PARTE IX** — **não leu este arquivo**.
