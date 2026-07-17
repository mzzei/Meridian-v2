# Meridian v2 · Fase 1 — Contas (Supabase)

Fundação de **identidade** para Backtester, sync de histórico e cobrança futura.  
Vale para o **Meridian v2** (porta 3457). A v1, se usar o mesmo schema, fica em **outra** pasta/projeto.

**Princípio:** conta **≠** chave Anthropic. O app funciona **sem login** (BYOK). Conta = quem é você.

---

## Setup (uma vez)

1. Crie projeto em https://supabase.com  
2. SQL Editor → cole `schema.sql` → Run (`profiles`, `predictions`, RLS)  
3. Auth: e-mail magic-link; Site URL + Redirect = URL do app (Pages ou localhost:3457)  
4. Project Settings → API: `Project URL` + `anon` key (públicas; RLS protege dados)  
5. **Não** coloque `service_role` no browser (só Worker, jobs de scoring)

---

## Fiação do cliente (ainda pendente no Meridian v2)

Quando houver URL + anon:

- Supabase JS via CDN; se chaves vazias → código de conta **inerte**  
- Login no rodapé da sidebar  
- `INSERT predictions` ao renderizar análise (logado)  
- Sync de histórico na nuvem (deslogado = localStorage)  
- Campo futuro: `comp_id` na previsão (multi-liga)

---

## Tabelas

| Tabela | Papel |
|--------|--------|
| `auth.users` | Supabase |
| `profiles` | 1:1 · `plan` free/pro |
| `predictions` | previsão + resultado (Backtester) |

RLS: `auth.uid() = user_id`.

---

## Fase 2 (futuro)

Stripe + `profiles.plan` · Worker com `service_role` para scoring · agregação anônima entre usuários (opcional).
