# Social Hub

Aplicativo completo de rede social com frontend, backend, banco de dados e Docker.

## Funcionalidades

- Cadastro e login com JWT.
- Feed de posts.
- Criacao e remocao de posts.
- Curtidas.
- Comentarios.
- Perfil publico por username.
- Edicao do proprio perfil.
- Busca de usuarios.
- Seguir e deixar de seguir usuarios.
- Chamadas de audio e video HD via WebRTC usando Wi-Fi ou dados moveis.

## Arquitetura

```text
apps/
  api/                 Backend Node.js + Express + Prisma
    prisma/            Schema do banco PostgreSQL
    src/
      config/          Env e Prisma client
      controllers/     Entrada HTTP
      middleware/      Auth e erros
      routes/          Rotas REST
      services/        Regras de negocio
      utils/           JWT e senha
  web/                 Frontend React + Vite + TypeScript
    src/
      api/             Cliente HTTP
      auth/            Contexto de autenticacao
      components/      Componentes reutilizaveis
      calls/           Cliente WebRTC e sinalizacao Socket.IO
      pages/           Telas principais
```

## Rodando localmente

### Sem Docker, usando SQLite

Use este modo em PCs corporativos onde Docker/WSL/virtualizacao nao estao liberados.

```bash
npm install
npm run setup:local
npm run db:local:generate
npm run db:local:push
npm run dev:local
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api

### GitHub Codespaces

O projeto ja inclui `.devcontainer/devcontainer.json`. Ao abrir no Codespaces, ele instala dependencias e prepara o banco SQLite automaticamente. Depois rode:

```bash
npm run dev:local
```

Abra a porta `5173` para usar o frontend.

### Com PostgreSQL local

1. Instale as dependencias:

```bash
npm install
```

2. Crie os arquivos de ambiente:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

3. Suba o banco:

```bash
docker compose up -d db
```

4. Gere o Prisma Client e rode a migracao:

```bash
npm run db:generate
npm run db:migrate
```

5. Rode frontend e backend:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api
- Healthcheck: http://localhost:4000/health

## Rodando com Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:4000/api
- PostgreSQL: localhost:5432

## Principais endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users?search=ana`
- `GET /api/users/:username`
- `PATCH /api/users/me`
- `POST /api/users/:id/follow`
- `DELETE /api/users/:id/follow`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`
- `DELETE /api/posts/:id/like`
- `POST /api/posts/:id/comments`
- `DELETE /api/posts/:postId/comments/:commentId`

## Chamadas de audio e video

As chamadas usam WebRTC no navegador. O backend usa Socket.IO apenas para sinalizacao: convidar, aceitar, recusar, encerrar e trocar oferta/resposta/candidatos ICE.

Em desenvolvimento, `localhost` funciona normalmente. Em producao, chamadas com camera e microfone exigem HTTPS. Para chamadas confiaveis em redes moveis, NAT restrito ou empresas, configure um servidor TURN e coloque as URLs em:

```bash
VITE_RTC_ICE_SERVERS="stun:stun.l.google.com:19302,turn:turn.seudominio.com:3478"
VITE_RTC_TURN_USERNAME="usuario-turn"
VITE_RTC_TURN_CREDENTIAL="senha-turn"
```

Sem TURN, chamadas ainda podem funcionar em muitas redes, mas algumas conexoes entre usuarios podem falhar.

## Proximos passos recomendados

- Upload de avatar e imagens de posts em S3 ou Cloudflare R2.
- Timeline personalizada apenas com usuarios seguidos.
- Notificacoes.
- Mensagens diretas.
- Moderacao e denuncia de conteudo.
- Testes automatizados de API e componentes.
