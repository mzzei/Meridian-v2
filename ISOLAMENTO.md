# Identidade — Meridian v2

## Fonte da verdade

| Prioridade | Onde | Uso |
|------------|------|-----|
| **1** | Pasta do **Meridian v2** neste PC | Código e config atuais |
| **2** | Backup `D:\Meridian-v2*` (+ zip) | Restaurar se C: corromper |
| **—** | GitHub / monólito da v1 | **Não** é fonte do v2 |

O Meridian v2 **ainda não tem repositório git próprio**.  
Pasta `.git-heranca-v1-IGNORAR` = resto da v1 — ignore e não faça push.

---

## Meridian v2 vs Meridian v1

| | **Meridian v2** | **Meridian v1** |
|--|-----------------|------------------|
| Pasta típica | `...\Projetos\Meridian-v2` | `...\.claude\sessions\WorldCupAgent` |
| Porta | **3457** | **3456** |
| UI | `index.html` + `css/app.css` + `js/app.js` | monólito `index.html` |
| Atalho | **Meridian v2** | **Meridian** |
| Abrir | `Abrir-Meridian-v2.vbs` | launcher da pasta da v1 |
| Servidor | `Iniciar-Servidor-v2.bat` / `node serve.js` | `Iniciar WorldCup Agent.bat` |
| Foco | Multi-campeonato (BR, Liberta, EPL, LaLiga, UCL) | Linha Copa / original |

---

## Regras

1. Trabalhar **só** nos arquivos do Meridian v2 (e backup D: se precisar).  
2. **Nunca** misturar pastas com a v1 (copiar por cima / unificar).  
3. **Nunca** “consertar” o v2 com o monólito GitHub da v1.  
4. Portas, PWA, localStorage e atalhos **separados** (3456 ≠ 3457).  
5. CompContext: **analysis** / **stats** / **library** — não misturar.

---

## Agentes de IA

Ler `ISOLAMENTO.md`, `AGENTS.md`, `HANDOFF-v2.md`.  
Responder em pt-BR. Não tocar na v1 sem pedido explícito.
