# 🔧 Solución Inmediata: Crear Tabla `event_logs`

## ❌ Error Actual

```
The table `public.event_logs` does not exist in the current database.
```

## ✅ Solución: Actualizar Start Command en Railway

### Paso 1: Ve a Railway Dashboard

1. Selecciona el servicio **API** (`@customer-service/api`)
2. Ve a **Settings** → **Deploy**

### Paso 2: Actualiza el Start Command

**Start Command actual (probablemente):**
```bash
pnpm --filter @customer-service/api start
```

**Cámbialo a:**
```bash
pnpm --filter @customer-service/db db:push && pnpm --filter @customer-service/api start
```

### Paso 3: Guarda y Redeploy

1. Click en **Save**
2. Railway redeployará automáticamente
3. Espera a que termine el deploy

---

## ✅ Verificación

Después del deploy, prueba:

```
https://customer-serviceapi-production.up.railway.app/debug/events
```

**Debería funcionar sin errores** y mostrar:
- Lista vacía `[]` si no hay eventos aún
- O lista de eventos si ya hay algunos

---

## 🔍 Si sigue fallando

### Opción A: Usar el script de inicialización

Cambia el Start Command a:

```bash
bash scripts/init-db-railway.sh && pnpm --filter @customer-service/api start
```

### Opción B: Build Command

Si prefieres hacerlo en el build, agrega al **Build Command**:

```bash
pnpm install --frozen-lockfile && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/db db:push && pnpm --filter @customer-service/api build
```

Y deja el Start Command simple:
```bash
pnpm --filter @customer-service/api start
```

---

## 📋 Qué hace `db:push`

- Crea todas las tablas faltantes del schema de Prisma
- Incluye `event_logs` y todas las demás
- No borra datos existentes (solo crea lo que falta)
- Es seguro ejecutarlo múltiples veces

---

## ⚠️ Nota

Después de que `db:push` se ejecute exitosamente, puedes:
- Dejar el Start Command así (se ejecutará en cada deploy, pero es rápido)
- O quitarlo después del primer deploy exitoso (solo si estás seguro de que todas las tablas están creadas)

**Recomendación:** Déjalo así para que se actualice automáticamente si agregas nuevas tablas en el futuro.
