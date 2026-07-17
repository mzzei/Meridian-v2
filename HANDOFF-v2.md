# Handoff — Meridian v2

Leia **`ISOLAMENTO.md`**, **`ARCHITECTURE.md`** e, se precisar de detalhe de sessão, **`SESSAO-HANDOFF-DETALHADO.md`**.

## Identidade

- **Meridian v2** (multi-campeonato) — **não** é o Meridian v1.
- Pasta canônica: `C:\Users\Gabriel\Projetos\Meridian-v2`
- Backups: `Downloads\Meridian-v2\…` · `D:\Meridian-v2`
- Porta: **3457**
- Stack modular: ver `ARCHITECTURE.md` (intent / lineup / prompts / export / app)
- Git local próprio (não misturar com monólito v1)
- Testes: `node tests/run.mjs`
- Cache: `?v=40` · SW `meridian-v2-offline-v25`

## Como rodar

- `Iniciar Meridian v2.bat`
- ou `Abrir-Meridian-v2.vbs` (atalho **Meridian v2**)
- ou `node serve.js` → http://localhost:3457/

## CompContext (não misturar)

| Contexto | Variável | Uso |
|----------|----------|-----|
| **analysis** | `_activeCompId` | prompts, `fillMatch` |
| **stats** | `_statsCompId` | seletor Estatísticas / featured |
| **library** | `_libCompId` | drill-down Biblioteca |

## Temas

`meridian_ui_theme` → `aurora` | `verde` | `mono` (B&W)

## Análise padrão (não regredir)

7 abas = PDF `Relatório · Meridian · Copa 2026.pdf` + v1:  
Resumo · Tática · Desempenho · Cartões · **Escanteios** · Escalação · Avançados.  
Escalação: `buildPitchModel` / formação + L→R laterais.

## Continuando com IA

*“Estou no Meridian v2 (não na v1). Porta 3457. Lê ISOLAMENTO.md, ARCHITECTURE.md e HANDOFF-v2.md. CompContext + 3 temas. Continua no v2.”*
