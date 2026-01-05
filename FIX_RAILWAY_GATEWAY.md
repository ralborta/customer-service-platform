# 🔧 FIX: Railway está ejecutando el API en lugar del Gateway

## ❌ Problema Detectado

En los logs del "channel-gateway" aparece:
```
"message":"@customer-service/api| ... /apps/api"
```

Esto significa que **Railway está ejecutando el código del API** en lugar del Gateway.

Por eso:
- `/__ping` devuelve **401** (porque el API tiene auth global)
- Los hooks del gateway no se ejecutan (porque no estás corriendo ese código)
- Los mensajes no se guardan (porque no estás pasando por el handler del gateway)

---

## ✅ Solución: Configurar Railway Correctamente

### Paso 1: Ir al servicio Channel Gateway en Railway

1. Railway Dashboard → Tu proyecto
2. Click en el servicio **Channel Gateway** (o `customer-service/channel-gateway`)

### Paso 2: Configurar Settings → Deploy

Ve a **Settings** → **Deploy** (o "Service Settings") y configura:

#### ✅ Root Directory
```
apps/channel-gateway
```

#### ✅ Build Command
```bash
pnpm install --frozen-lockfile && pnpm build
```

#### ✅ Start Command
```bash
pnpm start
```

**Alternativa (si no funciona con Root Directory):**

**Build Command:**
```bash
pnpm install --frozen-lockfile && pnpm -C apps/channel-gateway build
```

**Start Command:**
```bash
pnpm -C apps/channel-gateway start
```

---

## ✅ Verificación: Cómo Confirmar que Funciona

### 1. Revisa los logs al iniciar

Después del deploy, en los logs del Channel Gateway deberías ver:

✅ **DEBE aparecer:**
```
BOOT_CHANNEL_GATEWAY ✅
```

❌ **NO debe aparecer:**
```
@customer-service/api|.../apps/api
```

### 2. Prueba el endpoint `/__ping`

```bash
curl -i https://TU_GATEWAY.railway.app/__ping
```

✅ **Debe devolver 200:**
```json
{"ok":true,"ts":1234567890}
```

❌ **NO debe devolver 401**

### 3. Prueba el webhook

```bash
curl -i -X POST https://TU_GATEWAY.railway.app/webhooks/builderbot/whatsapp \
  -H "content-type: application/json" \
  -d '{"ping":true}'
```

✅ **Debe entrar al handler** y loguear:
- `>>> ONREQUEST (RAW) url= /webhooks/builderbot/whatsapp`
- `🚨🚨🚨 HANDLER EJECUTADO 🚨🚨🚨`

---

## 📋 Checklist de Configuración

### En Railway → Channel Gateway Service:

- [ ] **Root Directory**: `apps/channel-gateway`
- [ ] **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
- [ ] **Start Command**: `pnpm start`
- [ ] **Variables de Entorno** configuradas:
  - [ ] `DATABASE_URL` (misma que PostgreSQL)
  - [ ] `BUILDERBOT_API_KEY`
  - [ ] `INTERNAL_API_URL` (URL del API service)
  - [ ] `PORT=3001` (o el que Railway asigne)

### En `apps/channel-gateway/package.json`:

- [ ] `"build": "tsc"` ✅ (ya está)
- [ ] `"start": "node dist/index.js"` ✅ (ya está)

---

## 🚨 Importante: El Gateway NO debe tener Auth Global

El Gateway es un receptor de webhooks (server-to-server), por lo tanto:

- ❌ **NO debe tener** `@fastify/jwt` registrado globalmente
- ❌ **NO debe tener** hooks de autenticación globales
- ✅ **SÍ puede tener** validación route-specific con secret (opcional):

```typescript
fastify.post('/webhooks/builderbot/whatsapp', {
  preHandler: (req, reply) => {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.BUILDERBOT_WEBHOOK_SECRET) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  }
}, async (req, reply) => {
  // handler...
});
```

---

## 🔍 Si Sigue Fallando

1. **Verifica que el build se ejecuta:**
   - Revisa los logs del build en Railway
   - Debe compilar sin errores

2. **Verifica que el start apunta al archivo correcto:**
   - El log `BOOT_CHANNEL_GATEWAY ✅` debe aparecer
   - Si no aparece, el start está ejecutando otro archivo

3. **Verifica el Root Directory:**
   - Debe ser exactamente `apps/channel-gateway`
   - No debe tener espacios ni barras al final

4. **Reinicia el servicio:**
   - Railway → Channel Gateway → **Restart** o **Redeploy**
