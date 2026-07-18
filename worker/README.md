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

## Segurança

- Nenhuma chave no repositório — só Secrets Cloudflare  
- CORS `*` por simplicidade; restrinja se publicar o Worker  
