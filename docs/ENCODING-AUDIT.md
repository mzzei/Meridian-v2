# Auditoria profunda de encoding (mojibake)

**Classe de erro (o “cunho” do print):** texto UTF-8 interpretado como Latin-1/Windows-1252 e regravado.

| Correto | Corrompido (como no print) |
|---------|----------------------------|
| `Olá` | `OlÃ¡` |
| `Análise` | `AnÃ¡lise` |
| `Configurações` | `ConfiguraÃ§Ãµes` |
| `↑` | `â†‘` / `â†'` |
| `—` | `â€”` |
| `relatório` | `relatÃ³rio` |

**Print de referência:** `C:\Users\Gabriel\Downloads\atyfdvsuyhgsiofgj.png`  
(`OlÃ¡, tudo pronto para analisar.`)

**Data da varredura:** 2026-07-17  
**Pastas:** `Projetos\Meridian-v2` e `Downloads\Meridian-v2\Meridian-v2`

---

## Resultado da varredura

Escopo: `.html`, `.js`, `.css`, `.md`, `.json`, `.txt`, `.bat`, `.ps1`, `.vbs`, `.sql`, `.toml`  
(excluídos `node_modules`, `.git`, herança git v1)

### Arquivos de UI / runtime (críticos)

| Arquivo | Status pós-correção |
|---------|---------------------|
| `index.html` | **CLEAN** — `Olá`, `Análise`, `Configurações`, `Notícias` OK; setas do Exportar em SVG |
| `js/app.js` | **CLEAN** — sem marcadores de mojibake |
| `css/app.css` | **CLEAN** |
| `sw.js` | **Corrigido nesta varredura** — 16 ocorrências (comentários: `—`, `navegação`, `Página`, `ícones`) |
| `manifest.json` | CLEAN |
| `serve.js` | CLEAN (MIME já usa `charset=utf-8`) |

### Outros

| Item | Notas |
|------|--------|
| Scripts de auditoria em `docs/` | Podem conter marcadores **de propósito** (padrões de busca) |
| Handoffs `.md` | Em geral OK se gravados em UTF-8; re-auditar se editar no Bloco de Notas com ANSI |

### Totais (antes do fix do `sw.js`)

| Pasta | Arquivos escaneados | Infectados (reais) | Hits |
|-------|---------------------|--------------------|------|
| Projetos | ~30 | 1 (`sw.js`) + script de audit | 16 reais |
| Downloads | ~29 | 1 (`sw.js`) | 16 |

O `index.html` **já tinha sido reparado** na correção anterior do botão Exportar; o print que você mandou é típico de **HTML antigo em cache do Service Worker**, não do arquivo atual no disco.

---

## Causa raiz (por que volta a acontecer)

1. **Arquivo UTF-8** editado/salvo com ferramenta em **Windows-1252/ANSI** (ou PowerShell `Set-Content` sem `-Encoding utf8`).
2. Sequências multi-byte viram lixo visível (`Ã¡`, `â€`, etc.).
3. O **Service Worker** (`cache-first` do shell) pode continuar servindo o `index.html` **antigo** mesmo depois de o disco estar certo → parece que o bug “não saiu”.

---

## Correções aplicadas

1. Reparo de mojibake no `sw.js` (ambas as pastas).  
2. `index.html` verificado limpo + ícones SVG no Exportar (sem Unicode frágil).  
3. Cache-bust forçado: **`?v=38`** · SW **`meridian-v2-offline-v23`**.  
4. Relatório JSON: `docs/ENCODING-AUDIT.json`.

---

## Como confirmar no browser (obrigatório)

O disco está certo; se ainda vir `OlÃ¡`:

1. Servidor ligado na pasta canônica:  
   `C:\Users\Gabriel\Projetos\Meridian-v2`  
2. Abrir: **http://127.0.0.1:3457/?resetsw=1**  
3. Hard refresh (Ctrl+F5)  
4. Saudação deve ser: **“Olá, tudo pronto para analisar.”**

---

## Prevenção (regras para não repetir)

| Faça | Evite |
|------|--------|
| Editar `index.html` / `app.js` em editor UTF-8 (VS Code, etc.) | Bloco de Notas “ANSI” / “Western European” |
| PowerShell: `Set-Content -Encoding utf8` ou escrever via Node | `>` redirecionamento que reencoda |
| Após editar shell: bump `?v=` + `CACHE_VERSION` no `sw.js` | Só salvar e esperar o SW atualizar sozinho |
| Preferir **SVG** para ícones de UI | Setas Unicode soltas (`↑▾`) em HTML crítico |
| `serve.js` já manda `charset=utf-8` | Abrir `index.html` via `file://` (charset ambíguo) |

---

## Checklist de strings UI (estado atual no disco)

| String | `index.html` |
|--------|----------------|
| Olá, tudo pronto… | OK |
| Configurações | OK |
| Biblioteca de Jogos | OK |
| Relatórios Salvos | OK |
| Exportar (menu HTML/PDF) | OK (SVG) |
| Análise / relatório (textos de ajuda) | OK se UTF-8 limpo |

`js/app.js` (tabelas i18n e prompts): sem marcadores `Ã`/`â€` na varredura.

---

## Resumo

| | |
|--|--|
| **Cunho do bug** | Mojibake UTF-8 ↔ Latin-1 |
| **Onde estava no código** | Principalmente `index.html` (já limpo) + `sw.js` (limpo agora) |
| **Por que o print ainda mostrava** | Quase certamente **cache SW / aba antiga** |
| **Ação do usuário** | `?resetsw=1` + Ctrl+F5 |

*Fim da auditoria.*
