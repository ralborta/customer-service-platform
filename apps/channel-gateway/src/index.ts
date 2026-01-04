import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { prisma } from '@customer-service/db';
import { builderbotAdapter } from '@customer-service/shared';
import { WhatsAppWebhookSchema, ElevenLabsWebhookSchema } from '@customer-service/shared';
import { createHash } from 'crypto';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

const fastify = Fastify({
  logger: true
});

// CORS
fastify.register(cors, {
  origin: true
});

// Rate limiting
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Helper: Generate idempotency key from payload
function generateIdempotencyKey(source: string, payload: unknown): string {
  const payloadStr = JSON.stringify(payload);
  const hash = createHash('sha256').update(`${source}:${payloadStr}`).digest('hex');
  return hash;
}

// Helper: Resolve tenant from header or channel account
async function resolveTenant(accountKey?: string, tenantId?: string): Promise<string | null> {
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    return tenant?.id || null;
  }
  if (accountKey) {
    const account = await prisma.channelAccount.findFirst({
      where: { accountKey, active: true },
      include: { tenant: true }
    });
    return account?.tenantId || null;
  }
  return null;
}

// Helper: Get or create customer by phone
async function getOrCreateCustomer(tenantId: string, phoneNumber: string, name?: string) {
  let customer = await prisma.customer.findFirst({
    where: {
      tenantId,
      phoneNumber
    }
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId,
        phoneNumber,
        name: name || `Cliente ${phoneNumber}`,
        email: undefined
      }
    });
  }

  return customer;
}

// Helper: Get or create conversation
async function getOrCreateConversation(
  tenantId: string,
  customerId: string,
  channel: string
) {
  let conversation = await prisma.conversation.findFirst({
    where: {
      tenantId,
      customerId,
      primaryChannel: channel,
      status: { in: ['OPEN', 'PENDING'] }
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        customerId,
        primaryChannel: channel,
        status: 'OPEN',
        priority: 'MEDIUM'
      }
    });
  }

  return conversation;
}

// POST /webhooks/builderbot/whatsapp
fastify.post('/webhooks/builderbot/whatsapp', async (request, reply) => {
  try {
    const body = request.body as unknown;
    const validated = WhatsAppWebhookSchema.parse(body);

    // Resolve tenant (from header or account key)
    const accountKey = (request.headers['x-account-key'] as string) || 'builderbot_whatsapp_main';
    const tenantId = await resolveTenant(accountKey);
    
    if (!tenantId) {
      return reply.code(401).send({ error: 'Tenant not found' });
    }

    // Idempotency check
    const idempotencyKey = generateIdempotencyKey('builderbot_whatsapp', validated);
    const existingEvent = await prisma.eventLog.findUnique({
      where: { idempotencyKey }
    });

    if (existingEvent && existingEvent.status === 'processed') {
      return reply.code(200).send({ status: 'already_processed', eventId: existingEvent.id });
    }

    // Log event
    const eventLog = await prisma.eventLog.upsert({
      where: { idempotencyKey },
      update: { retryCount: { increment: 1 } },
      create: {
        tenantId,
        idempotencyKey,
        source: 'builderbot_whatsapp',
        type: validated.event || 'message.received',
        rawPayload: validated as any,
        status: 'pending'
      }
    });

    try {
      const data = validated.data;
      const fromPhone = data.from;
      const message = data.message;

      // Get or create customer
      const customer = await getOrCreateCustomer(tenantId, fromPhone);

      // Get or create conversation
      const conversation = await getOrCreateConversation(
        tenantId,
        customer.id,
        'WHATSAPP'
      );

      // Create message
      const dbMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          channel: 'WHATSAPP',
          direction: 'INBOUND',
          text: message.text,
          rawPayload: validated as unknown as Record<string, unknown>
        }
      });

      // Call internal API for triage (or do it here)
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const settings = (tenant?.settings as Record<string, unknown>) || {};
      const aiMode = (settings.aiMode as string) || 'ASSISTED';
      const autopilotCategories = (settings.autopilotCategories as string[]) || [];

      // Simple triage (rule-based for MVP)
      const messageText = (message.text || '').toLowerCase();
      let intent = 'otro';
      let confidence = 0.5;
      let category = 'OTRO';

      if (messageText.includes('seguimiento') || messageText.includes('tracking') || messageText.includes('pedido')) {
        intent = 'tracking';
        confidence = 0.8;
        category = 'TRACKING';
      } else if (messageText.includes('factura') || messageText.includes('deuda') || messageText.includes('pago')) {
        intent = 'facturacion';
        confidence = 0.8;
        category = 'FACTURACION';
      } else if (messageText.includes('reclamo') || messageText.includes('problema') || messageText.includes('dañado')) {
        intent = 'reclamo';
        confidence = 0.9;
        category = 'RECLAMO';
      }

      const autopilotEligible = autopilotCategories.includes(category) && confidence >= 0.7;

      // Create or update ticket
      let ticket = await prisma.ticket.findFirst({
        where: { conversationId: conversation.id, status: { not: 'CLOSED' } }
      });

      if (!ticket) {
        ticket = await prisma.ticket.create({
          data: {
            tenantId,
            conversationId: conversation.id,
            number: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'NEW',
            category,
            priority: category === 'RECLAMO' ? 'HIGH' : 'MEDIUM',
            title: `Consulta ${category}`
          }
        });
      }

      // Update message with metadata
      await prisma.message.update({
        where: { id: dbMessage.id },
        data: {
          metadata: {
            intent,
            confidence,
            suggestedReply: autopilotEligible ? `Gracias por contactarnos. Estamos procesando tu consulta sobre ${intent}.` : undefined,
            suggestedActions: []
          }
        }
      });

      // Autopilot: Send response if eligible
      if (aiMode === 'AUTOPILOT' && autopilotEligible) {
        const suggestedReply = `Gracias por contactarnos. Estamos procesando tu consulta sobre ${intent}. Te responderemos pronto.`;
        const result = await builderbotAdapter.sendText(fromPhone, suggestedReply);
        
        if (result.success) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              channel: 'WHATSAPP',
              direction: 'OUTBOUND',
              text: suggestedReply,
              metadata: { autopilot: true, messageId: result.messageId }
            }
          });
        }
      }

      // Mark event as processed
      await prisma.eventLog.update({
        where: { id: eventLog.id },
        data: { status: 'processed', processedAt: new Date() }
      });

      return reply.code(200).send({ status: 'processed', conversationId: conversation.id, ticketId: ticket.id });
    } catch (error) {
      await prisma.eventLog.update({
        where: { id: eventLog.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  } catch (error) {
    logger.error(error, 'Error processing WhatsApp webhook');
    return reply.code(400).send({ error: 'Invalid payload' });
  }
});

// POST /webhooks/elevenlabs/post-call
fastify.post('/webhooks/elevenlabs/post-call', async (request, reply) => {
  try {
    const body = request.body as unknown;
    const validated = ElevenLabsWebhookSchema.parse(body);

    // Resolve tenant
    const accountKey = (request.headers['x-account-key'] as string) || 'elevenlabs_calls_main';
    const tenantId = await resolveTenant(accountKey);
    
    if (!tenantId) {
      return reply.code(401).send({ error: 'Tenant not found' });
    }

    // Idempotency
    const idempotencyKey = generateIdempotencyKey('elevenlabs_post_call', validated);
    const existingEvent = await prisma.eventLog.findUnique({
      where: { idempotencyKey }
    });

    if (existingEvent && existingEvent.status === 'processed') {
      return reply.code(200).send({ status: 'already_processed', eventId: existingEvent.id });
    }

    const eventLog = await prisma.eventLog.upsert({
      where: { idempotencyKey },
      update: { retryCount: { increment: 1 } },
      create: {
        tenantId,
        idempotencyKey,
        source: 'elevenlabs_post_call',
        type: 'call.completed',
        rawPayload: validated as any,
        status: 'pending'
      }
    });

    try {
      const phoneNumber = validated.phone_number;
      const startedAt = new Date(validated.started_at);
      const endedAt = new Date(validated.ended_at);
      const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      // Get or create customer
      const customer = await getOrCreateCustomer(tenantId, phoneNumber);

      // Get or create conversation
      const conversation = await getOrCreateConversation(
        tenantId,
        customer.id,
        'CALL'
      );

      // Create call session
      const callSession = await prisma.callSession.create({
        data: {
          conversationId: conversation.id,
          phoneNumber,
          startedAt,
          endedAt,
          duration,
          outcome: validated.outcome || 'completed',
          summary: validated.summary,
          transcript: validated.transcript,
          rawPayload: validated as unknown as Record<string, unknown>
        }
      });

      // Create ticket event
      const ticket = await prisma.ticket.findFirst({
        where: { conversationId: conversation.id, status: { not: 'CLOSED' } }
      });

      if (ticket) {
        await prisma.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            type: 'call.completed',
            data: {
              callId: callSession.id,
              duration,
              outcome: validated.outcome,
              summary: validated.summary
            }
          }
        });
      }

      // Suggest WhatsApp follow-up
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const settings = (tenant?.settings as Record<string, unknown>) || {};
      const autopilotCallFollowup = (settings.autopilotCallFollowup as boolean) || false;

      if (autopilotCallFollowup && validated.summary) {
        const followupMessage = `Gracias por tu llamada. Resumen: ${validated.summary}. ¿Hay algo más en lo que podamos ayudarte?`;
        const result = await builderbotAdapter.sendText(phoneNumber, followupMessage);
        
        if (result.success) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              channel: 'WHATSAPP',
              direction: 'OUTBOUND',
              text: followupMessage,
              metadata: { callFollowup: true, callId: callSession.id }
            }
          });
        }
      }

      await prisma.eventLog.update({
        where: { id: eventLog.id },
        data: { status: 'processed', processedAt: new Date() }
      });

      return reply.code(200).send({ status: 'processed', callSessionId: callSession.id });
    } catch (error) {
      await prisma.eventLog.update({
        where: { id: eventLog.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  } catch (error) {
    logger.error(error, 'Error processing ElevenLabs webhook');
    return reply.code(400).send({ error: 'Invalid payload' });
  }
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', service: 'channel-gateway' };
});

const start = async () => {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    logger.info(`🚀 Channel Gateway listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
