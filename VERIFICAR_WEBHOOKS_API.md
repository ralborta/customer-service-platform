# 🔍 Verificar que los Webhooks Funcionan

## ✅ Lo que está bien:

1. El servicio API está corriendo (`@customer-service/api` activo)
2. La URL es correcta: `customer-serviceapi-production.up.railway.app`
3. Los endpoints `/conversations` funcionan (statusCode 200)

## ❓ Lo que necesitamos verificar:

Los logs que ves son solo de `/conversations`, no de webhooks. Necesitamos confirmar que los webhooks están llegando y procesándose.

---

## 🔍 Verificación Paso a Paso

### 1. Verificar mensajes en la DB (Endpoint de Debug)

Abre en tu navegador o con curl:

```
https://customer-serviceapi-production.up.railway.app/debug/messages
```

**Si funciona, deberías ver:**
- Lista de mensajes recientes
- Stats (totalMessages, totalConversations, totalCustomers)

**Si ves mensajes aquí** → ✅ **Los webhooks SÍ están funcionando y guardándose en la DB**

---

### 2. Verificar eventos de webhook

```
https://customer-serviceapi-production.up.railway.app/debug/events
```

**Si funciona, deberías ver:**
- Lista de eventos recientes de `builderbot_whatsapp`
- Stats (total, processed, pending, failed)

**Si ves eventos con status "processed"** → ✅ **Los webhooks se están procesando correctamente**

---

### 3. Buscar logs de webhooks en Railway

En Railway → API Service → Deploy Logs:

1. Usa el buscador: "webhook" o "builderbot"
2. O busca: "WEBHOOK RECIBIDO"
3. O busca: "/webhooks/builderbot/whatsapp"

**Si encuentras logs con:**
- `📥 WEBHOOK RECIBIDO (Builderbot)`
- `✅ Tenant resolved successfully`
- `✅ Message processed successfully`

→ ✅ **Los webhooks están llegando y procesándose**

---

### 4. Probar webhook manualmente (desde terminal)

```bash
curl -X POST https://customer-serviceapi-production.up.railway.app/webhooks/builderbot/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Account-Key: builderbot_whatsapp_main" \
  -d '{
    "event": "message.received",
    "data": {
      "from": "+5491133788190",
      "message": {
        "text": "Mensaje de prueba"
      }
    }
  }'
```

**Si devuelve:**
```json
{
  "status": "processed",
  "conversationId": "...",
  "ticketId": "...",
  "messageId": "..."
}
```

→ ✅ **El endpoint funciona correctamente**

---

## 🎯 Conclusión

**Si los endpoints de debug muestran mensajes y eventos** → Todo está funcionando, solo que los logs de webhooks no aparecen en la vista que estás viendo (pueden estar más abajo o en otro momento).

**Si los endpoints de debug están vacíos** → Los webhooks no están llegando, necesitamos verificar la configuración en Builderbot.

---

## 💡 Próximos Pasos

1. **Prueba los endpoints de debug** (pasos 1 y 2)
2. **Comparte los resultados** para saber si necesitamos ajustar algo
