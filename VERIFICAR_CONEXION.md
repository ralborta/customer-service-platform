# 🔍 Verificar Conexión Frontend → API

## ❌ Error: "No se puede conectar al API"

Si ves este error aunque `NEXT_PUBLIC_API_URL` esté configurado correctamente, el problema es que **el API no es accesible desde Vercel**.

## ✅ Verificaciones Paso a Paso

### 1. Verificar que el API está corriendo

**Railway → API Service → Logs**

Deberías ver:
```
🚀 API listening on 0.0.0.0:8080
```

Si no ves esto, el API no está corriendo. Reinicia el servicio.

### 2. Verificar que el API es accesible públicamente

Abre en el navegador (reemplaza con tu URL real):
```
https://customer-serviceapi-production.up.railway.app/health
```

**Debería responder:**
```json
{"status":"ok","service":"api"}
```

**Si no responde o da error:**
- El API no está accesible públicamente
- Verifica que Railway haya generado un dominio público
- Verifica que el servicio API esté "Active" en Railway

### 3. Verificar CORS (si el error cambia a CORS)

Si el API responde pero hay errores de CORS:

**Railway → API Service → Variables**

Agrega:
```
CORS_ORIGIN=https://tu-app.vercel.app
```

(Reemplaza con la URL real de tu app en Vercel)

O deja `CORS_ORIGIN` vacío (el código permite todos los orígenes por defecto).

### 4. Verificar la URL en la consola del navegador

1. Abre tu app en Vercel
2. Abre la consola (F12 → Console)
3. Intenta hacer login
4. Revisa el log `🌐 API Request`

Deberías ver:
```
🌐 API Request: {
  url: "https://customer-serviceapi-production.up.railway.app/auth/login",
  apiUrl: "https://customer-serviceapi-production.up.railway.app",
  method: "POST"
}
```

**Si la URL es `localhost` o está mal:**
- `NEXT_PUBLIC_API_URL` no está configurado en Vercel
- O no hiciste redeploy después de configurarlo

**Si la URL es correcta pero falla:**
- El API no está accesible (ver paso 2)
- O hay un problema de CORS (ver paso 3)

### 5. Verificar Network Tab

1. Abre la consola (F12)
2. Ve a la pestaña **Network**
3. Intenta hacer login
4. Busca la request a `/auth/login`
5. Click en ella y revisa:
   - **Status**: ¿Qué código HTTP?
   - **Headers**: ¿Qué headers tiene?
   - **Response**: ¿Qué responde el servidor?

**Si Status es:**
- `(failed)` o `ERR_CONNECTION_REFUSED`: El API no es accesible
- `404`: El endpoint no existe
- `405`: El método HTTP no está permitido
- `CORS error`: Problema de CORS

## 🐛 Problemas Comunes

### Problema 1: El API no está corriendo

**Síntoma**: El `/health` no responde

**Solución**:
1. Railway → API Service → Logs
2. Verifica que veas `🚀 API listening on 0.0.0.0:8080`
3. Si no, reinicia el servicio

### Problema 2: El API no tiene dominio público

**Síntoma**: No puedes acceder a `https://tu-api.railway.app/health`

**Solución**:
1. Railway → API Service → Settings → Networking
2. Click en **Generate Domain** o **Add Domain**
3. Copia la URL generada
4. Actualiza `NEXT_PUBLIC_API_URL` en Vercel con esa URL

### Problema 3: CORS bloqueando las requests

**Síntoma**: El error en la consola menciona "CORS" o "Access-Control-Allow-Origin"

**Solución**:
1. Railway → API Service → Variables
2. Agrega `CORS_ORIGIN=https://tu-app.vercel.app`
3. O deja `CORS_ORIGIN` vacío (permite todos)
4. Reinicia el API service

### Problema 4: El puerto está mal configurado

**Síntoma**: El API no escucha en el puerto correcto

**Solución**:
1. Railway → API Service → Variables
2. Verifica que `PORT` esté configurado (Railway lo asigna automáticamente)
3. El código usa `process.env.PORT || '3000'`, pero Railway asigna uno automáticamente

## 📝 Checklist de Verificación

- [ ] El API está corriendo (logs muestran "API listening")
- [ ] El API tiene dominio público en Railway
- [ ] `/health` responde correctamente desde el navegador
- [ ] `NEXT_PUBLIC_API_URL` está configurado en Vercel con `https://`
- [ ] Hiciste redeploy después de configurar la variable
- [ ] La consola muestra la URL correcta en `🌐 API Request`
- [ ] No hay errores de CORS en la consola
- [ ] El Network tab muestra que la request se está haciendo

## 🔧 Solución Rápida

Si nada funciona:

1. **Railway → API Service**:
   - Verifica que esté "Active"
   - Revisa los logs para errores
   - Reinicia el servicio

2. **Railway → API Service → Networking**:
   - Verifica que tenga un dominio público
   - Si no, genera uno

3. **Vercel → Environment Variables**:
   - Verifica `NEXT_PUBLIC_API_URL` con la URL completa (con `https://`)
   - Haz redeploy

4. **Prueba en el navegador**:
   - Abre `https://tu-api.railway.app/health`
   - Debe responder `{"status":"ok","service":"api"}`
