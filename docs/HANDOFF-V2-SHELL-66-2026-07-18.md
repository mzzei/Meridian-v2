# HANDOFF — Meridian v2 (shell 66)

**Data:** 2026-07-18  
**Branch:** `main` · **Repo:** https://github.com/mzzei/Meridian-v2  
**HEAD:** `e529698` — *chore: remove toggles auto-IA/filtragem dinamica, uso de API e hints de instalacao (shell 66)*  
**SHELL_VERSION:** `66` (version.js = sw.js = `?v=` no index ×2)

Continuação direta do `HANDOFF-V2-SHELL-65-2026-07-18.md` (leia-o primeiro; e o 57 antes dele). Sessão curta de **limpeza de UI a pedido do usuário** + correção de rótulo no Worker. Toda a arquitetura, infra e invariantes dos handoffs 57 e 65 continuam valendo.

---

## 1. O que foi feito nesta sessão

### Rótulo do Worker (`6ed9ace`, deployado)
- `worker/worker.js`: `service` do `/health` e `User-Agent` diziam `meridian-proxy` (copy-paste do v1) → corrigidos para `meridian-v2-proxy`. **Só strings de rótulo** — deploy, rotas e secrets intocados; v1 intocado.
- Worker **redeployado** (Version ID `2be7cfd7…`); `/health` no ar retorna `{"ok":true,"service":"meridian-v2-proxy"}`.

### Remoções de UI/features (`e529698`) — pedidos explícitos do usuário
1. **Toggle "Enriquecer dados via IA automaticamente"** — removido por inteiro: HTML, `autoAiEnabled`/`setAutoAi`, store `brsa_auto_ai`. Call sites assumem o padrão (off):
   - `espn.js`: agenda vazia agora **sempre** mostra o botão manual "buscar via IA →" (nunca busca sozinha).
   - `schedule.js` `loadTournamentCtx`: `if(!force)return;` — só ação explícita gasta créditos.
2. **Toggle "Filtragem dinâmica na busca (experimental)"** — removido por inteiro: HTML, `getDynSearch`/`setDynSearch`, store `brsa_dynsearch`.
   - `pipeline-facts.js`: Fase 1 **fixa** em `claude-haiku-4-5-20251001` + `web_search_20250305`; auto-cura de 400 agora só desliga structured outputs (`_soP1`). O branch de rebaixar Sonnet→Haiku saiu. `pause_turn` continua tratado.
   - `app.js`: as 2 precificações da Fase 1 usam sempre o preço do Haiku.
3. **Seção "Uso de API · Sessão" dos settings** — bloco `#sf-tok-usage` inteiro + `updateSettingsTokens` + 2 chamadas + i18n `sf_usage`/`sf_usage_empty`. **O indicador de tokens do chat (`i-tok-mini`/token-bar) foi mantido** — usuário só pediu a seção dos settings.
4. **Hints de instalação PWA** — `#sf-install-hint` e todos os escritores (3 inline no index + `updateInstallButton`/`installPwaApp` no app.js). Sobrou label "Instalar no Windows" + botão. Feedback de cancelamento/falha da instalação virou **toast**; caminho sem `beforeinstallprompt` mantém o `alert` com a instrução do Edge. A descrição "App instalado. Com o cache gravado…" do modo standalone também saiu.

**Nota de comportamento:** nada muda na prática — as duas features eram opt-in e off por padrão; saiu só a opção de ligá-las.

---

## 2. Verificação feita
- `node tests/run.mjs` → ALL PASSED (nenhum teste referenciava as features removidas).
- Preview no browser: settings sem os toggles, sem "Uso de API", sem hint de instalação; console limpo.
- Grep limpo: zero referências a `autoAi`/`DynSearch`/`sf-tok`/`sf-install-hint`/`sf_usage`.

---

## 3. Estado dos invariantes (57 + 65)
Todos valem. Checklist §8 do handoff 65 rodado no início da sessão: tudo verde (com a ressalva de que o `service` do health agora é `meridian-v2-proxy` — atualizar expectativa do checklist).

**Ajuste ao checklist:** `curl …/health` → `{"ok":true,"service":"meridian-v2-proxy"}`.

---

## 4. Próximos passos (herdados do handoff 65, ainda abertos)
1. Allowlist de origem no Worker (secrets AF/FD expostas a quem tiver a URL).
2. UI de troca de senha das configs avançadas.
3. Health probe incluir FD/AF.
4. Verificar deploy do GitHub Pages.
5. Chave FD nos settings: sumir ou documentar como fallback.
6. FPL `element-summary` por jogador.
7. Regenerar chaves AF/FD e atualizar secrets (zelo).

---

## 5. Prompt pronto para colar no Claude

```text
Abra a pasta C:\Users\Gabriel\Projetos\Meridian-v2 (repo mzzei/Meridian-v2, branch main, shell 66, HEAD e529698).

Leia obrigatoriamente:
- docs/HANDOFF-V2-SHELL-57-2026-07-18.md  (base: arquitetura, pipeline, invariantes 1–10)
- docs/HANDOFF-V2-SHELL-65-2026-07-18.md  (Worker real, secrets, achados FD/AF, senha, invariantes 11–18)
- docs/HANDOFF-V2-SHELL-66-2026-07-18.md  (esta sessão: limpeza de UI — features auto-IA/dynsearch removidas, Fase 1 fixa no Haiku)

Invariantes duros: v1 (meridian-proxy) intocável; sem ANTHROPIC_KEY no Worker; saúde de fontes nunca no prompt; node tests/run.mjs antes de push; SHELL_VERSION em 4 pontos.

Quero que você: [OBJETIVO AQUI]
```

**Fim do handoff.**
