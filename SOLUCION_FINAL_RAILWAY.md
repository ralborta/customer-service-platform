# 🎯 SOLUCIÓN FINAL - Railway ejecutando API en lugar de Gateway

## ❌ PROBLEMA CONFIRMADO

**Archivos encontrados:**
- `./railway.toml` (RAÍZ) ← **ESTE ES EL PROBLEMA**
  - `startCommand = "pnpm --filter @customer-service/api start"` ← Ejecuta el API
- `./apps/channel-gateway/railway.toml` ← Configuración correcta del Gateway
- `./apps/channel-gateway/Procfile` ← Alternativa con Procfile

**Síntoma:** Railway está usando el `railway.toml` de la raíz, que ejecuta el API.

---

## ✅ SOLUCIÓN 1: Script de arranque forzado (RECOMENDADA)

Ya creé el script `start-channel-gateway.sh` en la raíz del repo.

### En Railway Dashboard → Channel Gateway Service → Settings → Deploy:

#### Root Directory:
```
(DEJAR VACÍO o poner /)
```

#### Build Command:
```bash
pnpm install --frozen-lockfile
```

#### Start Command:
```bash
./start-channel-gateway.sh
```

**Ventaja:** Este script fuerza el build y ejecución del gateway, ignorando cualquier `railway.toml`.

---

## ✅ SOLUCIÓN 2: Root Directory + Start directo

### En Railway Dashboard → Channel Gateway Service → Settings → Deploy:

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
node dist/index.js
```

**Ventaja:** Con Root Directory = `apps/channel-gateway`, Railway debería usar el `railway.toml` de esa carpeta.

---

## ✅ SOLUCIÓN 3: Root Directory + Procfile

### En Railway Dashboard → Channel Gateway Service → Settings → Deploy:

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

**Ventaja:** Railway respeta Procfile muy bien.

---

## ✅ SOLUCIÓN 4: Renombrar railway.toml de raíz (NUCLEAR)

Si ninguna de las anteriores funciona, renombra temporalmente el `railway.toml` de la raíz:

```bash
mv railway.toml railway.toml.backup
```

Luego usa cualquiera de las soluciones anteriores.

**⚠️ IMPORTANTE:** Esto puede afectar otros servicios si dependen de ese archivo.

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
CWD: /app/apps/channel-gateway (o /app si usas script)
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

## 📋 CHECKLIST FINAL

- [ ] Configuré Railway con una de las 4 soluciones
- [ ] Después del deploy, aparece `🔥🔥🔥 RUNNING CHANNEL-GATEWAY ONLY 🔥🔥🔥` como primera línea
- [ ] NO aparece `API listening on 0.0.0.0:8080`
- [ ] `/__ping` devuelve 200 con `service: "channel-gateway"`
- [ ] Webhook devuelve 200 o entra al handler (no 401)

---

## 🎯 MI RECOMENDACIÓN PERSONAL

**Usa la SOLUCIÓN 1 (script forzado)** porque:
1. No depende de Root Directory
2. Ignora cualquier `railway.toml` que pueda interferir
3. Es explícito y no deja lugar a dudas
4. Ya está creado y con permisos de ejecución

**Configuración exacta:**
- **Root Directory:** (vacío)
- **Build Command:** `pnpm install --frozen-lockfile`
- **Start Command:** `./start-channel-gateway.sh`

---

## 🚨 SI SIGUE FALLANDO

Si después de probar todas las soluciones **todavía** ves `API listening`, entonces:

1. **Railway está usando un servicio "clonado" del API** - Verifica que el servicio "channel-gateway" no sea un fork/clone del servicio "api"
2. **Hay variables de entorno que están forzando el start** - Revisa si hay alguna variable `START_COMMAND` o similar
3. **Railway está usando un buildpack diferente** - Verifica que el builder sea `NIXPACKS` y no otro

En ese caso, la solución más rápida es **crear un servicio completamente nuevo** desde cero y conectarlo al mismo repo, pero con la configuración correcta desde el inicio.
