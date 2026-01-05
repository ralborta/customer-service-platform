# Verificación de Conexión API (Vercel ↔ Railway)

Si las tablas están y tienen datos, el problema es la conexión entre el frontend (Vercel) y el API (Railway).

## Paso 1: Verificar que el API esté corriendo en Railway

1. Ve a Railway → **API Service** → **Deployments**
2. Verifica que el último deployment esté **"Active"** (verde)
3. Si no está activo, haz clic en **"Redeploy"**

## Paso 2: Verificar que el API responda públicamente

Abre en tu navegador la URL del API de Railway:

```
https://TU-API-RAILWAY-URL.railway.app/health
```

**Deberías ver:**
```json
{"status":"ok","service":"api"}
```

**Si ves un error:**
- ❌ "Connection refused" → El API no está corriendo
- ❌ "404 Not Found" → El API está corriendo pero en otra ruta
- ❌ "502 Bad Gateway" → El API está iniciando o hay un error

## Paso 3: Verificar NEXT_PUBLIC_API_URL en Vercel

1. Ve a Vercel → Tu proyecto → **Settings** → **Environment Variables**
2. Busca `NEXT_PUBLIC_API_URL`
3. **Debe tener este formato:**
   ```
   https://TU-API-RAILWAY-URL.railway.app
   ```
   ⚠️ **IMPORTANTE:**
   - ✅ Debe empezar con `https://`
   - ✅ NO debe terminar con `/`
   - ✅ Debe ser la URL completa del API de Railway

4. Si no existe o está mal, agrégalo/corrígelo y haz **"Redeploy"** del proyecto en Vercel

## Paso 4: Verificar CORS en Railway

El API debe permitir requests desde Vercel. Verifica en Railway → API Service → **Variables**:

- `CORS_ORIGIN` puede estar vacío (por defecto permite todos los orígenes)
- O configúralo con la URL de tu frontend en Vercel:
  ```
  https://tu-proyecto.vercel.app
  ```

## Paso 5: Probar desde el navegador

1. Abre tu app en Vercel
2. Abre la **Consola del Navegador** (F12 → Console)
3. Intenta hacer login
4. Revisa los mensajes en la consola:
   - ✅ `🌐 API Request:` → Muestra la URL que está intentando usar
   - ❌ `❌ Network Error:` → No puede conectar al API
   - ❌ `❌ API Error:` → El API respondió pero con error

## Paso 6: Verificar logs del API en Railway

1. Ve a Railway → **API Service** → **Logs**
2. Intenta hacer login desde Vercel
3. Deberías ver en los logs:
   - `POST /auth/login` → Si ves esto, el request llegó al API
   - Si NO ves nada → El request no está llegando (problema de red/URL)

## Soluciones Comunes

### Problema: "No se puede conectar al API"

**Causa:** `NEXT_PUBLIC_API_URL` está mal configurado o el API no está corriendo.

**Solución:**
1. Verifica que el API responda en `/health` (Paso 2)
2. Verifica que `NEXT_PUBLIC_API_URL` tenga el formato correcto (Paso 3)
3. Haz redeploy en Vercel después de cambiar la variable

### Problema: "HTTP 405 Method Not Allowed"

**Causa:** La URL está mal formada o apunta a un lugar incorrecto.

**Solución:**
- Asegúrate de que `NEXT_PUBLIC_API_URL` NO termine con `/`
- Ejemplo correcto: `https://api.railway.app`
- Ejemplo incorrecto: `https://api.railway.app/` (tiene `/` al final)

### Problema: "CORS error" en el navegador

**Causa:** El API no está permitiendo requests desde Vercel.

**Solución:**
1. Verifica que `CORS_ORIGIN` en Railway esté configurado o vacío (permite todos)
2. O agrega la URL de Vercel: `https://tu-proyecto.vercel.app`

### Problema: El API responde pero el login falla

**Causa:** Las credenciales son incorrectas o hay un error en el código.

**Solución:**
1. Verifica los logs del API en Railway
2. Usa las credenciales del seed:
   - Email: `agent@demo.com`
   - Password: `admin123`

## Comandos de Verificación

### Desde tu terminal local:

```bash
# Verificar que el API responda
curl https://TU-API-RAILWAY-URL.railway.app/health

# Debería responder: {"status":"ok","service":"api"}

# Probar login
curl -X POST https://TU-API-RAILWAY-URL.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@demo.com","password":"admin123"}'

# Debería responder con un token JWT
```

## Checklist Final

- [ ] El API responde en `/health` desde el navegador
- [ ] `NEXT_PUBLIC_API_URL` está configurado en Vercel con `https://`
- [ ] `NEXT_PUBLIC_API_URL` NO termina con `/`
- [ ] `NEXT_PUBLIC_API_URL` apunta a la URL correcta del API de Railway
- [ ] Se hizo redeploy en Vercel después de cambiar la variable
- [ ] Los logs del API muestran requests cuando intentas hacer login
- [ ] No hay errores de CORS en la consola del navegador

Si todos estos pasos están correctos y aún no funciona, comparte:
1. La URL exacta de `NEXT_PUBLIC_API_URL` (sin credenciales)
2. Los logs del API en Railway cuando intentas hacer login
3. Los mensajes de error en la consola del navegador
