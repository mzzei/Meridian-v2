# Handoff detalhado da sessão — Meridian v2

**Data:** 2026-07-15  
**Projeto:** Meridian v2 (clone multi-liga, **isolado** do Meridian v1)  
**Pasta canônica nesta máquina:** `C:\Users\Gabriel\Projetos\Meridian-v2`  
**Idioma de UI/docs:** pt-BR (código/identificadores em inglês)

Este arquivo serve para **continuar o trabalho em outra máquina** sem perder contexto de produto, bugs corrigidos, decisões e pontos abertos.

---

## 1. O que é o Meridian v2

SPA offline-first de análise de futebol multi-campeonato:

- **Chat** com Claude (BYOK Anthropic + opcional Worker Cloudflare)
- **Análise padrão** (pipeline estruturado Fase 1 Haiku coleta + Fase 2 modelo escolhido → card com abas fixas)
- **Biblioteca de jogos**, **relatórios salvos**, **export PDF/print**
- **PWA** instalável no Edge (Service Worker cache-first)
- **Temas:** Aurora · Verde · B&W (mono)
- **Porta local:** **3457** (v1 usa **3456** — nunca misturar)

### Isolamento (regra dura)

- **Não** é o Meridian original (Copa / WorldCupAgent / git remoto como fonte da verdade do clone).
- Clone = **arquivos locais** desta pasta; não “mergear” com v1.
- Atalho desktop: **Meridian v2** → `Abrir-Meridian-v2.vbs` / launchers `*v2*`.
- Docs: `ISOLAMENTO.md`, `AGENTS.md`, `HANDOFF-v2.md`, `SESSAO-HANDOFF-DETALHADO.md` (anteriores).

---

## 2. Como rodar (nova máquina)

### Requisitos

- Node.js no PATH
- Navegador Edge/Chrome (PWA opcional)
- Chave Anthropic (`sk-ant-…`) em Configurações (ou Worker com `ANTHROPIC_KEY`)

### Subir o app

```bat
cd C:\Users\Gabriel\Projetos\Meridian-v2
Iniciar Meridian v2.bat
```

Ou:

```bat
set PORT=3457
node serve.js
```

Abrir: **http://127.0.0.1:3457/**

### PWA / cache offline

1. Uma abertura **com servidor ligado** grava o shell no SW.  
2. Depois o app instalado pode abrir a UI sem Node (APIs externas ainda precisam de rede).  
3. Se UI antiga: **http://127.0.0.1:3457/?resetsw=1**

### Versões atuais (cache-bust)

| Artefato | Versão |
|----------|--------|
| `css/app.css` | `?v=34` |
| `js/app.js` | `?v=34` |
| Service Worker `CACHE_VERSION` | `meridian-v2-offline-v19` |

Ao mudar CSS/JS: **sempre** bump `?v=N` em `index.html` + `sw.js` SHELL + `CACHE_VERSION`.

### Worker Cloudflare (opcional)

- Código: `worker/worker.js` + `worker/README.md`
- Proxy: Anthropic `/v1/*` e API-Football `/af/*`
- URL em Configurações → `localStorage` key `meridian_worker_url`
- **Não** é causa dos bugs de card/contexto (só transporte/auth)

### Copiar para outra máquina

- Preferir pasta inteira `Meridian-v2` (ou script `Copiar-Para-Drive.ps1` / `LEIA-ME-DRIVE.md` se usarem Drive).
- Não depender de git remoto como “fonte da verdade” do clone experimental.

---

## 3. Arquitetura (mapa mental)

```
Browser (index.html + css/app.css + js/app.js)
  ├─ ESPN (direto) — placares/agenda/notícias
  ├─ Anthropic Messages API — direto ou via Worker
  ├─ API-Football — via Worker (CORS) se configurado
  └─ SW (sw.js) — cache-first do shell; APIs externas na rede

Chat:
  toggleRun()
    ├─ looksLikeMatchQuery / isStandardAnalysisIntent → runAnalysis()  [PADRÃO]
    └─ senão → runChat()  [LIVRE]

runAnalysis():
  Fase 1: gatherFacts (Haiku + web_search) → fillDataGaps → verifyLineupNames
  Fase 2: modelo (Sonnet/…) + thinking opcional → JSON estruturado → renderAnalysis()
  Abas fixas (7, PDF referência): Resumo | Tática | Desempenho | Cartões | Escanteios | Escalação | Dados Avançados

runChat():
  Gate ambiguidade (popup jogos ESPN) se “jogo de hoje” sem times
  Stream Anthropic + web_search
  Sanitiza thinking/tool noise
  context_prompt → popup 3 opções (2 modelo + Outro…)
  card JSON flexível → renderChatCard() com validação anti-oco
```

### Arquivos críticos

| Arquivo | Papel |
|---------|--------|
| `js/app.js` | Quase toda a lógica de produto |
| `css/app.css` | Temas, cards, dock, help, popups |
| `index.html` | Shell, popups, PWA register |
| `sw.js` | Offline-first |
| `serve.js` | HTTP estático porta 3457 |
| `worker/worker.js` | Proxy CORS |

### Storage (localStorage) — origem = host:porta

- `meridian_ui_theme` — aurora \| verde \| mono  
- `meridian_worker_url`  
- API keys, persona, contexto de chat, histórico, caches ESPN/AF  

PWA em `127.0.0.1:3457` **não** compartilha storage com outro host.

---

## 4. Dois modos de análise (produto)

### A) Análise **padrão** (pipeline v1-like)

Referência visual/funcional:  
`C:\Users\Gabriel\Downloads\Relatório · Meridian · Copa 2026.pdf`

Entrega card com abas:

1. **Resumo** — confiança, fatores, tendências, **tickets** (gols, BTTS, escanteios, cartões…)  
2. **Tática** — probabilidades, mercados, lambda Poisson, eventos, técnicos, confrontos  
3. **Desempenho** — jogadores / stats  
4. **Cartões & Faltas**  
5. **Escalação**  
6. **Dados Avançados** — placares prováveis, incerteza, lacunas  

**Como o usuário pede:**

- `Flamengo x Palmeiras`  
- `analise Brasil x Argentina`  
- `análise completa Time A x Time B`  
- Clique em jogo da biblioteca (`PARTIDA` no texto)

### B) **Chat livre**

- Opinião, recortes, “como foi o 2º tempo”, “só os gols”  
- Card JSON **flexível** (abas livres) ou prosa  
- Ambiguidade → **popup de contexto** (não inventar o jogo)

### Roteamento (`toggleRun` / `looksLikeMatchQuery`)

- Confronto `Time A x Time B` + intenção de análise → **padrão**  
- Opinião/recorte → **chat**  
- “jogo de hoje” sem times → **popup** (gate cliente)  
- Anexos → **chat** multimodal  

Popup de ajuda (ícone **?** circular vazado ao lado do usuário na sidebar) explica os dois modos e o ícone de **contexto** (lápis) no dock.

---

## 5. O que foi feito nesta sessão (e sessões encadeadas)

### UX / tema

- Settings card alinhado à paleta Analisar (gradiente por tema) + scrim com blur  
- Elevação (`--pal-elev*`) sem glow colorido em botões da família Analisar  
- Seletor de ligas (stats): removido halo amarelo; B&W seletor voltou ao cinza claro  
- Card de análise: **variáveis `--acard-*` por tema** (Aurora/Verde escuro vidro; mono claro)  
- Estrela Meridian: sem texto “Meridian” no header do card; sem chip amarelo; loading sem bolha “trabalhando…”  
- Popup de contexto **acima do dock** (não modal central); opções **sem** fonte ESPN (`fifa.world` etc.)  
- Cancelar contexto → sugestão no chat “Definir contexto”  
- Botão direito: menu “Anexar como contexto” (capture phase)  

### Qualidade de agente / dados

- Gate de ambiguidade: não supor “o jogo de hoje”  
- Sanitização de thinking/scripts no chat  
- Cards ocos rejeitados (sem seções vazias / “—”)  
- Prompt de chat com template formal pós-jogo **e** aviso de não confundir com análise padrão  
- Score verification identity-first (sem presupor placar na query)  

### Ajuda

- `ls-help-btn` + `#help-analysis-ov` — explica padrão vs chat vs contexto  

### Isolamento / PWA / infra (sessões anteriores no mesmo fio)

- Rebrand clone → Meridian v2, porta 3457  
- SW offline-first  
- Multi-liga, CompContext, COMP_SANITY, fontes P1/P2  
- Worker documentado  

---

## 6. Bugs conhecidos / riscos

| Item | Status | Notas |
|------|--------|--------|
| Modelo ainda pode devolver card oco ou prosa de esclarecimento | Mitigado | Parser + heurísticas; não 100% |
| `looksLikeMatchQuery` vs opinião com “x” | Melhorado | Revisar edge cases (“4-3-3 vs 4-4-2”) |
| PWA com cache velho | Operacional | `?resetsw=1` + servidor ligado |
| SW cache-first pode servir index/js antigos | Operacional | bump `CACHE_VERSION` + `?v=` |
| Análise padrão + chat no mesmo fio | Parcial | toggleRun prioriza padrão se intent match |
| `color-mix` no CSS do card | OK Edge moderno | Se algo falhar em browser antigo, simplificar vars |
| Worker v1 reutilizado | OK se secrets iguais | Não “contamina” lógica de card |
| Alucinação de placar | Mitigado | Bloco PLACARES VERIFICADOS + regras; ainda possível sem rede |

---

## 7. Como validar rápido (checklist)

1. **Servidor 3457** sobe e carrega UI.  
2. Temas Aurora / Verde / B&W: card de análise muda de “pele” (não fica branco em Aurora/Verde).  
3. `Flamengo x Palmeiras` (ou jogo real) → abas padrão (Resumo… Avançado), não card chat genérico.  
4. `qual sua opinião sobre o jogo de hoje?` → popup de jogos, **sem** card inventado.  
5. Loading: só barra `Ns · tokens · ainda pensando…` (sem bolha “trabalhando…” com chip amarelo).  
6. Clique direito em texto do agente → “Anexar como contexto” (não só menu Edge).  
7. Ícone **?** ao lado do usuário → popup de ajuda.  
8. Lápis de contexto no dock ainda funciona.  
9. Export relatório / PDF ainda gera a partir dos `.a-card`.  
10. `?resetsw=1` limpa SW se UI antiga.

---

## 8. Continuar daqui (sugestões de próximos passos)

1. **E2E real** de um jogo ao vivo/hoje em análise padrão + export PDF e comparar com o PDF de referência.  
2. **Unificar** visual do card chat-flexível com o padrão (mesmas tokens `--acard-*`) — já compartilham CSS `.a-card`.  
3. Se o usuário digitar “análise completa” no meio de um chat, **forçar** `runAnalysis` e avisar no UI (toast).  
4. Testes automatizados mínimos: `looksLikeMatchQuery`, `normalizeChatCard`, `detectProseContextPrompt`.  
5. Documentar em `AGENTS.md` do projeto as regras de roteamento padrão vs chat.  
6. Revisar overrides mono antigos em `app.css` se ainda sobrar seletor conflitante de `.a-card`.  
7. Opcional: i18n do popup de ajuda (hoje só pt).  

---

## 9. Convenções ao editar

- Comunicação com o usuário: **pt-BR** (`AGENTS.md` global + projeto).  
- Não commitar chaves API.  
- Após editar `app.js` / `app.css`: bump **`?v=`** e **`CACHE_VERSION`**.  
- Não misturar com pasta/porta do v1 (3456).  
- Preferir fix de UX no cliente (gate/popup/parser) além de “só prompt”.  

### Funções-chave em `js/app.js` (busca por nome)

| Função | Uso |
|--------|-----|
| `looksLikeMatchQuery` / `isStandardAnalysisIntent` | Roteamento padrão vs chat |
| `toggleRun` | Enviar / Parar |
| `runAnalysis` | Pipeline completo |
| `runChat` | Chat + stream + gates |
| `openMatchPickerPopup` / `openContextPromptPopup` | Contexto |
| `renderAnalysis` | Card abas fixas padrão |
| `renderChatCard` / `normalizeChatCard` | Card flexível chat |
| `analystSystemPrompt` | Prompt do chat |
| `getSystemPrompt` / `getSystemPromptPhase2` | Prompt análise padrão |
| `brandStar` | Estrela temática |
| `openHelpAnalysis` / `closeHelpAnalysis` | Popup ajuda |
| `_syncSettingsTheme` | Skin do painel Configurações |

### CSS-chave

| Token / seletor | Uso |
|-----------------|-----|
| `--acard-*` | Pele do card de análise por tema |
| `--pal-elev*` | Sombra de profundidade (família Analisar) |
| `--spanel-*` / `--sov-scrim` | Configurações |
| `.ls-help-btn` / `.help-ov` | Ajuda |
| `.ctx-prompt-ov` | Popup contexto (ancorado no dock) |
| `.a-ball-plain` | Estrela sem chip |

---

## 10. Prints / assets de referência nesta máquina

| Path | Conteúdo |
|------|----------|
| `C:\Users\Gabriel\Downloads\Relatório · Meridian · Copa 2026.pdf` | **Análise padrão** de referência (França × Inglaterra, abas completas) |
| `C:\Users\Gabriel\Downloads\ws4ecd5ftgyhuk.png` | Card legibilidade (antes do fix de paleta) |
| `C:\Users\Gabriel\Downloads\rdrtfyyhujik.png` | Bolha “trabalhando…” (removida) |
| `C:\Users\Gabriel\Downloads\popup.png` | Popup contexto (posição/fontes) |
| `C:\Users\Gabriel\Downloads\auyfguyaef.png` / `rdfghjkl.png` / `edrftayufijmd.png` | Bugs de contexto/menu/loading |

---

## 11. Mensagem curta para colar na outra sessão

```
Continuar Meridian v2 em C:\Users\Gabriel\Projetos\Meridian-v2 (porta 3457, isolado do v1).

Ler SESSAO-HANDOFF-2026-07-15.md.

Estado: cache css/js ?v=30, SW meridian-v2-offline-v15.
Análise padrão = runAnalysis (card abas fixas tipo PDF Copa 2026).
Chat livre = runChat (card flexível + popup contexto se ambíguo).
Card UI usa --acard-* por tema (Aurora/Verde escuro, mono claro).
Ajuda: botão ? circular no ls-foot.
Próximo: validar E2E análise padrão + PDF export; limpar overrides CSS legados se sobrar conflito.
Não mergear com Meridian v1. Reset SW: /?resetsw=1 com servidor ligado.
```

---

## 12. Histórico de handoffs no repo

| Arquivo | Escopo |
|---------|--------|
| `SESSAO-HANDOFF-2026-07-15.md` | **Este** — sessão completa atual |
| `SESSAO-HANDOFF-DETALHADO.md` | Sessão anterior multi-liga / handoff |
| `HANDOFF-v2.md` | Handoff de rebrand/isolamento |
| `ISOLAMENTO.md` | Regras clone ≠ v1 |
| `AGENTS.md` | Regras do agente no projeto |

---

*Fim do handoff. Copiar a pasta `Meridian-v2` inteira + este arquivo é o suficiente para retomar.*
