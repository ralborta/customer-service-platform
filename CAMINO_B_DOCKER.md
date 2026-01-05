# 🐳 CAMINO B: Dockerfile para Channel Gateway

## ✅ Dockerfile creado

Ya creé el Dockerfile en `apps/channel-gateway/Dockerfile` que:
- Usa Node 20
- Copia todo el monorepo (necesario para `packages/`)
- Instala dependencias con pnpm
- Builda shared, db y channel-gateway
- Ejecuta el gateway desde `dist/index.js`

---

## 🔧 CONFIGURACIÓN EN RAILWAY

### Paso 1: Railway Dashboard → Channel Gateway Service → Settings → Deploy

#### Builder:
```
Dockerfile
```

#### Dockerfile Path:
```
apps/channel-gateway/Dockerfile
```

#### Root Directory:
```
(DEJAR VACÍO o /)
```

#### Build Command:
```
(DEJAR VACÍO - Dockerfile maneja el build)
```

#### Start Command:
```
(DEJAR VACÍO - Dockerfile tiene CMD)
```

---

## ✅ VENTAJAS DEL DOCKERFILE

1. **No depende de autodetección** - Railway no puede "adivinar" qué ejecutar
2. **Control total** - Vos definís exactamente qué se builda y cómo
3. **Reproducible** - Mismo resultado en cualquier entorno
4. **Ignora railway.toml** - El Dockerfile tiene prioridad sobre configs

---

## 🔍 VERIFICACIÓN DESPUÉS DEL DEPLOY

### 1. Revisa los logs al iniciar

**DEBE aparecer como PRIMERA LÍNEA:**
```
🔥🔥🔥 RUNNING CHANNEL-GATEWAY ONLY 🔥🔥🔥 2026-01-05T...
```

**Luego debe aparecer:**
```
🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥
CWD: /app/apps/channel-gateway
ARGV: [ '/usr/local/bin/node', '/app/apps/channel-gateway/dist/index.js' ]
```

**Y finalmente:**
```
🚀 Channel Gateway listening on 0.0.0.0:8080
```

**❌ NO debe aparecer:**
- `> @customer-service/api@1.0.0 start /app/apps/api`
- `API listening on 0.0.0.0:8080`
- `Tenants en la DB...` (ese log es del API)

---

### 2. Prueba `/__ping`

```bash
curl -i https://TU_GATEWAY.railway.app/__ping
```

**✅ Debe devolver 200:**
```json
{"ok":true,"service":"channel-gateway","ts":1234567890}
```

**❌ NO debe devolver 401**

---

### 3. Prueba webhook

```bash
curl -i -X POST https://TU_GATEWAY.railway.app/webhooks/builderbot/whatsapp \
  -H "content-type: application/json" \
  -d '{"ping":true}'
```

**✅ Debe entrar al handler y loguear:**
- `>>> ONREQUEST (RAW) ...`
- `HANDLER EJECUTADO`

**❌ NO debe devolver 401**

---

## 🚨 SI EL DOCKERFILE NO SE DETECTA

Si Railway no detecta el Dockerfile automáticamente:

1. **Verifica el path**: Debe ser `apps/channel-gateway/Dockerfile` desde la raíz
2. **Forzar Dockerfile**: En Settings → Deploy → Builder, selecciona manualmente "Dockerfile"
3. **Verifica que el archivo esté en el repo**: `git add apps/channel-gateway/Dockerfile && git commit && git push`

---

## 📋 CHECKLIST FINAL

- [ ] Dockerfile creado en `apps/channel-gateway/Dockerfile`
- [ ] Railway configurado con Builder = "Dockerfile"
- [ ] Dockerfile Path = `apps/channel-gateway/Dockerfile`
- [ ] Después del deploy, aparece `🔥🔥🔥 RUNNING CHANNEL-GATEWAY ONLY 🔥🔥🔥` como primera línea
- [ ] NO aparece `API listening on 0.0.0.0:8080`
- [ ] `/__ping` devuelve 200 con `service: "channel-gateway"`
- [ ] Webhook devuelve 200 o entra al handler (no 401)

---

## 🎯 POR QUÉ ESTO FUNCIONA

El Dockerfile **fuerza** a Railway a:
1. Construir desde el contexto del monorepo completo
2. Instalar todas las dependencias
3. Buildar solo lo necesario (shared, db, channel-gateway)
4. Ejecutar **exactamente** `node dist/index.js` del gateway

No hay lugar para "autodetección" ni "configs que se pisan". El Dockerfile es la fuente de verdad.

---

## 💡 BONUS: Si querés optimizar el build (opcional)

Si el build es muy lento, podés usar multi-stage build para cachear mejor:

```dockerfile
FROM node:20-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/*/package.json ./packages/*/
COPY apps/channel-gateway/package.json ./apps/channel-gateway/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @customer-service/shared build
RUN pnpm --filter @customer-service/db build
RUN pnpm --filter @customer-service/channel-gateway build

FROM base AS runtime
WORKDIR /app/apps/channel-gateway
COPY --from=build /app/apps/channel-gateway/dist ./dist
COPY --from=build /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

Pero para empezar, el Dockerfile simple que creé debería funcionar perfectamente.
