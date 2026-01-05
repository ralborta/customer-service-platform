# Solución: Error en `db:push` en Railway

## Problema
El API está intentando inicializar la base de datos pero `prisma db push` está fallando, lo que impide que el API responda correctamente.

## Diagnóstico

### 1. Verificar que la extensión `pgvector` esté instalada

Railway PostgreSQL puede no tener `pgvector` instalada por defecto. Necesitas instalarla manualmente.

**Opción A: Desde Railway Dashboard**
1. Ve a Railway → PostgreSQL Service → **Data** tab
2. Haz clic en **"Query"** o **"Connect"**
3. Ejecuta este SQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Opción B: Desde la terminal (psql)**
```bash
# Conectarte a la DB de Railway
psql $DATABASE_URL

# Dentro de psql:
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 2. Verificar permisos de la base de datos

El usuario de PostgreSQL debe tener permisos para crear extensiones y tablas.

En Railway, el usuario por defecto (`postgres`) debería tener estos permisos, pero verifica:

```sql
-- Verificar permisos del usuario actual
SELECT current_user, current_database();

-- Verificar si puede crear extensiones
SELECT has_database_privilege(current_user, current_database(), 'CREATE');
```

### 3. Verificar el DATABASE_URL

Asegúrate de que el `DATABASE_URL` en Railway API Service tenga este formato:

```
postgresql://postgres:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

**Pasos:**
1. Ve a Railway → PostgreSQL Service → **Variables**
2. Copia el valor de `DATABASE_URL` (debería ser algo como `${{Postgres.DATABASE_URL}}`)
3. Ve a Railway → API Service → **Variables**
4. Asegúrate de que `DATABASE_URL` tenga el mismo valor (o usa la referencia `${{Postgres.DATABASE_URL}}`)

### 4. Verificar logs detallados

Después de los cambios, los logs deberían mostrar:
- ✅ Si `db:push` se completó exitosamente
- ❌ Si `db:push` falló (con el error específico)
- ✅ Cuántas tablas se encontraron después

## Solución Rápida

### Paso 1: Instalar pgvector
```sql
-- Conectarte a la DB de Railway y ejecutar:
CREATE EXTENSION IF NOT EXISTS vector;
```

### Paso 2: Reiniciar el API Service
1. Ve a Railway → API Service
2. Haz clic en **"Restart"** o **"Redeploy"**

### Paso 3: Verificar logs
Deberías ver:
```
✅ db:push completado
✅ Tablas encontradas: 4
   - tenants
   - users
   - conversations
   - messages
```

## Si el problema persiste

### Alternativa: Usar Prisma Migrate en lugar de db push

Si `db:push` sigue fallando, puedes usar migraciones:

1. **Localmente**, ejecuta:
```bash
cd packages/db
npx prisma migrate dev --name init
```

2. **En Railway**, cambia el `startCommand` en `railway-api.toml`:
```toml
startCommand = "DB_INIT=true npx prisma migrate deploy && node dist/index.js"
```

3. **O desactiva DB_INIT** y ejecuta migraciones manualmente:
   - Desactiva `DB_INIT` en Railway API Variables
   - Ejecuta `npx prisma migrate deploy` manualmente desde Railway → API Service → **Shell**

## Verificación Final

Después de aplicar la solución:

1. ✅ El API debería responder en `/health`
2. ✅ Las tablas deberían existir (verifica con `scripts/check-db.js`)
3. ✅ El frontend debería poder conectarse al API
4. ✅ Los webhooks deberían poder crear mensajes

## Comandos Útiles

```bash
# Verificar tablas en la DB
cd packages/db
npx prisma studio

# O desde Railway Shell:
npx prisma studio --browser none
```
