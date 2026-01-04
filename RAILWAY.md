# Railway Deployment Guide

Este monorepo contiene múltiples servicios que deben deployarse por separado en Railway.

## Servicios

1. **API** (`apps/api`) - REST API principal
2. **Channel Gateway** (`apps/channel-gateway`) - Webhooks públicos
3. **Worker** (`apps/worker`) - Jobs async y scheduler

## Configuración en Railway

### Opción 1: Deploy Manual por Servicio

Para cada servicio, crea un nuevo servicio en Railway y configura:

#### Para API:
- **Root Directory**: `/` (raíz del monorepo)
- **Build Command**: `pnpm install && pnpm --filter @customer-service/api build`
- **Start Command**: `pnpm --filter @customer-service/api start`
- **Variables de entorno**: Ver `.env.example` en `apps/api/`

#### Para Channel Gateway:
- **Root Directory**: `/` (raíz del monorepo)
- **Build Command**: `pnpm install && pnpm --filter @customer-service/channel-gateway build`
- **Start Command**: `pnpm --filter @customer-service/channel-gateway start`
- **Variables de entorno**: Ver `.env.example` en `apps/channel-gateway/`

#### Para Worker:
- **Root Directory**: `/` (raíz del monorepo)
- **Build Command**: `pnpm install && pnpm --filter @customer-service/worker build`
- **Start Command**: `pnpm --filter @customer-service/worker start`
- **Variables de entorno**: Ver `.env.example` en `apps/worker/`

### Opción 2: Usar railway.toml

Copia el archivo `railway-{service}.toml` correspondiente a `railway.toml` antes de hacer deploy:

```bash
# Para API
cp railway-api.toml railway.toml

# Para Gateway
cp railway-gateway.toml railway.toml

# Para Worker
cp railway-worker.toml railway.toml
```

## Variables de Entorno Requeridas

Todos los servicios necesitan:
- `DATABASE_URL` - URL de conexión a PostgreSQL

Cada servicio tiene variables adicionales específicas. Ver los archivos `.env.example` en cada app.

## Notas

- El servicio **Web** (`apps/web`) debe deployarse en **Vercel**, no en Railway
- Asegúrate de que todos los servicios compartan la misma `DATABASE_URL`
- El build debe ejecutarse desde la raíz del monorepo para que pnpm workspaces funcione correctamente
