# 🔧 Solución: Error HTTP 405 en Login

## ❌ ¿Qué significa el error 405?

**HTTP 405 = "Method Not Allowed"**

Esto significa que:
- El frontend está intentando hacer un `POST` a `/auth/login`
- Pero la URL que está usando está mal o apunta al lugar incorrecto
- Por eso el servidor responde con 405 (método no permitido)

## 🔍 Diagnóstico

En la consola del navegador deberías ver algo como:
```
Failed to load resource: customer-serviceapi-...ay.app/auth/login:1 the server responded with a status of 405
```

**Problema**: La URL `customer-serviceapi-...ay.app` está mal formada (falta un guion o está incompleta).

## ✅ Solución Paso a Paso

### Paso 1: Obtener la URL correcta del API

1. Ve a **Railway Dashboard** → Tu proyecto
2. Click en el servicio **API** (`@customer-service/api`)
3. Ve a **Settings** → **Networking** (o **Deployments** → Click en el deployment → **Settings**)
4. Busca la sección **"Public Domain"** o **"Custom Domain"**
5. **Copia la URL completa** (debe ser algo como: `https://customer-service-api-production.up.railway.app`)

### Paso 2: Configurar en Vercel

1. Ve a **Vercel Dashboard** → Tu proyecto
2. Click en **Settings** (configuración)
3. Click en **Environment Variables** (Variables de Entorno)
4. Busca si existe `NEXT_PUBLIC_API_URL`:
   - Si **NO existe**: Click en **Add New**
   - Si **existe**: Click en el valor y edítalo
5. **Key (Nombre)**: `NEXT_PUBLIC_API_URL`
6. **Value (Valor)**: Pega la URL que copiaste de Railway
   - ✅ **Correcto**: `https://customer-service-api-production.up.railway.app`
   - ❌ **Incorrecto**: `customer-serviceapi....app` (falta `https://`, falta guion, etc.)
7. **Environment**: Selecciona **Production**, **Preview**, y **Development**
8. Click en **Save**

### Paso 3: Hacer un Nuevo Deploy

**⚠️ CRÍTICO**: Después de agregar/modificar variables de entorno, **DEBES hacer un nuevo deploy**.

**Opción A - Redeploy:**
1. Vercel → Tu proyecto → **Deployments**
2. Click en el menú (⋯) del último deployment
3. Click en **Redeploy**
4. Espera a que termine

**Opción B - Nuevo commit:**
1. Haz cualquier cambio pequeño (o un commit vacío)
2. Push a GitHub
3. Vercel desplegará automáticamente

### Paso 4: Verificar

Después del deploy:

1. Abre tu app en Vercel
2. Abre la consola del navegador (F12 → Console)
3. Intenta hacer login
4. En la consola deberías ver:
   ```
   🌐 API Request: {
     url: "https://tu-api-railway.app/auth/login",
     apiUrl: "https://tu-api-railway.app",
     method: "POST"
   }
   ```
5. Si la URL sigue siendo `localhost` o está mal, verás un error en rojo

## 🔍 Verificación Adicional

### Verificar que el API está accesible:

Abre en el navegador (reemplaza con tu URL real):
```
https://tu-api-railway.app/health
```

Debería responder:
```json
{"status":"ok","service":"api"}
```

Si no responde:
- El API no está corriendo en Railway
- O la URL está mal

### Verificar que el endpoint existe:

Abre en el navegador:
```
https://tu-api-railway.app/auth/login
```

Si responde con un error (no 405), el endpoint existe. Si da 405, hay un problema de configuración.

## 📝 Checklist

- [ ] Obtuve la URL del API desde Railway
- [ ] Agregué `NEXT_PUBLIC_API_URL` en Vercel con la URL correcta
- [ ] La URL empieza con `https://`
- [ ] La URL no termina con `/`
- [ ] La URL es completa (no tiene `...` o está truncada)
- [ ] Hice un nuevo deploy después de configurar
- [ ] Verifiqué que `/health` responde correctamente
- [ ] Puedo hacer login sin error 405

## 🆘 Si Aún No Funciona

1. **Verifica en la consola del navegador** qué URL está usando:
   - Debería mostrar la URL completa en el log `🌐 API Request`
   
2. **Verifica que el API esté corriendo**:
   - Railway → API Service → Logs
   - Deberías ver: `🚀 API listening on 0.0.0.0:8080`

3. **Verifica CORS** (si el error cambia a CORS):
   - Railway → API Service → Variables
   - Agrega: `CORS_ORIGIN=https://tu-app.vercel.app`

4. **Verifica que las credenciales existan**:
   - Railway → PostgreSQL → Query
   - Ejecuta: `SELECT email FROM users;`
   - Deberías ver: `agent@demo.com` y `admin@example.com`
