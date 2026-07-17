# Publicar Meridian v2 no GitHub Pages

O app é **estático** (HTML/CSS/JS). O `serve.js` **não** roda no Pages — só no PC.

## URL típica

Se o repositório for `SEU_USER/Meridian-v2`:

```text
https://SEU_USER.github.io/Meridian-v2/
```

Paths relativos (`./css/…`, `./js/…`) já funcionam nesse formato.

## 1. Conectar o remoto e enviar o código

No PowerShell (ajuste a URL do **seu** repositório):

```powershell
cd C:\Users\Gabriel\Projetos\Meridian-v2

git remote add origin https://github.com/SEU_USER/SEU_REPO.git
# se já existir: git remote set-url origin https://github.com/SEU_USER/SEU_REPO.git

git branch -M main
# ou mantenha master — o workflow aceita main e master

git push -u origin HEAD
```

Autenticação: login no GitHub no browser ou Personal Access Token (PAT) com `repo` + `workflow`.

## 2. Ativar Pages no GitHub

1. Abra o repositório no GitHub → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. (Alternativa sem Actions) Source: **Deploy from a branch** → branch `main`/`master` → folder `/ (root)`

Com o workflow `.github/workflows/pages.yml`, use **GitHub Actions**.

## 3. Conferir o deploy

1. Aba **Actions** → workflow **Deploy GitHub Pages** deve ficar verde  
2. **Settings → Pages** mostra a URL publicada  
3. Abra a URL (force refresh / aba anônima na 1ª vez)

## 4. O que funciona / o que não

| Funciona no Pages | Não roda no Pages |
|-------------------|-------------------|
| UI, temas, biblioteca, export HTML/PDF no browser | `node serve.js` / `.bat` local |
| PWA / SW (após 1ª visita online) | Secrets do Worker Cloudflare (configure no app) |
| Chamadas do browser à Anthropic/ESPN (sujeitas a CORS/rede) | Guardar API key no repositório (**nunca**) |

A chave Anthropic continua só no **localStorage** do visitante (Configurações).

## 5. Custom domain (opcional)

1. Pages → Custom domain → digite o domínio  
2. No DNS: registro `CNAME` apontando para `SEU_USER.github.io`  
3. Arquivo `CNAME` na raiz (o GitHub pode criar sozinho)

## Segurança

- Não commitar `sk-ant-…` nem `.env`  
- Worker URL (se usar) configure na UI do app, não no código  
- O repositório público expõe o código-fonte (esperado)

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| 404 em `/Meridian-v2` | Espere o Actions; confira Source = GitHub Actions |
| CSS/JS 404 | Confirme que o artifact inclui `css/` e `js/` (raiz do repo) |
| UI antiga | Hard refresh; Pages usa HTTPS (cache de SW separado do localhost) |
| Actions falhou | Permissões: Settings → Actions → General → Workflow permissions → **Read and write** |
