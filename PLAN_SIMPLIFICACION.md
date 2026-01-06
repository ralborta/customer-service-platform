# 🎯 Plan de Simplificación: Fusionar API + Gateway

## 🔍 Problema Actual

Tienes **2 servicios separados** que se comunican por HTTP:

1. **`apps/api`** - REST API con autenticación JWT
   - `/auth/login`
   - `/ai/triage` (con token interno)
   - `/conversations`, `/tickets`, etc. (con auth)

2. **`apps/channel-gateway`** - Webhooks públicos
   - `/webhooks/builderbot/whatsapp` (sin auth)
   - Llama a `INTERNAL_API_URL/ai/triage` (HTTP)
   - Tiene fallback rule-based si el API falla

**Complejidad innecesaria:**
- ❌ Necesitas `INTERNAL_API_URL` y `INTERNAL_API_TOKEN`
- ❌ Dos servicios en Railway (más configuración, más costos)
- ❌ Llamada HTTP interna (latencia, punto de falla)
- ❌ Si el API está caído, el gateway no puede hacer triage
- ❌ Dos builds, dos deploys, dos configuraciones

---

## ✅ Solución: Un Solo Servicio

**Fusionar `apps/api` + `apps/channel-gateway` → `apps/api`**

### Estructura Nueva:

```
apps/api/
├── src/
│   ├── index.ts              # Fastify principal
│   ├── routes/
│   │   ├── auth.ts           # /auth/login
│   │   ├── webhooks.ts       # /webhooks/* (públicos, sin auth)
│   │   ├── conversations.ts  # /conversations (con auth)
│   │   ├── tickets.ts        # /tickets (con auth)
│   │   └── ai.ts             # /ai/triage (con auth o token interno)
│   ├── services/
│   │   ├── triage.ts         # Lógica de triage (directa, sin HTTP)
│   │   └── tracking.ts
│   └── middleware/
│       └── auth.ts
```

### Ventajas:

✅ **Un solo servicio en Railway** - Menos configuración, menos costos
✅ **Sin comunicación HTTP interna** - Triage se llama directamente como función
✅ **Menos variables de entorno** - No necesitas `INTERNAL_API_URL` ni `INTERNAL_API_TOKEN`
✅ **Más rápido** - Sin latencia de red
✅ **Más confiable** - No hay punto de falla entre servicios
✅ **Más simple de debuggear** - Todo en un solo lugar

---

## 📋 Plan de Migración

### Paso 1: Mover lógica de webhooks al API

1. Copiar el handler de `/webhooks/builderbot/whatsapp` de `channel-gateway` a `api`
2. Crear ruta `/webhooks/*` que **NO requiera autenticación** (excluir de `onRequest` hook)
3. Mover `resolveTenant` y helpers del gateway al API

### Paso 2: Integrar triage directamente

1. En lugar de `fetch(INTERNAL_API_URL + '/ai/triage')`, llamar directamente:
   ```ts
   import { performTriage } from './services/triage';
   const triageResult = await performTriage(conversationId, lastMessageId, channel);
   ```

2. Eliminar el fallback rule-based (ya no es necesario, el triage siempre funciona)

### Paso 3: Actualizar frontend

1. Cambiar `NEXT_PUBLIC_API_URL` para apuntar al nuevo servicio unificado
2. El frontend sigue igual, solo cambia la URL base

### Paso 4: Eliminar channel-gateway

1. Eliminar `apps/channel-gateway/`
2. Eliminar servicio en Railway
3. Actualizar documentación

---

## 🚀 Configuración Final en Railway

**Un solo servicio: `api`**

- **Root Directory:** `/`
- **Build Command:** `pnpm install && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/api build`
- **Start Command:** `pnpm --filter @customer-service/api start`

**Variables de entorno:**
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `BUILDERBOT_API_KEY`
- `BUILDERBOT_API_URL`
- `OPENAI_API_KEY` (opcional)
- ~~`INTERNAL_API_URL`~~ ❌ **ELIMINADO**
- ~~`INTERNAL_API_TOKEN`~~ ❌ **ELIMINADO**

---

## ⚠️ Consideraciones

### ¿Qué pasa con el Worker?

El `apps/worker` puede quedarse separado (es para jobs async/cron, no necesita fusionarse).

### ¿Qué pasa con el Web?

El `apps/web` sigue igual, solo cambia la URL del API (que ahora es el mismo que recibe webhooks).

### Seguridad

- Los webhooks siguen siendo públicos (sin auth) pero están en el mismo servicio
- El resto de endpoints siguen requiriendo JWT
- Puedes agregar rate limiting solo a `/webhooks/*` si quieres

---

## 📊 Comparación

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

## 🎯 ¿Hacemos esto?

**Tiempo estimado:** 1-2 horas

**Beneficios inmediatos:**
- ✅ Eliminas la complejidad de comunicación entre servicios
- ✅ Reduces costos en Railway
- ✅ Simplificas el deploy
- ✅ Mejoras la confiabilidad
- ✅ Reduces la latencia

**Riesgos:**
- ⚠️ Necesitas actualizar la configuración de Builderbot (webhook URL)
- ⚠️ Necesitas hacer un deploy coordinado (actualizar webhook URL después del deploy)

---

## 💡 Alternativa Más Simple (Si no quieres fusionar todo)

Si prefieres mantener separados pero simplificar:

1. **Mover la lógica de triage a `packages/shared`** - Función compartida
2. **Ambos servicios importan y usan directamente** - Sin HTTP
3. **Mantener 2 servicios** pero sin comunicación HTTP

Esto es más simple que fusionar, pero menos simple que tener un solo servicio.

---

## 🤔 Mi Recomendación

**Fusionar todo en un solo servicio** es la mejor opción porque:
- Eliminas TODA la complejidad de comunicación entre servicios
- Reduces costos
- Simplificas el mantenimiento
- El código ya está ahí, solo hay que moverlo

¿Quieres que lo implemente?
