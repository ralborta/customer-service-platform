# 🔍 Verificación Paso a Paso: ¿Por qué no aparecen los mensajes?

## Paso 1: Verificar que la DB tiene tablas y datos

### Opción A: Desde Railway (Recomendado)

1. Ve a Railway → Tu proyecto → PostgreSQL service
2. Click en **Query** (o **Connect** → **Query**)
3. Ejecuta estas queries:

```sql
-- Verificar que existen las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar tenants
SELECT COUNT(*) as tenant_count FROM tenants;
SELECT * FROM tenants LIMIT 5;

-- Verificar mensajes
SELECT COUNT(*) as message_count FROM messages;
SELECT * FROM messages ORDER BY "createdAt" DESC LIMIT 5;

-- Verificar conversaciones
SELECT COUNT(*) as conversation_count FROM conversations;
SELECT * FROM conversations ORDER BY "updatedAt" DESC LIMIT 5;

-- Verificar channel accounts
SELECT * FROM channel_accounts;
```

**Si alguna query falla o devuelve 0 registros**, el problema está en la inicialización de la DB.

### Opción B: Desde tu máquina local

Si tienes acceso a la `DATABASE_URL` de Railway:

```bash
# Configura la variable de entorno
export DATABASE_URL="postgresql://..."

# Ejecuta el script de verificación
pnpm db:check
```

---

## Paso 2: Verificar logs del API (Railway)

1. Ve a Railway → API Service → **Logs**
2. Busca estos mensajes al inicio:

```
🔄 Inicializando base de datos...
📦 Creando/actualizando tablas...
✅ Base de datos inicializada
```

**Si NO ves estos mensajes:**
- Verifica que `DB_INIT=true` esté configurado en las Variables del API
- Reinicia el servicio API

**Si ves errores:**
- Copia el error completo
- Verifica que `DATABASE_URL` esté correcto

---

## Paso 3: Verificar logs del Channel Gateway (Railway)

1. Ve a Railway → Channel Gateway Service → **Logs**
2. Busca cuando llega un webhook:

```
📥 Received webhook payload
🔍 Resolving tenant for webhook
```

**Si ves:**
- `❌ Tenant not found` → La DB no tiene tenants (ver Paso 1)
- `✅ Tenant resolved successfully` → El tenant está OK, pero puede fallar después

**Si NO ves ningún log de webhook:**
- El webhook de Builderbot no está llegando
- Verifica la URL del webhook en Builderbot

---

## Paso 4: Verificar que los mensajes se guardan

En los logs del Channel Gateway, después de recibir un webhook, deberías ver:

```
✅ Message created in database
✅ Message processed successfully
```

**Si NO ves estos mensajes:**
- Revisa el error completo en los logs
- Verifica que `DATABASE_URL` esté configurado en Channel Gateway

---

## Paso 5: Verificar que el Frontend puede conectarse al API

### En Vercel:

1. Ve a Vercel → Tu proyecto → Settings → Environment Variables
2. Verifica que existe:
   ```
   NEXT_PUBLIC_API_URL=https://tu-api.railway.app
   ```
   (Reemplaza con la URL real de tu API)

3. **IMPORTANTE**: Después de agregar/modificar variables, haz un **nuevo deploy**

### Verificar desde el navegador:

1. Abre tu app en Vercel
2. Abre la consola del navegador (F12 → Console)
3. Intenta hacer login
4. Revisa si hay errores de conexión:
   - `Failed to fetch` → El API no es accesible o la URL está mal
   - `401 Unauthorized` → Problema de autenticación
   - `CORS error` → Problema de CORS (verifica `CORS_ORIGIN` en el API)

---

## Paso 6: Verificar el webhook de Builderbot

1. Ve a Builderbot Dashboard → Tu bot → Webhooks
2. Verifica que la URL sea:
   ```
   https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp
   ```
   (NO debe ser la URL del API)

3. Verifica que el webhook esté **activo**

4. Envía un mensaje de prueba desde WhatsApp
5. Revisa los logs del Channel Gateway inmediatamente después

---

## Checklist Rápido

- [ ] **DB tiene tablas**: Query `SELECT * FROM tenants` devuelve datos
- [ ] **DB tiene tenants**: Al menos 1 tenant en la tabla `tenants`
- [ ] **API tiene `DB_INIT=true`**: Configurado en Railway → API → Variables
- [ ] **API logs muestran inicialización**: Logs muestran `✅ Base de datos inicializada`
- [ ] **Channel Gateway tiene `DATABASE_URL`**: Misma URL que el API
- [ ] **Channel Gateway logs muestran webhooks**: Logs muestran `📥 Received webhook payload`
- [ ] **Channel Gateway resuelve tenant**: Logs muestran `✅ Tenant resolved successfully`
- [ ] **Mensajes se guardan**: Logs muestran `✅ Message created in database`
- [ ] **Vercel tiene `NEXT_PUBLIC_API_URL`**: Configurado y redeploy hecho
- [ ] **Webhook de Builderbot apunta al Channel Gateway**: NO al API

---

## Solución Rápida si Nada Funciona

### 1. Reiniciar todo con DB_INIT

**Railway → API Service:**
```
Variables:
  DB_INIT=true
  DATABASE_URL=postgresql://...
  JWT_SECRET=algún-secret-aleatorio
```

**Railway → Channel Gateway Service:**
```
Variables:
  DATABASE_URL=postgresql://... (misma que API)
  INTERNAL_API_URL=https://tu-api.railway.app
  INTERNAL_API_TOKEN=internal-token
  BUILDERBOT_API_KEY=tu_key
```

### 2. Reiniciar ambos servicios

En Railway, click en **Restart** en ambos servicios (API y Channel Gateway)

### 3. Verificar logs

Espera 1-2 minutos y revisa los logs del API. Deberías ver:
```
🔄 Inicializando base de datos...
✅ Base de datos inicializada
```

### 4. Enviar mensaje de prueba

Envía un mensaje desde WhatsApp y revisa los logs del Channel Gateway

### 5. Verificar en la DB

Ejecuta en Railway → PostgreSQL → Query:
```sql
SELECT COUNT(*) FROM messages;
SELECT * FROM messages ORDER BY "createdAt" DESC LIMIT 1;
```

Si ves el mensaje aquí pero no en Vercel, el problema es la conexión Frontend → API.

---

## Errores Comunes

### Error: "No tenant found"
**Causa**: La DB no tiene tenants (el seed no se ejecutó)
**Solución**: Configura `DB_INIT=true` en el API y reinicia

### Error: "Connection refused" o "ECONNREFUSED"
**Causa**: El API no está corriendo o la URL está mal
**Solución**: Verifica que el API esté corriendo y que `INTERNAL_API_URL` sea correcta

### Error: "401 Unauthorized" en el frontend
**Causa**: `NEXT_PUBLIC_API_URL` no está configurado o está mal
**Solución**: Configura la variable en Vercel y haz redeploy

### Los mensajes están en la DB pero no aparecen en Vercel
**Causa**: El frontend no puede conectarse al API o hay problema de CORS
**Solución**: 
1. Verifica `NEXT_PUBLIC_API_URL` en Vercel
2. Verifica `CORS_ORIGIN` en el API (debe ser la URL de Vercel)
3. Revisa la consola del navegador para errores
