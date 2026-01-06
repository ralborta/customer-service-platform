# 🔧 Solución: Tabla `event_logs` no existe

## ❌ Error

```
The table `public.event_logs` does not exist in the current database.
```

## ✅ Solución

La tabla `event_logs` no se creó en la base de datos. Necesitas ejecutar `db:push` para crear todas las tablas faltantes.

---

## 🚀 Opción 1: Desde Railway (Recomendado)

### En Railway → API Service → Variables:

1. **Asegúrate de que `DB_INIT=true` esté configurado**
2. **Agrega o verifica el Build Command:**

   En Railway → API Service → Settings → Deploy → Build Command:
   ```bash
   pnpm install --frozen-lockfile && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/api build && pnpm --filter @customer-service/db db:push
   ```

3. **O agrega al Start Command:**

   En Railway → API Service → Settings → Deploy → Start Command:
   ```bash
   pnpm --filter @customer-service/db db:push && pnpm --filter @customer-service/api start
   ```

4. **Redeploy el servicio**

---

## 🚀 Opción 2: Desde tu máquina local (si tienes acceso a la DB)

```bash
cd /Users/ralborta/Customer_Service
pnpm --filter @customer-service/db db:push
```

**Nota:** Esto requiere que `DATABASE_URL` esté configurado en tu `.env` local y apunte a la misma base de datos de Railway.

---

## 🚀 Opción 3: Script de inicialización automática

Si prefieres que se ejecute automáticamente al iniciar el servicio, puedes crear un script que verifique y cree las tablas si no existen.

---

## ✅ Verificación

Después de ejecutar `db:push`, verifica:

1. **Prueba el endpoint de debug:**
   ```
   https://customer-serviceapi-production.up.railway.app/debug/events
   ```

2. **Debería funcionar sin errores** y mostrar:
   - Lista vacía si no hay eventos aún
   - O lista de eventos si ya hay algunos

---

## 📋 Tablas que se crearán

El `db:push` creará todas las tablas del schema de Prisma, incluyendo:
- ✅ `event_logs` (la que falta)
- ✅ `tenants`
- ✅ `users`
- ✅ `customers`
- ✅ `conversations`
- ✅ `messages`
- ✅ `tickets`
- ✅ Y todas las demás...

---

## 💡 Recomendación

**Opción 1 (Railway)** es la más simple porque:
- Se ejecuta automáticamente en cada deploy
- No necesitas acceso local a la DB
- Railway maneja todo

Solo asegúrate de que `DB_INIT=true` esté configurado o que el Build/Start Command incluya `db:push`.
