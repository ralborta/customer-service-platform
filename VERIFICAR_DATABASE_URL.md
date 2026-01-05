# 🔴 PROBLEMA: NO HAY CONEXIÓN A LA BASE DE DATOS

## El Error

Los logs muestran:
```
❌ ERROR: NO SE PUEDE CONECTAR A LA BASE DE DATOS
```

**Esto significa que la API no puede conectarse a PostgreSQL.**

## Solución: Verificar DATABASE_URL en Railway

### Paso 1: Verificar que PostgreSQL esté corriendo

1. Ve a Railway Dashboard
2. Busca el servicio **PostgreSQL**
3. Verifica que esté **Running** (verde)

### Paso 2: Obtener DATABASE_URL del PostgreSQL

1. Click en el servicio **PostgreSQL**
2. Ve a la pestaña **Variables**
3. Busca la variable `DATABASE_URL`
4. **Copia el valor completo**
   - Formato: `postgresql://postgres:PASSWORD@HOST:PORT/railway`

### Paso 3: Configurar DATABASE_URL en el servicio API

1. Ve al servicio **API** en Railway
2. Click en **Variables** (Settings → Variables)
3. Busca `DATABASE_URL`
4. **Si NO existe:**
   - Click en **+ New Variable**
   - Nombre: `DATABASE_URL`
   - Valor: Pega el valor que copiaste del PostgreSQL
   - Click en **Add**
5. **Si existe pero es diferente:**
   - Click en el valor
   - Reemplázalo con el valor del PostgreSQL
   - Guarda

### Paso 4: Verificar que el formato sea correcto

El `DATABASE_URL` debe tener este formato:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

**Ejemplo correcto:**
```
postgresql://postgres:abc123@containers-us-west-123.railway.app:5432/railway
```

**Ejemplos INCORRECTOS:**
- ❌ `postgres://...` (falta "ql")
- ❌ `postgresql://...` sin password
- ❌ Vacío o `undefined`
- ❌ Solo el host sin el resto

### Paso 5: Reiniciar el servicio API

1. En el servicio API
2. Click en los **3 puntos** (⋯) → **Restart**
3. Espera a que reinicie
4. Ve a **Logs**
5. Busca: `✅ Conexión a la DB exitosa`

## Verificación Rápida

Abre en tu navegador:
```
https://TU_API_RAILWAY_URL/debug/login-status
```

Si ves:
- `"status": "OK"` → ✅ Todo funciona
- `"status": "ERROR"` → Revisa los pasos anteriores

## Checklist

- [ ] PostgreSQL está corriendo en Railway
- [ ] `DATABASE_URL` existe en PostgreSQL → Variables
- [ ] `DATABASE_URL` está configurado en API → Variables
- [ ] El formato es `postgresql://postgres:PASSWORD@HOST:PORT/railway`
- [ ] El servicio API se reinició después de configurar
- [ ] Los logs muestran `✅ Conexión a la DB exitosa`

## Si sigue sin funcionar

1. **Verifica que ambos servicios estén en el mismo proyecto de Railway**
2. **Verifica que no haya espacios extra en DATABASE_URL**
3. **Copia el DATABASE_URL directamente desde PostgreSQL (no lo escribas manualmente)**
