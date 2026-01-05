# 🔐 Credenciales de Acceso

## Usuarios Creados por el Seed

Cuando ejecutas `pnpm db:seed`, se crean automáticamente estos usuarios:

### 1. Usuario Admin (Tenant: Admin)

- **Email**: `admin@example.com`
- **Contraseña**: `admin123`
- **Rol**: `admin`
- **Tenant**: `admin`

### 2. Usuario Agent (Tenant: Demo)

- **Email**: `agent@demo.com`
- **Contraseña**: `admin123`
- **Rol**: `agent`
- **Tenant**: `demo`

## Cómo Usar

1. **Haz login** en la página `/login`
2. Usa cualquiera de estas credenciales:
   - `admin@example.com` / `admin123`
   - `agent@demo.com` / `admin123`

## Verificar que el Seed se Ejecutó

Si no puedes hacer login, verifica que el seed se haya ejecutado:

### En Railway (PostgreSQL → Query):

```sql
SELECT email, name, role, "tenantId" FROM users;
```

Deberías ver al menos 2 usuarios:
- `admin@example.com`
- `agent@demo.com`

### Si no hay usuarios:

1. Railway → API Service → Variables
2. Asegúrate de que `DB_INIT=true` esté configurado
3. Reinicia el API Service
4. Revisa los logs del API - deberías ver:
   ```
   🌱 No hay tenants, ejecutando seed...
   ✅ Seed completado
   ```

## Cambiar Contraseñas

Si necesitas cambiar las contraseñas, puedes:

1. Conectarte a la DB y actualizar directamente
2. O modificar el seed y volver a ejecutarlo (solo si `DB_INIT=true` y no hay datos)

## Nota de Seguridad

⚠️ **Estas son credenciales de desarrollo/demo**. En producción, debes:
- Cambiar todas las contraseñas
- Usar contraseñas seguras
- Implementar recuperación de contraseña
- Considerar autenticación de dos factores
