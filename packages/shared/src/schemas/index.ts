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

export const WhatsAppWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    from: z.string(),
    to: z.string(),
    message: z.object({
      id: z.string(),
      text: z.string().optional(),
      type: z.string(),
      timestamp: z.number()
    }).passthrough()
  }).passthrough()
});

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
