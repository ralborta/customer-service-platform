# Guía de Configuración en Railway

## Estructura de Servicios en Railway

Necesitas crear **4 servicios** en Railway:

1. **PostgreSQL** (Base de Datos)
2. **API** (`apps/api`)
3. **Channel Gateway** (`apps/channel-gateway`) - **AQUÍ VA BUILDERBOT**
4. **Worker** (`apps/worker`)

---

## 1. Base de Datos (PostgreSQL)

### Crear el servicio:
1. En Railway Dashboard → **New Project**
2. Click en **+ New** → **Database** → **Add PostgreSQL**
3. Railway creará automáticamente un servicio PostgreSQL

### Obtener la URL de conexión:
1. Click en el servicio PostgreSQL
2. Ve a la pestaña **Variables**
3. Copia la variable `DATABASE_URL` (Railway la crea automáticamente)
   - Formato: `postgresql://postgres:password@host:port/railway`

### Configurar pgvector (opcional):
```sql
-- Conéctate a la DB y ejecuta:
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 2. Channel Gateway (Webhooks Públicos)

**Este es el servicio donde configuras Builderbot** porque:
- Recibe webhooks de Builderbot
- Envía mensajes por WhatsApp usando Builderbot

### Crear el servicio:
1. **New Service** → **GitHub Repo** → Selecciona tu repo
2. En **Settings**:
   - **Root Directory**: Dejar vacío (raíz del monorepo)
   - **Build Command**: 
     ```bash
     pnpm install && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/channel-gateway build
     ```
   - **Start Command**: 
     ```bash
     cd apps/channel-gateway && pnpm start
     ```

### Variables de Entorno (Settings → Variables):

```env
# Base de Datos (compartida con todos los servicios)
DATABASE_URL=postgresql://postgres:password@host:port/railway

# Builderbot (OBLIGATORIO para WhatsApp)
BUILDERBOT_API_URL=https://api.builderbot.cloud
BUILDERBOT_API_KEY=tu_api_key_de_builderbot
BUILDERBOT_BOT_ID=tu_bot_id_opcional

# URL del API interno (para llamar al triage)
INTERNAL_API_URL=http://tu-api-service.railway.app
INTERNAL_API_TOKEN=token-interno-opcional

# Puerto (Railway lo asigna automáticamente)
PORT=3001
```

### Obtener la URL pública:
1. Click en el servicio Channel Gateway
2. Ve a **Settings** → **Networking**
3. Click en **Generate Domain** o usa un dominio personalizado
4. **Copia esta URL** - la necesitarás para configurar el webhook en Builderbot

**Ejemplo**: `https://channel-gateway-production.up.railway.app`

---

## 3. API (REST API Interna)

### Crear el servicio:
1. **New Service** → **GitHub Repo** → Mismo repo
2. En **Settings**:
   - **Root Directory**: Dejar vacío
   - **Build Command**: 
     ```bash
     pnpm install && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/api build
     ```
   - **Start Command**: 
     ```bash
     cd apps/api && pnpm start
     ```

### Variables de Entorno:

```env
# Base de Datos
DATABASE_URL=postgresql://postgres:password@host:port/railway

# JWT
JWT_SECRET=tu-secret-super-seguro-cambiar-en-produccion

# CORS (URL de tu web app en Vercel)
CORS_ORIGIN=https://tu-app.vercel.app

# Builderbot (para enviar mensajes desde API si es necesario)
BUILDERBOT_API_URL=https://api.builderbot.cloud
BUILDERBOT_API_KEY=tu_api_key_de_builderbot
BUILDERBOT_BOT_ID=tu_bot_id_opcional

# OpenAI (opcional - para LLM real en triage)
OPENAI_API_KEY=tu_openai_key_opcional

# Puerto
PORT=3000
```

---

## 4. Worker (Jobs Async)

### Crear el servicio:
1. **New Service** → **GitHub Repo** → Mismo repo
2. En **Settings**:
   - **Root Directory**: Dejar vacío
   - **Build Command**: 
     ```bash
     pnpm install && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/worker build
     ```
   - **Start Command**: 
     ```bash
     cd apps/worker && pnpm start
     ```

### Variables de Entorno:

```env
# Base de Datos
DATABASE_URL=postgresql://postgres:password@host:port/railway

# OpenAI (opcional - para embeddings y resúmenes)
OPENAI_API_KEY=tu_openai_key_opcional
```

---

## Configuración Inicial de la Base de Datos

Una vez que todos los servicios estén corriendo:

### Opción 1: Desde tu máquina local
```bash
# Conecta DATABASE_URL de Railway
export DATABASE_URL="postgresql://postgres:password@host:port/railway"

# Push schema
pnpm db:push

# Seed datos demo
pnpm db:seed
```

### Opción 2: Desde Railway (usando Railway CLI)
```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link al proyecto
railway link

# Ejecutar comandos en el contexto de Railway
railway run pnpm db:push
railway run pnpm db:seed
```

---

## Configurar Webhook en Builderbot

1. Ve a tu dashboard de Builderbot
2. Configuración del Bot → **Webhooks**
3. Agrega webhook:
   - **URL**: `https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp`
   - **Método**: `POST`
   - **Headers**:
     ```
     X-Account-Key: builderbot_whatsapp_main
     ```
   - **Eventos**: Selecciona `message.received`

---

## Resumen de Variables por Servicio

### PostgreSQL
- `DATABASE_URL` (automática)

### Channel Gateway (Builderbot aquí)
- `DATABASE_URL`
- `BUILDERBOT_API_URL`
- `BUILDERBOT_API_KEY` ⭐
- `BUILDERBOT_BOT_ID`
- `INTERNAL_API_URL`
- `PORT`

### API
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `BUILDERBOT_API_URL` (opcional, si envías desde API)
- `BUILDERBOT_API_KEY` (opcional)
- `OPENAI_API_KEY` (opcional)
- `PORT`

### Worker
- `DATABASE_URL`
- `OPENAI_API_KEY` (opcional)

---

## Checklist de Configuración

- [ ] Crear servicio PostgreSQL en Railway
- [ ] Copiar `DATABASE_URL` del PostgreSQL
- [ ] Crear servicio Channel Gateway
- [ ] Configurar variables de Builderbot en Channel Gateway ⭐
- [ ] Obtener URL pública del Channel Gateway
- [ ] Crear servicio API
- [ ] Configurar `JWT_SECRET` y `CORS_ORIGIN` en API
- [ ] Crear servicio Worker
- [ ] Ejecutar `pnpm db:push` y `pnpm db:seed`
- [ ] Configurar webhook en Builderbot con URL del Channel Gateway
- [ ] Probar enviando un mensaje de prueba

---

## Troubleshooting

### Error: "BUILDERBOT_API_KEY not found"
- Verifica que esté configurado en **Channel Gateway**, no en API
- Verifica que el nombre de la variable sea exactamente `BUILDERBOT_API_KEY`

### Error: "Failed to connect to database"
- Verifica que `DATABASE_URL` sea la misma en todos los servicios
- Verifica que el servicio PostgreSQL esté corriendo

### Los webhooks no llegan
- Verifica que la URL del Channel Gateway sea pública
- Verifica que el webhook en Builderbot tenga la URL correcta
- Revisa los logs del Channel Gateway en Railway

### Error: "INTERNAL_API_URL not found"
- Configura `INTERNAL_API_URL` en Channel Gateway apuntando a tu servicio API
- O deja vacío y usará fallback a rule-based triage
