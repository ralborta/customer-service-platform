# 🔧 SOLUCIÓN DEFINITIVA - PROBLEMA DE LOGIN

## Paso 1: Verificar el estado actual

Abre en tu navegador (o usa curl):

```
https://TU_API_RAILWAY_URL/debug/login-status
```

Esto te mostrará EXACTAMENTE qué está mal:
- Si el tenant existe
- Si el usuario existe
- Si el password es válido

## Paso 2: Si el password está mal, FIJARLO

Haz un POST a:

```
https://TU_API_RAILWAY_URL/debug/fix-password
```

Con el body:
```json
{
  "email": "agent@demo.com",
  "password": "admin123"
}
```

O simplemente:
```bash
curl -X POST https://TU_API_RAILWAY_URL/debug/fix-password \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@demo.com","password":"admin123"}'
```

Esto:
1. Busca el usuario
2. Regenera el password hash
3. Lo actualiza en la DB
4. Verifica que funciona

## Paso 3: Si el usuario no existe, ejecutar seed

En Railway → API Service → Shell:

```bash
cd packages/db
npx tsx prisma/seed.ts
```

## Paso 4: Verificar logs del API

En Railway → API Service → Logs, busca:
- `❌ Tenant not found` → El tenant no existe
- `❌ User not found` → El usuario no existe  
- `❌ User inactive` → El usuario está inactivo
- `❌ Password invalid` → El password hash está mal
- `✅ Login successful` → Todo funciona

## Resumen

1. **Verifica**: `/debug/login-status`
2. **Arregla**: `/debug/fix-password` (POST)
3. **Si no existe**: Ejecuta seed
4. **Revisa logs**: Para ver exactamente qué falla
