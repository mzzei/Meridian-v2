# Meridian v2 — Worker proxy (Cloudflare)

Worker serverless que resolve:

1. **API-Football no browser** (CORS) → `{worker}/af/*`  
2. **Chave Anthropic no servidor** → `{worker}/v1/*` injeta secret  
3. **FPL (Fantasy Premier League)** (CORS) → `{worker}/fpl/*` — sem chave, só GET; métricas de jogador da EPL (gols, assists, xG, lesões)  
4. **football-data.org no browser** (CORS) → `{worker}/fd/*` — probe 07/2026: as respostas GET da FD não trazem `Access-Control-Allow-Origin` em nenhuma origem; proxy obrigatório. Secret opcional `FD_KEY` (senão usa o `?token=` do app)

Usado pelo **Meridian v2**. **Worker PRÓPRIO do v2** (`meridian-v2-proxy` no wrangler.toml) — o Worker do Meridian v1 / Copa 2026 (`meridian-proxy`) é outro deploy e NÃO deve ser misturado nem sobrescrito.

Rotas: `/af/*` → API-Football · `/fd/*` → football-data.org · `/fpl/*` → FPL · `/v1/*` → Anthropic · `/` health.

---

## Deploy (painel)

1. Cloudflare → Workers → Create  
2. Cole `worker.js` → Deploy  
3. Secrets: `ANTHROPIC_KEY`, `AF_KEY` (opcional mas recomendado)  
4. No app Meridian v2: **Configurações → Worker URL**

CLI:

```bash
cd worker
npx wrangler deploy
npx wrangler secret put ANTHROPIC_KEY
npx wrangler secret put AF_KEY
```

---

## Como o Meridian v2 usa

- Campo API-Football em Configurações **liga** a AF; com Worker URL, chama `{worker}/af/...`  
- AF_KEY no Worker (secret) tem prioridade sobre a chave enviada pelo browser  
- Anthropic: `/v1/messages` via Worker quando a URL está configurada  
- Se AF falhar → app cai na ESPN (nada quebra)

---

## Futuro (Backtester)

Cron Trigger no Worker: scoring de `predictions` com `service_role` Supabase (não no browser).  
Ver `../docs/backtester-design.md`.

---

## Rate limit (shell 92)

Binding nativo `[[ratelimits]]` (wrangler ≥4.36) — **por IP + classe de rota**:

| Binding | Rotas | Limite |
|---------|-------|--------|
| `RL_DATA` | `/af/*` · `/fd/*` · `/fpl/*` (key `ip:classe` — cada classe conta separada) | 30/min por IP |
| `RL_AI` | `/v1/*` (relay Anthropic; uma análise ≈ 10–12 chamadas) | 30/min por IP |

- Estouro → **429** JSON `{code:"rate_limited"}` + `Retry-After: 60` + CORS (o app lê o corpo).
- **Fail-open**: sem o binding (dev/conta sem o recurso) nada é bloqueado; `/health` expõe `rate_limit:true|false`.
- Contagem é **por localização Cloudflare** (backstop honesto contra abuso, não contador global exato — validado em produção: 30×200 → 429 na mesma conexão/colo).
- `namespace_id` 2101/2102 são do **v2** — não reutilizar no v1.

## Segurança

- Nenhuma chave no repositório — só Secrets Cloudflare  
- **Allowlist de Origin (shell 67):** browsers só passam se `Origin` estiver na lista  
  - Default: `https://mzzei.github.io`, `http://localhost:3457`, `http://127.0.0.1:3457`  
  - Ampliar: secret `ALLOWED_ORIGINS` = CSV (`https://outro.github.io,http://localhost:5173`)  
  - `file://` (Origin `null`): só com secret `ALLOW_NULL_ORIGIN=1`  
  - Pedidos **sem** Origin (curl, health ops) continuam OK  
- Allowlist **não** bloqueia curl malicioso com a URL — protege abuso via site de terceiros no browser  
- Health: `{"ok":true,"service":"meridian-v2-proxy","origin_gate":true}`  

```bash
# opcional — origens extras
npx.cmd wrangler secret put ALLOWED_ORIGINS
# valor exemplo: https://mzzei.github.io,http://localhost:3457
```

