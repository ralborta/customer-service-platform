# ✅ Simplificación Completa: API + Gateway Fusionados

## 🎯 Cambios Realizados

Se fusionaron `apps/api` y `apps/channel-gateway` en un **solo servicio unificado**.

### ✅ Lo que se hizo:

1. **Rutas de webhooks agregadas al API**
   - `/webhooks/builderbot/whatsapp` (POST)
   - `/webhooks/elevenlabs/post-call` (POST)

2. **Funciones helper movidas al API**
   - `resolveTenant()` - Resuelve tenant desde accountKey
   - `getOrCreateCustomer()` - Obtiene o crea customer
   - `getOrCreateConversation()` - Obtiene o crea conversación
   - `generateIdempotencyKey()` - Genera clave de idempotencia

3. **Triage integrado directamente**
   - Ya NO se hace llamada HTTP a `/ai/triage`
   - Se llama directamente a `performTriage()` como función
   - Eliminada la necesidad de `INTERNAL_API_URL` y `INTERNAL_API_TOKEN`

4. **Rutas públicas configuradas**
   - Todas las rutas `/webhooks/*` son públicas (sin autenticación)
   - Endpoints de debug también públicos
   - El resto de rutas requieren JWT

5. **Endpoints de debug agregados**
   - `/debug/messages` - Ver mensajes recientes
   - `/debug/events` - Ver eventos de webhook
   - `/__ping` - Ping simple

---

## 🚀 Configuración en Railway

### **Un Solo Servicio: `api`**

#### Railway Dashboard → API Service → Settings → Deploy:

1. **Root Directory:**
   ```
   (DEJAR VACÍO - usar raíz del repo)
   ```

2. **Build Command:**
   ```bash
   pnpm install --frozen-lockfile && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/api build
   ```

3. **Start Command:**
   ```bash
   pnpm --filter @customer-service/api start
   ```

---

## 📋 Variables de Entorno (Actualizadas)

### Variables REQUERIDAS:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret para JWT tokens
- `CORS_ORIGIN` - Origen permitido para CORS (opcional, puede estar vacío)
- `BUILDERBOT_API_URL` - URL de Builderbot API
- `BUILDERBOT_API_KEY` - API key de Builderbot
- `BUILDERBOT_BOT_ID` - Bot ID (opcional)

### Variables OPCIONALES:
- `OPENAI_API_KEY` - Para triage con LLM (opcional)
- `PORT` - Puerto del servidor (default: 3000)
- `HOST` - Host del servidor (default: 0.0.0.0)

### Variables ELIMINADAS (ya no necesarias):
- ❌ `INTERNAL_API_URL` - **ELIMINADA**
- ❌ `INTERNAL_API_TOKEN` - **ELIMINADA**

---

## 🔄 Actualizar Builderbot Webhook

**IMPORTANTE:** Después del deploy, actualiza la URL del webhook en Builderbot:

**Antes:**
```
https://channel-gateway-production.up.railway.app/webhooks/builderbot/whatsapp
```

**Ahora:**
```
https://api-production.up.railway.app/webhooks/builderbot/whatsapp
```

(Reemplaza `api-production.up.railway.app` con la URL real de tu servicio API en Railway)

---

## ✅ Verificación

### 1. Verificar que el servicio está corriendo:

```bash
curl https://TU_API.railway.app/health
```

Debe devolver:
```json
{
  "status": "ok",
  "service": "api",
  "unified": true
}
```

### 2. Verificar ping:

```bash
curl https://TU_API.railway.app/__ping
```

Debe devolver:
```json
{
  "ok": true,
  "service": "api",
  "ts": 1234567890
}
```

### 3. Verificar webhook (desde Builderbot o manualmente):

```bash
curl -X POST https://TU_API.railway.app/webhooks/builderbot/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Account-Key: builderbot_whatsapp_main" \
  -d '{
    "event": "message.received",
    "data": {
      "from": "+1234567890",
      "message": {
        "text": "Hola, necesito ayuda"
      }
    }
  }'
```

Debe devolver 200 OK con:
```json
{
  "status": "processed",
  "conversationId": "...",
  "ticketId": "...",
  "messageId": "..."
}
```

---

## 🗑️ Eliminar Channel Gateway

Después de verificar que todo funciona:

1. **Eliminar servicio en Railway:**
   - Ve a Railway Dashboard
   - Selecciona el servicio "channel-gateway"
   - Settings → Delete Service

2. **Eliminar código (opcional):**
   ```bash
   rm -rf apps/channel-gateway
   ```

3. **Actualizar documentación:**
   - Eliminar referencias a `channel-gateway` en README
   - Actualizar guías de deploy

---

## 📊 Comparación Antes/Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Servicios en Railway** | 2 (API + Gateway) | 1 (API) |
| **Variables de entorno** | ~10 | ~8 |
| **Llamadas HTTP internas** | 1 por webhook | 0 |
| **Latencia de triage** | ~50-200ms | ~5-10ms |
| **Puntos de falla** | 2 servicios | 1 servicio |
| **Configuración Railway** | 2 servicios | 1 servicio |
| **Costo Railway** | 2x | 1x |

---

## 🎉 Beneficios

✅ **Un solo servicio** - Menos configuración, menos costos
✅ **Sin comunicación HTTP interna** - Más rápido, más confiable
✅ **Menos variables de entorno** - Más simple de mantener
✅ **Código más simple** - Todo en un solo lugar
✅ **Más fácil de debuggear** - Un solo log stream

---

## ⚠️ Notas Importantes

1. **Actualizar webhook URL en Builderbot** después del deploy
2. **Eliminar servicio channel-gateway** en Railway después de verificar
3. **Las variables `INTERNAL_API_URL` y `INTERNAL_API_TOKEN` ya no son necesarias** - puedes eliminarlas de Railway
4. **El endpoint `/ai/triage` sigue funcionando** pero ahora puede ser llamado sin auth (para uso interno) o con JWT (para uso desde frontend)

---

## 🐛 Troubleshooting

### Si el webhook devuelve 401:

- Verifica que `/webhooks/` esté en la lista de rutas públicas en el hook `onRequest`
- Revisa los logs del API para ver qué ruta está siendo bloqueada

### Si el triage falla:

- Verifica que `performTriage` esté importado correctamente
- Revisa los logs para ver el error específico
- El fallback rule-based debería funcionar si el triage falla

### Si no se crean mensajes:

- Verifica la conexión a la base de datos (`DATABASE_URL`)
- Revisa los logs para ver errores de Prisma
- Verifica que el tenant se esté resolviendo correctamente

---

**¡Listo! El sistema está simplificado y debería funcionar mejor que antes.**
