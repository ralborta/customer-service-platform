FROM node:20-slim

WORKDIR /app

# Copiamos TODO el monorepo (necesitamos packages/ para workspace dependencies)
COPY . .

# Instalación monorepo
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile || pnpm install

# Build de dependencias y del gateway
RUN pnpm --filter @customer-service/shared build || true
RUN pnpm --filter @customer-service/db build || true
RUN pnpm --filter @customer-service/channel-gateway build

# Hacer ejecutable el script de start
RUN chmod +x apps/channel-gateway/start.sh

ENV NODE_ENV=production
EXPOSE 8080

# Usar el wrapper script que fuerza el directorio correcto
CMD ["bash", "apps/channel-gateway/start.sh"]
