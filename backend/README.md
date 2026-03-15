# Backend - Pedidos, Clientes e Sessao JWT

API REST com Express e Prisma ORM, com autenticacao baseada em cookies (access token curto + refresh token opaco + CSRF) e modelagem relacional entre `Order` e `Customer`.

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Configuração

1. Instale as dependências:

   ```bash
   cd backend && npm install
   ```

2. Crie o arquivo `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   Ajuste `DATABASE_URL` se quiser outro caminho para o SQLite e configure `JWT_SECRET`, `CORS_ORIGIN` e duracoes dos tokens.

3. Gere o cliente Prisma e aplique as migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

   Na primeira vez, isso cria o banco e aplica a migration `init`. Em produção ou em outro ambiente, use `npx prisma migrate deploy`.

4. (Opcional) Popule o banco com dados de exemplo:

   ```bash
   npm run db:seed
   ```

5. Inicie o servidor:

   ```bash
   npm run dev
   ```

A API estará em `http://localhost:3001`.

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST   | /auth/register | Cria conta inativa e gera token de ativacao |
| POST   | /auth/activate | Ativa conta com token valido |
| POST   | /auth/login | Cria cookies de sessao (access, refresh e csrf) |
| POST   | /auth/refresh | Rotaciona refresh e renova access |
| POST   | /auth/logout | Revoga refresh atual e limpa cookies |
| GET    | /auth/me | Retorna usuario autenticado |
| GET    | /orders | Lista todos os pedidos (protegido) |
| GET    | /orders/:id | Busca um pedido (protegido) |
| POST   | /orders | Cria um pedido (protegido + CSRF) |
| PUT    | /orders/:id | Atualiza um pedido (protegido + CSRF) |
| DELETE | /orders/:id | Remove um pedido (protegido + CSRF) |
| GET    | /customers/lookup?email=&phone= | Busca cliente por email/celular (protegido) |

As rotas autenticadas usam cookie HttpOnly para access/refresh. O frontend envia `X-CSRF-Token` (lido do cookie `gba_csrf`) em requisicoes de escrita.

O corpo das requisições de pedido (POST/PUT) segue o tipo `OrderItem` do frontend (`customer` continua no payload/response para compatibilidade), mas internamente o backend persiste cliente em tabela própria (`Customer`) e relaciona por `customerId`.

No fluxo de novo pedido, e possivel identificar cliente existente por celular/email com `GET /customers/lookup`, permitindo preencher automaticamente nome e sobrenome quando ja houver cadastro.

## Scripts

- `npm run dev` — inicia em modo desenvolvimento com reload
- `npm run build` — compila TypeScript para `dist/`
- `npm run start` — roda o build (`node dist/index.js`)
- `npm run db:generate` — gera o Prisma Client
- `npm run db:migrate` — aplica e cria migrations (`prisma migrate dev`)
- `npm run db:seed` — popula o banco com pedidos de exemplo (igual ao mock do frontend)
- `npm run db:push` — sincroniza o schema sem migration (útil para prototipar)
- `npm run db:studio` — abre o Prisma Studio para inspecionar dados
