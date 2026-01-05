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

# Inicialización automática de DB (IMPORTANTE: activar en el primer deploy)
DB_INIT=true

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

**IMPORTANTE**: Configura `DB_INIT=true` en el servicio **API** para que las tablas se creen automáticamente en el primer deploy.

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

### ✅ Automático (Recomendado)

**Las tablas se crean automáticamente** cuando configuras `DB_INIT=true` en el servicio API:

1. En el servicio **API** en Railway
2. Ve a **Settings** → **Variables**
3. Agrega: `DB_INIT=true`
4. Al hacer deploy, automáticamente:
   - Crea todas las tablas (18 tablas)
   - Ejecuta el seed con datos demo (si es la primera vez)

**Nota**: Después del primer deploy exitoso, puedes quitar `DB_INIT=true` o dejarlo (solo hace seed si no hay datos).

### Opción Manual (si prefieres)

Si prefieres hacerlo manualmente:

```bash
# Conecta DATABASE_URL de Railway
export DATABASE_URL="postgresql://postgres:password@host:port/railway"

# Push schema
pnpm db:push

# Seed datos demo
pnpm db:seed
```

---

## Configurar Webhook en Builderbot (IMPORTANTE)

**Este es el paso clave**: Configurar Builderbot para que ENVÍE mensajes a nuestro sistema.

### Paso a paso:

1. **Obtén la URL pública de tu Channel Gateway en Railway:**
   - Ve al servicio Channel Gateway en Railway
   - Settings → Networking → Generate Domain
   - Copia la URL: `https://tu-channel-gateway.railway.app`

2. **Ve al dashboard de Builderbot:**
   - Login en https://builderbot.cloud
   - Selecciona tu bot

3. **Configura el Webhook:**
   - Ve a **Configuración** → **Webhooks** (o **Integrations**)
   - Click en **Add Webhook** o **Configure Webhook**
   - Configura:
     - **URL**: `https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp`
     - **Método**: `POST`
     - **Headers** (si Builderbot lo permite):
       ```
       X-Account-Key: builderbot_whatsapp_main
       ```
     - **Eventos a escuchar**: 
       - ✅ `message.received` (mensajes entrantes)
       - ✅ `message.sent` (opcional, para confirmaciones)
       - ✅ `message.delivered` (opcional)

4. **Guarda y activa el webhook**

5. **Prueba enviando un mensaje de prueba:**
   - Envía un mensaje de WhatsApp a tu número de Builderbot
   - Verifica en los logs de Railway Channel Gateway que llegó el webhook
   - Verifica en la base de datos que se creó el mensaje

### Estructura del Webhook que Builderbot debe enviar:

Nuestro sistema espera recibir de Builderbot:

```json
{
  "event": "message.received",
  "data": {
    "from": "+5491112345678",
    "message": {
      "text": "Hola, quiero consultar mi pedido"
    },
    "messageId": "msg_123456",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

Si Builderbot usa un formato diferente, necesitarás ajustar el schema en `packages/shared/src/schemas/index.ts`

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
- `DB_INIT=true` ⭐ (para crear tablas automáticamente)
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
- [ ] Configurar `DB_INIT=true` en API ⭐ (crea tablas automáticamente)
- [ ] Configurar `JWT_SECRET` y `CORS_ORIGIN` en API
- [ ] Crear servicio Worker
- [ ] Hacer deploy del API (las tablas se crean automáticamente)
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
