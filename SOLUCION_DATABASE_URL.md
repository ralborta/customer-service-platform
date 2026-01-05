# 🔧 Solución: Error DATABASE_URL vacío

## ❌ Error que estás viendo:

```
Error validating datasource 'db': You must provide a nonempty URL. 
The environment variable 'DATABASE_URL' resolved to empty string.
```

## ✅ Solución Paso a Paso:

### Paso 1: Obtener DATABASE_URL de PostgreSQL

1. Ve a **Railway Dashboard** → Tu proyecto
2. Click en el servicio **PostgreSQL** (o **Database**)
3. Ve a la pestaña **Variables**
4. Busca la variable `DATABASE_URL`
5. **Copia el valor completo** (debe ser algo como: `postgresql://postgres:password@host:port/railway`)

### Paso 2: Configurar DATABASE_URL en el API Service

1. En Railway Dashboard → Tu proyecto
2. Click en el servicio **API** (`@customer-service/api`)
3. Ve a la pestaña **Variables**
4. Busca si existe `DATABASE_URL`:
   - Si **NO existe**: Click en **+ New Variable**
   - Si **existe pero está vacío**: Click en el valor y edítalo
5. **Nombre**: `DATABASE_URL`
6. **Valor**: Pega el valor que copiaste del servicio PostgreSQL
7. Click en **Save** o **Add**

### Paso 3: Configurar DATABASE_URL en el Channel Gateway

1. En Railway Dashboard → Tu proyecto
2. Click en el servicio **Channel Gateway** (`@customer-service/channel-gateway`)
3. Ve a la pestaña **Variables**
4. Busca si existe `DATABASE_URL`:
   - Si **NO existe**: Click en **+ New Variable**
   - Si **existe pero está vacío**: Click en el valor y edítalo
5. **Nombre**: `DATABASE_URL`
6. **Valor**: **Mismo valor** que configuraste en el API (misma DB)
7. Click en **Save** o **Add**

### Paso 4: Verificar otras variables necesarias

#### API Service debe tener:
```
DATABASE_URL=postgresql://... (del servicio PostgreSQL)
DB_INIT=true
JWT_SECRET=algún-secret-aleatorio
```

#### Channel Gateway debe tener:
```
DATABASE_URL=postgresql://... (misma que API)
INTERNAL_API_URL=https://tu-api.railway.app
INTERNAL_API_TOKEN=internal-token
BUILDERBOT_API_KEY=tu_key
```

### Paso 5: Reiniciar los servicios

1. **API Service**: Click en **Restart** o **Redeploy**
2. **Channel Gateway**: Click en **Restart** o **Redeploy**
3. Espera 1-2 minutos

### Paso 6: Verificar los logs

Después de reiniciar, revisa los logs del **API Service**. Deberías ver:

```
🔄 ============================================
🔄 INICIANDO INICIALIZACIÓN DE BASE DE DATOS
🔄 ============================================
🔗 DATABASE_URL configurado: SÍ (postgresql://postgres...)
📦 Paso 1: Generando Prisma Client...
✅ Prisma Client generado
📦 Paso 2: Creando/actualizando tablas...
✅ db:push completado
✅ Tablas encontradas: 4
   - tenants
   - users
   - conversations
   - messages
🌱 No hay tenants, ejecutando seed...
✅ Seed completado
✅ BASE DE DATOS INICIALIZADA CORRECTAMENTE
```

## ⚠️ Si aún ves el error:

1. **Verifica que copiaste el valor completo** (no debe tener espacios al inicio/final)
2. **Verifica que el servicio PostgreSQL esté corriendo**
3. **Verifica que la URL sea correcta** (debe empezar con `postgresql://`)
4. **Reinicia ambos servicios** después de configurar

## 🔍 Verificación Final:

Después de configurar y reiniciar, verifica en Railway → PostgreSQL → Query:

```sql
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM messages;
```

Si devuelve números > 0, ¡la DB está funcionando! 🎉
