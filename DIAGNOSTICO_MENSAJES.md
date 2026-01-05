# 🔍 Diagnóstico: Por qué no llegan los mensajes

## ⚠️ PROBLEMA PRINCIPAL

**Builderbot NO está emitiendo eventos de mensaje** (dice la nota amarilla en la configuración).

## ✅ PASOS PARA SOLUCIONAR

### 1. Activar eventos de mensaje en Builderbot (CRÍTICO)

1. En Builderbot → **Configuración** (click en el link verde "configuración")
2. Busca **"Tiempo de espera"** o **"Timeout"**
3. Cambia de `0` a `30` o `60` segundos
4. **Guarda**

### 2. Activar eventos en el webhook

En la página de Webhooks de Builderbot:

1. **Busca en la lista de eventos:**
   - `message.received` (mensajes entrantes) ⭐ **ESTE ES EL MÁS IMPORTANTE**
   - `message.sent` (opcional)
   - `message.delivered` (opcional)

2. **Activa/Selecciona** `message.received` (debe tener un checkbox o toggle)

3. **Guarda** la configuración del webhook

### 3. Verificar que el webhook esté configurado

La URL debe ser:
```
https://customer-servicechannel-gateway-production.up.railway.app/webhooks/builderbot/whatsapp
```

⚠️ **Nota**: Verifica que la URL sea correcta (puede tener un guión faltante).

### 4. Probar enviando un mensaje

1. Envía un mensaje desde WhatsApp al número de Builderbot
2. Revisa Railway → Channel Gateway → Logs
3. Deberías ver: `📥 Received webhook payload`

## 🔍 VERIFICACIÓN

### Verificar eventos recibidos

Abre en tu navegador:
```
https://TU_CHANNEL_GATEWAY_RAILWAY_URL/debug/events
```

Deberías ver:
- Eventos con `status: 'processed'` si funcionó
- Eventos con `status: 'failed'` si falló
- Nada si no están llegando webhooks

### Verificar mensajes guardados

Abre:
```
https://TU_CHANNEL_GATEWAY_RAILWAY_URL/debug/messages
```

Deberías ver los mensajes guardados en la DB.

## 📋 Checklist

- [ ] Timeout configurado > 0 en Builderbot Configuración
- [ ] Evento `message.received` activado en el webhook
- [ ] URL del webhook correcta
- [ ] Webhook guardado y activo
- [ ] Probar enviando un mensaje de WhatsApp
- [ ] Verificar logs del Channel Gateway
- [ ] Verificar `/debug/events` para ver si llegó el webhook
- [ ] Verificar `/debug/messages` para ver si se guardó el mensaje

## ❌ Si sigue sin funcionar

1. **Revisa los logs del Channel Gateway:**
   - Railway → Channel Gateway → Logs
   - Busca: `📥 Received webhook payload`
   - Si NO aparece: El webhook no está llegando (problema de Builderbot)
   - Si aparece pero falla: Revisa el error específico

2. **Verifica el formato del webhook:**
   - Builderbot puede enviar un formato diferente
   - Revisa los logs para ver el payload exacto
   - Puede necesitar ajustar el schema en `packages/shared/src/schemas/index.ts`

3. **Prueba manualmente:**
   ```bash
   bash scripts/test-webhook.sh
   ```
   Esto envía un webhook de prueba para verificar que el endpoint funciona.
