import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { prisma } from '@customer-service/db';
import { authenticate, type AuthUser } from './middleware/auth';
import { performTriage } from './services/triage';
import { getTrackingProvider } from './services/tracking';
import { TriageRequestSchema, TrackingLookupSchema, CreateQuoteSchema } from '@customer-service/shared';
import { builderbotAdapter } from '@customer-service/shared';
import * as bcrypt from 'bcryptjs';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Singleton pattern to ensure only one app instance
let appInstance: ReturnType<typeof Fastify> | null = null;

async function buildApp() {
  // Return existing instance if already built
  if (appInstance) {
    logger.warn('App instance already exists, returning existing instance');
    return appInstance;
  }

  const fastify = Fastify({
    logger: true
  });

  // Register plugins first
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || true, // true = permitir todos los orígenes
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  });

  // Register JWT - wrap in try-catch to handle double registration gracefully
  try {
    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'change-me-in-production'
    });
  } catch (err: any) {
    // If decorator already exists, that's okay - continue
    if (err.code === 'FST_ERR_DEC_ALREADY_PRESENT') {
      logger.warn('JWT plugin already registered (this is okay), continuing...');
    } else {
      // Re-throw other errors
      throw err;
    }
  }

  // Auth routes
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password, tenantSlug } = request.body as {
      email: string;
      password: string;
      tenantSlug?: string;
    };

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password required' });
    }

    // Find tenant if slug provided
    let tenant = null;
    if (tenantSlug) {
      tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        ...(tenant && { tenantId: tenant.id })
      },
      include: { tenant: true }
    });

    if (!user || !user.active) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = fastify.jwt.sign({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    });

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } };
  });

  // AI Triage - INTERNAL ENDPOINT (no auth required, uses internal token)
  fastify.post('/ai/triage', async (request, reply) => {
    // Check for internal API token (from Channel Gateway)
    const authHeader = request.headers.authorization;
    const internalToken = process.env.INTERNAL_API_TOKEN || 'internal-token';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === internalToken) {
        // Internal call from Channel Gateway - no user auth needed
        const body = request.body as unknown;
        const validated = TriageRequestSchema.parse(body);

        try {
          // Verify conversation exists
          const conversation = await prisma.conversation.findUnique({
            where: { id: validated.conversationId }
          });

          if (!conversation) {
            return reply.code(404).send({ error: 'Conversation not found' });
          }

          const result = await performTriage(
            validated.conversationId,
            validated.lastMessageId,
            validated.channel
          );

          return result;
        } catch (error) {
          logger.error(error, 'Triage error');
          return reply.code(500).send({ error: 'Triage failed' });
        }
      }
    }
    
    // If no valid internal token, require user authentication
    try {
      await request.jwtVerify();
      const user = request.user as AuthUser;
      const body = request.body as unknown;
      const validated = TriageRequestSchema.parse(body);

      try {
        // Verify conversation belongs to tenant
        const conversation = await prisma.conversation.findUnique({
          where: { id: validated.conversationId }
        });

        if (!conversation || conversation.tenantId !== user.tenantId) {
          return reply.code(404).send({ error: 'Conversation not found' });
        }

        const result = await performTriage(
          validated.conversationId,
          validated.lastMessageId,
          validated.channel
        );

        return result;
      } catch (error) {
        logger.error(error, 'Triage error');
        return reply.code(500).send({ error: 'Triage failed' });
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Protected routes (all other routes require auth)
  fastify.addHook('onRequest', authenticate);

  // Conversations
  fastify.get('/conversations', async (request, reply) => {
    const user = request.user as AuthUser;
    const { status, priority, channel, assignedTo } = request.query as Record<string, string>;

    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(channel && { primaryChannel: channel }),
        ...(assignedTo && { assignedToId: assignedTo })
      },
      include: {
        customer: true,
        assignedTo: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true, tickets: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    return conversations;
  });

  fastify.get('/conversations/:id', async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTo: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        tickets: {
          include: {
            assignedTo: true,
            events: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        callSessions: {
          orderBy: { startedAt: 'desc' }
        },
        shipments: {
          include: {
            events: {
              orderBy: { occurredAt: 'desc' }
            }
          }
        }
      }
    });

    if (!conversation || conversation.tenantId !== user.tenantId) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    return conversation;
  });

  // Messages
  fastify.post('/conversations/:id/messages', async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };
    const { text, channel, direction } = request.body as {
      text: string;
      channel?: string;
      direction?: string;
    };

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true
      }
    });

    if (!conversation || conversation.tenantId !== user.tenantId) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    const messageDirection = direction || 'OUTBOUND';
    const messageChannel = channel || conversation.primaryChannel;

    // Si es mensaje OUTBOUND y el canal es WhatsApp, enviar por Builderbot
    let builderbotMessageId: string | undefined;
    if (messageDirection === 'OUTBOUND' && messageChannel === 'WHATSAPP' && conversation.customer.phoneNumber) {
      try {
        const result = await builderbotAdapter.sendText(
          conversation.customer.phoneNumber,
          text,
          {
            metadata: {
              conversationId: conversation.id,
              sentBy: user.userId,
              tenantId: user.tenantId
            }
          }
        );

        if (result.success && result.messageId) {
          builderbotMessageId = result.messageId;
          logger.info({ messageId: result.messageId, phoneNumber: conversation.customer.phoneNumber }, 'Message sent via Builderbot');
        } else {
          logger.error({ error: result.error }, 'Failed to send message via Builderbot');
          return reply.code(500).send({ 
            error: 'Failed to send message via WhatsApp', 
            details: result.error 
          });
        }
      } catch (error) {
        logger.error(error, 'Error sending message via Builderbot');
        return reply.code(500).send({ 
          error: 'Error sending message via WhatsApp',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Guardar mensaje en DB
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        channel: messageChannel,
        direction: messageDirection,
        text,
        metadata: { 
          sentBy: user.userId,
          ...(builderbotMessageId && { builderbotMessageId })
        }
      }
    });

    // Actualizar última actualización de la conversación
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    return message;
  });

  // Tickets
  fastify.get('/tickets', async (request, reply) => {
    const user = request.user as AuthUser;
    const { status, category, priority, assignedTo } = request.query as Record<string, string>;

    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status && { status }),
        ...(category && { category }),
        ...(priority && { priority }),
        ...(assignedTo && { assignedToId: assignedTo })
      },
      include: {
        conversation: {
          include: { customer: true }
        },
        assignedTo: true,
        _count: {
          select: { events: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return tickets;
  });

  fastify.get('/tickets/:id', async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            customer: true,
            messages: {
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        assignedTo: true,
        createdBy: true,
        events: {
          orderBy: { createdAt: 'asc' },
          include: {
            ticket: {
              select: { number: true }
            }
          }
        }
      }
    });

    if (!ticket || ticket.tenantId !== user.tenantId) {
      return reply.code(404).send({ error: 'Ticket not found' });
    }

    return ticket;
  });

  fastify.post('/tickets', async (request, reply) => {
    const user = request.user as AuthUser;
    const body = request.body as {
      conversationId?: string;
      category: string;
      priority?: string;
      title?: string;
      assignedToId?: string;
    };

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: user.tenantId,
        conversationId: body.conversationId,
        number: `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'NEW',
        category: body.category,
        priority: body.priority || 'MEDIUM',
        title: body.title,
        assignedToId: body.assignedToId,
        createdById: user.userId
      }
    });

    return ticket;
  });

  fastify.patch('/tickets/:id', async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: string;
      assignedToId?: string;
      priority?: string;
      summary?: string;
    };

    const ticket = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!ticket || ticket.tenantId !== user.tenantId) {
      return reply.code(404).send({ error: 'Ticket not found' });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...body,
        ...(body.status === 'CLOSED' && { closedAt: new Date() }),
        ...(body.status === 'RESOLVED' && { resolvedAt: new Date() })
      }
    });

    // Create event
    if (body.status || body.assignedToId) {
      await prisma.ticketEvent.create({
        data: {
          ticketId: id,
          type: 'status_change',
          data: {
            ...body,
            changedBy: user.userId
          }
        }
      });
    }

    return updated;
  });

  // Tracking
  fastify.post('/tracking/lookup', async (request, reply) => {
    const user = request.user as AuthUser;
    const body = request.body as unknown;
    const validated = TrackingLookupSchema.parse(body);

    const provider = getTrackingProvider();
    const status = await provider.getStatus(validated.trackingNumber, validated.carrier);

    // Save to database if conversationId provided
    const { conversationId } = request.body as { conversationId?: string };
    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });

      if (conversation && conversation.tenantId === user.tenantId) {
        await prisma.shipment.upsert({
          where: {
            tenantId_trackingNumber: {
              tenantId: user.tenantId,
              trackingNumber: validated.trackingNumber
            }
          },
          update: {
            status: status.status,
            conversationId
          },
          create: {
            tenantId: user.tenantId,
            conversationId,
            trackingNumber: validated.trackingNumber,
            carrier: status.carrier,
            status: status.status
          }
        });

        // Save events
        const shipment = await prisma.shipment.findUnique({
          where: {
            tenantId_trackingNumber: {
              tenantId: user.tenantId,
              trackingNumber: validated.trackingNumber
            }
          }
        });

        if (shipment) {
          for (const event of status.events) {
            // Check if event already exists
            const existing = await prisma.shipmentEvent.findFirst({
              where: {
                shipmentId: shipment.id,
                status: event.status,
                occurredAt: event.occurredAt
              }
            });

            if (!existing) {
              await prisma.shipmentEvent.create({
                data: {
                  shipmentId: shipment.id,
                  status: event.status,
                  description: event.description,
                  location: event.location,
                  occurredAt: event.occurredAt
                }
              });
            }
          }
        }
      }
    }

    return status;
  });

  // Knowledge Base
  fastify.get('/kb/search', async (request, reply) => {
    const user = request.user as AuthUser;
    const { q } = request.query as { q: string };

    if (!q) {
      return reply.code(400).send({ error: 'Query parameter required' });
    }

    // Simple text search (MVP - can be enhanced with vector search)
    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 10
    });

    return articles.map(article => ({
      id: article.id,
      title: article.title,
      content: article.content.substring(0, 200) + '...',
      tags: article.tags
    }));
  });

  fastify.get('/kb/articles', async (request, reply) => {
    const user = request.user as AuthUser;

    const articles = await prisma.knowledgeArticle.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    return articles;
  });

  fastify.post('/kb/articles', async (request, reply) => {
    const user = request.user as AuthUser;
    const body = request.body as {
      title: string;
      content: string;
      tags?: string[];
      sourceType?: string;
      sourceUrl?: string;
    };

    const article = await prisma.knowledgeArticle.create({
      data: {
        tenantId: user.tenantId,
        title: body.title,
        content: body.content,
        tags: body.tags || [],
        sourceType: body.sourceType || 'manual',
        sourceUrl: body.sourceUrl
      }
    });

    return article;
  });

  // Billing (mock)
  fastify.get('/billing/invoices', async (request, reply) => {
    const user = request.user as AuthUser;
    const { customerId } = request.query as { customerId?: string };

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: user.tenantId,
        ...(customerId && { customerId })
      },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return invoices;
  });

  // Quotes
  fastify.get('/quotes', async (request, reply) => {
    const user = request.user as AuthUser;
    const { customerId } = request.query as { customerId?: string };

    const quotes = await prisma.quote.findMany({
      where: {
        tenantId: user.tenantId,
        ...(customerId && { customerId })
      },
      include: {
        customer: true,
        items: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return quotes;
  });

  fastify.post('/quotes', async (request, reply) => {
    const user = request.user as AuthUser;
    const body = request.body as unknown;
    const validated = CreateQuoteSchema.parse(body);

    const quote = await prisma.quote.create({
      data: {
        tenantId: user.tenantId,
        customerId: validated.customerId,
        number: `QT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'draft',
        notes: validated.notes,
        items: {
          create: validated.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        }
      },
      include: { items: true }
    });

    return quote;
  });

  fastify.get('/quotes/:id', async (request, reply) => {
    const user = request.user as AuthUser;
    const { id } = request.params as { id: string };

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true
      }
    });

    if (!quote || quote.tenantId !== user.tenantId) {
      return reply.code(404).send({ error: 'Quote not found' });
    }

    return quote;
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'api' };
  });

  appInstance = fastify;
  return fastify;
}

// Prevent multiple executions - use a flag
let isStarting = false;

async function start() {
  if (isStarting) {
    logger.warn('Start function already called, skipping...');
    return;
  }
  isStarting = true;

  // Verificar que la DB esté accesible y tenga tablas
  // La inicialización (db push + seed) se hace en el startCommand de Railway
  logger.info('🔍 Verificando conexión a la base de datos...');
  try {
    // Intentar una query simple para verificar conexión
    await prisma.$queryRaw`SELECT 1 as test`;
    logger.info('✅ Conexión a la DB exitosa');
    
    // Verificar que las tablas existen
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'users', 'conversations', 'messages')
    `;
    const tableCount = (tableCheck as any[]).length;
    logger.info(`📊 Tablas encontradas: ${tableCount}`);
    
    if (tableCount === 0) {
      logger.error('❌ ============================================');
      logger.error('❌ ERROR: NO HAY TABLAS EN LA BASE DE DATOS');
      logger.error('❌ ============================================');
      logger.error('💡 La base de datos no está inicializada.');
      logger.error('💡 El script init-db-railway.sh debería ejecutarse en el startCommand.');
      logger.error('💡 Verifica los logs del startCommand en Railway.');
      logger.error('❌ ============================================');
      logger.error('❌ El servicio continuará, pero fallará al procesar requests');
      logger.error('❌ ============================================');
    } else {
      // Verificar si hay datos
      try {
        const tenantCount = await prisma.tenant.count();
        logger.info(`📊 Tenants en la DB: ${tenantCount}`);
        
        if (tenantCount === 0) {
          logger.warn('⚠️ No hay tenants en la DB. El seed debería ejecutarse automáticamente.');
        }
      } catch (err) {
        logger.warn('⚠️ No se pudo contar tenants (puede ser normal si las tablas están vacías)');
      }
    }
  } catch (error) {
    logger.error('❌ ============================================');
    logger.error('❌ ERROR: NO SE PUEDE CONECTAR A LA BASE DE DATOS');
    logger.error('❌ ============================================');
    logger.error('Error:', error instanceof Error ? error.message : String(error));
    logger.error('💡 Verifica que:');
    logger.error('   1. DATABASE_URL esté configurado en Railway → API Service → Variables');
    logger.error('   2. El servicio PostgreSQL esté corriendo en Railway');
    logger.error('   3. DATABASE_URL tenga el formato correcto: postgresql://...');
    logger.error('❌ ============================================');
    logger.error('❌ El servicio continuará, pero fallará al procesar requests');
    logger.error('❌ ============================================');
  }

  try {
    const fastify = await buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    logger.info(`🚀 API listening on ${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Only start if this is the main module
if (require.main === module) {
  start();
}
