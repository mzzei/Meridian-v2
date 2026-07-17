# Meridian v2 — copiar para outra máquina (Drive)

Este pacote é o **Meridian v2**, **separado** do Meridian v1 (v1 / Copa).  
Leia **`ISOLAMENTO.md`** — nunca copie por cima da pasta da v1.

O Meridian v2 **ainda não está no git**: a verdade é a pasta no disco (+ backup/zip no drive).

## O que é isto

| Item | Valor |
|------|--------|
| Projeto | Meridian v2 (multi-campeonato) |
| Pasta | `Meridian-v2-*` |
| Porta | **3457** (v1 usa **3456** em outra pasta) |
| App | `index.html` + `css/app.css` + `js/app.js` |
| Servidor | `node serve.js` ou `Iniciar Meridian v2.bat` |

## Nesta máquina (antes de ir embora)

1. Feche o servidor Node se estiver rodando.
2. Rode `Copiar-Para-Drive.ps1` **ou** copie a pasta inteira.
3. Ejecte o drive com segurança.

## Na outra máquina

1. Copie para um local **próprio**, por exemplo:
   ```
   C:\Users\<voce>\Projetos\Meridian-v2
   ```
   **Não** coloque em cima da pasta do Meridian v1 / WorldCupAgent.

2. Instale **Node.js** se precisar: https://nodejs.org

3. Duplo clique em **`Iniciar Meridian v2.bat`**  
   ou `node serve.js` → http://localhost:3457/

4. No Grok: abrir **esta pasta** e pedir  
   *“Lê ISOLAMENTO.md e HANDOFF-v2.md e continua no Meridian v2.”*

## O que NÃO vai no drive

- Sessão/chat do Grok
- API keys no browser (localStorage)
- Atalhos da v1

## Segurança

- Não compartilhe a pasta publicamente se tiver chaves em arquivos.
