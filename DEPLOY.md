# Guía de Deploy Automático

## Configuración de Deploy Automático en Railway

Railway puede hacer deploy automático desde GitHub cuando conectas tu repositorio.

### Pasos para Configurar Deploy Automático:

1. **En Railway Dashboard:**
   - Ve a tu proyecto
   - Click en "New" → "GitHub Repo"
   - Selecciona el repositorio: `ralborta/customer-service-platform`
   - Railway detectará automáticamente los servicios

2. **Para cada servicio (API, Gateway, Worker):**
   - Railway creará un servicio automáticamente
   - Configura las variables de entorno necesarias
   - Railway usará los comandos de build/start del `railway.toml` o los que configures manualmente

3. **Configuración de Build/Start:**

   **API:**
   - Build: `pnpm install && pnpm --filter @customer-service/api build`
   - Start: `pnpm --filter @customer-service/api start`

   **Gateway:**
   - Build: `pnpm install && pnpm --filter @customer-service/channel-gateway build`
   - Start: `pnpm --filter @customer-service/channel-gateway start`

   **Worker:**
   - Build: `pnpm install && pnpm --filter @customer-service/worker build`
   - Start: `pnpm --filter @customer-service/worker start`

4. **Variables de Entorno:**
   - Configura todas las variables necesarias en cada servicio
   - `DATABASE_URL` debe ser compartida entre todos los servicios

## GitHub Actions (Opcional)

Si prefieres usar GitHub Actions para deploy, necesitas:

1. **Agregar Railway Token como Secret:**
   - Ve a Settings → Secrets and variables → Actions
   - Agrega `RAILWAY_TOKEN` con tu token de Railway

2. **El workflow `.github/workflows/deploy.yml` se ejecutará automáticamente**

## Deploy Manual

Si prefieres deploy manual:

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link al proyecto
railway link

# Deploy
railway up
```

## Notas

- Railway detecta automáticamente cambios en `main` y hace deploy
- Cada servicio se deploya independientemente
- El servicio Web debe deployarse en Vercel, no en Railway
