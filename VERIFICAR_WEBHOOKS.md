# 🔍 Verificar por qué no llegan los mensajes

## Paso 1: Verificar que los mensajes se están guardando

Abre en tu navegador:
```
https://TU_CHANNEL_GATEWAY_RAILWAY_URL/debug/messages
```

Esto te mostrará:
- Los últimos mensajes guardados en la DB
- Estadísticas (total de mensajes, conversaciones, clientes)

## Paso 2: Verificar eventos de webhook

Abre:
```
https://TU_CHANNEL_GATEWAY_RAILWAY_URL/debug/events
```

Esto te mostrará:
- Los últimos eventos de webhook recibidos
- Estadísticas (cuántos procesados, pendientes, fallidos)

## Paso 3: Verificar logs del Channel Gateway

En Railway → Channel Gateway Service → Logs, busca:
- `📥 Received webhook payload` → El webhook está llegando
- `✅ Tenant resolved successfully` → El tenant se encontró
- `✅ Message created in database` → El mensaje se guardó
- `❌ ERROR al crear mensaje en DB` → Hay un error al guardar

## Paso 4: Verificar configuración del webhook en Builderbot

1. Ve al dashboard de Builderbot
2. Configuración → Webhooks
3. Verifica que la URL sea:
   ```
   https://TU_CHANNEL_GATEWAY_RAILWAY_URL/webhooks/builderbot/whatsapp
   ```
4. Verifica que el método sea `POST`
5. Verifica que esté activo

## Problemas comunes

### ❌ No llegan webhooks
- **Síntoma**: No ves `📥 Received webhook payload` en los logs
- **Solución**: Verifica la URL del webhook en Builderbot

### ❌ Error al resolver tenant
- **Síntoma**: Ves `❌ Tenant not found` en los logs
- **Solución**: Verifica que el seed se ejecutó y creó el `ChannelAccount`

### ❌ Error al guardar mensaje
- **Síntoma**: Ves `❌ ERROR al crear mensaje en DB` en los logs
- **Solución**: Revisa el error específico en los logs

### ❌ Payload inválido
- **Síntoma**: Ves `❌ Payload validation failed` en los logs
- **Solución**: El formato del webhook de Builderbot puede ser diferente. Revisa el schema en `packages/shared/src/schemas/index.ts`

## Prueba manual

Envía un mensaje de prueba desde WhatsApp y luego:
1. Revisa los logs del Channel Gateway
2. Verifica `/debug/events` para ver si llegó el webhook
3. Verifica `/debug/messages` para ver si se guardó el mensaje
