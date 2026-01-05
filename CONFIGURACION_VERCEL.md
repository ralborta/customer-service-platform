# 🔧 Configuración de Vercel para el Frontend

## ⚠️ Error 405 o 404 en Login

Si ves errores como:
- `HTTP 405` en el login
- `Failed to load resource: customer-serviceapi....app/auth/login`
- `Error al cargar conversaciones: Unknown error`

**El problema es que `NEXT_PUBLIC_API_URL` no está configurado o está mal configurado en Vercel.**

## ✅ Solución Paso a Paso

### Paso 1: Obtener la URL del API en Railway

1. Ve a **Railway Dashboard** → Tu proyecto
2. Click en el servicio **API** (`@customer-service/api`)
3. Ve a **Settings** → **Networking**
4. Copia la **URL pública** (ejemplo: `https://customer-service-api-production.up.railway.app`)

### Paso 2: Configurar en Vercel

1. Ve a **Vercel Dashboard** → Tu proyecto
2. Ve a **Settings** → **Environment Variables**
3. Busca si existe `NEXT_PUBLIC_API_URL`:
   - Si **NO existe**: Click en **Add New**
   - Si **existe pero está mal**: Click en el valor y edítalo
4. **Nombre**: `NEXT_PUBLIC_API_URL`
5. **Valor**: Pega la URL que copiaste de Railway
   - ✅ Correcto: `https://customer-service-api-production.up.railway.app`
   - ❌ Incorrecto: `customer-serviceapi....app` (falta guion, https, etc.)
6. **Environment**: Selecciona **Production**, **Preview**, y **Development** (o al menos Production)
7. Click en **Save**

### Paso 3: Hacer un Nuevo Deploy

**IMPORTANTE**: Después de agregar/modificar variables de entorno, **debes hacer un nuevo deploy**.

1. En Vercel → Tu proyecto → **Deployments**
2. Click en el menú (⋯) del último deployment
3. Click en **Redeploy**
4. O simplemente haz un nuevo commit y push (Vercel desplegará automáticamente)

### Paso 4: Verificar

Después del deploy:

1. Abre tu app en Vercel
2. Abre la consola del navegador (F12 → Console)
3. Deberías ver:
   ```
   🌐 API Request: {
     url: "https://tu-api.railway.app/auth/login",
     apiUrl: "https://tu-api.railway.app",
     hasToken: false
   }
   ```
4. Intenta hacer login
5. Si funciona, deberías ser redirigido a `/inbox`

## 🔍 Verificación Rápida

### Verificar que el API está accesible:

Abre en el navegador:
```
https://tu-api.railway.app/health
```

Debería responder:
```json
{"status":"ok","service":"api"}
```

Si no responde o da error, el API no está corriendo o no es accesible.

### Verificar la URL en Vercel:

1. Vercel → Settings → Environment Variables
2. Busca `NEXT_PUBLIC_API_URL`
3. Verifica que:
   - ✅ Empiece con `https://`
   - ✅ No termine con `/`
   - ✅ Sea la URL completa del API en Railway
   - ✅ No tenga espacios ni caracteres raros

## 🐛 Troubleshooting

### Error: "Failed to load resource: 404"

**Causa**: La URL del API está mal o el API no está corriendo.

**Solución**:
1. Verifica que el API esté corriendo en Railway
2. Verifica que `NEXT_PUBLIC_API_URL` sea correcta
3. Haz un nuevo deploy después de cambiar la variable

### Error: "Failed to load resource: 405"

**Causa**: La URL está mal formada o apunta al lugar incorrecto.

**Solución**:
1. Verifica que `NEXT_PUBLIC_API_URL` apunte al **API service**, no al Channel Gateway
2. Verifica que la URL sea completa: `https://tu-api.railway.app` (sin `/` al final)
3. Haz un nuevo deploy

### Error: "CORS error"

**Causa**: El API no permite requests desde Vercel.

**Solución**:
1. Railway → API Service → Variables
2. Agrega `CORS_ORIGIN` con la URL de Vercel:
   ```
   CORS_ORIGIN=https://tu-app.vercel.app
   ```
3. Reinicia el API service

## 📝 Checklist Final

- [ ] `NEXT_PUBLIC_API_URL` configurado en Vercel
- [ ] URL es correcta (empieza con `https://`, no termina con `/`)
- [ ] URL apunta al API service (no al Channel Gateway)
- [ ] Nuevo deploy hecho después de configurar la variable
- [ ] API está corriendo en Railway (verifica con `/health`)
- [ ] Puedes hacer login sin errores
- [ ] Puedes ver conversaciones en `/inbox`
