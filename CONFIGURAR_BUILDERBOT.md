# 🔧 Configurar Builderbot para recibir mensajes

## ⚠️ PROBLEMA ACTUAL

La nota amarilla en Builderbot dice:
> "La configuración actual No emite eventos de mensaje provenientes del host"

**Esto significa que NO estás recibiendo mensajes porque los eventos están desactivados.**

## ✅ SOLUCIÓN

### Paso 1: Activar eventos de mensaje

1. En Builderbot, ve a **Configuración** (el link verde que dice "configuración" en la nota amarilla)
2. Busca la opción de **"Tiempo de espera"** o **"Timeout"**
3. Cambia el valor de `0` a un número mayor, por ejemplo: `30` o `60` segundos
4. **Guarda** los cambios

### Paso 2: Activar eventos de mensaje en el webhook

En la página de Webhooks que estás viendo:

1. **Busca en la lista de eventos** un evento relacionado con mensajes, por ejemplo:
   - `message.received` (mensajes entrantes)
   - `message.sent` (mensajes enviados)
   - `message.*` (todos los eventos de mensaje)

2. **Activa/Selecciona** estos eventos (deben tener un checkbox o toggle)

3. **Guarda** la configuración del webhook

### Paso 3: Verificar la URL del webhook

La URL debe ser exactamente:
```
https://customer-servicechannel-gateway-production.up.railway.app/webhooks/builderbot/whatsapp
```

⚠️ **Nota**: Veo que la URL tiene "customer-servicechannel-gateway" (sin guión). Verifica que sea correcta.

### Paso 4: Probar

1. Envía un mensaje de prueba desde WhatsApp al número de Builderbot
2. Revisa los logs en Railway → Channel Gateway → Logs
3. Deberías ver: `📥 Received webhook payload`

## 📋 Checklist

- [ ] Timeout configurado a un valor > 0 en Configuración
- [ ] Eventos de mensaje activados en el webhook (message.received, etc.)
- [ ] URL del webhook correcta
- [ ] Webhook guardado y activo
- [ ] Probar enviando un mensaje de WhatsApp

## 🔍 Verificar que funciona

Después de configurar, verifica:

1. **En Railway → Channel Gateway → Logs:**
   - Deberías ver `📥 Received webhook payload` cuando llegue un mensaje

2. **Abre en el navegador:**
   ```
   https://TU_CHANNEL_GATEWAY_RAILWAY_URL/debug/events
   ```
   - Deberías ver eventos con `status: 'processed'`

3. **Abre:**
   ```
   https://TU_CHANNEL_GATEWAY_RAILWAY_URL/debug/messages
   ```
   - Deberías ver los mensajes guardados en la DB

## ❓ Si sigue sin funcionar

1. Revisa los logs del Channel Gateway para ver qué error aparece
2. Verifica que el formato del webhook coincida con lo que esperamos
3. Comparte los logs para diagnosticar
