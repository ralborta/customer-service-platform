# 🔧 Configurar Builderbot API para Enviar Mensajes

## ❌ Error Actual

```
"Access Project Middleware: Unauthorized: Token is missing"
```

Este error indica que Builderbot requiere un **Project ID** además del API Key.

---

## ✅ Solución: Agregar Project ID

### Paso 1: Obtener Project ID de Builderbot

1. Ve a tu dashboard de Builderbot: https://builderbot.cloud
2. Selecciona tu bot/proyecto
3. Ve a **Configuración** o **Settings**
4. Busca el **Project ID** (puede estar en la URL o en la configuración)
   - Ejemplo de URL: `https://builderbot.cloud/project/b1f0bc99-5667-4319-a8f4-1f5b11e2b453`
   - El Project ID sería: `b1f0bc99-5667-4319-a8f4-1f5b11e2b453`

### Paso 2: Agregar Variable en Railway

En **Railway → API Service → Variables**, agrega:

```
BUILDERBOT_PROJECT_ID=tu-project-id-aqui
```

**Ejemplo:**
```
BUILDERBOT_PROJECT_ID=b1f0bc99-5667-4319-a8f4-1f5b11e2b453
```

---

## 📋 Variables Requeridas en Railway

### Variables OBLIGATORIAS:

1. **`BUILDERBOT_API_URL`**
   ```
   https://api.builderbot.cloud
   ```

2. **`BUILDERBOT_API_KEY`**
   ```
   tu-api-key-de-builderbot
   ```
   (La API key que obtuviste de Builderbot)

3. **`BUILDERBOT_PROJECT_ID`** ⭐ **NUEVO - REQUERIDO**
   ```
   tu-project-id-de-builderbot
   ```
   (El Project ID de tu proyecto en Builderbot)

### Variables OPCIONALES:

4. **`BUILDERBOT_BOT_ID`** (solo si tienes múltiples bots)
   ```
   tu-bot-id
   ```

---

## 🔍 Verificación

Después de agregar `BUILDERBOT_PROJECT_ID`:

1. **Redeploy el servicio API** en Railway
2. **Revisa los logs** del API cuando intentas enviar un mensaje
3. Deberías ver logs como:
   ```
   [BUILDERBOT] Enviando mensaje: { hasProjectId: true, ... }
   [BUILDERBOT] Mensaje enviado exitosamente: { messageId: "..." }
   ```

---

## 🐛 Si Sigue Fallando

### Verificar en los Logs:

Los logs ahora muestran más información:
- `hasApiKey: true/false`
- `hasProjectId: true/false`
- `hasBotId: true/false`
- Headers enviados
- Response completo del error

### Posibles Problemas:

1. **Project ID incorrecto**
   - Verifica que sea exactamente el mismo que aparece en Builderbot
   - Sin espacios, sin comillas

2. **API Key incorrecto**
   - Verifica que sea el API Key correcto de Builderbot
   - Puede estar en Settings → API Keys

3. **Formato del endpoint incorrecto**
   - El código ahora intenta múltiples formatos de autenticación
   - Si Builderbot usa un formato diferente, revisa los logs para ver qué está enviando

---

## 📝 Nota

El código ahora soporta múltiples formatos de autenticación:
- `Authorization: Bearer {apiKey}`
- `X-API-Key: {apiKey}`
- `X-Project-Id: {projectId}`
- `projectId` en el body

Si Builderbot requiere otro formato, los logs te mostrarán exactamente qué se está enviando.
