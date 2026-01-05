FROM node:20-slim

WORKDIR /app

# Copiamos SOLO el service root (porque Railway con root directory ya recorta el contexto)
COPY . .

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --frozen-lockfile || pnpm install

# build
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]
