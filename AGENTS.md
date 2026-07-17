# Regras para agentes de IA — Meridian v2

Leia **`ISOLAMENTO.md`** primeiro.

## Projeto

- Workspace = **Meridian v2** (multi-campeonato), porta **3457**.
- **Não** é Meridian v1 / WorldCupAgent (porta **3456**).
- Código: `index.html`, `css/app.css`, `js/app.js` (`COMPETITIONS`).
- Verdade = **arquivos locais** (ainda sem git próprio).

## Proibido

- Mesclar ou copiar por cima da v1 (ou o inverso).
- Restaurar o v2 a partir do monólito GitHub / pasta da v1.
- Tratar remoto `ClaudeCode-Agent` como repositório do v2.
- Recriar handoffs/launchers da v1 nesta pasta.
- Atalho chamado só `Meridian.lnk` apontando para esta pasta (esse nome é da v1).

## Preferido

- Launchers `*v2*` (`Abrir-Meridian-v2.vbs`, etc.).
- Backup: `Copiar-Para-Drive.ps1` / `D:\Meridian-v2*`.
- Respeitar CompContext e os três temas (aurora / verde / mono).

## Roteamento chat vs análise (js/app.js)

- `Time A x Time B` (com ou sem `?`) → **análise padrão** (`runAnalysis`).
- Opinião/recorte (`qual`, `como foi`, `só os gols`…) → **chat** (`runChat`).
- Formações táticas puras (`4-3-3 vs 4-4-2`) → chat.
- Após editar `app.js`/`app.css`: bump `?v=` em `index.html` + `sw.js` e `CACHE_VERSION`.

## Análise padrão — estrutura fixa (PDF referência / Meridian v1)

Referência visual: `Relatório · Meridian · Copa 2026.pdf`.

**7 abas obrigatórias** (nunca omitir a de Escanteios; nunca colapsar estrutura):

1. **Resumo** — confiança, fatores decisivos, tendências, sugestões de ticket  
2. **Tática** — probs resultado, mercados de gols, lambda Poisson, eventos, técnicos, confronto, duelos, síntese  
3. **Desempenho** — cards dos times + stats por jogador  
4. **Cartões & Faltas** — leitura, eventos, jogadores sob risco  
5. **Escanteios** — leitura, eventos, médias coletadas (`_corners`)  
6. **Escalação** — mapa de campo (`_pitchTeam` / formação real, não 4 buckets rígidos)  
7. **Dados Avançados** — placares mais prováveis, incerteza, lacunas  

Erros de estrutura do v1 **já corrigidos** que o v2 não deve regredir:

- Mapa de escalação: rederivar linhas no render; fatiar pela formação (ex. 4-2-3-1); L→R por LAD/LAE  
- Aba Escanteios ausente ou misturada em Tática  
- Card oco / seções vazias (usar `normalizeChatCard` / `_abaVaziaMsg`)  
- Misturar chat flexível com abas fixas do pipeline padrão  

## Idioma

- Responder em **pt-BR**.
