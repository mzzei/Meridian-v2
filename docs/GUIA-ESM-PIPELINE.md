# Guia em linguagem simples: pipeline em ESM “de verdade” (recomendação 4)

Este guia é para quem **não programa no dia a dia**.  
Serve para entender **o que fazer**, **em que ordem** e **como saber se deu certo** — sem precisar virar desenvolvedor.

---

## O que já está pronto (recomendações 1–3)

1. **Lista de campeonatos** mora em um arquivo só: `js/comp/competitions.js`  
2. **Memória do app** (agenda, histórico, liga ativa…) mora em `js/state.js`, com **funções oficiais** para mudar isso (`setSchedule`, `setAnalysisCompId`, …)  
3. **Botões da tela** passam por uma lista controlada: `js/html-bridge.js` (ponte do HTML)

Isso é a base. A recomendação 4 **só faz sentido em cima dessa base**.

---

## O que é a recomendação 4 (em português claro)

Hoje, a “parte que pensa a análise” (buscar dados, conversar, montar o relatório) ainda está em arquivos **clássicos** — como peças que todos compartilham uma mesa bagunçada.

**ESM de verdade** = cada peça:

- declara **de quem depende** (como uma lista de ingredientes)
- **entrega** o que produz (como um prato nomeado)
- **não** mexe em coisas “no ar” sem avisar

Arquivos envolvidos (nomes aproximados):

| Arquivo | O que faz (em humano) |
|---------|------------------------|
| `pipeline-facts.js` | Pesquisa / coleta fatos |
| `pipeline-run.js` | Roda o chat e a análise completa |
| `espn.js` / `football-apis.js` | Puxa placares e tabelas |
| `prompts.js` | Instruções que o modelo de IA recebe |

---

## Por que não fazer tudo de uma vez

É como reformar a cozinha **enquanto o restaurante está aberto**:

- Se mudar tudo no mesmo dia, um erro pequeno quebra análise, chat e export.
- Em fatias pequenas, se algo falhar, você sabe **qual peça** e desfaz só ela.

---

## Passo a passo (ordem recomendada)

Faça **um passo por vez**. Só avance se o passo anterior estiver “OK”.

### Status atual (implementado no código)

| Passo | Status |
|-------|--------|
| 0–1 base | OK (state, competitions, html-bridge, testes) |
| **2** liga via catálogo | **OK** — `pipeline-facts` importa `compLabel` / `compSanity` / `compSeasonLabel` |
| **3** state na análise | **OK** — `state.activeCompId`; `setRunning` no `runAnalysis` |
| **4** pipeline-facts ESM | **OK** — import no `main.js`, fora do classic |
| 5 pipeline-run ESM | pendente |
| 6 espn/af/live ESM | pendente |
| 7 limpeza final | pendente |

### Passo 0 — Checklist de segurança (sempre)

1. Servidor local ligado (`Iniciar Meridian v2` / porta 3457).  
2. Abrir: `http://127.0.0.1:3457/?resetsw=1`  
3. Conferir no console do navegador (F12): mensagem de shell sem erro vermelho.  
4. Teste rápido manual:
   - abrir Biblioteca  
   - carregar agenda  
   - exportar HTML (se tiver análise)  
   - clicar **Analisar** com um jogo simples (se tiver API key)

Se algo falhar **antes** de mudar o pipeline, **não** comece o Passo 1.

---

### Passo 1 — “Congelar” o comportamento atual

**Objetivo:** ter um ponto de retorno seguro.

1. Anotar o commit atual (ou fazer um commit “antes do pipeline ESM”).  
2. Rodar: `node tests/run.mjs` → deve aparecer **ALL PASSED**.  
3. Guardar um print ou nota: “Biblioteca e análise OK em [data]”.

**Pronto quando:** testes passam e o app abre sem erro.

---

### Passo 2 — Migrar **só leitura de campeonato** no pipeline

**Objetivo:** o pipeline deixa de “adivinhar” a liga no ar e usa o catálogo oficial.

Em termos humanos: onde o código diz “qual é a liga ativa?”, passar a usar a **mesma lista** de `competitions.js` / `state` (já existentes).

**Não** reescrever a análise inteira.

**Como validar:**

1. Mudar de liga (Série A → Premier, etc.).  
2. Pedir uma análise.  
3. Ver se o subtítulo / contexto da liga bate com a escolha.

**Pronto quando:** liga certa na análise + testes OK.

---

### Passo 3 — Migrar **agenda / placares** para usar `state`

**Objetivo:** quando o pipeline grava ou lê “próximos jogos”, usa `setSchedule` / `state.schedule` em vez de uma variável solta.

**Validar:**

1. Atualizar agenda (botão de reload).  
2. Chips de jogos aparecem.  
3. Biblioteca lista jogos.  
4. `node tests/run.mjs` OK.

**Pronto quando:** agenda e biblioteca iguais ao de antes.

---

### Passo 4 — Transformar `pipeline-facts.js` em ESM de verdade

**O que muda (conceito):**

- O arquivo passa a **importar** o que precisa (`state`, `competitions`, helpers de dados).  
- O arquivo **exporta** `gatherFacts` (e o que for público).  
- Entra no `main.js` como `import`, **sai** da lista classic.

**Validar:**

1. App carrega.  
2. Uma análise completa ainda coleta dados (status “pesquisando…”).  
3. Sem erro no console.  
4. Testes Node + smoke manual.

**Se quebrar:** reverter **só** este arquivo para classic e investigar.

---

### Passo 5 — Transformar `pipeline-run.js` em ESM de verdade

**Conceito:** igual ao passo 4, para `runChat`, `runAnalysis`, `toggleRun`.

**Validar (mais importante):**

1. Botão **Analisar**  
2. Chat livre (pergunta sem “Time A x Time B”)  
3. Cancelar análise no meio  
4. Histórico / reabrir análise  
5. Export HTML/PDF  

**Pronto quando:** tudo isso igual ao de antes.

---

### Passo 6 — Dados externos (`espn` / `football-apis` / `live`)

**Só depois** do pipeline estável.

Um arquivo por vez, mesma regra:

- import do que precisa  
- export do que oferece  
- remove da lista classic  
- teste + smoke  

---

### Passo 7 — Limpeza final

1. Reduzir `expose` só ao que o **HTML** ainda chama (`html-bridge`).  
2. Apagar caminhos mortos (`loadClassic` vazio, se não sobrar classic).  
3. Atualizar `ARCHITECTURE.md` com a lista final.  
4. Bump de versão do shell (`version.js` + `?resetsw=1`).

---

## Como saber se “deu certo” (sem saber programar)

Use esta tabela:

| Pergunta | Sim = bom |
|----------|-----------|
| O app abre sem tela vermelha / erro de carregar? | ☐ |
| Biblioteca mostra campeonatos e jogos? | ☐ |
| Analisar um jogo termina com o card de 7 abas? | ☐ |
| Chat responde pergunta simples? | ☐ |
| Exportar HTML baixa um arquivo? | ☐ |
| `node tests/run.mjs` diz ALL PASSED? | ☐ |

Se **qualquer** ☐ falhar, **pare** e volte o último passo (git restore / commit anterior).

---

## O que **não** fazer

- Não converter pipeline **e** ESPN **e** app no mesmo dia.  
- Não “consertar” com `globalThis.tudo` de novo (já vimos que piora).  
- Não apagar o `html-bridge` antes de todos os botões usarem outra forma de clique.  
- Não pular o `?resetsw=1` depois de mudar JS (cache antigo mente).

---

## Papéis sugeridos (se houver mais de uma pessoa)

| Quem | Faz |
|------|-----|
| Você (produto) | Checklist manual da tabela acima |
| Dev | Um passo técnico por PR + testes |
| Review | Confirmar que o passo não reintroduziu `globalThis` soup |

---

## Resumo em 4 frases

1. **1–3 já são a fundação** (campeonatos, memória, botões).  
2. **4 é reformar a cozinha da análise** em fatias.  
3. **Cada fatia** = um arquivo, um teste, um smoke no browser.  
4. **Se quebrar**, desfaz só a fatia — o restaurante continua aberto.

Quando quiser **começar o Passo 2 ou 4 na prática no código**, diga qual passo e um dev (ou eu) executa só aquele pedaço.
