# Fontes grátis estruturadas + FactsMemory (shell 53)

## Objetivo

Reduzir dependência de uma única fonte (ESPN) e **economizar `web_search`** (tokens/$) reutilizando fatos básicos que se repetem entre análises.

## Camadas estruturadas (sem chave)

| # | Fonte | Módulo | O que entrega | Cobertura no catálogo |
|---|--------|--------|---------------|------------------------|
| 0 | ESPN (já existia) | `js/data/espn.js` | tabela, scoreboard, forma | todas via `espn` |
| 1 | TheSportsDB | `espn.js` (`getTsdbContext`) | resultados + próximos | brsa 4351, epl 4328, laliga 4335, ucl 4480 |
| 2 | **OpenFootball** | `js/data/free-sources.js` | calendário + placares da temporada (JSON GitHub) | br.1, en.1, es.1, copa.l, uefa.cl |
| 3 | **Scorebat Free** | `free-sources.js` | títulos de jogos recentes / highlights | filtro por keywords em `scorebat[]` |
| 4 | **OpenLigaDB** | `free-sources.js` | tabela + jogos (CORS aberto) | quando `openliga` shortcut estiver no catálogo (DE) |

Cascata paga continua: **API-Football → football-data.org → ESPN**.  
As camadas grátis (TSDB + 3 novas) rodam **em paralelo** e são **sempre anexadas** quando respondem (validação cruzada).

IDs e stems ficam em `js/comp/competitions.js` (`tsdb`, `openfootball`, `scorebat`, `openliga`).

## FactsMemory (`js/data/facts-memory.js`)

- Storage: `localStorage` chave `meridian_facts_mem_v1`
- Dimensões com TTL:
  - `tabela` 6h · `resultados` 2h · `forma` 4h · `tecnico` 24h · `xg` 12h · `estilo` 24h · `escalacao`/`desfalques` 3h · blob estruturado 2h
- Fluxo em `gatherFacts`:
  1. Monta bloco **MEMÓRIA LOCAL** (fatos frescos) e anexa a `fdCtx`
  2. Ingere blob das APIs (`factsMemIngestStructured`)
  3. **Filtra tópicos** de `web_search` (`factsMemFilterTopics`) — skip dimensões já cobertas
  4. Após JSON da Fase 1, grava por time (`factsMemIngestRawFacts`)

Isso **não** é memória de treino do modelo: é cache de dados **já coletados/API**. Grounding temporal continua valendo.

## Wiring

- Classic load: `main.js` → `free-sources.js` + `facts-memory.js` (antes de `app.js`)
- SW precache + `SHELL_VERSION = 53`
- Testes: `tests/run.mjs` (IDs multi-liga, 3 fontes, smoke da memória em VM)

## Limitações honestas

- Sem chave Anthropic a Fase 1/2 de análise não roda; a coleta estruturada grátis **sim** (útil para agenda/contexto).
- OpenLigaDB hoje só entra no prompt se a competição tiver `openliga` (Bundesliga etc. — preparado no catálogo).
- OpenFootball é estático (atualização community); Scorebat free é feed curto global.
- Libertadores: sem ID estável no free key TSDB; OpenFootball `copa.l` cobre a temporada.
