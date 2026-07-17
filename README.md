# Meridian v2 · Multi-campeonato

> **Meridian v2** — não é o Meridian v1.  
> Porta **3457** · ver [`ISOLAMENTO.md`](./ISOLAMENTO.md).

App de inteligência esportiva multi-liga (evolução local da linha Meridian):  
Série A, Libertadores, Premier League, LaLiga e Champions League.

| | Meridian v2 | Meridian v1 |
|--|-------------|-------------|
| Pasta | `...\Projetos\Meridian-v2` | `...\.claude\sessions\WorldCupAgent` |
| Porta | **3457** | **3456** |
| UI | `index.html` + `css/app.css` + `js/app.js` | monólito `index.html` |
| Atalho | **Meridian v2** | **Meridian** |

## Como rodar

```bat
Iniciar Meridian v2.bat
```

Ou: `node serve.js` → http://localhost:3457/  
App / atalho: `Abrir-Meridian-v2.vbs`

## Arquivos de identidade

| Arquivo | Função |
|---------|--------|
| `ISOLAMENTO.md` | v2 vs v1; verdade = disco local |
| `AGENTS.md` | Regras para IA |
| `HANDOFF-v2.md` | Continuar trabalho |
| `SESSAO-HANDOFF-DETALHADO.md` | Handoff longo de sessão |
| `Abrir-Meridian-v2.vbs` | Abre na 3457 (modo app) |
| `Iniciar-Servidor-v2.bat` | Sobe o Node |
| `Iniciar Meridian v2.bat` | Servidor + browser |
| `Reparar-Meridian-v2.bat` | Sobe servidor + limpa SW |

## Backup

- `Copiar-Para-Drive.ps1`  
- `D:\Meridian-v2*` (ou zip com data)
