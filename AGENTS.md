# Regras para agentes de IA — Meridian v2

## Obrigatório no início de TODA sessão neste projeto

**Antes de qualquer tarefa de código, review ou “continuar de onde parou”:**

1. Localize e leia o handoff **mestre do agente** (prioridade máxima):
   - `docs/HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md` (**canônico; shell 90 + PARTE IX e PARTE X FEITAS** — paridade de coleta; escalação honesta por proveniência + elenco confirmado match-day/live; chat em prosa).
   - Se existir `*MESTRE*` com número de shell **maior** no nome, preferir esse.
   - Não pular: dual-mode, Sonnet 5, budget 0, prefill/`_prefillOk`, resgate Opus, `var MODEL_PRICE`, `_coletaOk`/fase1-* (inv. 32 — **nada** pode marcá-lo true sem a F1 ter devolvido rawFacts), `parseAnalysisJson` em toda saída de LLM (inv. 33), proveniência da escalação (inv. 34), meta-assert em smoke test (inv. 35), Worker.
2. Se a tarefa for pontual de uma sessão antiga, complemente com `docs/HANDOFF-V2-SHELL-*.md` do shell relevante (65 Worker, 67 allowlist, etc.).
3. Confira `js/version.js` (`SHELL_VERSION`) e alinhe com o handoff; se divergirem, confiar no **código + git log** e avisar o usuário.
4. Só então atenda o pedido do usuário.

Isto foi pedido explicitamente pelo dono do projeto: *sempre que abrir sessão do Meridian v2, verificar o handoff*.

Leia também **`ISOLAMENTO.md`** (v2 ≠ v1).

## Obrigatório no FIM de TODA sessão com mudanças

**Antes de encerrar o trabalho (sempre, sem o usuário precisar lembrar):**

1. **Atualizar handoff(s)**:
   - Se o `SHELL_VERSION` subiu ou mudou algo **estrutural do agente** (intent, pipeline, fontes, Worker, dual-mode) → atualizar o **mestre** (`*MESTRE-AGENTE*` ou criar shell novo mestre) **e** um handoff de sessão `HANDOFF-V2-SHELL-<N>-…` se útil.
   - Mudanças pequenas de sessão: handoff de sessão +, se afetar o agente, um parágrafo no mestre.
   - Incluir: shell, HEAD, o que mudou, testes, deploy, invariantes, próximos passos, dual-mode se mexeu em intent/pipeline.
   - O mestre deve continuar **detalhado o suficiente** para um agente novo entender o produto sem a conversa anterior (não economizar páginas no que for crucial).
2. **`node tests/run.mjs`** se houve mudança de código (deve passar).
3. **`git add` + `git commit`** com mensagem clara (shell no subject se bump).
4. **`git push origin main`** (ou a branch em uso).
5. Confirmar ao usuário: handoff path + commit hash + push OK.

Pedido explícito do dono: *ao final de tudo sempre atualize o handoff e push e commit no git*.

## Projeto

- Workspace = **Meridian v2** (multi-campeonato), porta **3457**.
- **Não** é Meridian v1 / WorldCupAgent (porta **3456**).
- Código modular — ver **`ARCHITECTURE.md`**:
  - `js/lib/intent.js` — roteamento chat/análise
  - `js/analysis/lineup.js` — mapa de escalação
  - `js/analysis/prompts.js` — system prompts
  - `js/analysis/tab-helpers.js` — abas / empty states
  - `js/export/report.js` + `css/print-report.css` — export HTML/PDF
  - `js/app.js` — orquestração / UI / pipeline
- Git próprio: repo local em `Projetos\Meridian-v2` (não misturar com v1).
- Testes: `node tests/run.mjs`

## Proibido

- Mesclar ou copiar por cima da v1 (ou o inverso).
- Restaurar o v2 a partir do monólito GitHub / pasta da v1.
- Tratar remoto `ClaudeCode-Agent` como repositório do v2.
- Recriar handoffs/launchers da v1 nesta pasta.
- Atalho chamado só `Meridian.lnk` apontando para esta pasta (esse nome é da v1).

## Preferido

- Launchers `*v2*` (`Abrir-Meridian-v2.vbs`, etc.).
- Backup: `Copiar-Para-Drive.ps1` / `D:\Meridian-v2*`.
- Respeitar CompContext e os três temas (aurora / verde / mono).

## Roteamento chat vs análise (js/app.js)

- `Time A x Time B` (com ou sem `?`) → **análise padrão** (`runAnalysis`).
- Opinião/recorte (`qual`, `como foi`, `só os gols`…) → **chat** (`runChat`).
- Formações táticas puras (`4-3-3 vs 4-4-2`) → chat.
- Após editar `app.js`/`app.css`: bump `?v=` em `index.html` + `sw.js` e `CACHE_VERSION`.

## Análise padrão — estrutura fixa (PDF referência / Meridian v1)

Referência visual: `Relatório · Meridian · Copa 2026.pdf`.

**7 abas obrigatórias** (nunca omitir a de Escanteios; nunca colapsar estrutura):

1. **Resumo** — confiança, fatores decisivos, tendências, sugestões de ticket  
2. **Tática** — probs resultado, mercados de gols, lambda Poisson, eventos, técnicos, confronto, duelos, síntese  
3. **Desempenho** — cards dos times + stats por jogador  
4. **Cartões & Faltas** — leitura, eventos, jogadores sob risco  
5. **Escanteios** — leitura, eventos, médias coletadas (`_corners`)  
6. **Escalação** — mapa de campo (`_pitchTeam` / formação real, não 4 buckets rígidos)  
7. **Dados Avançados** — placares mais prováveis, incerteza, lacunas  

Erros de estrutura do v1 **já corrigidos** que o v2 não deve regredir:

- Mapa de escalação: rederivar linhas no render; fatiar pela formação (ex. 4-2-3-1); L→R por LAD/LAE  
- Aba Escanteios ausente ou misturada em Tática  
- Card oco / seções vazias (usar `normalizeChatCard` / `_abaVaziaMsg`)  
- Misturar chat flexível com abas fixas do pipeline padrão  

## Idioma

- Responder em **pt-BR**.
