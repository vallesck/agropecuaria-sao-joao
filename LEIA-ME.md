# Agropecuária São João — como hospedar na Vercel

O site tem duas partes:

- **Vitrine** (`index.html`, `img/`) e **painel admin** (`admin/`).
- **Servidor** (`api/`): funções da Vercel que guardam produtos, categorias, fotos e a senha do painel no **Vercel Blob**.

Sem o Blob conectado, a vitrine aparece sem produtos e o painel não consegue entrar. É o único passo obrigatório além do deploy.

## 1. Publicar o projeto

Use **uma** das opções:

- **Pelo GitHub:** suba o conteúdo desta pasta para um repositório e, na Vercel, clique em **Add New → Project** e importe o repositório. Framework Preset: **Other**. Deixe o *Root Directory* como está (a raiz, onde fica o `index.html`).
- **Pelo terminal:** dentro desta pasta, rode `npx vercel` e depois `npx vercel --prod`.

> Importante: o caminho até a pasta `api/` **não pode ter espaços** (a Vercel recusa o deploy). Se colocar os arquivos dentro de uma subpasta no repositório, use um nome sem espaços, por exemplo `site/`.

## 2. Conectar o armazenamento (obrigatório)

1. No painel da Vercel, abra o projeto → aba **Storage**.
2. **Create Database** → escolha **Blob** → crie.
3. Conecte ao projeto (marque Production, Preview e Development). Isso cria a variável `BLOB_READ_WRITE_TOKEN` sozinha.
4. Faça um novo deploy: aba **Deployments** → nos `...` do último → **Redeploy**.

Na primeira visita, o site cria sozinho os 7 produtos e as 5 categorias iniciais.

## 3. Entrar no painel

- Endereço: `https://SEU-DOMINIO/admin`
- Senha inicial: **`admin123`**
- **Troque a senha logo no primeiro acesso** (aba **Senha**). Enquanto a senha inicial estiver em uso, o painel mostra um aviso.

Pelo painel dá para adicionar, editar, excluir e reordenar produtos, enviar fotos, marcar como sem estoque, ocultar produtos, gerenciar categorias e trocar a senha.

## Opcional

| Variável de ambiente | Para quê |
|---|---|
| `ADMIN_PASSWORD` | Define outra senha inicial no lugar de `admin123` (só vale até a senha ser trocada pelo painel). |
| `SESSION_SECRET` | Chave própria para assinar os logins. Se não existir, o site gera uma sozinho. |

Domínio próprio: projeto → **Settings → Domains**.

## Testar no computador

```bash
npm install
npx vercel link
npx vercel env pull .env.local
npx vercel dev
```

Fora da produção, os dados ficam numa pasta separada do Blob (`dev-data/`), sem mexer no site no ar.
