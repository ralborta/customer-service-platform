# 🔍 VERIFICAR CONFIGURACIÓN DE RAILWAY - Channel Gateway

## ❌ PROBLEMA CONFIRMADO EN LOS LOGS

Los logs muestran:
- `> @customer-service/api@1.0.0 start /app/apps/api` ← **Esto es del API**
- `API listening on 0.0.0.0:8080` ← **Esto es del API**
- NO aparece `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥`
- NO aparece `>>> ONREQUEST (RAW)`
- Todos los webhooks devuelven 401

**Conclusión**: Railway está ejecutando el código del **API** en lugar del **Gateway**.

---

## ✅ QUÉ VERIFICAR EN RAILWAY (AHORA MISMO)

Ve a **Railway Dashboard → Channel Gateway Service → Settings → Deploy** y copia **EXACTAMENTE** estos 3 valores:

### 1. Root Directory
¿Qué dice? (puede estar vacío, o decir `/`, o `apps/channel-gateway`, etc.)

### 2. Build Command
¿Qué dice? (copia el texto completo)

### 3. Start Command
¿Qué dice? (copia el texto completo)

---

## ✅ CONFIGURACIÓN CORRECTA (3 OPCIONES)

### **OPCIÓN 1: Root Directory + Start Directo (RECOMENDADA)**

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

---

### **OPCIÓN 2: Root Directory + Procfile (ALTERNATIVA)**

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
```
(DEJAR VACÍO - Railway usará el Procfile automáticamente)
```

**Nota**: Ya creé el archivo `apps/channel-gateway/Procfile` con `web: node dist/index.js`

---

### **OPCIÓN 3: Sin Root Directory (FORZADO)**

#### Root Directory:
```
(DEJAR VACÍO)
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

---

## ✅ VERIFICACIÓN DESPUÉS DEL DEPLOY

### 1. Revisa los logs al iniciar

**DEBE aparecer como PRIMERA LÍNEA:**
```
🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥
```

**Luego debe aparecer:**
```
CWD: /app/apps/channel-gateway
ARGV: [ '/usr/local/bin/node', '/app/apps/channel-gateway/dist/index.js' ]
🔥🔥🔥 BOOT_CHANNEL_GATEWAY__ONLY__2026-01-05 🔥🔥🔥
```

**Y finalmente:**
```
🚀 Channel Gateway listening on 0.0.0.0:8080
```

❌ **NO debe aparecer:**
- `> @customer-service/api@1.0.0 start /app/apps/api`
- `API listening on 0.0.0.0:8080`

---

### 2. Prueba `/__ping`

```bash
curl -i https://TU_GATEWAY.railway.app/__ping
```

✅ **Debe devolver 200:**
```json
{"ok":true,"service":"channel-gateway","ts":1234567890}
```

❌ **NO debe devolver 401**

---

## 🚨 SI SIGUE APARECIENDO "API listening"

Si después de configurar correctamente **todavía** ves `API listening on 0.0.0.0:8080`, entonces:

1. **Railway está ignorando tus comandos** y usando un config por defecto
2. **Hay un `railway.toml` en root** que está sobrescribiendo tu configuración
3. **El servicio está mal configurado** y Railway está usando auto-detect

**Solución**: 
- Verifica si hay un `railway.toml` en la raíz del repo
- Si existe, elimínalo o renómbralo temporalmente
- O crea un `railway.toml` específico en `apps/channel-gateway/railway.toml`

---

## 📋 CHECKLIST FINAL

- [ ] Root Directory configurado correctamente
- [ ] Build Command configurado correctamente
- [ ] Start Command configurado correctamente (o vacío si usas Procfile)
- [ ] No hay `railway.toml` en root que pueda interferir
- [ ] Después del deploy, aparece `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥` como primera línea
- [ ] `/__ping` devuelve 200 con `service: "channel-gateway"`

---

## 🎯 PRÓXIMOS PASOS

1. **Copia los 3 valores actuales** de Railway (Root Directory, Build Command, Start Command)
2. **Configura con una de las 3 opciones** de arriba
3. **Espera 1-2 minutos** para el deploy
4. **Revisa los logs** - debe aparecer `🔥 ENTRYPOINT: CHANNEL-GATEWAY 🔥` como primera línea
5. **Prueba `/__ping`** - debe devolver 200

Si después de esto **todavía** ves `API listening`, entonces Railway está ignorando tus comandos y necesitamos revisar si hay configs ocultos o usar otra estrategia.
