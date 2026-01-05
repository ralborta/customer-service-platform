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
    if (account) {
      return account.tenantId;
    }
    
    // Fallback: Si no existe el ChannelAccount, usar el primer tenant disponible (para desarrollo)
    // En producción, deberías crear el ChannelAccount en el seed
    logger.warn({ accountKey }, 'ChannelAccount not found, trying fallback to first tenant');
    const firstTenant = await prisma.tenant.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    if (!firstTenant) {
      logger.error('❌ ============================================');
      logger.error('❌ NO HAY TENANTS EN LA BASE DE DATOS');
      logger.error('❌ ============================================');
      logger.error('💡 Esto significa que:');
      logger.error('   1. El seed no se ejecutó correctamente');
      logger.error('   2. O DB_INIT=true no está configurado en el API');
      logger.error('   3. O la DB no tiene tablas creadas');
      logger.error('❌ ============================================');
      logger.warn('🔄 Intentando crear tenant por defecto automáticamente...');
      
      // Crear tenant por defecto si no existe ninguno
      try {
        const defaultTenant = await prisma.tenant.create({
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
        logger.info('✅ ============================================');
        logger.info({ tenantId: defaultTenant.id }, '✅ Default tenant created');
        
        // Crear el ChannelAccount para este tenant
        await prisma.channelAccount.create({
          data: {
            tenantId: defaultTenant.id,
            channel: accountKey.includes('builderbot') ? 'builderbot_whatsapp' : 'elevenlabs_calls',
            accountKey,
            active: true
          }
        });
        logger.info({ tenantId: defaultTenant.id, accountKey }, '✅ ChannelAccount created for default tenant');
        logger.info('✅ ============================================');
        return defaultTenant.id;
      } catch (error) {
        logger.error('❌ ============================================');
        logger.error('❌ FALLÓ AL CREAR TENANT POR DEFECTO');
        logger.error('❌ ============================================');
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Detalles:');
        logger.error('💡 Verifica que:');
        logger.error('   1. DATABASE_URL esté configurado correctamente');
        logger.error('   2. Las tablas existan (ejecuta DB_INIT=true en el API)');
        logger.error('   3. La DB esté accesible');
        logger.error('❌ ============================================');
        return null;
      }
    }
    
    logger.info({ tenantId: firstTenant.id, accountKey }, 'Using fallback tenant, creating ChannelAccount');
    
    // Crear el ChannelAccount para futuras requests
    try {
      await prisma.channelAccount.upsert({
        where: {
          tenantId_accountKey: {
            tenantId: firstTenant.id,
            accountKey
          }
        },
        update: { active: true },
        create: {
          tenantId: firstTenant.id,
          channel: accountKey.includes('builderbot') ? 'builderbot_whatsapp' : 'elevenlabs_calls',
          accountKey,
          active: true
        }
      });
      logger.info({ tenantId: firstTenant.id, accountKey }, 'ChannelAccount created successfully');
      return firstTenant.id;
    } catch (error) {
      logger.error({ error, accountKey, tenantId: firstTenant.id }, 'Failed to create ChannelAccount');
      // Aún así retornar el tenantId para que funcione
      return firstTenant.id;
    }
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
  const startTime = Date.now();
  let tenantId: string | null = null;
  
  try {
    const body = request.body as unknown;
    
    // Log raw body completo para debug (limitado a 1000 chars)
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    logger.info({ 
      bodyPreview: bodyStr.substring(0, 1000),
      bodyType: typeof body,
      bodyKeys: typeof body === 'object' && body !== null ? Object.keys(body) : []
    }, '📥 Received webhook payload');
    
    // Resolve tenant PRIMERO (antes de validar, para tener mejor error)
    const accountKey = (request.headers['x-account-key'] as string) || 
                       (request.headers['x-account-key'] as string) ||
                       'builderbot_whatsapp_main';
    logger.info({ 
      accountKey, 
      headerKeys: Object.keys(request.headers),
      hasXAccountKey: !!request.headers['x-account-key']
    }, '🔍 Resolving tenant for webhook');
    
    tenantId = await resolveTenant(accountKey);
    
    if (!tenantId) {
      logger.error({ 
        accountKey, 
        bodyPreview: bodyStr.substring(0, 200),
        error: 'Tenant resolution failed'
      }, '❌ Tenant not found');
      return reply.code(401).send({ 
        error: 'Tenant not found',
        details: `No tenant found for accountKey: ${accountKey}. Make sure DB_INIT=true was set and seed ran successfully.`
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
      const messageText = message.text || message.body || '(sin texto)';
      
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
          metadata: {
            intent: triageResult.intent,
            confidence: triageResult.confidence,
            suggestedReply: triageResult.suggestedReply,
            suggestedActions: triageResult.suggestedActions,
            autopilotEligible
          }
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
      logger.error({ 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        tenantId,
        bodyPreview: bodyStr
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

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', service: 'channel-gateway' };
});

// Debug endpoint - verificar mensajes en DB
fastify.get('/debug/messages', async (request, reply) => {
  try {
    const { limit = 10 } = request.query as { limit?: string };
    const limitNum = parseInt(limit, 10) || 10;
    
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

// Debug endpoint - verificar eventos de webhook
fastify.get('/debug/events', async (request, reply) => {
  try {
    const { limit = 20 } = request.query as { limit?: string };
    const limitNum = parseInt(limit, 10) || 20;
    
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
