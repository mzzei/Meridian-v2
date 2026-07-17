# Code Review [ultra] — Meridian v2 (pós-migração ESM)

**HEAD:** `37e7dac`  
**Escopo:** decomposição + entry ESM + “low-risk” schedule/featured/library  
**Barra:** ultra (estrutura, spaghetti, >1k, code-judo)  
**Veredito:** **REQUEST CHANGES**

---

## Resumo executivo

O monólito **encolheu em LOC** (`app.js` ~2.1k vs ~5.9k) e o write path do agente permanece legível.  
Mas a “migração ESM de baixo risco” em `schedule` / `featured` / `library` **não criou módulos** — criou **código clássico prefixado com `globalThis.`** + **mojibake de encoding**. Isso **aumenta** o número de conceitos (ESM + classic + expose + host + globalThis + var-bridge) sem reduzir acoplamento real.

A barra ultra exige simplicidade estrutural. Hoje a estrutura é **mais difícil de raciocinar** do que um único `app.js` coeso ou um ESM de verdade com `import` de deps.

---

## Métricas

| Arquivo | LOC | Nota |
|---------|-----|------|
| `js/app.js` | ~2116 | Ainda >1k; shell UI+state+settings |
| `pipeline-facts` / `pipeline-run` | ~626 / ~592 | OK &lt;1k |
| `espn.js` | ~626 | OK |
| `schedule.js` | ~360 | **~101× `globalThis.`** + mojibake |
| `library.js` / `featured.js` | ~210 / ~274 | **~100× `globalThis.`** cada + mojibake |

---

## Achados (prioridade)

### 1. [BLOCKER] “ESM low-risk” move complexidade, não a deleta

`schedule.js` / `library.js` / `featured.js` são o mesmo código de antes com reescrita mecânica:

```js
globalThis._schedByComp[compId] = …
globalThis.compLabel(compId)
globalThis.renderLibrary()
```

**Isso não é boundary.** É o monólito espalhado com prefixo. O leitor ainda precisa do grafo mental completo de globals do `app.js`, **mais** a ordem de bootstrap, **mais** o fato de que `let` foi forçado a `var` para “compartilhar slot”.

**Code-judo (escolher um):**

**A — Honestidade clássica (mais simples agora)**  
Reverter schedule/featured/library para scripts clássicos sem `globalThis.`, carregados em `CLASSIC`. Manter ESM só onde há **import real** (`intent`, `normalize`, `history`→normalize, `report` com `hostFn` enxuto).

**B — ESM de verdade**  
Extrair `js/state.js`:

```js
export const state = { schedule: [], schedByComp: {}, … };
export const COMPETITIONS = { … };
```

Módulos fazem `import { state, COMPETITIONS } from '../state.js'`. Zero `globalThis._schedule`.

Meio-termo atual **reprova** a barra ultra.

---

### 2. [BLOCKER] Dois protocolos de interop para o mesmo problema

| Estilo | Onde |
|--------|------|
| `host()` / `hostFn()` | `history.js`, `report.js` |
| `globalThis.X` em massa | `schedule`, `featured`, `library` |
| `expose({…})` | quase todos os ESM |
| `loadClassic` | pipeline + app |

Quatro mecanismos. Deveria haver **um**: ou classic global, ou import+state, ou no máximo `hostFn` só em bordas HTML.

**Code-judo:** padronizar. Se a fase é transição, **só** `hostFn` + `expose` (como history/report). Proibir `globalThis.foo` espalhado no corpo das funções.

---

### 3. [HIGH] Mojibake introduzido pela conversão (regressão de produto)

`schedule.js` / `library.js` / `featured.js` contêm dezenas de sequências corrompidas (`├`, `ÔÇö`, `┬À`, comentários ilegíveis, possível emoji quebrado no logo fallback).

Isso **não** é nit cosmético: strings de UI e comentários de manutenção degradaram. Causa provável: pipeline PowerShell `Out-File` / encoding na re-conversão.

**Remédio:** restaurar textos UTF-8 a partir do commit pré-conversão (`22c543f` / `1ec0fba`) e reaplicar ESM **sem** round-trip por encoding do shell — ou reverter esses três arquivos ao clássico limpo.

---

### 4. [HIGH] `app.js` ainda monólito (>1k) e dono do state

~2116 linhas: COMPETITIONS, UI settings, CompContext, init, tokens…  
A ultra rule de >1k **não foi resolvida** — só atenuada.

**Code-judo:**  
- `js/comp/competitions.js` (COMPETITIONS + season helpers)  
- `js/state.js` (schedule, history ref, view, lib filter)  
- `js/ui/settings-theme.js`  
meta: `app.js` &lt; 800 LOC de glue.

---

### 5. [HIGH] Bootstrap dual é mais frágil que qualquer um dos extremos

```
main.js (module)
  → import ESM (side-effect + expose)
  → await loadClassic em série (8 scripts)
```

Conceitos a manter na cabeça:

1. Ordem de `import` (featured antes de schedule)  
2. Ordem de `CLASSIC` (app por último)  
3. `var` vs `let` no app  
4. O que está em `expose` vs só no lexical do classic  
5. `?v=` + SW precache de **ambos** os mundos  

**Code-judo de curto prazo:** se não dá pure ESM, **tudo classic** via um array (como era) — um só modelo. Entry `type=module` só para `version`/telemetria é overkill se o resto é classic.

**Code-judo de médio prazo:** pure ESM + `html-bridge.js` com os ~40 handlers do HTML.

---

### 6. [MED] `hostFn` silencioso mascara erros

```js
const fn = hostFn('toast');
if (fn) fn(msg);
```

Falha de wiring vira no-op. Em desenvolvimento, preferir:

```js
function must(name) {
  const fn = globalThis[name];
  if (typeof fn !== 'function') throw new Error('host missing: ' + name);
  return fn;
}
```

(ou flag debug).

---

### 7. [MED] Testes passam sem provar a arquitetura híbrida

`tests/run.mjs` valida exports e ownership de strings. **Não** valida:

- shared state `var` ↔ ESM no browser  
- mojibake em strings PT  
- ordem featured→schedule no runtime real  
- export PDF com `esc` ainda não definido no import time (só call time — ok, mas sem smoke)

Não bloquear por falta de Playwright, mas não tratar “ALL PASSED” como aprovação estrutural.

---

### 8. [LOW] O que está bem (não diluir)

- `intent` / `normalize` como ESM **com import real** — modelo correto  
- `history` → `import { migrateAnalysisPayload }` — boa  
- Write path do agente estável (`attach` → verify → pad → render)  
- Pipelines &lt;1k cada  
- Shell version central (`version.js` + SW)  
- Direção geral de fatiar o monólito **era** certa; a execução “globalThis soup” desviou

---

## Plano mínimo para re-review (sem big-bang)

1. **Corrigir mojibake** em schedule/featured/library (restore UTF-8).  
2. **Unificar interop:** ou reverter os 3 para classic, ou reescrever com `state.js` + imports (sem `globalThis.` no corpo).  
3. **Um protocolo:** `hostFn` só em report/HTML bridge; resto import.  
4. **Extrair `state.js` + `competitions.js`** — destravar o resto do ESM de verdade.  
5. Meta: `app.js` &lt; 1k ou justificativa explícita.

Até (1)+(2), a barra ultra **não fecha**.

---

## Checklist da barra

| Critério | Status |
|----------|--------|
| Sem regressão estrutural | **FALHA** (globalThis soup + dual bootstrap) |
| Sem code-judo óbvio ignorado | **FALHA** (state.js / reverter classic) |
| Sem monólito >1k injustificado | **FALHA** (`app.js` ~2.1k) |
| Sem spaghetti / magic | **FALHA** (globalThis + expose + classic) |
| Sem leak de boundary | **FALHA** (módulos “ESM” leem app inteiro) |
| Encoding / legibilidade | **FALHA** (mojibake) |

**REQUEST CHANGES.**
