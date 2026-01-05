# 🔧 CONFIGURACIÓN EXACTA PARA RAILWAY - Channel Gateway

## ❌ PROBLEMA DETECTADO

Los logs muestran:
- `"API listening on 0.0.0.0:8080"` ← Esto es del API, NO del Gateway
- NO aparece `🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥`
- NO aparece `>>> ONREQUEST (RAW)`
- `/__ping` devuelve 401 (porque está corriendo el API con auth global)

**Conclusión**: Railway está ejecutando el código del **API** en lugar del **Gateway**.

---

## ✅ SOLUCIÓN: Configurar Railway Correctamente

### En Railway Dashboard → Channel Gateway Service → Settings → Deploy

Tienes **DOS OPCIONES**. Elige una:

---

### **OPCIÓN A (Recomendada): Root Directory + Start Simple**

#### Root Directory:
```
apps/channel-gateway
```

#### Build Command:
```bash
pnpm install --frozen-lockfile && pnpm build
```

#### Start Command:
```bash
pnpm start
```

✅ **Ventaja**: Simple y directo. Al tener Root Directory, `pnpm start` ejecuta el start del gateway.

---

### **OPCIÓN B (A Prueba de Balas): Sin Root Directory**

#### Root Directory:
```
(DEJAR VACÍO o no configurar)
```

#### Build Command:
```bash
pnpm install --frozen-lockfile && pnpm -C apps/channel-gateway build
```

#### Start Command:
```bash
pnpm -C apps/channel-gateway start
```

✅ **Ventaja**: Fuerza explícitamente el directorio, incluso si Railway se confunde.

---

### **OPCIÓN C (Ultra Segura): Start Directo con Node**

#### Root Directory:
```
apps/channel-gateway
```

#### Build Command:
```bash
pnpm install --frozen-lockfile && pnpm build
```

#### Start Command:
```bash
node dist/index.js
```

✅ **Ventaja**: No depende de `pnpm start`, ejecuta directamente el archivo compilado.

---

## ✅ VERIFICACIÓN INMEDIATA

### 1. Revisa los logs al iniciar

Después del deploy, en los logs del Channel Gateway **DEBE aparecer**:

✅ **DEBE aparecer:**
```
🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥
```

✅ **DEBE aparecer:**
```
🚀 Channel Gateway listening on 0.0.0.0:3001
```

❌ **NO debe aparecer:**
```
API listening on 0.0.0.0:8080
```

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
- `>>> ONREQUEST (RAW) url= /webhooks/builderbot/whatsapp`
- `🚨🚨🚨 HANDLER EJECUTADO 🚨🚨🚨`

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### En Railway → Channel Gateway Service:

- [ ] **Root Directory**: `apps/channel-gateway` (Opción A o C) o vacío (Opción B)
- [ ] **Build Command**: Según la opción elegida
- [ ] **Start Command**: Según la opción elegida
- [ ] **Variables de Entorno** configuradas:
  - [ ] `DATABASE_URL` (misma que PostgreSQL)
  - [ ] `BUILDERBOT_API_KEY`
  - [ ] `INTERNAL_API_URL` (URL del API service)
  - [ ] `PORT=3001` (o el que Railway asigne)

---

## 🚨 IMPORTANTE: Railway TOML

El archivo `railway-gateway.toml` **puede ser ignorado** por Railway en monorepos.

**Por ahora, configura TODO por la UI de Railway** (Settings → Deploy).

Cuando funcione, ahí sí podemos usar el TOML.

---

## 🔍 SI SIGUE FALLANDO

1. **Verifica que el build se ejecuta:**
   - Revisa los logs del build en Railway
   - Debe compilar sin errores
   - Debe generar `dist/index.js`

2. **Verifica que el start apunta al archivo correcto:**
   - El log `🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥` debe aparecer
   - Si no aparece, el start está ejecutando otro archivo

3. **Verifica el Root Directory:**
   - Debe ser exactamente `apps/channel-gateway` (sin espacios, sin barras al final)
   - O dejarlo vacío si usas Opción B

4. **Reinicia el servicio:**
   - Railway → Channel Gateway → **Restart** o **Redeploy**

---

## 📝 RESUMEN DE CAMBIOS EN EL CÓDIGO

1. ✅ Log de boot cambiado a: `🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥`
2. ✅ `/__ping` ahora retorna `{ ok: true, service: 'channel-gateway', ts: ... }`
3. ✅ CORS deshabilitado
4. ✅ Rate limiting deshabilitado temporalmente
5. ✅ Hooks de diagnóstico activos

---

## 🎯 PRÓXIMOS PASOS

1. Configura Railway con una de las 3 opciones
2. Espera 1-2 minutos para el deploy
3. Revisa los logs - debe aparecer el log de boot único
4. Prueba `/__ping` - debe devolver 200 con `service: "channel-gateway"`
5. Si funciona, prueba el webhook real desde Builderbot
