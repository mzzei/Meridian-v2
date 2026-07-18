# HANDOFF — Meridian v2 (shell 67)

**Data:** 2026-07-18  
**Branch:** `main` · **Repo:** https://github.com/mzzei/Meridian-v2  
**SHELL_VERSION:** `67`  
**Escopo:** sessão A → B → C (allowlist Worker, smoke, health FD/AF, FPL element-summary)

Continua: handoff **66** (UI) ← **65** (Worker/secrets) ← **57** (arquitetura multi-fonte).

---

## 1. Sessão A — Allowlist de Origin no Worker

### O quê
- `worker/worker.js`: gate `resolveCors()` antes de qualquer rota (incl. OPTIONS).
- **Default permitidos:** `https://mzzei.github.io`, `http://localhost:3457`, `http://127.0.0.1:3457`, `localhost/127.0.0.1:8787`.
- Secret opcional `ALLOWED_ORIGINS` (CSV) amplia a lista.
- Secret `ALLOW_NULL_ORIGIN=1` libera Origin `null` (file://) — **off** por padrão.
- Pedidos **sem** Origin (curl/ops) → OK com `ACAO: *`.
- Origin de browser **fora** da lista → **403** `{ code: "origin_not_allowed" }`.
- Health JSON inclui `origin_gate: true` + `allowed_default`.

### Deploy
- `npx.cmd wrangler deploy` → `meridian-v2-proxy`  
- Version ID: `ecda42a3-11ee-428e-a345-e7999e76ea4b`  
- URL: `https://meridian-v2-proxy.gcerqueira2012.workers.dev`

### Testes ao vivo (2026-07-18)
| Caso | Status |
|------|--------|
| `/health` sem Origin | 200 |
| Origin `https://mzzei.github.io` | 200 + ACAO reflete origem |
| Origin `http://localhost:3457` | 200 |
| Origin `https://evil.example.com` | **403** |
| OPTIONS evil | **403** |
| OPTIONS pages | 200 |
| `/fd/competitions` (secret) | 200 |
| `/fpl/bootstrap-static/` | 200 |
| `/fpl/element-summary/355/` | 200 |

**Nota:** allowlist protege abuso **via browser** de sites terceiros. Não substitui rotação de secrets nem rate-limit contra curl.

---

## 2. Sessão B — Smoke + docs settings

### Smoke de dados (camada A)
- ESPN BR standings: entradas via `children[].standings.entries` (parser shell 55).
- ESPN EPL + UCL scoreboard: eventos OK.
- OpenFootball / TSDB: já cobertos por testes e probes anteriores.

### GitHub Pages
- URL esperada: `https://mzzei.github.io/Meridian-v2/`
- Após push do shell 67, o Pages atualiza com `?v=67` (pode levar 1–2 min). Se o HTML ainda mostrar shell antigo, hard-refresh / limpar SW.

### Settings FD/AF (documentados no index)
- Placeholders: “Opcional se secret … no Worker”.
- Hints: AF Free = técnico; sem lineups 2026; FD só via Worker (CORS); preferir secrets Cloudflare.
- `#cov-help` atualizado com o quadro honesto A/B/C.

---

## 3. Sessão C — Health FD/AF + FPL element-summary

### Health
- `_shProbeWorkerKeyed('af'|'fd')` em `source-health.js`.
- Auto-probe (4s / 30min) **não** sobrescreve status rico de `loadAfData`/`loadFdData`.
- Botão **Testar fontes agora** → `probeSourcesHealthFull()` → inclui AF (`/af/status`) e FD (`/fd/competitions`).

### FPL element-summary
- `_fplElementSummaries`: com times do jogo (≥2), busca até 2 top pontuadores por time (máx 6), `element-summary/{id}/`, cache 6h.
- Acrescenta linha “Forma recente (FPL element-summary): … últimos GWs”.
- Só EPL + Worker; silent sem times/Worker.

---

## 4. Arquivos tocados

| Arquivo | Mudança |
|---------|---------|
| `worker/worker.js` | allowlist Origin |
| `worker/README.md` | docs segurança |
| `js/data/source-health.js` | probe AF/FD full button |
| `js/data/free-sources.js` | FPL element-summary |
| `index.html` | hints FD/AF/cov + `?v=67` |
| `js/version.js` / `sw.js` | shell 67 |
| `tests/run.mjs` | asserts allowlist + health + FPL |

---

## 5. Invariantes (ainda valem)

- v1 Worker `meridian-proxy` intocável.
- Sem `ANTHROPIC_KEY` no Worker (decisão do usuário).
- Saúde de fontes **nunca** no prompt.
- `SHELL_VERSION` em version.js + sw.js + index `?v=` (×2).
- `node tests/run.mjs` antes de push.

---

## 6. Próximos passos (ainda abertos)

1. Regenerar chaves AF/FD se quiser zelo pós-debug.  
2. UI de troca de senha das configs avançadas.  
3. Confirmar Pages em produção após deploy do 67 (browser).  
4. Rate-limit no Worker (defesa além de Origin).  

---

## 7. Prompt para a próxima sessão

```text
Abra Meridian-v2 (shell 67). Leia:
- docs/HANDOFF-V2-SHELL-67-2026-07-18.md
- docs/HANDOFF-V2-SHELL-66-2026-07-18.md
- docs/HANDOFF-V2-SHELL-65-2026-07-18.md
- docs/HANDOFF-V2-SHELL-57-2026-07-18.md

Worker: origin gate deployado. Quero: [OBJETIVO]
```

**Fim do handoff.**
