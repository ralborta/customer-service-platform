FROM node:20-slim

WORKDIR /app

# Copiamos monorepo (porque dependés de packages/)
COPY . .

# Instalación monorepo
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile

# Build de dependencias y del gateway
RUN pnpm --filter @customer-service/shared build
RUN pnpm --filter @customer-service/db build
RUN pnpm --filter @customer-service/channel-gateway build

WORKDIR /app/apps/channel-gateway

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]
