# 🔍 Diagnóstico: Por qué no llegan los mensajes

## Problemas Identificados

### 1. ❌ Channel Gateway devuelve 401 (Tenant no encontrado)

**Síntoma**: Los logs muestran `statusCode: 401` en todas las requests del webhook.

**Causa probable**: 
- La base de datos no tiene tablas creadas
- O no tiene tenants creados
- O el `DB_INIT=true` no se ejecutó correctamente

**Solución**:
1. Verifica en Railway → Servicio **API** → Variables:
   - `DB_INIT=true` debe estar configurado
   - `DATABASE_URL` debe estar configurado (misma DB que Channel Gateway)

2. Verifica que el servicio API haya ejecutado el seed:
   - Revisa los logs del API al iniciar
   - Debe mostrar: `🚀 Initializing database schema...` y `🌱 Seeding database...`

3. Si no se ejecutó, reinicia el servicio API con `DB_INIT=true`

---

### 2. ❌ Frontend (Vercel) no puede conectarse al API

**Síntoma**: Los mensajes no aparecen en el dashboard de Vercel.

**Causa probable**:
- `NEXT_PUBLIC_API_URL` no está configurado en Vercel
- O apunta a `localhost:3000` (no funciona en producción)

**Solución**:
1. En Vercel → Tu proyecto → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://tu-api-service.railway.app
   ```
   (Reemplaza con la URL real de tu API en Railway)

2. **IMPORTANTE**: Después de agregar la variable, haz un nuevo deploy

---

### 3. ❌ Webhook de Builderbot apunta al lugar incorrecto

**Síntoma**: Los mensajes no llegan al sistema.

**Verificación**:
1. En Builderbot Dashboard → Webhooks:
   - URL debe ser: `https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp`
   - **NO** debe ser: `https://tu-api.railway.app/...`

2. Verifica que el Channel Gateway esté accesible:
   - Abre en el navegador: `https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp`
   - Debe responder (aunque sea un error, significa que está accesible)

---

## Checklist de Verificación

### ✅ Base de Datos (Railway PostgreSQL)

- [ ] Servicio PostgreSQL creado
- [ ] `DATABASE_URL` copiada y configurada en todos los servicios (API, Channel Gateway, Worker)

### ✅ API Service (Railway)

- [ ] Servicio creado y conectado al repo
- [ ] Variables configuradas:
  - [ ] `DATABASE_URL` (misma que PostgreSQL)
  - [ ] `DB_INIT=true` (solo en el primer deploy, luego puedes quitarlo)
  - [ ] `JWT_SECRET` (algún string aleatorio)
  - [ ] `PORT=8080` (o el que Railway asigne)
- [ ] Logs muestran: `✅ Database schema initialized` y `✅ Database seeded`
- [ ] URL pública accesible: `https://tu-api.railway.app`

### ✅ Channel Gateway Service (Railway)

- [ ] Servicio creado y conectado al repo
- [ ] Variables configuradas:
  - [ ] `DATABASE_URL` (misma que PostgreSQL)
  - [ ] `BUILDERBOT_API_URL=https://api.builderbot.cloud`
  - [ ] `BUILDERBOT_API_KEY=tu_api_key`
  - [ ] `INTERNAL_API_URL=https://tu-api.railway.app` (URL del API service)
  - [ ] `INTERNAL_API_TOKEN=internal-token` (o el que configuraste)
  - [ ] `PORT=3001` (o el que Railway asigne)
- [ ] URL pública accesible: `https://tu-channel-gateway.railway.app`
- [ ] Webhook de Builderbot apunta a: `https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp`

### ✅ Frontend (Vercel)

- [ ] Proyecto conectado al repo
- [ ] Root Directory: `apps/web`
- [ ] Variables configuradas:
  - [ ] `NEXT_PUBLIC_API_URL=https://tu-api.railway.app` (URL del API service)
- [ ] Deploy exitoso

### ✅ Builderbot

- [ ] Webhook configurado:
  - [ ] URL: `https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp`
  - [ ] Método: `POST`
  - [ ] Eventos: `message.received`

---

## Cómo Verificar que Funciona

### 1. Verificar que la DB tiene datos:

Conéctate a la DB de Railway y ejecuta:
```sql
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM conversations;
SELECT COUNT(*) FROM messages;
```

Si todos devuelven `0`, el seed no se ejecutó.

### 2. Verificar que el Channel Gateway recibe webhooks:

Revisa los logs del Channel Gateway en Railway. Debes ver:
- `📥 Received webhook payload`
- `🔍 Resolving tenant for webhook`
- `✅ Tenant resolved successfully` (o `❌ Tenant not found` si falla)

### 3. Verificar que el API responde:

Abre en el navegador:
```
https://tu-api.railway.app/auth/login
```

Debe responder (aunque sea un error 400, significa que está funcionando).

### 4. Verificar que el Frontend se conecta al API:

Abre la consola del navegador en Vercel y revisa:
- Si hay errores de CORS
- Si hay errores de conexión al API
- Si el `API_URL` está correcto

---

## Solución Rápida

Si nada funciona, ejecuta esto en Railway:

1. **API Service** → Variables:
   ```
   DB_INIT=true
   DATABASE_URL=postgresql://...
   JWT_SECRET=algún-secret-aleatorio
   ```

2. **Channel Gateway** → Variables:
   ```
   DATABASE_URL=postgresql://... (misma que API)
   INTERNAL_API_URL=https://tu-api.railway.app
   INTERNAL_API_TOKEN=internal-token
   BUILDERBOT_API_KEY=tu_key
   ```

3. **Reinicia ambos servicios**

4. **Vercel** → Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://tu-api.railway.app
   ```

5. **Redeploy todo**

---

## Próximos Pasos

1. Verifica los logs del Channel Gateway para ver el error exacto
2. Verifica que la DB tenga tablas y tenants
3. Verifica que Vercel tenga `NEXT_PUBLIC_API_URL` configurado
4. Envía un mensaje de prueba desde WhatsApp y revisa los logs
