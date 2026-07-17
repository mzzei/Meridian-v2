# Code Review [ultra] — Meridian v2

**Escopo:** `5d6f94a..15054f2` (decomposição + residual risks)  
**HEAD:** `15054f2`  
**Barra:** ultra (estrutura, spaghetti, >1k LOC, code-judo)  
**Veredito:** **REQUEST CHANGES** — comportamento em direção certa; estrutura ainda não passa a barra.

---

## Veredito

Não aprovar só porque “funciona” e os testes passam. Os diffs recentes **moveram pedaços** de `app.js` e **empilharam caminhos alternativos** (PDF, SW, normalização) sem deletar a complexidade que motivou a decomposição.

| Métrica | Valor |
|---------|--------|
| `js/app.js` | **~4888 linhas / ~282 funções** — ainda god-file |
| `css/app.css` | **~2759** |
| “Módulos” novos | fatias de script global + ordem de `<script defer>` |
| Testes | bons para routing/lineup/normalize; fracos para PDF real / SW real |

---

## Achados (por severidade)

### 1. [BLOCKER] Decomposição é fatiamento, não modularização

`render.js` / `espn.js` / `live.js` são trechos recortados de `app.js` com os mesmos globais (`ESPN_BASE`, `esc`, `_cardCount`, `FLAGS`…).  
Não há contrato, não há ownership, há `typeof X==='function'` espalhado.

**Isso não reduz o número de conceitos** que o leitor carrega — só multiplica arquivos e ordem de carga.

**Code-judo:**
- Ou **ES modules** com imports explícitos (`type="module"` + entry),  
- Ou **fatias verticais com API mínima** documentada em `ARCHITECTURE.md` e zero `typeof` guards (falha cedo se o script faltar).

Enquanto `app.js` permanecer ~5k LOC e dono do pipeline + AF/FD + chat + history + UI, a “decomposição” é cosmética.

---

### 2. [BLOCKER] `app.js` ainda acima de qualquer limite saudável

A regra ultra: não empurrar arquivos para >1k. Aqui o monólito **já estava** >1k e **permanece** ~4.9k após “extrair”.

Sobra no monólito (candidatos óbvios à próxima fatia real):
- pipeline `runAnalysis` / `gatherFacts` / verify  
- AF + FD  
- history + CompContext UI  
- chat routing runtime (já tem `intent.js` puro)

**Code-judo:** meta mensurável — `app.js` < 1500 LOC em 2–3 PRs, cada um com um dono de domínio e testes de contrato.

---

### 3. [HIGH] `normalizeAnalysisPayload` é o lugar errado + triplicado + muta

Chamado em:
1. `loadHistory` (com dirty-check via `JSON.stringify` — O(n) e frágil)  
2. `saveAnalysis`  
3. `ensureRendered`  
4. `renderResults` (de novo)

E **duplica** a lógica de `_corners` que `runAnalysis` já anexa a partir de `rawFacts`.

Efeitos colaterais:
- muta objetos do histórico **in-place**  
- re-pada eventos em **todo** render  
- grava no `localStorage` textos sintéticos `_migrated` (altera artefato do usuário sem versão de schema)

**Code-judo:**
```
attachDerivedFields(parsed, rawFacts)  // só no fim do pipeline
migrateHistoryOnce(store)              // _schema: 2, uma vez
renderResults(d)                       // assume payload canônico
```
Um caminho de escrita. Zero `typeof normalize…`. Zero pad no render.

---

### 4. [HIGH] PDF “one-click” briga com a arquitetura offline-first

`report.js` agora tem:
- load de **CDN** (`html2pdf`)  
- iframe offscreen + **sleep 550ms** mágico  
- path one-click **e** path print  
- toast “Gerando…” + toast sucesso/fallback  
- `.then(ok => if (!ok)…)` onde a função **quase nunca retorna `false`** (ramo morto)

Isso adiciona **dois modos**, dependência externa, timing frágil e contradiz SW offline-first.

**Code-judo (escolha uma):**
1. **Simples:** só print dialog (honesto, zero CDN, zero iframe).  
2. **Sério:** vendor `html2pdf.bundle.min.js` em `assets/`, precache no SW, sem CDN, sem sleep mágico (aguardar `fonts.ready` / `iframe.onload`).

Não manter os dois “quase iguais” com fallback em cascata sem ownership claro.

---

### 5. [HIGH] SW: complexidade subiu; PWA offline ficou mais frágil

`preferNetwork()` trata **todo** `.js/.css/.html/.json` como network-first.  
Na prática:
- `cacheFirst` quase só serve imagem  
- offline com rede ruim = falha onde cache-first antigo ainda entregava shell  
- path de **navegação duplica** `networkFirst` (copy-paste do put de index)

Cliente (`index.html`):
- reload em `SW_ACTIVATED` **e** `controllerchange`  
- risco de reload na **primeira** instalação  
- `APP_BUILD` / `CACHE_VERSION` / `?v=42` / lista de precache no inline script — **quatro** lugares para esquecer no próximo bump

**Code-judo:**
- Network-first **só** para `navigate` (HTML).  
- Assets `?v=N`: cache-first por URL (versão nova = cache miss = rede).  
- Um único sinal de update → um reload (preferir `controllerchange` com “já tinha controller”).  
- Uma constante `SHELL_VERSION` gerada ou um único arquivo `version.json`.

---

### 6. [MED] `renderResults` ignora o registry que já existe

`ANALYSIS_TAB_ORDER` + `renderAnalysisTabShell` em `tab-helpers.js` — mas `renderResults` ainda hardcoda 7 botões + 7 painéis em template gigante.

**Code-judo:** tab builders por id (`buildTab.resumo(d, ctx)` …) + shell do registry. Deleta duplicação de labels e ordem.

---

### 7. [MED] Extratos ESPN/live incompletos = boundary podre

`espn.js` tem `fetchEspn` / scoreboard curto, mas standings parse / multi-liga / chat ESPN **continuam em `app.js`**.  
Quem mexe em ESPN precisa adivinhar em qual arquivo está a metade.

**Code-judo:** tudo que fala `fetchEspn` / scoreboard / standings ESPN no mesmo módulo; `app.js` só orquestra.

---

### 8. [LOW] Nits que não salvam o review

- slugify duplicado (export vs tests)  
- `window.* =` no fim dos scripts (sintoma do não-módulo)  
- CSS monólito 2.7k (fora do diff principal, mas saúde do repo)

---

## O que está bem (não diluir)

- `intent.js` puro + testes de `routing-question-mark` — contrato claro.  
- `lineup.js` / pitch model com testes de shape — bom isolamento.  
- Botão limpar (SVG) — bug de UI real, fix direto.  
- Intenção de migrar histórico antigo e de network-first no HTML — problemas certos; implementação que inflou.

---

## Plano mínimo para re-review (sem “mais uma fatia cosmetica”)

1. **Unificar normalização** — um attach no pipeline; migrate history com `_schema`; tirar de `renderResults`.  
2. **PDF: uma estratégia** — vendor ou print-only; apagar o outro path.  
3. **SW: enxugar** — network-first só navigate; uma versão; um reload.  
4. **Meta LOC** — próximo PR tira AF/FD **ou** history+CompContext de `app.js` com API explícita.  
5. **Tabs** — `renderResults` passa a usar `ANALYSIS_TAB_ORDER`.

Até (1)+(2)+(3), a barra ultra **não** é atingida.

---

## Approval bar checklist

| Critério | Status |
|----------|--------|
| Sem regressão estrutural clara | **FALHA** (SW + PDF + normalize) |
| Sem code-judo óbvio ignorado | **FALHA** |
| Sem arquivo >1k sem justificativa | **FALHA** (`app.js` ~5k) |
| Sem spaghetti de branches especiais | **FALHA** (normalize×3, PDF dual, SW dual reload) |
| Sem abstração mágica | **FALHA** (CDN+sleep+iframe) |
| Sem leak de boundary | **FALHA** (ESPN/history split) |
| Sem duplicar helper canônico | **FALHA** (_corners attach) |

**REQUEST CHANGES.**
