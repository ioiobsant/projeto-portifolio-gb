# Backend - CRUD de Pedidos

API REST com Express e Prisma ORM, compatível com os dados de pedido do frontend.

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

   Ajuste `DATABASE_URL` se quiser outro caminho para o SQLite.

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

| Método | Rota           | Descrição              |
|--------|----------------|------------------------|
| GET    | /orders        | Lista todos os pedidos |
| GET    | /orders/:id    | Busca um pedido        |
| POST   | /orders        | Cria um pedido         |
| PUT    | /orders/:id    | Atualiza um pedido     |
| DELETE | /orders/:id    | Remove um pedido       |

O corpo das requisições (POST/PUT) segue o tipo `OrderItem` do frontend (id, category, model, customer, specs, quantity, saleValue, deliveryDate, status, createdAt, etc.).

## Scripts

- `npm run dev` — inicia em modo desenvolvimento com reload
- `npm run build` — compila TypeScript para `dist/`
- `npm run start` — roda o build (`node dist/index.js`)
- `npm run db:generate` — gera o Prisma Client
- `npm run db:migrate` — aplica e cria migrations (`prisma migrate dev`)
- `npm run db:seed` — popula o banco com pedidos de exemplo (igual ao mock do frontend)
- `npm run db:push` — sincroniza o schema sem migration (útil para prototipar)
- `npm run db:studio` — abre o Prisma Studio para inspecionar dados
