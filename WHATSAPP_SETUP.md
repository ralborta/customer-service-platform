# Configuración de WhatsApp con Builderbot

## Variables de Entorno

Para que el envío de mensajes por WhatsApp funcione, necesitas configurar estas variables en `apps/api/.env`:

```env
BUILDERBOT_API_URL=https://api.builderbot.cloud
BUILDERBOT_API_KEY=tu_api_key_aqui
BUILDERBOT_BOT_ID=tu_bot_id_opcional
```

## Cómo Obtener las Credenciales

1. **Regístrate en Builderbot.cloud**
2. **Crea un bot** en el dashboard
3. **Obtén tu API Key** desde la configuración del bot
4. **Opcionalmente obtén el Bot ID** si tienes múltiples bots

## Flujo de Funcionamiento

### 1. Recepción de Mensajes (Webhook) ⭐ CONFIGURAR EN BUILDERBOT

**IMPORTANTE**: Este webhook se configura EN BUILDERBOT, no en nuestro sistema.

**Flujo:**
1. Cliente envía mensaje por WhatsApp → Builderbot lo recibe
2. Builderbot envía webhook a nuestro Channel Gateway
3. Nuestro sistema procesa el mensaje

**Configuración en Builderbot:**
1. Ve a tu dashboard de Builderbot (https://builderbot.cloud)
2. Selecciona tu bot
3. Ve a **Configuración** → **Webhooks** (o **Integrations**)
4. Agrega webhook:
   - **URL**: `https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp`
     - ⚠️ **IMPORTANTE**: Debe ser la URL del **Channel Gateway**, NO del API
     - Ejemplo: `https://customer-servicechannel-gateway-production.up.railway.app/webhooks/builderbot/whatsapp`
   - **Método**: `POST`
   - **Headers** (si Builderbot lo permite):
     ```
     X-Account-Key: builderbot_whatsapp_main
     ```
   - **Eventos**: Selecciona `message.received`

**⚠️ VERIFICACIÓN**: Asegúrate de que la URL del webhook termine en `/webhooks/builderbot/whatsapp` y que sea del servicio **Channel Gateway**, no del API.

**Nuestro endpoint espera recibir:**
```
POST https://tu-channel-gateway.railway.app/webhooks/builderbot/whatsapp
Headers:
  X-Account-Key: builderbot_whatsapp_main (opcional)
Body:
  {
    "event": "message.received",
    "data": {
      "from": "+5491112345678",
      "message": {
        "text": "Hola, quiero consultar mi pedido"
      }
    }
  }
```

### 2. Envío de Mensajes

Cuando un agente aprueba y envía un mensaje desde el dashboard:

1. El frontend llama a: `POST /conversations/:id/messages`
2. El API verifica que la conversación sea de WhatsApp
3. Obtiene el número de teléfono del cliente
4. Llama a Builderbot API para enviar el mensaje
5. Guarda el mensaje en la base de datos con el `messageId` de Builderbot

### 3. Modo Autopilot

Si el tenant tiene `aiMode: 'AUTOPILOT'` y el triage determina que es elegible:
- El webhook automáticamente envía una respuesta por WhatsApp
- Sin necesidad de aprobación humana

## Estructura del Payload de Builderbot

El adapter espera que Builderbot envíe webhooks con esta estructura:

```json
{
  "event": "message.received",
  "data": {
    "from": "+5491112345678",
    "text": "Hola, quiero consultar mi pedido",
    "messageId": "msg_123456",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## Testing

### Modo Mock (sin API Key)

Si no configuras `BUILDERBOT_API_KEY`, el sistema funciona en modo mock:
- Los mensajes se guardan en la DB
- Se loguean en consola
- No se envían realmente por WhatsApp

### Modo Real (con API Key)

Con la API Key configurada:
- Los mensajes se envían realmente por WhatsApp
- Se guarda el `messageId` de Builderbot en la metadata
- Los errores se retornan al frontend

## Troubleshooting

### Error: "Failed to send message via WhatsApp"

1. Verifica que `BUILDERBOT_API_KEY` esté configurado
2. Verifica que la API Key sea válida
3. Verifica que el número de teléfono esté en formato correcto (ej: `+5491112345678`)
4. Revisa los logs del API para más detalles

### Los mensajes no llegan

1. Verifica que el webhook de Builderbot esté configurado correctamente
2. Verifica que el channel-gateway esté accesible públicamente
3. Revisa los logs del channel-gateway para ver si llegan los webhooks

### Los mensajes se envían pero no aparecen en el dashboard

1. Verifica que el webhook de Builderbot esté configurado para enviar confirmaciones
2. Revisa que el `messageId` se esté guardando correctamente en la metadata
