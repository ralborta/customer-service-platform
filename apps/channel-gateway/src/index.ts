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

// Rate limiting - excluir endpoints de debug, health y webhooks
// IMPORTANTE: Los webhooks NO deben tener rate limiting porque vienen de servicios externos
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  skip: (request: { url: string }) => {
    // No aplicar rate limiting a endpoints públicos y webhooks
    const url = request.url.split('?')[0]; // Remover query params
    const publicRoutes = ['/health', '/debug', '/webhooks'];
    const shouldSkip = publicRoutes.some(route => url.startsWith(route));
    if (shouldSkip) {
      logger.debug({ url }, 'Skipping rate limit for public route');
    }
    return shouldSkip;
  }
} as Parameters<typeof fastify.register>[1]);

// Helper: Generate idempotency key from payload
function generateIdempotencyKey(source: string, payload: unknown): string {
  const payloadStr = JSON.stringify(payload);
  const hash = createHash('sha256').update(`${source}:${payloadStr}`).digest('hex');
  return hash;
}

// Helper: Resolve tenant from header or channel account
// IMPORTANTE: Esta función NUNCA debe retornar null - siempre debe retornar un tenant
async function resolveTenant(accountKey?: string, tenantId?: string): Promise<string> {
  logger.info({ accountKey, tenantId }, '🔍 resolveTenant called');
  
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      logger.info({ tenantId, tenantSlug: tenant.slug }, '✅ Tenant encontrado por ID');
      return tenant.id;
    }
  }
  
  if (accountKey) {
    // Buscar ChannelAccount
    logger.info({ accountKey }, 'Buscando ChannelAccount...');
    const account = await prisma.channelAccount.findFirst({
      where: { accountKey, active: true },
      include: { tenant: true }
    });
    
    if (account) {
      logger.info({ accountKey, tenantId: account.tenantId, tenantSlug: account.tenant.slug }, '✅ ChannelAccount encontrado');
      return account.tenantId;
    }
    
    logger.warn({ accountKey }, '⚠️ ChannelAccount not found');
  }
  
  // FALLBACK: Buscar cualquier tenant disponible
  logger.warn('Buscando cualquier tenant disponible...');
  let tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: 'asc' }
  });
  
  if (!tenant) {
    // ÚLTIMO RECURSO: Crear tenant por defecto
    logger.warn('🔄 No hay tenants, creando tenant por defecto...');
    try {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Default Tenant',
          slug: 'default',
          settings: {
            aiMode: 'ASSISTED',
            autopilotCategories: ['INFO', 'TRACKING'],
            confidenceThreshold: 0.7,
            autopilotCallFollowup: false
          }
        }
      });
      logger.info({ tenantId: tenant.id }, '✅ Tenant por defecto creado');
    } catch (error) {
      logger.error({ error }, '❌ FALLÓ crear tenant por defecto');
      throw new Error('No se pudo crear tenant. Verifica la conexión a la DB.');
    }
  }
  
  // Crear ChannelAccount si no existe
  if (accountKey) {
    try {
      await prisma.channelAccount.upsert({
        where: {
          tenantId_accountKey: {
            tenantId: tenant.id,
            accountKey
          }
        },
        update: { active: true },
        create: {
          tenantId: tenant.id,
          channel: accountKey.includes('builderbot') ? 'builderbot_whatsapp' : 'elevenlabs_calls',
          accountKey,
          active: true
        }
      });
      logger.info({ tenantId: tenant.id, accountKey }, '✅ ChannelAccount creado/actualizado');
    } catch (error) {
      logger.warn({ error }, '⚠️ Error al crear ChannelAccount, pero continuando con tenant');
    }
  }
  
  logger.info({ tenantId: tenant.id, tenantSlug: tenant.slug }, '✅ Tenant resuelto');
  return tenant.id;
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
  // LOG INMEDIATO - esto debe aparecer SIEMPRE si el handler se ejecuta
  logger.info('🚨🚨🚨 HANDLER EJECUTADO 🚨🚨🚨');
  logger.info({ url: request.url, method: request.method }, 'Handler started');
  
  const startTime = Date.now();
  let tenantId: string | null = null;
  let eventLog: any = null;
  
  try {
    const body = request.body as unknown;
    
    // Log COMPLETO del request para debug
    logger.info('========================================');
    logger.info('📥 WEBHOOK RECIBIDO');
    logger.info('========================================');
    logger.info({ 
      method: request.method,
      url: request.url,
      headers: Object.keys(request.headers),
      bodyPreview: typeof body === 'string' ? body.substring(0, 1000) : JSON.stringify(body).substring(0, 1000),
      bodyType: typeof body,
      bodyKeys: typeof body === 'object' && body !== null ? Object.keys(body) : []
    }, '📥 Received webhook payload');
    
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    
    // Resolve tenant PRIMERO (antes de validar, para tener mejor error)
    const accountKey = (request.headers['x-account-key'] as string) || 
                       (request.headers['x-account-key'] as string) ||
                       'builderbot_whatsapp_main';
    logger.info({ 
      accountKey, 
      headerKeys: Object.keys(request.headers),
      hasXAccountKey: !!request.headers['x-account-key']
    }, '🔍 Resolving tenant for webhook');
    
    // resolveTenant NUNCA retorna null - siempre retorna un tenant
    try {
      tenantId = await resolveTenant(accountKey);
      logger.info({ tenantId, accountKey }, '✅ Tenant resolved successfully');
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        accountKey
      }, '❌ ERROR CRÍTICO: No se pudo resolver tenant');
      return reply.code(500).send({ 
        error: 'Database error',
        details: error instanceof Error ? error.message : 'Could not resolve tenant. Check database connection.'
      });
    }
    
    logger.info({ tenantId, accountKey }, '✅ Tenant resolved successfully');
    
    // Validar payload DESPUÉS de resolver tenant
    let validated;
    try {
      validated = WhatsAppWebhookSchema.parse(body);
      logger.info({ validated: JSON.stringify(validated).substring(0, 500) }, '✅ Payload validated');
    } catch (validationError) {
      logger.error({ 
        error: validationError instanceof Error ? validationError.message : String(validationError),
        bodyPreview: bodyStr.substring(0, 500),
        tenantId
      }, '❌ Payload validation failed');
      return reply.code(400).send({ 
        error: 'Invalid payload format',
        details: validationError instanceof Error ? validationError.message : 'Unknown validation error',
        received: body
      });
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
          rawPayload: JSON.parse(JSON.stringify(validated)),
        status: 'pending'
      }
    });

    try {
      const data = validated.data;
      const fromPhone = data.from;
      const message = data.message || {};
      
      // Extraer texto del mensaje (puede venir en 'text' o 'body')
      // Asegurar que siempre sea string
      let messageText: string;
      if (typeof message.text === 'string') {
        messageText = message.text;
      } else if (typeof message.body === 'string') {
        messageText = message.body;
      } else if (typeof message === 'string') {
        messageText = message;
      } else {
        messageText = '(sin texto)';
      }
      
      logger.info({ fromPhone, messageText: messageText.substring(0, 100), message }, 'Processing WhatsApp message');

      // Get or create customer
      logger.info({ tenantId, fromPhone }, '👤 Obteniendo/creando customer...');
      const customer = await getOrCreateCustomer(tenantId, fromPhone);
      logger.info({ customerId: customer.id, phoneNumber: fromPhone, customerName: customer.name }, '✅ Customer resolved');

      // Get or create conversation
      logger.info({ tenantId, customerId: customer.id, channel: 'WHATSAPP' }, '💬 Obteniendo/creando conversación...');
      const conversation = await getOrCreateConversation(
        tenantId,
        customer.id,
        'WHATSAPP'
      );
      logger.info({ conversationId: conversation.id, status: conversation.status }, '✅ Conversation resolved');

      // Create message
      let dbMessage;
      try {
        logger.info({ conversationId: conversation.id, messageText: messageText.substring(0, 50) }, '📝 Creando mensaje en DB...');
        dbMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            channel: 'WHATSAPP',
            direction: 'INBOUND',
            text: messageText,
            rawPayload: JSON.parse(JSON.stringify(validated))
          }
        });
        logger.info({ 
          messageId: dbMessage.id, 
          conversationId: conversation.id,
          direction: 'INBOUND',
          textLength: messageText.length
        }, '✅ Message created in database');
      } catch (dbError) {
        logger.error({ 
          error: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined,
          conversationId: conversation.id,
          messageText: messageText.substring(0, 100)
        }, '❌ ERROR al crear mensaje en DB');
        throw dbError; // Re-lanzar para que se maneje en el catch externo
      }

      // Get tenant settings
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const settings = (tenant?.settings as Record<string, unknown>) || {};
      const aiMode = (settings.aiMode as string) || 'ASSISTED';
      const autopilotCategories = (settings.autopilotCategories as string[]) || [];

      // Call internal API for triage (better than rule-based here)
      let triageResult: {
        intent: string;
        confidence: number;
        suggestedReply: string;
        autopilotEligible: boolean;
        suggestedActions: Array<{ type: string; payload: Record<string, unknown> }>;
      } | null = null;

      try {
        const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
        const triageResponse = await fetch(`${apiUrl}/ai/triage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // In production, use internal service token
            'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN || 'internal-token'}`
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            lastMessageId: dbMessage.id,
            channel: 'whatsapp'
          })
        });

        if (triageResponse.ok) {
          triageResult = await triageResponse.json() as typeof triageResult;
        }
      } catch (error) {
        logger.warn(error, 'Failed to call triage API, using fallback');
      }

      // Fallback to simple rule-based if triage API fails
      if (!triageResult) {
        const messageText = (message.text || '').toLowerCase();
        let intent = 'otro';
        let confidence = 0.5;

        if (messageText.includes('seguimiento') || messageText.includes('tracking') || messageText.includes('pedido')) {
          intent = 'tracking';
          confidence = 0.8;
        } else if (messageText.includes('factura') || messageText.includes('deuda') || messageText.includes('pago')) {
          intent = 'facturacion';
          confidence = 0.8;
        } else if (messageText.includes('reclamo') || messageText.includes('problema') || messageText.includes('dañado')) {
          intent = 'reclamo';
          confidence = 0.9;
        }

        triageResult = {
          intent,
          confidence,
          suggestedReply: 'Gracias por contactarnos. Estamos procesando tu consulta.',
          autopilotEligible: false,
          suggestedActions: []
        };
      }

      const category = triageResult.intent.toUpperCase();
      const autopilotEligible = triageResult.autopilotEligible && autopilotCategories.includes(category);

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

      // Update message with metadata from triage
      await prisma.message.update({
        where: { id: dbMessage.id },
        data: {
          metadata: JSON.parse(JSON.stringify({
            intent: triageResult.intent,
            confidence: triageResult.confidence,
            suggestedReply: triageResult.suggestedReply,
            suggestedActions: triageResult.suggestedActions,
            autopilotEligible
          }))
        }
      });

      // Update conversation priority based on intent
      let conversationPriority = 'MEDIUM';
      if (category === 'RECLAMO' || triageResult.confidence > 0.9) {
        conversationPriority = 'HIGH';
      } else if (category === 'TRACKING' || category === 'INFO') {
        conversationPriority = 'LOW';
      }

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          priority: conversationPriority,
          updatedAt: new Date()
        }
      });

      // Autopilot: Send response if eligible
      if (aiMode === 'AUTOPILOT' && autopilotEligible && triageResult.suggestedReply) {
        const result = await builderbotAdapter.sendText(fromPhone, triageResult.suggestedReply);
        
        if (result.success) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              channel: 'WHATSAPP',
              direction: 'OUTBOUND',
              text: triageResult.suggestedReply,
              metadata: { 
                autopilot: true, 
                messageId: result.messageId,
                intent: triageResult.intent,
                confidence: triageResult.confidence
              }
            }
          });

          // Update conversation status if autopilot responded
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { status: 'PENDING' } // Waiting for customer response
          });
        }
      }

      // Mark event as processed
      await prisma.eventLog.update({
        where: { id: eventLog.id },
        data: { status: 'processed', processedAt: new Date() }
      });

      const responseTime = Date.now() - startTime;
      logger.info({ 
        conversationId: conversation.id, 
        ticketId: ticket.id,
        messageId: dbMessage.id,
        responseTime: `${responseTime}ms`
      }, '✅ Message processed successfully');
      
      return reply.code(200).send({ 
        status: 'processed', 
        conversationId: conversation.id, 
        ticketId: ticket.id,
        messageId: dbMessage.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body || {}).substring(0, 200);
      logger.error('========================================');
      logger.error('❌ ERROR PROCESANDO WEBHOOK');
      logger.error('========================================');
      logger.error({ 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        tenantId,
        bodyPreview: bodyStr,
        processingTime: Date.now() - startTime
      }, '❌ Error processing message');
      
      if (eventLog) {
        await prisma.eventLog.update({
          where: { id: eventLog.id },
          data: {
            status: 'failed',
            error: errorMessage
          }
        });
      }
      
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: errorMessage
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      tenantId
    }, '❌ Error processing WhatsApp webhook');
    return reply.code(500).send({ 
      error: 'Internal server error',
      details: errorMessage
    });
  }
});

// POST /webhooks/elevenlabs/post-call
fastify.post('/webhooks/elevenlabs/post-call', async (request, reply) => {
  try {
    const body = request.body as unknown;
    const validated = ElevenLabsWebhookSchema.parse(body);

    // Resolve tenant (nunca retorna null)
    const accountKey = (request.headers['x-account-key'] as string) || 'elevenlabs_calls_main';
    const tenantId = await resolveTenant(accountKey);

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
          rawPayload: JSON.parse(JSON.stringify(validated)),
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
          rawPayload: JSON.parse(JSON.stringify(validated))
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

// Health check - debe ser público (sin autenticación)
fastify.get('/health', async () => {
  return { status: 'ok', service: 'channel-gateway' };
});

// Debug endpoints - deben ser públicos (sin autenticación)
// Estos endpoints NO requieren autenticación para facilitar el debugging
fastify.get('/debug/messages', async (request, reply) => {
  try {
    const { limit = '10' } = request.query as { limit?: string };
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    
    const messages = await prisma.message.findMany({
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          include: {
            customer: true
          }
        }
      }
    });
    
    const totalMessages = await prisma.message.count();
    const totalConversations = await prisma.conversation.count();
    const totalCustomers = await prisma.customer.count();
    
    return {
      messages,
      stats: {
        totalMessages,
        totalConversations,
        totalCustomers,
        recentMessages: messages.length
      }
    };
  } catch (error) {
    logger.error({ error }, 'Debug messages error');
    return reply.code(500).send({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Debug endpoint - verificar eventos de webhook (público, sin autenticación)
fastify.get('/debug/events', async (request, reply) => {
  try {
    const { limit = '20' } = request.query as { limit?: string };
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    
    const events = await prisma.eventLog.findMany({
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      where: {
        source: 'builderbot_whatsapp'
      }
    });
    
    const stats = {
      total: await prisma.eventLog.count({ where: { source: 'builderbot_whatsapp' } }),
      processed: await prisma.eventLog.count({ where: { source: 'builderbot_whatsapp', status: 'processed' } }),
      pending: await prisma.eventLog.count({ where: { source: 'builderbot_whatsapp', status: 'pending' } }),
      failed: await prisma.eventLog.count({ where: { source: 'builderbot_whatsapp', status: 'failed' } })
    };
    
    return {
      events,
      stats
    };
  } catch (error) {
    logger.error({ error }, 'Debug events error');
    return reply.code(500).send({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

const start = async () => {
  try {
    // Plugins ya están registrados arriba (CORS y rate limiting)
    // Solo necesitamos iniciar el servidor
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
