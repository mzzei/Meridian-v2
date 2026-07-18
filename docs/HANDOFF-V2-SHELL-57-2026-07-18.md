# HANDOFF DETALHADO — Meridian v2 (shell 57)

**Data do handoff:** 2026-07-18  
**Branch:** `main`  
**Repo:** https://github.com/mzzei/Meridian-v2  
**HEAD local (no momento do handoff):** `211acf4` — *feat: cobertura A/B/C na UI + AF coach/lineup minimal free (shell 57)*  
**Working tree:** limpa, up to date com `origin/main`  
**SHELL_VERSION:** `57` (`js/version.js` = `sw.js` devem bater sempre)

Este documento é um handoff **descritivo e minucioso** do Meridian **v2** e de **tudo que foi feito na sessão recente** (multi-fonte grátis, memória, anti-fantasma, auditoria de fontes, cobertura A/B/C, AF minimal). Destina-se a continuar o trabalho em **outra sessão / outro agente (ex.: Claude)** sem perder contexto.

---

## 1. O que é o Meridian v2 (visão direta)

- **SPA de análise de futebol** multi-liga (não é o v1; isolado).
- Usuário descreve um jogo / pergunta; o app:
  1. **Coleta estruturada** (APIs + registry free + memória local) → `DADOS DA API`
  2. **Fase 1** — LLM (Haiku/Sonnet) + `web_search` → JSON de fatos (`rawFacts`)
  3. Portões (completude de stats, verify lineup names)
  4. **Fase 2** — análise (thinking budget por esforço) → card/tabs/export
- **Sem bundler.** Entry ESM + scripts classic carregados em ordem.
- **Servir local:** `node serve.js` (porta histórica ~3457; ver `serve.js`).
- **GitHub Pages** existe no histórico do projeto; SW network-first para navigate.
- **Chaves opcionais:** Anthropic (análise), API-Football, football-data.org — UI de settings.
- **Sem Anthropic:** coleta estruturada e UI de agenda ainda funcionam; pipeline completo de análise **não**.

### Competições no catálogo (`js/comp/competitions.js`)

| id | Nome | espn | af | fd | tsdb | openfootball | scorebat keys | openliga |
|----|------|------|----|----|------|--------------|---------------|----------|
| brsa | Brasileirão Série A | bra.1 | 71 | BSA | 4351 | br.1 | brazil:, brasileir, brazil: serie | null |
| libertadores | Libertadores | conmebol.libertadores | 13 | CLI | null | copa.l | libertadores, conmebol | null |
| epl | Premier League | eng.1 | 39 | PL | 4328 | en.1 | premier league, england: premier | null |
| laliga | LaLiga | esp.1 | 140 | PD | 4335 | es.1 | la liga, spain: la | null |
| ucl | Champions | uefa.champions | 2 | CL | 4480 | uefa.cl | champions league, uefa champions | null |

Helpers exportados: `getComp`, `compLabel`, `compSeasonLabel`, `tsdbLeague`, `openfootballStem`, `scorebatKeys`, `openligaShortcut`, `afLeague`, `fdCode`, etc. Expostos no `globalThis` via `expose()` para classic.

---

## 2. Arquitetura de boot (não quebrar)

### Entry

- `index.html` → `js/main.js?v=SHELL` (`type="module"`)
- `js/main.js`:
  1. Import ESM: competitions, state, intent, tab-helpers, lineup, normalize, history, export, **pipeline-facts**, **pipeline-run**
  2. `loadClassic` sequencial (async=false) da lista CLASSIC
  3. `installHtmlBridge()` por último (onclick do HTML)

### CLASSIC order (shell 57) — ordem importa

```
js/analysis/prompts.js
js/analysis/render.js
js/data/cached-fetch.js          ← fetch+TTL canônico
js/data/source-telemetry.js      ← anti-fantasma + cobertura A/B/C
js/data/espn.js                  ← ESPN + getTsdbContext
js/data/football-apis.js         ← FD + AF + afEnrich*
js/data/free-sources.js          ← registry free (usa TSDB + OF + Scorebat + OpenLiga)
js/data/facts-memory.js          ← memória local por time
js/data/phase1-context.js        ← ORQUESTRA coleta (usa tudo acima)
js/data/schedule.js
js/data/live.js
js/ui/featured.js
js/ui/library.js
js/app.js                        ← UI grande, settings, thinking, tokens
```

### Hybrid ESM / classic (decisões históricas importantes)

- **ESM real** para: competitions, state, pipeline-facts, pipeline-run, intent, history, export, normalize, etc.
- **Classic** para: espn, football-apis, schedule, featured, library, app, e a stack de dados free (evita mojibake UTF-8 e “globalThis soup” que já quebrou UI).
- Tentativa de ESM “low-risk” em schedule/featured/library **foi revertida** (`4135837`) — manter classic UTF-8 nesses módulos.
- Pipeline-facts **não** importa classic no topo: usa `_h(name)` / `host()` em **call-time** (depois do loadClassic). Se classic não carregou, lança erro claro.

### Versionamento

- Única fonte: `js/version.js` → `export const SHELL_VERSION = '57'`
- `sw.js` deve ter `const SHELL_VERSION = '57'` **igual**
- Testes em `tests/run.mjs` assertam match version.js ↔ sw
- Bump de shell em qualquer mudança de classic/ESM servido: version + sw + (se novos arquivos) precache no sw

### Como rodar testes

```bash
cd C:\Users\Gabriel\Projetos\Meridian-v2
node tests/run.mjs
```

Deve terminar em **ALL PASSED**. Testes cobrem intent, normalize, ownership de módulos, ESM smoke, FactsMemory VM, coverage score, presença de antifantasma/AF minimal, shell version.

---

## 3. Pipeline de análise (como o agente “pensa”)

### Arquivos

| Arquivo | Papel |
|---------|--------|
| `js/analysis/pipeline-run.js` | `runAnalysis`, stream Fase 2, orquestra F1→portões→F2→verify→render/save |
| `js/analysis/pipeline-facts.js` | `gatherFacts`, fillDataGaps, verifyLineupNames, verifyAnalysis, grounding/source rules |
| `js/analysis/prompts.js` | system prompts fase 2 (classic) |
| `js/analysis/render.js` | tabs/shell de análise (classic) |
| `js/analysis/normalize.js` | schema migrate/attach/finalize (ESM) |
| `js/data/phase1-context.js` | **coleta estruturada pré-LLM** |

### Fluxo atual (shell 57)

```
runAnalysis(query)
  │
  ├─ startThinking / updateThinkingToks
  │
  ├─ Fase 1: gatherFacts(query, apiKey, …)
  │     │
  │     ├─ collectPhase1Context(compId, query)   [classic host]
  │     │     ├─ free registry paralelo (TSDB, OF, Scorebat, OpenLiga)
  │     │     ├─ Camada A: FD → ESPN → AF full só se A vazia
  │     │     ├─ Camada B: afEnrichCoachLineupMinimal se AF key e A não foi AF
  │     │     ├─ factsMemIngestStructured(apiText)  // SEM memória no blob
  │     │     ├─ factsMemBuildKnownBlock(compId, teams)
  │     │     ├─ buildAgentSourceLine(active)     // REPERTOIRE
  │     │     ├─ computeCoverageScore → agentBlock // COBERTURA A/B/C
  │     │     ├─ joinContextBlocks → fdCtx
  │     │     └─ recordPhase1Telemetry + renderCoverageBadge
  │     │
  │     ├─ phase1FilterTopics(topics, compId, hasFd, teams)  // skip seguro
  │     ├─ Prompt Haiku/Sonnet + web_search (max_uses por esforço)
  │     ├─ Structured outputs com auto-cura 400
  │     ├─ Dyn search opt-in (Sonnet web_search_20260209) com auto-cura
  │     └─ factsMemIngestRawFacts(rawFacts) se JSON ok
  │
  ├─ fillDataGaps (stats de jogador / ranking se vazios)
  ├─ verifyLineupNames (anti-alucinação de elenco)
  │
  ├─ Fase 2: stream modelo + thinking + opcional web_search
  ├─ verifyAnalysis (crítico Haiku)
  └─ normalize + render + history save
```

### Grounding (regras duras no prompt)

- Fatos voláteis **só** de dados/busca desta mensagem (não memória de treino do modelo).
- Placar sacro; dados vencem memória de treino.
- Odds sem nomear bookmaker no fundamento.
- Fonte P1/P2 de imprensa/stats (prompt-only; **não** usar allowed_domains — já quebrou o pipeline 2x).

### Esforço

- `EFFORT_LEVELS` / `EFFORT_SEARCHES` em app.js (classic): número de web_searches Fase 1 e thinking budget Fase 2.

---

## 4. O que foi feito NESTA sessão (minucioso, em ordem)

A sessão partiu de um v2 já com ESM pipeline (passos 2–5), catálogo multi-liga, UI/export/PDF/SW em estados avançados. O foco explícito do usuário:

1. Implementar multi-fonte grátis + memória (economia de web_search).  
2. Code-review ultra → corrigir tudo.  
3. Auditar se só ESPN “valia” (fantasmas).  
4. Anti-fantasma + linha limpa no agente.  
5. Pesquisa de outras fontes “fáceis como ESPN”.  
6. Honestidade: fontes não suprem tudo.  
7. Implementar (1) score A/B/C e (2) AF coach/lineup minimal.

### 4.1 Shell 53 — multi-fonte grátis + FactsMemory (commit `5ee8452`)

**Pedido:** implementar o sugerido; buscar 3 fontes semelhantes; memória de dados básicos repetidos para skip de web_search.

**Criado:**

- `js/data/free-sources.js` — OpenFootball, Scorebat, OpenLigaDB + agregador.
- `js/data/facts-memory.js` — localStorage `meridian_facts_mem_v1`, TTLs por dimensão.
- `docs/FONTES-GRATIS-E-MEMORIA.md`

**Alterado:**

- `competitions.js` — campos `openfootball`, `scorebat[]`, `openliga`, tsdb multi-liga (epl 4328, laliga 4335, ucl 4480).
- `espn.js` — `getTsdbContext(compId)` multi-liga.
- `pipeline-facts.js` — free sources + memória no gatherFacts.
- main CLASSIC, sw, version 53, tests.

**Comportamento inicial (ainda ingênuo):**

- Fontes em paralelo com cascata AF→FD→ESPN.
- Memória inject + filter de tópicos + ingest rawFacts.

### 4.2 Code-review ultra → REQUEST CHANGES

Problemas graves identificados e depois corrigidos:

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Skip de tópicos por **liga** (qualquer time) | Podia pular técnico/escalação do jogo atual por cache de outro clube |
| 2 | Ingest circular (memória re-ingerida no blob) + placeholders `presente_no_bloco_estruturado` | Memória se auto-validava sem conteúdo real |
| 3 | OpenLiga com `openliga: null` em todas as comps | “3ª fonte” teatro |
| 4 | Scorebat key `'serie a'` + fallback cross-liga | Casa Itália / polui BR com PL |
| 5 | Spaghetti em gatherFacts | Lógica de coleta espalhada |
| 6 | Fetch+cache triplicado | Divergência de protocolo |
| 7 | Inflação de tokens de input sem teto | Custo sobe mesmo “economizando” search |

### 4.3 Shell 54 — fix ultra (commit `2e665dc`)

**Criado:**

- `js/data/cached-fetch.js` — `cachedJsonFetch`, `joinContextBlocks` (maxTotal/maxEach), `parseMatchTeamsFromQuery`.
- `js/data/phase1-context.js` — `collectPhase1Context`, `phase1FilterTopics`.

**Reescrito:**

- `facts-memory.js`:
  - Entidade normalizada (time).
  - Skip de dims de **time** só se **ambos** os times do confronto tiverem entrada fresca.
  - Sem times parseados → **nunca** skip de time (fail-safe).
  - `factsMemIngestStructured` grava trechos reais (`api_tabela` / `api_resultados`), rejeita placeholder.
  - `factsMemBuildKnownBlock(compId, teams)` focado nos times + liga, sem eco de blob inteiro.
- `free-sources.js`: Scorebat sem fallback; OpenLiga no-op se null; dedupe placares OF.
- `gatherFacts`: só consome `collectPhase1Context` + filter + ingest rawFacts.

**Scorebat brsa keys:** `brazil:`, `brasileir`, `brazil: serie` — **não** `serie a` solto.

### 4.4 Auditoria “só ESPN funciona?” (achado crítico)

Probe ao vivo mostrou:

| Fonte | API | CORS | Qualidade real |
|-------|-----|------|----------------|
| ESPN scoreboard | OK | `*` | Bom |
| ESPN classificação no **agente** | API OK 20 times | `*` | **FANTASMA no prompt** — bug de parser |
| TSDB free past/next | OK | `*` | **1 evento** (quase fantasma) |
| OpenFootball | OK | `*` | Rico mas estático |
| Scorebat | OK | `*` | EU ok; BR vazio com keys estritas |
| OpenLiga | OK JSON | **sem CORS** | No-op no catálogo + risco browser |

**Bug ESPN:** `formatEspnContext` lia `sData.standings[0].entries` (morto). Payload real: `children[0].standings.entries`. A UI já usava `_parseEspnStandingsPayload` corretamente; o **agente** não.

### 4.5 Shell 55 — ESPN parser + TSDB rico (commit `a965e86`)

- `formatEspnContext` usa `_parseEspnStandingsPayload` + fallbacks `children[]` e path antigo.
- `getTsdbContext`: além de past/next, usa `eventsseason` + `lookuptable` quando past é magro; tabela free pode vir truncada (ex. 5 times) mas útil.
- `cachedJsonFetch`: se content-type não é json (GitHub raw text/plain), `text()` + `JSON.parse`.

### 4.6 Shell 56 — anti-fantasma (commit `60e56d2`)

**Pedido:** telemetria anti-fantasma; linha de raciocínio limpa; benefícios; **não** lacunas sem uso.

**Criado:** `js/data/source-telemetry.js`

- `detectSourceBenefits(text)`
- `buildAgentSourceLine(active)` → bloco `=== REPERTOIRE ESTRUTURADO ATIVO ===` (só chars > 0)
- `formatSourcesStatusHuman` → `Fontes: ESPN · TheSportsDB · …`
- `recordPhase1Telemetry` → `globalThis._phase1Telemetry` + sessionStorage `meridian_phase1_sources_v1`
- `active[]` vs `silent[]` (tentados e vazios — **não** vão ao prompt)

**free-sources:** `getFreeSourcesBundle` → `{ text, active, silent }`

**phase1:** monta agentLine + apiText + memory; silent só telemetria.

**Prompt gatherFacts:** lista só ativos; proíbe tratar fonte ausente como lacuna; busca só o que falta no schema.

**UI thinking:** `[F1] Fontes: …`

### 4.7 Pesquisa profunda de fontes “fáceis como ESPN”

Critério: JSON, CORS, sem chave ou free key simples, multi-liga, encaixe no padrão ESPN.

**Tier A (sem chave):** ESPN, TSDB free, OpenFootball, Scorebat, StatsBomb open (histórico), OpenLiga (só DE + CORS problemático).

**Tier B (chave free):** football-data.org (free forever, ~12 comps incl. BSA, 10 req/min, placares atrasados), API-Football free (100 req/dia, lineups/coach).

**Não recomenda como “ESPN”:** Sofascore/FotMob unofficial, Understat scrape, RapidAPI genéricos.

**Conclusão honesta para o usuário:** não existe segundo provedor free multi-liga ao vivo no nível ESPN. Stack free **supre camada A** (campeonato); **B/C** exigem web_search e/ou AF/FD.

### 4.8 Shell 57 — cobertura A/B/C + AF minimal (commit `211acf4`)

**Pedido:** implementar (1) score de cobertura A/B/C na UI e (2) AF free focado em coach+lineup com cache mínimo.

#### 4.8.1 Cobertura A/B/C

| Camada | Significado | Alta quando |
|--------|-------------|-------------|
| **A** Campeonato | tabela, placares, próximos | benefícios classif. + jogos nos ativos |
| **B** Time / pré-jogo | técnico, escalação | AF coaches/lineups ou blocos equivalentes |
| **C** Analítico | xG, métricas | raramente na coleta estruturada → web_search |

**Funções:** `computeCoverageScore`, `buildCoverageAgentBlock`, `renderCoverageBadge`, `hideCoverageBadge`.

**UI:** `#data-coverage` no `index.html` (dock, acima do error-box). CSS pills `.cov-pill.cov-high|medium|low` em `css/app.css` (+ tema mono).

**Agente:** bloco `=== COBERTURA DE DADOS ===` no `fdCtx` com regra: A alta → não re-buscar tabela; B alta → não re-buscar técnico/onze; gastar search no que estiver BAIXA (tipicamente C).

**Thinking:** status combina Fontes + Cobertura.

**Persistência:** `_phase1Coverage`, telemetry com levels A/B/C.

#### 4.8.2 AF free minimal

**Mudança de cascata A (importante):**

```
Antes: AF (se key) → FD → ESPN
Agora: FD (se key) → ESPN → AF full SÓ se A ainda vazia
```

Motivo: free AF 100 req/dia não deve gastar 2 calls pesadas de standings+fixtures em toda análise se ESPN já resolve camada A.

**Camada B:** `afEnrichCoachLineupMinimal(query)`:

1. `getAfFixtures()` (cache 15 min, 1 call a frio)
2. Match times da query nas fixtures (`_afMatchIds` + parse “A x B”)
3. `getAfCoach` home/away (TTL 24h, keys `meridian_af_coach_{comp}_{teamId}`)
4. Lineup **somente** se `_afLineupWorthFetch`: status live ou |now − kickoff| < 36h

**Legado:** `afEnrichCoachLineup(query, fData)` ainda existe quando cascata é AF full; também passou a respeitar lineup só perto do jogo.

**phase1:** se cascade.source !== `'af'`, chama layer B em paralelo conceitual (após cascade, await free + afB).

---

## 5. Mapa de arquivos críticos (estado atual)

### Dados / coleta

| Arquivo | Responsabilidade |
|---------|------------------|
| `js/data/cached-fetch.js` | `cachedJsonFetch`, `joinContextBlocks`, `parseMatchTeamsFromQuery` |
| `js/data/source-telemetry.js` | REPERTOIRE, coverage A/B/C, telemetria, badge UI |
| `js/data/espn.js` | ESPN fetch (proxies CORS), formatEspnContext (children[]), TSDB multi-liga, chat scoreboards, etc. |
| `js/data/football-apis.js` | FD + AF, throttle AF 1.1s, coach/lineup minimal e full |
| `js/data/free-sources.js` | OF, Scorebat, OpenLiga, bundle active/silent, inclui TSDB via getTsdbContext |
| `js/data/facts-memory.js` | memória por time/liga, filter tópicos fail-safe |
| `js/data/phase1-context.js` | **orquestrador único** da coleta estruturada |
| `js/data/schedule.js` | agenda multi-comp (classic) |
| `js/data/live.js` | ao vivo |
| `js/data/history.js` | histórico ESM |

### Análise

| Arquivo | Responsabilidade |
|---------|------------------|
| `js/analysis/pipeline-facts.js` | gatherFacts + portões + grounding |
| `js/analysis/pipeline-run.js` | runAnalysis / stream |
| `js/analysis/prompts.js` | prompts F2 classic |
| `js/analysis/render.js` | UI análise |
| `js/analysis/normalize.js` | schema |

### App / UI

| Arquivo | Responsabilidade |
|---------|------------------|
| `js/app.js` | settings keys, thinking, tokens, grande parte UI |
| `js/ui/featured.js` | featured / empty state / match state |
| `js/ui/library.js` | biblioteca / views |
| `js/html-bridge.js` | lista onclick HTML → host |
| `js/state.js` | state + bridges `_schedule`, `activeCompId`, etc. |
| `index.html` | shell, `#data-coverage`, settings AF/FD/Anthropic |

### Docs úteis

- `docs/FONTES-GRATIS-E-MEMORIA.md` — fontes + memória + coverage (atualizar fluxo mentalmente se divergir; cascata atual é FD→ESPN→AF)
- `docs/GUIA-ESM-PIPELINE.md` — como extrair ESM
- `docs/CODE-REVIEW-ULTRA-*.md` — reviews anteriores
- **Este arquivo** — handoff sessão shell 53–57

---

## 6. Contrato de integração de uma fonte “tipo ESPN”

Para qualquer fonte nova:

1. Campo de ID no `COMPETITIONS` se multi-liga.
2. `async function getFooContext(compId) → string` (vazio se inútil).
3. Registrar no registry (`getFreeSourcesBundle`) **ou** na cascata A/B de `phase1-context`.
4. Só entra no agente se `chars > 0` → `active[]` + benefícios detectados.
5. Se vazio → `silent[]` apenas; **nunca** virar lacuna no prompt.
6. Cache via `cachedJsonFetch` + orçamento `joinContextBlocks`.
7. Atualizar `computeCoverageScore` se a fonte contribui para A, B ou C.
8. Testes de presença + shell bump.

---

## 7. Limitações honestas (não regressar para marketing)

| Capacidade | Estado real shell 57 |
|------------|----------------------|
| Tabela + próximos ao vivo multi-liga | **ESPN** (principal); FD se chave |
| Validação cruzada placares | TSDB (melhorou com season/table) + OpenFootball |
| Técnico determinístico | **Só com AF key** (layer B) + match de nomes nas fixtures |
| Escalação confirmada | AF só perto do jogo (&lt;36h) ou web_search |
| xG / métricas jogador | Quase sempre **web_search** (C baixa na coleta) |
| BR Scorebat | Frequentemente silent |
| OpenLiga | Silent no catálogo atual |
| Sem Anthropic | Sem Fase 1/2 completa |
| Free AF 100/dia | Agora viável se ESPN cobre A e B é coaches cacheados |

**Desconfiança do usuário era justificada.** O sistema agora **mostra** a confiança (A/B/C) em vez de fingir multi-fonte completa.

---

## 8. Telemetria e debug

```js
globalThis._phase1Telemetry
// { ts, compId, cascade, active[], silent[], coverage, agentLine, ... }

globalThis._phase1Coverage
// { A:{level,detail}, B, C, overall, summaryHuman, agentBlock }

sessionStorage.getItem('meridian_phase1_sources_v1')
localStorage meridian_facts_mem_v1
// caches ESPN/TSDB/OF/AF por chave meridian_* / tsdb_* / etc.
```

UI:

- Thinking label `[F1] Fontes: … · Cobertura: A … · B … · C …`
- Badge `#data-coverage` no dock (pills A B C + overall)

---

## 9. Commits desta linha de trabalho (mais recentes primeiro)

```
211acf4 feat: cobertura A/B/C na UI + AF coach/lineup minimal free (shell 57)
60e56d2 feat: anti-fantasma — repertoire ativo no agente + telemetria UI (shell 56)
a965e86 fix: ESPN standings no agente (parser children) + TSDB season/table (shell 55)
2e665dc fix: multi-fonte + FactsMemory ultra (shell 54) — skip por times, sem circular, coleta unificada
5ee8452 feat: multi-fonte gratis (OF/Scorebat/OpenLiga) + FactsMemory (shell 53)
923e87f feat: pipeline-run ESM (step 5) without requiring API key
0a59758 feat: pipeline-facts ESM with competitions and state (steps 2-4)
72f969a feat: competitions, state setters, and html-bridge
4135837 fix: undo globalThis soup; classic UI/data with clean UTF-8
… (ESM extract, PDF, SW, ultra reviews anteriores)
```

Tudo isso já está em **`origin/main`**.

---

## 10. Invariantes / “não faça isso”

1. **Não** colocar pipeline-facts de volta no CLASSIC; manter ESM + `_h()`.
2. **Não** ESM-ificar schedule/featured/library sem plano de encoding (já reverteu).
3. **Não** reintroduzir skip de FactsMemory por liga sem ambos os times.
4. **Não** listar fontes silent no prompt como lacunas.
5. **Não** usar `allowed_domains` no web_search.
6. **Não** deixar SHELL_VERSION divergir entre version.js e sw.js.
7. **Não** gastar AF free em standings se ESPN já encheu A (cascata atual).
8. **Não** confiar em Scorebat para BR sem probe.
9. PowerShell: evitar heredoc bash em commits; mensagens simples.
10. Testes: `node tests/run.mjs` antes de push.

---

## 11. Próximos passos naturais (não implementados)

Prioridade sugerida se continuar:

1. **Chave FD free no fluxo real do usuário** — segunda tabela A estável (BSA/PL/PD/CL).  
2. **Chave AF free** com Worker recomendado (CORS AF no browser é problemático; ver `worker/README.md` se existir).  
3. Atualizar diagrama em `FONTES-GRATIS-E-MEMORIA.md` (ainda menciona cascata AF→FD→ESPN em um trecho; código é FD→ESPN→AF).  
4. Score C pós-web_search (hoje C é da coleta estruturada apenas).  
5. UI settings: texto de ajuda “A alta / B precisa AF / C precisa busca”.  
6. Probe periódico de fontes (health) sem poluir o agente.  
7. StatsBomb open só se quiser modo histórico (não live).  
8. FPL API só EPL + Worker (CORS none no probe).

---

## 12. Prompt pronto para colar no Claude

```text
Abra a pasta C:\Users\Gabriel\Projetos\Meridian-v2 (repo mzzei/Meridian-v2, branch main, shell 57, HEAD 211acf4).

Leia obrigatoriamente:
- docs/HANDOFF-V2-SHELL-57-2026-07-18.md  (este handoff completo)
- docs/FONTES-GRATIS-E-MEMORIA.md
- js/data/phase1-context.js
- js/data/source-telemetry.js
- js/analysis/pipeline-facts.js (gatherFacts)
- js/main.js (CLASSIC order)

Contexto em uma frase: SPA futebol multi-liga, ESM+classic, coleta estruturada anti-fantasma com REPERTOIRE + cobertura A/B/C; cascata A = FD→ESPN→AF last resort; B = AF coach/lineup minimal com cache; C via web_search.

Antes de mudar código: node tests/run.mjs e não divergir SHELL_VERSION.

Quero que você: [OBJETIVO AQUI]
```

---

## 13. Checklist de sanidade ao retomar

- [ ] `git status` limpo / `git pull`
- [ ] `SHELL_VERSION` 57 em version.js e sw.js
- [ ] `node tests/run.mjs` → ALL PASSED
- [ ] `node serve.js` sobe
- [ ] Análise com ESPN: badge mostra A alta se tabela+jogos
- [ ] Sem AF key: B tipicamente baixa/média só com memória
- [ ] Com AF key + jogo no calendário fixtures: B sobe se coaches cacheados
- [ ] Console: `_phase1Telemetry.active` não inclui scorebat quando empty
- [ ] Prompt Fase 1 contém REPERTOIRE e COBERTURA se hasFd

---

## 14. Resumo executivo (30 segundos)

Meridian v2 shell **57** é um SPA multi-liga com pipeline de análise em duas fases. A sessão recente construiu um **banco de coleta estruturada multi-fonte** (ESPN + free registry + memória), descobriu e corrigiu que a **classificação ESPN não ia pro agente**, eliminou **skips perigosos e fontes fantasma no prompt**, e adicionou **transparência de cobertura A/B/C** na UI e no raciocínio do modelo. AF free deixou de ser cascata pesada e virou **camada B enxuta** (técnico/escalação). O produto **ainda depende de Anthropic web_search (e opcionalmente AF/FD)** para análise completa de confiança — e agora isso é **visível**, não escondido.

**Fim do handoff.**
