# Roteiro de demonstração — calls de handover · Meridian v2

**URL da demo:** `https://mzzei.github.io/Meridian-v2/?demo=1`
**Duração alvo:** 10–12 min de demonstração + perguntas.
**Regra de ouro:** com `?demo=1` NENHUMA chamada à Anthropic é feita — a demo não depende de chave, de cota nem da API estar de pé. Tudo que aparece de análise é fixture rotulada; agenda/estatísticas da sidebar são dados ESPN reais.

---

## 1. Antes da call (5 min, obrigatório)

- [ ] Abrir a URL da demo numa **janela anônima** (biblioteca vazia, sem contexto residual de conversas antigas).
- [ ] Conferir o **badge amarelo "🎬 MODO DEMO"** no canto inferior esquerdo. Sem badge = o parâmetro `?demo=1` se perdeu → recarregue com ele.
- [ ] Rodar **uma análise completa de teste** (clicar Analisar e esperar o card). Se funcionou agora, funciona na call — é determinístico.
- [ ] Deixar essa análise de teste na tela **ou** limpar a conversa — decidir antes, não durante.
- [ ] Zoom do navegador ~90–100%; fechar DevTools; silenciar notificações.
- [ ] Ter o **plano B aberto em outra aba** (ver §5).

---

## 2. Roteiro — ordem das telas

### 2.1 Abertura (1 min) — tela inicial

O que mostrar: a home com o campo de partida já preenchido (`PARTIDA: Flamengo x Palmeiras`), o seletor de modelo (Sonnet) e a sidebar com **agenda e estatísticas reais da liga** (ESPN).

O que dizer:
> "Meridian é um agente de análise de futebol multi-liga — Brasileirão, Libertadores, Premier League, LaLiga e Champions. A sidebar já é dado real, ao vivo, da ESPN. A análise usa a API da Anthropic com a chave do próprio usuário, que fica só no navegador dele — nada de chave compartilhada em servidor. Hoje estou em modo demo: mesma interface, mesmo motor, resposta do modelo simulada para não depender de rede na call."

### 2.2 Disparar a análise (1 min)

Clicar **Analisar**. Enquanto as fases correm (~5 s):
> "A análise real tem duas fases: primeiro uma coleta estruturada — busca na web, API-Football, football-data e ESPN, com cascata e telemetria de fontes — depois o modelo monta o relatório em JSON validado. O que vocês veem aqui é o contador de tokens e as fases andando como numa análise de verdade."

### 2.3 O card, aba por aba (5–6 min)

Ordem sugerida (da mais impactante para a mais técnica):

| # | Aba | O que apontar | Frase-chave |
|---|-----|---------------|-------------|
| 1 | **Resumo** | Contexto da partida, confiança geral, tendências, fatores decisivos e as **sugestões de ticket com probabilidade e fundamento** | "Cada sugestão vem com probabilidade E o porquê — nunca um palpite seco." |
| 2 | **Escalação** | Mapa dos dois XIs com **badge de proveniência** (api / pesquisa / modelo / inferida) e banco | "Honestidade de fonte: o app rotula de onde veio cada escalação. Em dia de jogo, um poll determinístico busca o XI confirmado na API sem gastar um token de LLM." |
| 3 | **Tática** | Probabilidades 1X2 e mercados de gols — **Poisson calculado localmente** a partir dos lambdas que o modelo estima | "O modelo estima os parâmetros; a matemática de probabilidade roda no navegador. O modelo não 'chuta' porcentagem." |
| 4 | **Cartões & Faltas** | Leitura disciplinar, pendurados por time, eventos com probabilidade | "Mercados secundários com o mesmo rigor do principal." |
| 5 | **Escanteios** | Leitura e linhas | (passar rápido — mesmo formato) |
| 6 | **Desempenho** | xG, forma, desfalques e **stats por jogador** coletados na Fase 1 | "Números por jogador vêm da coleta, não da memória do modelo." |
| 7 | **Dados Avançados** | Lambdas com faixas, incertezas e **lacunas declaradas** | "O card declara o que NÃO sabe. Anti-alucinação é requisito de produto aqui, não enfeite." |

Na demo, as lacunas dizem explicitamente que os números são ilustrativos — se alguém perguntar, isso é feature: até a demo é honesta sobre fonte.

### 2.4 Chat de acompanhamento (1 min)

Digitar: **"Qual mercado tem melhor valor nesse jogo?"** → resposta em prosa curta.
> "Depois do relatório, o usuário conversa: o agente responde em texto direto, ancorado no que a análise já estabeleceu — sem regenerar o card, sem custo de nova coleta. E o roteamento é por código: pergunta vira conversa, pedido de análise vira card. Nunca se misturam."

### 2.5 Fechamento de produto (1–2 min)

- **Exportar** → relatório imprimível/PDF via impressão nativa.
- **Biblioteca** → o card ficou salvo; análises são retomáveis.
- Uma frase de arquitetura:
> "Por trás: SPA estática no GitHub Pages, um Worker Cloudflare como proxy com secrets das APIs de futebol e rate-limit, e a chave Anthropic sempre do usuário, no navegador dele. Configurações avançadas ficam atrás de senha."

---

## 3. Perguntas prováveis (respostas prontas)

| Pergunta | Resposta |
|---|---|
| "Isso é ao vivo?" | "A interface e a agenda/estatísticas sim; a resposta do modelo nesta call é simulada (badge no canto). Rodo uma real ao final se quiserem — leva ~1–2 min e usa uma chave real." |
| "Quanto custa por análise?" | "Depende do modelo escolhido: o app mostra o custo estimado em tokens/dólar no rodapé de cada análise. Sonnet é o padrão; Haiku é o econômico; Opus o mais profundo." |
| "E se o modelo inventar dado?" | "Três defesas: coleta estruturada com proveniência A/B/C, gate de contexto que pergunta ao usuário antes de supor jogo, e lacunas declaradas no card. Escalação sem fonte confiável aparece rotulada como estimativa." |
| "Funciona para outra liga?" | Trocar a liga no seletor da sidebar — a agenda/estatística real muda na hora (isso é dado vivo mesmo na demo). |
| "Onde fica a chave da API?" | "No navegador do usuário, em sessionStorage — morre ao fechar a aba. Nunca vai para servidor nosso." |

---

## 4. O que NÃO fazer na call

- **Não prometer** que os números da demo refletem a rodada real — estão rotulados como ilustrativos.
- **Não editar** o campo de partida da demo para outro confronto: o jogo da demo é fixo; outro texto dispara o fluxo real de gates (pode abrir popup de contexto — correto, mas quebra o ritmo).
- **Não abrir** as configurações avançadas sem necessidade (são protegidas por senha; a call não precisa delas).
- **Não rodar** análise real sem avisar que aí sim há custo e latência reais.

---

## 5. Plano B (em camadas)

1. **Badge não aparece / análise tenta chamar API** → a URL perdeu o `?demo=1`. Recarregar com o parâmetro.
2. **Página não carrega ou parece versão velha** → `https://mzzei.github.io/Meridian-v2/?resetsw=1` (limpa o Service Worker) e depois voltar à URL da demo.
3. **Popup de contexto abriu** (alguém mexeu no input) → clicar "Prévia do próximo confronto oficial" e seguir; ou recarregar a demo.
4. **Internet caiu no meio** → a análise demo continua funcionando (não usa rede); a sidebar ESPN pode ficar vazia — seguir no card e dizer que a agenda é dado vivo.
5. **GitHub Pages fora do ar** → rodar local: `node serve.js` na raiz do repo e abrir `http://localhost:3456/?demo=1`.
6. **Último recurso** → prints do card (tirar um conjunto na preparação da call e deixar numa pasta aberta).

**Plano A+ (opcional, final da call):** análise real ao vivo. Requisitos: chave Anthropic válida colada nas configurações, partida real da agenda (clicar num jogo da sidebar), e 1–2 min de paciência. Riscos: latência da API e resultado não determinístico. Só fazer com tempo sobrando.

---

*Gerado no shell 98. A demo em si está documentada na timeline do handoff mestre (`HANDOFF-V2-SHELL-72-MESTRE-AGENTE-2026-07-18.md`).*
