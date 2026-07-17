# Meridian v2 · Backtester — design

> Válido para o **Meridian v2 multi-campeonato** (e, se no futuro quiser, a v1 — **sem** copiar pastas inteiras entre projetos).  
> Depende da Fase 1 contas/Supabase (`../supabase/`). Ainda **não é código**.

Transforma o Meridian de opinador em instrumento medível:  
*“tickets de alta confiança acertaram X% nesta competição”*.

---

## 1. Métricas

| Métrica | Pergunta |
|---------|----------|
| Hit rate por confiança | Alta confiança acerta mais que média/baixa? |
| Calibração 1X2 | “60% casa” acontece ~60%? |
| Brier (v2) | Qualidade probabilística entre modelos/fases |
| Hit rate por mercado | Resultado vs O/U vs jogador |
| Hit rate por competição | `comp_id` (brsa / epl / ucl…) |

Cada métrica deve ser **acionável** (mudar prompt, calibração de “alta”, etc.).

---

## 2. Fluxo

```
① Análise renderiza (usuário logado)
   INSERT predictions (1X2, confiança, lambdas, tickets, model, comp_id, match_date)

② Jogo termina
   ESPN / TheSportsDB (já no app) → placar real

③ Scoring = CÓDIGO (cron Worker)
   UPDATE result_*, outcome, tickets_result, scored_at

④ Tela "Meu Desempenho"
   agrega por confidence, mercado, comp_id (RLS)
```

Scoring de tickets ambíguos com IA = **só v2**. V1: regras determinísticas (1X2, O/U, BTTS).

---

## 3. Não fazer

- Avaliar tickets ambíguos com IA na v1  
- Calibração global entre usuários sem `SECURITY DEFINER` + anonimização  
- Mostrar “71%” com N &lt; 10 por bucket  
- Derivar `outcome` de narrativa em vez de placar  

---

## 4. Ordem de implementação

1. Fiar Supabase no cliente (login opt-in)  
2. `INSERT` em `renderResults` (incluir `comp_id` se a coluna existir / migration)  
3. Cron de scoring no Worker  
4. UI “Meu Desempenho”  
5. v2: tickets ambíguos, Brier, por modelo  

Tudo aditivo, degrada em silêncio se deslogado.
