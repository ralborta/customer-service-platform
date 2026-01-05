# 🔐 Configuración de INTERNAL_API_TOKEN

## ¿Qué es INTERNAL_API_TOKEN?

Es un **token secreto** que permite que el **Channel Gateway** se comunique con el **API** de forma segura, sin necesidad de autenticación JWT de usuario.

## ¿Cómo obtenerlo?

**No se obtiene de ningún servicio externo**. Es un valor que **tú eliges** y configuras manualmente.

## Opciones:

### ✅ Opción 1: Usar el valor por defecto (más fácil)

**No configures nada** - el sistema usa automáticamente `'internal-token'`.

**Ventajas:**
- ✅ Funciona inmediatamente
- ✅ No necesitas generar nada

**Desventajas:**
- ⚠️ No es muy seguro (cualquiera que conozca el valor puede llamar al API)

### ✅ Opción 2: Generar un token aleatorio (recomendado)

Genera un string aleatorio y configúralo en ambos servicios.

**Cómo generar uno:**

**Opción A - Desde terminal:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Opción B - Desde Node.js:**
```javascript
require('crypto').randomBytes(32).toString('hex')
```

**Opción C - Online:**
- Ve a: https://randomkeygen.com/
- Usa un "CodeIgniter Encryption Keys" (64 caracteres)

**Ejemplo de token generado:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## Configuración en Railway

Una vez que tengas el token (o uses el default), configúralo en **ambos servicios**:

### 1. Channel Gateway Service

**Settings → Variables:**
```
INTERNAL_API_TOKEN=tu-token-aqui
```

### 2. API Service

**Settings → Variables:**
```
INTERNAL_API_TOKEN=tu-token-aqui
```

**⚠️ IMPORTANTE**: Debe ser **exactamente el mismo** en ambos servicios.

## Verificación

Después de configurar, los logs del Channel Gateway deberían mostrar que puede llamar al API sin errores 401.

Si ves errores 401 en las llamadas al `/ai/triage`, verifica que:
1. El token esté configurado en ambos servicios
2. El token sea exactamente el mismo (sin espacios, sin comillas)
3. Ambos servicios estén reiniciados después de agregar la variable

## Ejemplo Completo

```env
# Channel Gateway
INTERNAL_API_URL=https://tu-api.railway.app
INTERNAL_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# API
INTERNAL_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## Recomendación

Para desarrollo/MVP: usa el valor por defecto (`'internal-token'` o no configures nada).

Para producción: genera un token aleatorio de al menos 32 caracteres.
