# ✅ Solución Definitiva: Forzar Ejecución del Channel Gateway

## 🔥 El Problema

Railway está ejecutando `node dist/index.js` desde el directorio equivocado, lo que hace que arranque el **API** en lugar del **Gateway**. Por eso ves 401 y no aparecen tus logs del gateway.

## ✅ Solución Implementada

Se crearon dos archivos:

1. **`apps/channel-gateway/start.sh`**: Script wrapper que fuerza el directorio correcto
2. **`apps/channel-gateway/Dockerfile`**: Actualizado para usar el script wrapper

---

## 🚀 Configuración en Railway (2 Opciones)

### **OPCIÓN A: Usar Dockerfile (RECOMENDADO)**

#### Railway Dashboard → Channel Gateway Service → Settings → Deploy:

1. **Root Directory:**
   ```
   (DEJAR VACÍO - usar raíz del repo)
   ```
   O explícitamente:
   ```
   /
   ```

2. **Builder:**
   ```
   Dockerfile
   ```

3. **Dockerfile Path:**
   ```
   apps/channel-gateway/Dockerfile
   ```

4. **Build Command:**
   ```
   (DEJAR VACÍO - Dockerfile maneja el build)
   ```

5. **Start Command:**
   ```
   (DEJAR VACÍO - Dockerfile tiene CMD)
   ```

---

### **OPCIÓN B: Usar Start Command Directo (Alternativa)**

Si prefieres NO usar Dockerfile:

1. **Root Directory:**
   ```
   (DEJAR VACÍO - usar raíz del repo)
   ```

2. **Builder:**
   ```
   NIXPACKS
   ```

3. **Build Command:**
   ```
   pnpm install --frozen-lockfile && pnpm --filter @customer-service/shared build && pnpm --filter @customer-service/db build && pnpm --filter @customer-service/channel-gateway build
   ```

4. **Start Command (OBLIGATORIO - este es el clave):**
   ```bash
   cd /app && test -f apps/channel-gateway/dist/index.js && node apps/channel-gateway/dist/index.js || (echo "FATAL: no existe apps/channel-gateway/dist/index.js" && pwd && ls -la && ls -la apps && ls -la apps/channel-gateway && exit 1)
   ```

   O usando el script wrapper:
   ```bash
   bash apps/channel-gateway/start.sh
   ```

---

## ✅ Verificación Después del Deploy

### 1. Revisar Logs de Railway

Debes ver **PRIMERO** esta línea:
```
🚀 BOOT WRAPPER channel-gateway
```

Y luego:
```
🔥🔥🔥 RUNNING CHANNEL-GATEWAY ONLY 🔥🔥🔥 2026-01-05T...
```

**❌ Si ves esto, está mal:**
```
@customer-service/api@1.0.0 start /app/apps/api
```

### 2. Probar Endpoints

```bash
# Health check
curl -i https://TU_GATEWAY.railway.app/health

# Ping endpoint
curl -i https://TU_GATEWAY.railway.app/__ping
```

**✅ Debe devolver 200 OK**

**❌ Si devuelve 401, sigue corriendo el API**

### 3. Probar Webhook

```bash
curl -i -X POST https://TU_GATEWAY.railway.app/webhooks/builderbot/whatsapp \
  -H "content-type: application/json" \
  -d '{"ping":true}'
```

**✅ Debe devolver 200 OK (o 400 si falta el body completo, pero NO 401)**

---

## 🔍 Debugging si Sigue Fallando

Si después de esto sigue apareciendo `apps/api` en los logs:

1. **Verifica el Start Command en Railway:**
   - Ve a Settings → Deploy
   - Copia exactamente lo que está en "Start Command"
   - Debe ser el comando con `cd /app` o el script wrapper

2. **Revisa los logs completos del deploy:**
   - Busca la línea que dice "Starting..."
   - Debe mostrar el comando exacto que Railway está ejecutando

3. **Verifica que el build generó el dist correcto:**
   - En los logs del build, busca `apps/channel-gateway/dist/index.js`
   - Debe aparecer sin errores

---

## 💡 Por Qué Funciona

- **`cd /app`**: Fuerza el working directory al root del repo dentro del contenedor
- **`test -f apps/channel-gateway/dist/index.js`**: Verifica que existe el archivo correcto antes de ejecutar
- **Ruta absoluta `apps/channel-gateway/dist/index.js`**: No depende del CWD actual
- **Script wrapper**: Añade logs de diagnóstico para confirmar que se ejecuta el código correcto

---

## 🎯 Resultado Esperado

Después de aplicar esto:

1. ✅ Los logs muestran `BOOT WRAPPER channel-gateway`
2. ✅ Los logs muestran `RUNNING CHANNEL-GATEWAY ONLY`
3. ✅ `/__ping` devuelve 200
4. ✅ `/health` devuelve 200
5. ✅ Los webhooks de Builderbot se procesan correctamente
6. ✅ Los mensajes se guardan en la base de datos

---

**Si después de esto sigue fallando, el problema NO es el código, es la configuración de Railway. Revisa cada campo en Settings → Deploy.**
