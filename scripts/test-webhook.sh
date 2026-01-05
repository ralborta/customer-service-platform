#!/bin/bash
# Script para probar el webhook manualmente

set -e

echo "🧪 Test de Webhook de Builderbot"
echo "=================================="
echo ""

# Configuración
CHANNEL_GATEWAY_URL="${CHANNEL_GATEWAY_URL:-https://customer-servicechannel-gateway-production.up.railway.app}"
ENDPOINT="${CHANNEL_GATEWAY_URL}/webhooks/builderbot/whatsapp"

echo "📍 Endpoint: $ENDPOINT"
echo ""

# Payload de prueba (formato esperado por nuestro schema)
PAYLOAD='{
  "event": "message.received",
  "data": {
    "from": "+5491123456789",
    "to": "+5491198765432",
    "message": {
      "id": "msg_test_123",
      "text": "Hola, quiero consultar mi pedido",
      "type": "text",
      "timestamp": '$(date +%s)'
    }
  }
}'

echo "📤 Enviando webhook de prueba..."
echo "Payload:"
echo "$PAYLOAD" | jq .
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Account-Key: builderbot_whatsapp_main" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "📥 Respuesta:"
echo "HTTP Code: $HTTP_CODE"
echo "Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Webhook procesado correctamente"
else
  echo "❌ Error en el webhook (HTTP $HTTP_CODE)"
fi

echo ""
echo "🔍 Verificar mensajes guardados:"
echo "curl $CHANNEL_GATEWAY_URL/debug/messages"
echo ""
echo "🔍 Verificar eventos:"
echo "curl $CHANNEL_GATEWAY_URL/debug/events"
