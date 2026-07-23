# SKILL — Motor Meridian de Análise de Futebol

**O que é:** motor headless de análise pré/pós-jogo de futebol multi-liga (Brasileirão, Libertadores, Premier League, LaLiga, Champions). Pipeline em duas fases com portões anti-alucinação por código. Roda em Node ou browser, sem UI própria — o integrador constrói a apresentação.

**O que NÃO é:** não inclui frontend, chat, proxy/Worker, hosting nem chave de API. A chave Anthropic é sempre do integrador/usuário final.

---

## Arquitetura (o valor está aqui)

```
query ancorada ("PARTIDA: A x B")
  │
  ├─ FASE 1 — coleta estruturada (Haiku + web_search)
  │    · cascata de fontes: API-Football → football-data → ESPN (fallback imutável)
  │    · cobertura A/B/C declarada (o modelo sabe o que tem e o que falta)
  │    · structured outputs com auto-cura (400 → caminho por prompt-contrato)
  │    · memória local de fatos por time (não re-paga o que já coletou)
  │
  ├─ PORTÕES (código, não prompt)
  │    · fillDataGaps: xG, escanteios/jogo, placar exato dos últimos 5, tabela,
  │      stats de titulares, escalação completa (11+banco+técnico) — 1 passagem
  │      barata dirigida SÓ ao que faltou; custo zero se a coleta veio completa
  │    · verifyLineupNames: cada nome da escalação cruzado com busca fresca —
  │      jogador comprovadamente fora do elenco é REMOVIDO antes da Fase 2
  │
  ├─ FASE 2 — análise (modelo escolhido, sem tools quando a coleta bastou)
  │    · JSON por prompt-contrato + parseAnalysisJson (fences + repair de truncado)
  │    · escada de recuperação: retry de forma → resgate Opus 4.8 (nunca rebaixa)
  │    · prefill '{' só em modelos que aceitam (auto-cura para os demais)
  │
  └─ NORMALIZAÇÃO
       · proveniência de escalação por time: api > pesquisa > modelo > inferida
       · pads determinísticos de eventos; lambdas p/ Poisson (cálculo local)
       · lacunas DECLARADAS no resultado — o motor diz o que não sabe
```

Limitações conhecidas da API (não re-tentar): extended thinking na Fase 2 exige
gramática de structured outputs, e a gramática do relatório excede o limite de
compilação da API; prefill de assistant devolve 400 nos modelos novos.

## INPUT — contrato de entrada

```js
import { createEngine } from './motor/engine.mjs';

const engine = await createEngine({
  apiKey: 'sk-ant-…',        // OBRIGATÓRIA (ou workerUrl com secret ANTHROPIC_KEY)
  workerUrl: '',             // opcional: proxy CORS/secrets (recomendado em browser)
  model: 'claude-sonnet-5',  // modelo da Fase 2 (Haiku=rápido, Sonnet=padrão, Opus=profundo)
  competition: 'brsa',       // brsa | libertadores | premier | laliga | ucl
  searches: 2,               // teto de buscas da Fase 1 (1–3)
  dataKeys: { af: '', fd: '' }, // opcionais: API-Football / football-data (melhora a camada A)
  storage: null,             // {getItem,setItem,removeItem} — default: memória (Node) / localStorage (browser)
  onProgress: (u) => {},     // {status, phase: 1|2, inTokens, outTokens} — streaming de progresso
  log: (msg) => {},          // avisos não-fatais
});

const { analysis, rawFacts, usage } =
  await engine.analyzeMatch('PARTIDA: Flamengo x Palmeiras', { signal });
```

**Regras de entrada:**
- A query deve estar **ancorada** (dois times definidos). O prefixo `PARTIDA:` declara isso. Resolver ambiguidade ("o jogo de hoje") é responsabilidade do integrador — o motor não adivinha partida (princípio: zero suposição).
- Pós-jogo: incluir `[Contexto confirmado: pós-jogo]` na query → o motor verifica o placar oficial via busca ANTES da análise (placar nunca é inferido pelo modelo).
- `signal` (AbortController) cancela no meio de qualquer fase.

## OUTPUT — contrato de saída

`analysis` = JSON estruturado com os campos:

| Campo | Conteúdo |
|---|---|
| `contexto_analise` | `previa` \| `pos_jogo` |
| `partida`, `fase`, `data_hora`, `sede`, `contexto_fase` | identificação |
| `confianca_geral` | `alto` \| `medio` \| `baixo` — honesto, função da cobertura |
| `mandante`/`visitante` | nome, forma, xG marcado/sofrido, desfalques, escalação+status, jogadores-chave |
| `tecnico_mandante`/`tecnico_visitante` | formação, filosofia, ajustes, impacto em mercados |
| `lambda` | gols esperados (low/mid/high por lado + racional) — insumo p/ Poisson local |
| `eventos_provaveis` | eventos com probabilidade E fundamento |
| `sugestoes_ticket` | sugestões com probabilidade, fundamento e confiança |
| `confronto_tatico` | ataque×defesa dos dois lados, duelos-chave, conclusão |
| `cartoes_faltas`, `escanteios` | mercados secundários com a mesma estrutura |
| `tendencias`, `fatores_decisivos`, `incerteza` | leitura qualitativa |
| `lacunas` | **o que o motor NÃO conseguiu apurar** — sempre declarado |
| `_lineups`, `_lineupsFonte` | escalações derivadas + proveniência (`api`>`pesquisa`>`modelo`>`inferida`) |
| `_coletaOk` | a Fase 1 trouxe fatos? (false = análise direta, confiança menor) |

`rawFacts` = fatos brutos da Fase 1 (auditável). `usage` = tokens por fase.

**Garantias:** todo número de probabilidade vem com fundamento; escalação sem fonte é rotulada, nunca vendida como confirmada; falha de qualquer camada degrada (análise sai com lacunas declaradas), não quebra.

## Arquivos do pacote

- `motor/engine.mjs` — composição headless (este contrato)
- `js/analysis/` — prompts, pipeline F1/F2, normalização, escalação (menos `render.js`)
- `js/data/` — fontes, cascata, memória de fatos, cobertura, telemetria
- `js/lib/intent.js`, `js/comp/competitions.js`, `js/state.js`, `js/expose.js`, `js/runtime.js`
- `tests/motor.mjs` — prova de integração headless (`node tests/motor.mjs`)
- `motor/HANDOFF-ENGENHARIA.md` — arquitetura e regras de funcionamento

## Handover técnico (roteiro da sessão de integração)

1. `node tests/motor.mjs` na máquina do integrador → `MOTOR ALL PASSED` (sem chave, tudo stub).
2. Rodar `analyzeMatch` com a chave real dele num jogo da rodada → inspecionar `analysis.lacunas` e `_lineupsFonte` juntos.
3. Percorrer este SKILL.md seção por seção com o time dele.
4. Percorrer o `HANDOFF-ENGENHARIA.md` — em especial a seção 3 (regras de funcionamento).
