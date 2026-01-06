import { z } from 'zod';

export const TriageRequestSchema = z.object({
  conversationId: z.string(),
  lastMessageId: z.string(),
  channel: z.enum(['whatsapp', 'call', 'email', 'chat'])
});

export const TriageResponseSchema = z.object({
  intent: z.enum(['reclamo', 'info', 'facturacion', 'tracking', 'cotizacion', 'otro']),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.string()),
  suggestedActions: z.array(z.object({
    type: z.string(),
    payload: z.record(z.unknown())
  })),
  suggestedReply: z.string(),
  autopilotEligible: z.boolean()
});

// Schema flexible para webhooks de Builderbot
// Builderbot puede enviar diferentes formatos, así que hacemos el schema más permisivo
export const WhatsAppWebhookSchema = z.object({
  event: z.string().optional(),
  eventName: z.string().optional(), // Builderbot custom hook usa eventName
  data: z.object({
    from: z.string(),
    to: z.string().optional(),
    answer: z.string().optional(), // Builderbot custom hook envía answer directamente
    body: z.string().optional(), // Algunos formatos usan body directamente
    message: z.object({
      id: z.string().optional(),
      text: z.string().optional(),
      type: z.string().optional(),
      timestamp: z.number().optional(),
      body: z.string().optional() // Algunos proveedores usan 'body' en lugar de 'text'
    }).passthrough().optional() // message es opcional si answer/body están en data
  }).passthrough()
}).passthrough(); // Permitir campos adicionales

export const ElevenLabsWebhookSchema = z.object({
  call_id: z.string(),
  phone_number: z.string(),
  started_at: z.string(),
  ended_at: z.string(),
  outcome: z.string(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const TrackingLookupSchema = z.object({
  trackingNumber: z.string().min(1),
  carrier: z.string().optional()
});

export const CreateQuoteSchema = z.object({
  customerId: z.string(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative()
  })),
  notes: z.string().optional()
});
