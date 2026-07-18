# HANDOFF DETALHADO — Meridian v2 (shell 65)

**Data do handoff:** 2026-07-18  
**Branch:** `main`  
**Repo:** https://github.com/mzzei/Meridian-v2  
**HEAD no momento do handoff:** `71c9433` — *feat: senha nas informacoes avancadas + Worker URL movida p/ secao trancada (shell 65)*  
**Working tree:** limpa, up to date com `origin/main`  
**SHELL_VERSION:** `65` (`js/version.js` = `sw.js` = `?v=` no `index.html` — os TRÊS devem bater; o `?v=` do index ficou preso em 52 por 5 shells e foi corrigido no 58)

Continuação direta do `HANDOFF-V2-SHELL-57-2026-07-18.md` (leia-o primeiro para a base: arquitetura boot ESM/classic, pipeline 2 fases, multi-fonte, anti-fantasma, cobertura A/B/C). Este documento cobre os shells **58→65** e a **infraestrutura real deployada** (Worker Cloudflare + secrets), feita COM o usuário nesta sessão.

---

## 1. Infraestrutura REAL no ar (não é mais só código)

| Item | Valor |
|------|-------|
| Worker Cloudflare | `https://meridian-v2-proxy.gcerqueira2012.workers.dev` |
| Conta | gcerqueira2012@gmail.com (account id `038b39fb836bf754af82338dcf592052`) |
| Nome no wrangler.toml | `meridian-v2-proxy` — **NUNCA** usar `meridian-proxy` (é o Worker do Meridian v1 / Copa 2026; invariante do usuário: v1 e v2 não se misturam) |
| Rotas | `/v1/*` Anthropic · `/af/*` API-Football · `/fd/*` football-data.org · `/fpl/*` FPL · `/` health |
| Secrets no Worker | `AF_KEY` ✅ · `FD_KEY` ✅ · `ANTHROPIC_KEY` **❌ de propósito** |
| Anthropic | chave **por usuário no navegador**; o app envia `x-api-key` sempre e o Worker repassa (secret, se existisse, prevaleceria). Decisão explícita do usuário: cada pessoa usa a própria chave |
| Login wrangler | feito nesta máquina (OAuth); PowerShell do usuário exige `npx.cmd` (política bloqueia `npx.ps1`) |
| Estado validado | FD verde via secret com campo vazio; AF "chave OK · plano Free sem temporada atual"; FPL retornou métricas reais via Worker sem chave |

**Modo secrets (shell 63):** os campos de chave do app estão VAZIOS no navegador do usuário. `fetchFd/fetchAf` prosseguem sem chave local quando há Worker; flags `meridian_fd_remote_ok` / `meridian_af_remote_ok` (localStorage) lembram se a via remota funcionou; gates do pipeline usam `fdReady()` / `afReady()` (football-apis.js) — não gastam chamadas quando o Worker existe mas a secret não.

---

## 2. O que foi feito por shell (58→65)

### Shell 58 — cobertura pós-busca (`e15644d`)
- `updateCoverageAfterSearch(rawFacts)` em `source-telemetry.js`: após o web_search da Fase 1, recalcula **B** (técnico dos 2 times / onze) e **C** (xG, métricas de jogador) a partir dos rawFacts. **Só sobe, nunca rebaixa.** Re-pinta o badge, atualiza `_phase1Coverage` + sessionStorage (`postSearch:true`), summary vira "Cobertura (pós-busca): …".
- Chamado no fim de `gatherFacts` (pipeline-facts.js) via `_h`; o retorno passa a levar a cobertura final (`_covOut`).
- Hint `#cov-help` nos settings (A grátis ESPN / B precisa AF / C via busca).
- Fix: `?v=` do index sincronizado com SHELL_VERSION (estava preso em 52 desde o shell 53).

### Shell 59 — FPL + StatsBomb Open + health probe (`c8399cd`)
- **Worker** rota `/fpl/*` → `fantasy.premierleague.com/api` (GET only, sem chave; FPL não manda CORS).
- `getFplContext(compId, teams)` em free-sources.js: **só EPL + Worker**; gols/assists/xG/xA/forma/minutos por time do jogo + lesões/dúvidas com news. Cache 6h. Sobe camada C da EPL sem web_search. Helper puro `_fplFormatContext` (testado em VM).
- `getStatsbombOpenContext(compId, query)`: **só modo histórico** — ativa apenas quando a query cita ano que EXISTE no open-data da liga (`_SB_OPEN_COMP`: laliga/epl/ucl). Bloco marcado "TEMPORADA PASSADA; NUNCA use como estado atual". Cache 7d. brsa/libertadores sem cobertura → silent. Helpers puros `_sbOpenYearsFromQuery` / `_sbOpenPickSeason`.
- Registry: `getFreeSourcesBundle(compId, teams, query)` (phase1-context passa os dois novos args).
- `js/data/source-health.js` (novo, classic, no sw precache): probe das fontes free com os getters reais (cache TTL → custo baixo) → status nos settings (`tsdb-status`, `of-status`, `scorebat-status`, `openliga-status`, `fpl-status`, `sbopen-status`), botão `#btn-probe-sources`, auto no load (4s) + 30min. **INVARIANTE: saúde é UI/telemetria (`_sourceHealth` + sessionStorage `meridian_source_health_v1`) — NUNCA entra no prompt.**
- Benefits novos no telemetry: "métricas de jogador", "histórico de temporada passada"; C considera o benefit FPL.

### Shell 60 — FD via Worker (`e033733`) — ACHADO DE PROBE
- **Probe real com chave de usuário:** as respostas **GET do football-data.org NÃO trazem `Access-Control-Allow-Origin` em NENHUMA origem** (o preflight OPTIONS até responde; o GET não) → browser direto SEMPRE falha com "Failed to fetch". A pesquisa do handoff 57 dizia "FD limpo" mas nunca tinha testado no browser com chave.
- Worker rota `/fd/*` → `api.football-data.org/v4` (chave via `?token=` do app OU secret `FD_KEY`; repassa headers de rate limit com `Access-Control-Expose-Headers`).
- `_fdUrl` worker-first (como `_afUrl`); status FD sem Worker explica o CORS.

### Shell 61 — consumo AF via /status (`8d824aa`)
- `getAfStatus()` usa `/status` da AF — **não conta na cota diária** (docs oficiais, confirmado pelo usuário). Status AF exibe `Free · X/100 req hoje`.

### Shell 62 — deploy + fallback Anthropic (`c9308a7`)
- Worker deployado de verdade (ver §1). Redeployado com: `/v1` usa `env.ANTHROPIC_KEY` se existir, senão repassa o `x-api-key` do cliente; 401 claro sem nenhuma.
- `getReqHeaders` (app.js): envia `x-api-key` **sempre** que houver chave (antes só sem Worker — com Worker sem secret a análise quebraria).
- Validação ponta a ponta: `/fpl/bootstrap-static/` retornou métricas reais via Worker.
- `worker/.wrangler/` caiu no gitignore (cache local; continha só account id).

### Shell 63 — modo secret-no-Worker (`ff0d637`)
- Ver §1 (modo secrets). Boot testa FD/AF quando só o Worker está configurado; status "verificando via Worker (secret)…"; mensagens distinguem "secret ausente/inválida".
- Bônus descoberto: FD responde parcialmente até SEM chave via Worker (acesso anônimo limitado da API).

### Shell 64 — AF Free sem temporada atual (`1f513d5`) — ACHADO CRÍTICO
- **Erro real com secret válida:** `"Free plans do not have access to this season, try from 2022 to 2024"`. O plano Free da AF **não cobre a temporada atual** — standings, fixtures e lineups de 2026 são bloqueados. A chave AUTENTICA (não confundir com secret inválida).
- `loadAfData` detecta o plan-limit: mantém `remote_ok=true` (camada B viva), status `chave OK · plano Free da AF não cobre a temporada atual — tabela/jogos via ESPN; técnico ainda via AF`.
- **Resgate da camada B:** `/teams?search` e `/coachs` NÃO têm trava de temporada → `_afTeamIdByName` (cache 7d) + `_afCoachOnlyFallback(query)`: resolve os 2 times por nome e busca os técnicos. `afEnrichCoachLineupMinimal` cai nesse fallback quando fixtures vêm vazias. **Escalação confirmada é impossível no Free** (exige fixture id da temporada atual) → só web_search.

### Shell 65 — senha nas informações avançadas (`71c9433`)
- `<details id="adv-lock">` só abre com senha. Gate client-side (**vitrine, não segurança real** — quem lê o código contorna; as chaves de verdade são secrets no Worker).
- Hash SHA-256 em `ADV_PASS_HASH` (app.js). A senha em claro NÃO está no repo — o usuário a conhece (foi combinada em conversa privada). Trocar: `await advPassHash('nova')` no console → colar hex na constante.
- Desbloqueio por sessão (`sessionStorage meridian_adv_unlock`). **Worker URL foi movida para DENTRO da seção trancada.**
- Cuidado: `prompt()` é usado para pedir a senha; `crypto.subtle` exige contexto seguro (https/localhost — file:// falha com toast).

---

## 3. Quadro honesto de fontes (ATUALIZA a seção 7 do handoff 57)

| Capacidade | Estado real shell 65 |
|------------|----------------------|
| Tabela + jogos temporada atual | **ESPN** (sem chave) + **FD via Worker/secret** (funcionando, validado) |
| Tabela/jogos pela AF | **BLOQUEADO no plano Free** (só temporadas 2022–2024) |
| Técnico determinístico | **AF free via fallback** `/teams`+`/coachs` (sem trava de temporada) |
| Escalação confirmada | **SÓ web_search** (AF free não dá fixture id atual; FD não tem lineup) |
| Métricas de jogador EPL | **FPL via Worker** (sem chave; xG/xA/forma/lesões) → C sobe |
| xG / métricas outras ligas | web_search (C pós-busca atualiza o badge) |
| Histórico de temporada passada | StatsBomb Open (laliga/epl/ucl; só quando a query cita o ano) |
| FD no browser sem Worker | **impossível** (sem CORS em GET — probe 07/2026) |
| AF no browser sem Worker | impossível (CORS, já sabido) |
| Anthropic | chave individual por navegador; Worker repassa (sem secret, por decisão) |

---

## 4. Novos arquivos / funções-chave desta sessão

| Onde | O quê |
|------|-------|
| `worker/worker.js` | rotas `/fd` e `/fpl` novas; `/v1` com fallback de chave do cliente |
| `worker/wrangler.toml` | `name = "meridian-v2-proxy"` (NÃO mudar) |
| `js/data/source-health.js` | probe de saúde (novo módulo classic; CLASSIC + sw precache) |
| `js/data/free-sources.js` | `getFplContext`, `_fplFormatContext`, `getStatsbombOpenContext`, `_sbOpen*`, bundle com `(compId, teams, query)` |
| `js/data/football-apis.js` | `fdReady`/`afReady`, `_remoteOk*`, `getAfStatus`, `_afTeamIdByName`, `_afCoachOnlyFallback`, `_fdUrl`/`_afUrl` worker-first, mensagens de status honestas |
| `js/data/source-telemetry.js` | `updateCoverageAfterSearch`, `coverageLevelsFromRawFacts`, SOURCE_META fpl/statsbomb |
| `js/app.js` | `getReqHeaders` com x-api-key sempre; `ADV_PASS_HASH`/`advPassHash`/`initAdvLock`; boot FD/AF com worker sem chave |
| `index.html` | ds-rows das fontes free + botão probe; `#adv-lock` com Worker URL dentro; hints atualizados |

---

## 5. Invariantes NOVOS (além dos 10 do handoff 57, que continuam valendo)

11. **NUNCA** deployar com nome `meridian-proxy` — é o Worker do v1/Copa 2026 (usuário exige isolamento total v1↔v2).
12. **NUNCA** colocar `ANTHROPIC_KEY` como secret no Worker — decisão do usuário: chave Anthropic é individual, por navegador.
13. Saúde de fontes (source-health) é UI/telemetria — **nunca** entra no prompt do agente.
14. Erro de AF com "Free plans do not have access" = chave OK + limitação de plano — **não** tratar como secret inválida nem desligar a camada B.
15. StatsBomb Open só ativa com ano citado que exista no open-data — **nunca** em análise de temporada atual.
16. A senha das configs avançadas em claro **não** vai para o repo (só o hash `ADV_PASS_HASH`).
17. `?v=` do index.html acompanha o SHELL_VERSION (3 lugares: version.js, sw.js, index ×2 linhas).
18. PowerShell do usuário: `npx.cmd` (não `npx`) — política de execução bloqueia scripts .ps1.

---

## 6. Telemetria / debug (acréscimos)

```js
globalThis._sourceHealth            // { ts, compId, probes[{id,ok,ms,note}] }
sessionStorage meridian_source_health_v1
localStorage  meridian_fd_remote_ok / meridian_af_remote_ok   // '1' = via Worker funcionou
localStorage  meridian_fpl_bootstrap_v1 / meridian_sbopen_*   // caches novos
sessionStorage meridian_adv_unlock  // '1' = seção avançada destrancada nesta sessão
// _phase1Coverage.postSearch === true → badge já reflete o pós-busca
```

---

## 7. Próximos passos naturais (não implementados)

1. **Allowlist de origem no Worker** — hoje qualquer pessoa com a URL usa as secrets AF/FD (cota alheia). Checar `Origin` contra GH Pages do usuário + localhost antes de injetar secrets (risco baixo — só cota de dados esportivos — mas o usuário já demonstrou preocupação com exposição).
2. UI de troca de senha das configs avançadas (hoje é editar `ADV_PASS_HASH` no código).
3. Health probe incluir FD/AF (hoje os status deles vêm de `loadFdData`/`loadAfData`; o botão "Testar fontes" cobre só as free).
4. Verificar deploy do GitHub Pages (usuário usa localhost via `node serve.js`; Pages pode estar defasado).
5. Chave FD nos settings poderia sumir da UI (redundante com a secret) — ou manter como fallback documentado.
6. FPL: usar `element-summary` por jogador para forma recente (hoje só bootstrap-static).
7. Regenerar as chaves AF/FD nos dashboards (passaram pela conversa) e atualizar as secrets — zelo, não urgência.

---

## 8. Checklist de sanidade ao retomar

- [ ] `git status` limpo / `git pull` — HEAD ≥ `71c9433`
- [ ] `SHELL_VERSION` 65 em version.js, sw.js e index (`?v=65` ×2)
- [ ] `node tests/run.mjs` → **ALL PASSED** (~200 asserts)
- [ ] `curl https://meridian-v2-proxy.gcerqueira2012.workers.dev/health` → `{"ok":true,…}`
- [ ] App com Worker URL + campos de chave vazios: FD verde (`classificação…`), AF `chave OK · plano Free…`
- [ ] Seção avançada pede senha (summary: "protegidas por senha")
- [ ] FPL verde quando liga ativa = Premier League
- [ ] Console: `_sourceHealth.probes` sem erro inesperado

---

## 9. Prompt pronto para colar no Claude

```text
Abra a pasta C:\Users\Gabriel\Projetos\Meridian-v2 (repo mzzei/Meridian-v2, branch main, shell 65, HEAD 71c9433).

Leia obrigatoriamente:
- docs/HANDOFF-V2-SHELL-57-2026-07-18.md  (base: arquitetura, pipeline, invariantes 1–10)
- docs/HANDOFF-V2-SHELL-65-2026-07-18.md  (esta sessão: Worker real, secrets, achados FD/AF, senha)
- js/data/phase1-context.js · js/data/football-apis.js · js/data/source-health.js

Contexto em uma frase: SPA futebol multi-liga com Worker Cloudflare REAL no ar (meridian-v2-proxy; secrets AF_KEY/FD_KEY; Anthropic por navegador), cascata A = FD(secret)→ESPN→AF, B = técnico AF via fallback /teams+/coachs (Free não cobre temporada atual), C = FPL (EPL) + web_search com badge pós-busca.

Invariantes duros: v1 (meridian-proxy) intocável; sem ANTHROPIC_KEY no Worker; saúde de fontes nunca no prompt; node tests/run.mjs antes de push; SHELL_VERSION em 4 pontos.

Quero que você: [OBJETIVO AQUI]
```

**Fim do handoff.**
