# 🔧 CONFIGURACIÓN EXACTA PARA RAILWAY - Channel Gateway

## ❌ PROBLEMA CONFIRMADO

Los logs muestran:
- `"API listening on 0.0.0.0:8080"` ← Esto es del API, NO del Gateway
- NO aparece `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥`
- NO aparece `>>> ONREQUEST (RAW)`
- `/__ping` devuelve 401 (porque está corriendo el API con auth global)

**Conclusión**: Railway está ejecutando el código del **API** en lugar del **Gateway**.

---

## ✅ SOLUCIÓN DEFINITIVA (Modo "No me jodas más")

### En Railway Dashboard → Channel Gateway Service → Settings → Deploy

#### Root Directory:
```
apps/channel-gateway
```

#### Build Command:
```bash
pnpm install --frozen-lockfile
pnpm -C apps/channel-gateway clean || true
pnpm -C apps/channel-gateway build
```

#### Start Command:
```bash
node apps/channel-gateway/dist/index.js
```

✅ **Ventaja**: Evita totalmente que pnpm/workspaces/filters te jueguen en contra. Ejecuta directamente el archivo compilado.

---

## ✅ VERIFICACIÓN INFALIBLE

### 1. Revisa los logs al iniciar

Después del deploy, en los logs del Channel Gateway **DEBE aparecer EN ESTE ORDEN**:

1. ✅ `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥`
2. ✅ `CWD: /app/apps/channel-gateway` (o similar)
3. ✅ `ARGV: [ '/usr/local/bin/node', '/app/apps/channel-gateway/dist/index.js' ]` (o similar)
4. ✅ `🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥`
5. ✅ `📋 RUTAS REGISTRADAS:` con la lista de rutas
6. ✅ `🚀 Channel Gateway listening on 0.0.0.0:8080` (o el puerto que Railway asigne)

❌ **NO debe aparecer:**
- `API listening on 0.0.0.0:8080`
- Logs con formato de `@customer-service/api`

---

### 2. Prueba el endpoint `/__ping`

```bash
curl -i https://TU_GATEWAY.railway.app/__ping
```

✅ **Debe devolver 200:**
```json
{"ok":true,"service":"channel-gateway","ts":1234567890}
```

❌ **NO debe devolver 401**

Si devuelve 401, **todavía estás pegándole al API**. Revisa la configuración de Railway.

---

### 3. Prueba el webhook

```bash
curl -i -X POST https://TU_GATEWAY.railway.app/webhooks/builderbot/whatsapp \
  -H "content-type: application/json" \
  -d '{"ping":true}'
```

✅ **Debe loguear:**
- `>>> ONREQUEST (RAW) url= /webhooks/builderbot/whatsapp method= POST`
- `🚨🚨🚨 HANDLER EJECUTADO 🚨🚨🚨`

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### En Railway → Channel Gateway Service → Settings → Deploy:

- [ ] **Root Directory**: `apps/channel-gateway`
- [ ] **Build Command**: 
  ```bash
  pnpm install --frozen-lockfile
  pnpm -C apps/channel-gateway clean || true
  pnpm -C apps/channel-gateway build
  ```
- [ ] **Start Command**: 
  ```bash
  node apps/channel-gateway/dist/index.js
  ```
- [ ] **Variables de Entorno** configuradas:
  - [ ] `DATABASE_URL` (misma que PostgreSQL)
  - [ ] `BUILDERBOT_API_KEY`
  - [ ] `INTERNAL_API_URL` (URL del API service)
  - [ ] `PORT` (Railway lo asigna automáticamente, puede ser 8080)

---

## 🚨 IMPORTANTE: Railway TOML

El archivo `railway-gateway.toml` **puede ser ignorado** por Railway en monorepos.

**Por ahora, configura TODO por la UI de Railway** (Settings → Deploy).

Si quieres usar TOML más adelante:
1. Renombra `railway-gateway.toml` → `railway.toml`
2. Colócalo dentro de `apps/channel-gateway/railway.toml`
3. En Railway setea **Root Directory = `apps/channel-gateway`**

---

## 🔍 SI SIGUE FALLANDO

### Verifica que el build se ejecuta:
- Revisa los logs del build en Railway
- Debe compilar sin errores
- Debe generar `dist/index.js` en `apps/channel-gateway/dist/index.js`

### Verifica que el start apunta al archivo correcto:
- El log `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥` debe aparecer
- El `CWD` debe mostrar `/app/apps/channel-gateway` o similar
- El `ARGV` debe mostrar la ruta al archivo `dist/index.js`
- Si no aparecen estos logs, el start está ejecutando otro archivo

### Verifica el Root Directory:
- Debe ser exactamente `apps/channel-gateway` (sin espacios, sin barras al final)

### Reinicia el servicio:
- Railway → Channel Gateway → **Restart** o **Redeploy**

---

## 📝 RESUMEN DE CAMBIOS EN EL CÓDIGO

1. ✅ Logs forenses agregados: `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥`, `CWD`, `ARGV`
2. ✅ Log de boot único: `🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥`
3. ✅ `/__ping` retorna `{ ok: true, service: 'channel-gateway', ts: ... }`
4. ✅ CORS deshabilitado
5. ✅ Rate limiting deshabilitado temporalmente
6. ✅ Hooks de diagnóstico activos
7. ✅ Log adicional en `listen()` con `console.log`

---

## 🎯 PRÓXIMOS PASOS

1. **Configura Railway** con los valores exactos de arriba
2. **Espera 1-2 minutos** para el deploy
3. **Revisa los logs** - debe aparecer `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥` como PRIMERA línea
4. **Prueba `/__ping`** - debe devolver 200 con `service: "channel-gateway"`
5. **Si funciona**, prueba el webhook real desde Builderbot

---

## ✅ CHECKLIST FINAL (Cuando esté bien)

En logs del servicio gateway vas a ver en este orden:

1. ✅ `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥`
2. ✅ `CWD: /app/apps/channel-gateway` (o similar)
3. ✅ `ARGV: [ ... ]` (mostrando la ruta al dist/index.js)
4. ✅ `🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥`
5. ✅ `📋 RUTAS REGISTRADAS:` mostrando `/webhooks/builderbot/whatsapp`
6. ✅ `🚀 Channel Gateway listening on 0.0.0.0:8080` (o el puerto asignado)
7. ✅ Al pegar el webhook: `>>> ONREQUEST (RAW)...` y `🚨🚨🚨 HANDLER EJECUTADO 🚨🚨🚨`
