import { prisma } from '@customer-service/db';
import type { TriageResult, IntentType } from '@customer-service/shared';

export async function performTriage(
  conversationId: string,
  lastMessageId: string,
  channel: string
): Promise<TriageResult> {
  // Get conversation and messages
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      customer: true
    }
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const lastMessage = conversation.messages[0];
  if (!lastMessage || !lastMessage.text) {
    return {
      intent: 'otro',
      confidence: 0.3,
      missingFields: [],
      suggestedActions: [],
      suggestedReply: 'Por favor, proporciona más información sobre tu consulta.',
      autopilotEligible: false
    };
  }

  const messageText = lastMessage.text.toLowerCase();
  let intent: IntentType = 'otro';
  let confidence = 0.5;
  let category = 'OTRO';
  const missingFields: string[] = [];
  const suggestedActions: Array<{ type: string; payload: Record<string, unknown> }> = [];

  // Rule-based triage (MVP - can be replaced with LLM)
  if (messageText.includes('seguimiento') || messageText.includes('tracking') || messageText.includes('pedido') || messageText.includes('envío')) {
    intent = 'tracking';
    confidence = 0.8;
    category = 'TRACKING';
    
    // Check for tracking number
    const trackingMatch = messageText.match(/\b[A-Z0-9]{6,}\b/);
    if (!trackingMatch) {
      missingFields.push('trackingNumber');
      suggestedActions.push({
        type: 'request_tracking_number',
        payload: {}
      });
    } else {
      suggestedActions.push({
        type: 'lookup_tracking',
        payload: { trackingNumber: trackingMatch[0] }
      });
    }
  } else if (messageText.includes('factura') || messageText.includes('deuda') || messageText.includes('pago') || messageText.includes('cuenta')) {
    intent = 'facturacion';
    confidence = 0.8;
    category = 'FACTURACION';
    suggestedActions.push({
      type: 'fetch_invoices',
      payload: { customerId: conversation.customerId }
    });
  } else if (messageText.includes('reclamo') || messageText.includes('problema') || messageText.includes('dañado') || messageText.includes('defectuoso') || messageText.includes('reembolso')) {
    intent = 'reclamo';
    confidence = 0.9;
    category = 'RECLAMO';
    missingFields.push('orderNumber', 'description');
    suggestedActions.push({
      type: 'create_ticket',
      payload: { category: 'RECLAMO', priority: 'HIGH' }
    });
  } else if (messageText.includes('cotización') || messageText.includes('precio') || messageText.includes('costo')) {
    intent = 'cotizacion';
    confidence = 0.7;
    category = 'COTIZACION';
    suggestedActions.push({
      type: 'create_quote',
      payload: {}
    });
  } else if (messageText.includes('info') || messageText.includes('información') || messageText.includes('consulta')) {
    intent = 'info';
    confidence = 0.6;
    category = 'INFO';
  }

  // Get tenant settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: conversation.tenantId }
  });
  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const autopilotCategories = (settings.autopilotCategories as string[]) || [];
  const confidenceThreshold = (settings.confidenceThreshold as number) || 0.7;

  const autopilotEligible = 
    autopilotCategories.includes(category) && 
    confidence >= confidenceThreshold &&
    missingFields.length === 0;

  // Generate suggested reply
  let suggestedReply = '';
  if (intent === 'tracking') {
    if (missingFields.includes('trackingNumber')) {
      suggestedReply = 'Hola! Para ayudarte con el seguimiento, necesito el número de tracking de tu pedido. ¿Podrías compartirlo?';
    } else {
      suggestedReply = 'Perfecto, voy a consultar el estado de tu pedido. Te responderé en breve.';
    }
  } else if (intent === 'facturacion') {
    suggestedReply = 'Te ayudo con tu consulta de facturación. Estoy revisando tu información.';
  } else if (intent === 'reclamo') {
    suggestedReply = 'Lamento el inconveniente. Voy a crear un ticket para tu reclamo y un agente se pondrá en contacto contigo pronto.';
  } else if (intent === 'cotizacion') {
    suggestedReply = 'Con gusto te ayudo con una cotización. ¿Podrías darme más detalles sobre lo que necesitas?';
  } else {
    suggestedReply = 'Gracias por contactarnos. Estoy procesando tu consulta y te responderé pronto.';
  }

  // If OpenAI API key is available, enhance with LLM (optional)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '') {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente de atención al cliente. Analiza el mensaje y determina la intención (reclamo, info, facturacion, tracking, cotizacion, otro) con un nivel de confianza (0-1).'
            },
            {
              role: 'user',
              content: `Mensaje del cliente: "${lastMessage.text}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (response.ok) {
        const data = await response.json();
        const llmResponse = data.choices[0]?.message?.content || '';
        // Parse LLM response and enhance triage result
        // This is a simplified version - you could parse JSON from LLM
      }
    } catch (error) {
      // Fallback to rule-based if LLM fails
      console.error('LLM triage failed, using rule-based:', error);
    }
  }

  return {
    intent,
    confidence,
    missingFields,
    suggestedActions,
    suggestedReply,
    autopilotEligible
  };
}
