# HANDOFF DE ENGENHARIA — Motor Meridian (edição para integrador)

Documento para o desenvolvedor que vai integrar e manter o motor. Complementa o
`SKILL.md` (contrato de uso): aqui está o **porquê** de cada decisão e as regras
que não devem ser violadas na manutenção. Não há segredos aqui — chaves de API
são sempre do integrador e nunca acompanham o pacote.

---

## 1. Mapa de módulos (o que é o quê)

| Camada | Arquivos | Papel |
|---|---|---|
| Composição | `motor/engine.mjs` | Monta o ambiente headless e expõe `createEngine`/`analyzeMatch` |
| Orquestração | `js/analysis/pipeline-facts.js`, `js/analysis/pipeline-run.js` | Fase 1 (coleta), portões, Fase 2 (análise), streaming |
| Conhecimento | `js/analysis/prompts.js` | Prompts de sistema das duas fases (o contrato textual do JSON) |
| Derivação | `js/analysis/normalize.js`, `js/analysis/lineup.js`, `js/analysis/tab-helpers.js` | Schema canônico, escalações + proveniência, pads determinísticos |
| Fontes | `js/data/espn.js`, `js/data/football-apis.js`, `js/data/free-sources.js`, `js/data/schedule.js` | ESPN (sempre disponível), API-Football/football-data (opcionais), agenda |
| Infra de coleta | `js/data/phase1-context.js`, `js/data/facts-memory.js`, `js/data/cached-fetch.js`, `js/data/source-telemetry.js`, `js/data/source-health.js` | Cascata, cobertura A/B/C, memória de fatos, cache, telemetria de fontes |
| Base | `js/lib/intent.js`, `js/comp/competitions.js`, `js/state.js`, `js/expose.js`, `js/runtime.js` | Roteamento, ligas, estado, ponte de globais |
| Prova | `tests/motor.mjs` | Análise completa headless com API stubada — o teste de aceitação |

Dois estilos de módulo convivem por design (o app original roda **sem bundler**):
- **ESM** (`import`/`export`): analysis/, lib/, comp/, state.
- **Classic** (funções globais): data/ e prompts. O `engine.mjs` os carrega via
  `vm.runInThisContext` na mesma ordem do app.

## 2. Arquitetura em uma página

**Fase 1 — coleta estruturada (modelo barato + web_search).**
A cascata de fontes é `API-Football → football-data → ESPN`; a ESPN é a rede de
segurança imutável (gratuita, sem chave). Antes de buscar, o motor monta a
**cobertura A/B/C** (A = dados estruturados de API; B = escalação/técnico;
C = métricas) e instrui o modelo a buscar **só o que está baixo** — é isso que
mantém o custo de coleta pequeno. A resposta usa structured outputs quando o
acesso aceita, com **auto-cura**: um 400 rebaixa para o contrato por prompt no
mesmo run, sem quebrar.

**Portões (código, não prompt).** Depois da coleta, duas passagens deterministas:
- `fillDataGaps`: inspeciona o JSON em memória e dispara **uma** busca dirigida
  barata cobrindo só o que faltou (xG, escanteios/jogo, placar exato dos últimos
  5, tabela, stats de titulares, escalação 11+banco+técnico). Coleta completa =
  custo zero.
- `verifyLineupNames`: cruza cada nome de escalação com busca fresca e remove
  jogadores comprovadamente fora do elenco **antes** de a Fase 2 ver o nome.
  "Não achei nada" não invalida ninguém — só evidência positiva remove.

**Fase 2 — análise.** O modelo escolhido recebe os fatos consolidados e devolve
o JSON do relatório por **prompt-contrato**. Escada de recuperação: parse robusto
(`parseAnalysisJson`: cerca markdown + reparo de JSON truncado) → retry de forma
sem tools → **resgate com modelo de tier superior** (nunca rebaixar qualidade no
caminho de erro). Probabilidades 1X2/gols são derivadas **localmente** (Poisson
sobre os lambdas) — o modelo estima parâmetros, não porcentagens.

**Normalização.** Escalações ganham **proveniência por time**
(`api > pesquisa > modelo > inferida`) e o pior nível dos dois vira o rótulo
global — o motor nunca vende estimativa como confirmação. Lacunas são declaradas
no próprio resultado.

## 3. Regras de funcionamento (não violar na manutenção)

1. **Todo parse de saída de LLM passa por `parseAnalysisJson`.** Nunca
   `JSON.parse` seco nem regex de chaves — truncamento no teto de tokens é
   rotina, e o reparo recupera o relatório.
2. **Prefill de assistant (`{`) só em modelos Haiku.** Os modelos atuais das
   famílias Sonnet/Opus rejeitam com 400. O motor tem auto-cura para modelos
   futuros, mas não reintroduza prefill como técnica principal.
3. **Extended thinking na Fase 2 é proibido sem structured outputs — e a
   gramática do relatório completo excede o limite de compilação da API**
   ("compiled grammar is too large"), mesmo em formas deduplicadas/agrupadas.
   Não re-tente sem a API elevar o limite. Thinking sem gramática produz prosa
   no lugar do JSON e derruba o relatório.
4. **Structured outputs usa `additionalProperties:false` — logo, NUNCA pode um
   campo existir no contrato textual e faltar no schema** (o modelo fica
   proibido de emiti-lo e o dado "some" silenciosamente). Ao evoluir a coleta,
   altere SEMPRE os dois juntos (template textual + schema).
5. **`budget_tokens` e sampling params (`temperature` etc.) devolvem 400 nos
   modelos atuais** quando combinados com os recursos novos. Sonnet 5 exige
   `thinking:{type:'disabled'}` explícito quando não se quer thinking.
6. **Ponte classic↔ESM só com `var`/`function`/atribuição em global** —
   `const`/`let` de script classic não chegam ao objeto global, e a falha é
   silenciosa (o consumidor lê `undefined`).
7. **Nomes de jogador nunca são inventados**: o pipeline só usa o que
   dados/busca trouxeram; incerteza vira "A confirmar" ou lacuna declarada.
8. **Teste anti-regressão precisa de meta-assert** que prove que ele reprova o
   caso ruim — um smoke test que nunca falha é pior que nenhum.
9. **Falha degrada, não quebra**: fonte fora do ar → cascata segue; coleta
   inteira falha → análise direta com `_coletaOk:false` e confiança menor.

## 4. Como evoluir

- **Nova liga:** adicionar a entrada em `js/comp/competitions.js` (ids ESPN/AF/FD)
  — o resto do pipeline é agnóstico de liga.
- **Nova fonte de dados:** registrar em `js/data/free-sources.js` (fontes sem
  chave) ou seguir o padrão de `football-apis.js` (com chave + throttle +
  detecção de limite de plano). A cascata está em `phase1-context.js`.
- **Novo campo no relatório:** adicionar no contrato textual do prompt da Fase 2
  (`prompts.js`) e no consumo (`normalize.js`); se também entrar na coleta,
  respeitar a regra 4 (paridade template↔schema da Fase 1).
- **Trocar modelos:** `model` no `createEngine`; o resgate usa tier superior por
  princípio — mantenha.

## 5. Rotina de verificação

```bash
node tests/motor.mjs    # análise completa headless, API stubada — deve terminar MOTOR ALL PASSED
```

Rode após qualquer mudança. Para teste com API real, use uma chave própria e um
jogo da rodada; inspecione `analysis.lacunas` e `analysis._lineupsFonte` — os
dois dizem a verdade sobre a qualidade daquela análise.
