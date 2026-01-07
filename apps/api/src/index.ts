import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { prisma } from '@customer-service/db';
import { authenticate, type AuthUser } from './middleware/auth';
import { performTriage } from './services/triage';
import { getTrackingProvider } from './services/tracking';
import { TriageRequestSchema, TrackingLookupSchema, CreateQuoteSchema, WhatsAppWebhookSchema, ElevenLabsWebhookSchema } from '@customer-service/shared';
import { builderbotAdapter } from '@customer-service/shared';
import * as bcrypt from 'bcryptjs';
import pino from 'pino';
import { createHash } from 'crypto';

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
  // CORS: Permitir todos los orígenes de Vercel (producción y previews)
  // Si CORS_ORIGIN está configurado, usarlo; si no, permitir todos
  const corsOrigin = process.env.CORS_ORIGIN;
  await fastify.register(cors, {
    origin: corsOrigin 
      ? (origin, cb) => {
          // Si CORS_ORIGIN está configurado, verificar que el origen coincida
          // O si es un dominio de Vercel, permitirlo
          if (!origin) {
            cb(null, true);
            return;
          }
          const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
          const isVercelDomain = origin.includes('.vercel.app') || origin.includes('vercel.app');
          if (allowedOrigins.includes(origin) || isVercelDomain) {
            cb(null, true);
          } else {
            cb(null, false);
          }
        }
      : true, // Si no hay CORS_ORIGIN, permitir todos los orígenes
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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

  // Debug endpoint - verificar usuarios en DB
  fastify.get('/debug/users', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          tenantId: true,
          tenant: {
            select: {
              name: true,
              slug: true
            }
          }
        }
      });
      return { users, count: users.length };
    } catch (error) {
      logger.error({ error }, 'Debug users error');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Debug endpoint - DIAGNÓSTICO COMPLETO DE LOGIN
  fastify.get('/debug/login-status', async (request, reply) => {
    try {
      const email = 'agent@demo.com';
      const password = 'admin123';
      
      // 1. Verificar tenant demo
      const demoTenant = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
      
      // 2. Verificar usuario
      let user = null;
      if (demoTenant) {
        user = await prisma.user.findUnique({
          where: {
            tenantId_email: {
              tenantId: demoTenant.id,
              email
            }
          }
        });
      }
      
      // 3. Verificar password
      let passwordValid = false;
      if (user) {
        passwordValid = await bcrypt.compare(password, user.password);
      }
      
      return {
        tenant: demoTenant ? {
          id: demoTenant.id,
          slug: demoTenant.slug,
          name: demoTenant.name,
          exists: true
        } : { exists: false },
        user: user ? {
          id: user.id,
          email: user.email,
          active: user.active,
          role: user.role,
          tenantId: user.tenantId,
          exists: true,
          passwordHashLength: user.password.length
        } : { exists: false },
        password: {
          testPassword: password,
          valid: passwordValid
        },
        status: demoTenant && user && user.active && passwordValid ? 'OK' : 'ERROR',
        message: !demoTenant ? 'Tenant demo no existe' :
                 !user ? 'Usuario no existe' :
                 !user.active ? 'Usuario inactivo' :
                 !passwordValid ? 'Password incorrecto' :
                 'Todo OK'
      };
    } catch (error) {
      logger.error({ error }, 'Debug login status error');
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Debug endpoint - FIJAR PASSWORD (solo para desarrollo)
  fastify.post('/debug/fix-password', async (request, reply) => {
    try {
      const { email = 'agent@demo.com', password = 'admin123' } = request.body as { email?: string; password?: string };
      
      // Buscar tenant demo
      const demoTenant = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
      if (!demoTenant) {
        return reply.code(404).send({ error: 'Tenant demo no existe' });
      }
      
      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: demoTenant.id,
            email
          }
        }
      });
      
      if (!user) {
        return reply.code(404).send({ error: 'Usuario no existe' });
      }
      
      // Regenerar password hash
      const newHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash, active: true }
      });
      
      // Verificar que funciona
      const isValid = await bcrypt.compare(password, newHash);
      
      return {
        success: true,
        email,
        passwordUpdated: true,
        passwordValid: isValid,
        message: 'Password actualizado correctamente'
      };
    } catch (error) {
      logger.error({ error }, 'Fix password error');
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Auth routes
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { email, password, tenantSlug } = request.body as {
        email: string;
        password: string;
        tenantSlug?: string;
      };

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password required' });
      }

      // Buscar tenant (si se especifica, usar ese; si no, usar "demo" por defecto)
      const slug = tenantSlug || 'demo';
      const tenant = await prisma.tenant.findUnique({ where: { slug } });
      
      if (!tenant) {
        logger.error({ slug, email }, '❌ Tenant not found');
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Buscar usuario en ese tenant
      const user = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: tenant.id,
            email
          }
        },
        include: { tenant: true }
      });

      if (!user) {
        logger.error({ email, tenantSlug: slug, tenantId: tenant.id }, '❌ User not found');
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      if (!user.active) {
        logger.error({ email, userId: user.id }, '❌ User inactive');
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verificar password
      const valid = await bcrypt.compare(password, user.password);
      
      if (!valid) {
        logger.error({ 
          email, 
          userId: user.id,
          passwordHashLength: user.password.length,
          passwordHashStart: user.password.substring(0, 20)
        }, '❌ Password invalid');
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      logger.info({ email, userId: user.id, tenantId: user.tenantId }, '✅ Login successful');

      // Generate JWT
      const token = fastify.jwt.sign({
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role
      });

      logger.info({ email, userId: user.id }, 'Login successful');
      return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Login error');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // AI Triage - Puede ser llamado con auth JWT o sin auth (para uso interno)
  fastify.post('/ai/triage', async (request, reply) => {
    const body = request.body as unknown;
    let validated: { conversationId: string; lastMessageId: string; channel: string };
    let tenantId: string | null = null;

    try {
      validated = TriageRequestSchema.parse(body);
    } catch (error) {
      return reply.code(400).send({ error: 'Invalid request body', details: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Intentar autenticación JWT (opcional)
    try {
      await request.jwtVerify();
      const user = request.user as AuthUser;
      tenantId = user.tenantId;

      // Verify conversation belongs to tenant
      const conversation = await prisma.conversation.findUnique({
        where: { id: validated.conversationId }
      });

      if (!conversation || conversation.tenantId !== user.tenantId) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
    } catch (err) {
      // Si no hay JWT, verificar que la conversación existe (uso interno)
      const conversation = await prisma.conversation.findUnique({
        where: { id: validated.conversationId }
      });

      if (!conversation) {
        return reply.code(404).send({ error: 'Conversation not found' });
      }
      tenantId = conversation.tenantId;
    }

    try {
      const result = await performTriage(
        validated.conversationId,
        validated.lastMessageId,
        validated.channel
      );

      return result;
    } catch (error) {
      logger.error(error, 'Triage error');
      return reply.code(500).send({ error: 'Triage failed', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

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

  // Protected routes (all other routes require auth)
  // Excluir rutas públicas del hook de autenticación
  fastify.addHook('onRequest', async (request, reply) => {
    // Rutas públicas que NO requieren autenticación
    const publicRoutes = [
      '/auth/login',
      '/health',
      '/__ping',
      '/debug/users',
      '/debug/login-status',
      '/debug/fix-password',
      '/debug/test-password',
      '/debug/messages',
      '/debug/events',
      '/webhooks/', // Todas las rutas de webhooks son públicas
      '/ai/triage' // Tiene su propia autenticación interna
    ];
    
    // Si la ruta es pública, no aplicar autenticación
    if (publicRoutes.some(route => request.url.startsWith(route))) {
      return;
    }
    
    // Para todas las demás rutas, aplicar autenticación
    return authenticate(request, reply);
  });

  // ============================================
  // WEBHOOKS (Públicos - sin autenticación)
  // ============================================

  // POST /webhooks/builderbot/whatsapp
  fastify.post('/webhooks/builderbot/whatsapp', async (request, reply) => {
    const startTime = Date.now();
    let tenantId: string | null = null;
    let eventLog: any = null;
    
    try {
      const body = request.body as unknown;
      
      logger.info('========================================');
      logger.info('📥 WEBHOOK RECIBIDO (Builderbot)');
      logger.info('========================================');
      logger.info({ 
        method: request.method,
        url: request.url,
        headers: Object.keys(request.headers),
        bodyPreview: typeof body === 'string' ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200)
      }, '📥 Received webhook payload');
      
      // Resolve tenant PRIMERO
      const accountKey = (request.headers['x-account-key'] as string) || 'builderbot_whatsapp_main';
      logger.info({ accountKey }, '🔍 Resolving tenant for webhook');
      
      try {
        tenantId = await resolveTenant(accountKey);
        logger.info({ tenantId, accountKey }, '✅ Tenant resolved successfully');
      } catch (error) {
        logger.error({ 
          error: error instanceof Error ? error.message : String(error),
          accountKey
        }, '❌ ERROR CRÍTICO: No se pudo resolver tenant');
        return reply.code(500).send({ 
          error: 'Database error',
          details: error instanceof Error ? error.message : 'Could not resolve tenant. Check database connection.'
        });
      }
      
      // Validar payload
      let validated;
      try {
        validated = WhatsAppWebhookSchema.parse(body);
        logger.info('✅ Payload validated');
      } catch (validationError) {
        logger.error({ 
          error: validationError instanceof Error ? validationError.message : String(validationError)
        }, '❌ Payload validation failed');
        return reply.code(400).send({ 
          error: 'Invalid payload format',
          details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
        });
      }

      // Idempotency check (opcional si event_logs existe)
      const idempotencyKey = generateIdempotencyKey('builderbot_whatsapp', validated);
      let existingEvent = null;
      
      try {
        existingEvent = await prisma.eventLog.findUnique({
          where: { idempotencyKey }
        });

        if (existingEvent && existingEvent.status === 'processed') {
          return reply.code(200).send({ status: 'already_processed', eventId: existingEvent.id });
        }

        // Log event
        eventLog = await prisma.eventLog.upsert({
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
      } catch (eventLogError: any) {
        // Si la tabla event_logs no existe, continuar sin logging de eventos
        if (eventLogError?.message?.includes('does not exist') || eventLogError?.message?.includes('event_logs')) {
          logger.warn('⚠️ Tabla event_logs no existe, continuando sin logging de eventos. Ejecuta: pnpm --filter @customer-service/db db:push');
          eventLog = null; // No hay eventLog, pero continuamos
        } else {
          throw eventLogError; // Otro error, re-lanzar
        }
      }

      try {
        const data = validated.data;
        const fromPhone = data.from;
        const message = data.message || {};
        
        // Determinar tipo de evento
        const eventName = (validated as any).eventName || validated.event || '';
        const isOutgoing = eventName.includes('outgoing') || eventName.includes('sent') || eventName === 'message.sent';
        
        // Extraer texto del mensaje - Builderbot envía formatos diferentes según el evento
        let messageText: string;
        
        // Para mensajes OUTGOING: Builderbot usa data.answer
        if (isOutgoing) {
          if (typeof (data as any).answer === 'string' && (data as any).answer) {
            messageText = (data as any).answer;
          } else if (typeof (data as any).body === 'string' && (data as any).body) {
            messageText = (data as any).body;
          } else {
            messageText = '(sin texto)';
          }
        }
        // Para mensajes INCOMING: Builderbot usa data.body
        else {
          // Formato Builderbot: data.body (mensajes entrantes)
          if (typeof (data as any).body === 'string' && (data as any).body) {
            messageText = (data as any).body;
          }
          // Formato estándar: data.message.text o data.message.body
          else if (typeof message.text === 'string' && message.text) {
            messageText = message.text;
          } else if (typeof message.body === 'string' && message.body) {
            messageText = message.body;
          }
          // Fallback: data.answer (por si acaso)
          else if (typeof (data as any).answer === 'string' && (data as any).answer) {
            messageText = (data as any).answer;
          }
          // Último recurso
          else if (typeof message === 'string' && message) {
            messageText = message;
          } else {
            messageText = '(sin texto)';
          }
        }
        
        logger.info({ 
          eventName,
          isOutgoing,
          fromPhone, 
          messageText: messageText.substring(0, 100),
          dataKeys: Object.keys(data),
          messageKeys: message ? Object.keys(message) : [],
          hasDataBody: !!(data as any).body,
          hasDataAnswer: !!(data as any).answer,
          hasMessageText: !!message.text,
          hasMessageBody: !!message.body
        }, 'Processing WhatsApp message');

        // Get or create customer
        const customer = await getOrCreateCustomer(tenantId, fromPhone);
        logger.info({ customerId: customer.id, phoneNumber: fromPhone }, '✅ Customer resolved');

        // Get or create conversation
        const conversation = await getOrCreateConversation(
          tenantId,
          customer.id,
          'WHATSAPP'
        );
        logger.info({ conversationId: conversation.id }, '✅ Conversation resolved');

        // Determinar dirección del mensaje (eventName e isOutgoing ya están definidos arriba)
        const direction = isOutgoing ? 'OUTBOUND' : 'INBOUND';
        
        logger.info({ 
          eventName, 
          direction, 
          isOutgoing,
          messageText: messageText.substring(0, 50)
        }, 'Determining message direction');

        // Create message
        const dbMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            channel: 'WHATSAPP',
            direction,
            text: messageText,
            rawPayload: JSON.parse(JSON.stringify(validated))
          }
        });
        logger.info({ messageId: dbMessage.id, direction }, '✅ Message created in database');

        // Solo hacer triage si el mensaje tiene texto (no es solo metadata)
        // Ignorar mensajes "outgoing" que son respuestas automáticas
        // (eventName e isOutgoing ya están definidos arriba)
        
        // Get tenant settings
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const settings = (tenant?.settings as Record<string, unknown>) || {};
        const aiMode = (settings.aiMode as string) || 'ASSISTED';
        const autopilotCategories = (settings.autopilotCategories as string[]) || [];

        // Call triage DIRECTLY (solo para mensajes entrantes, no salientes)
        let triageResult;
        if (!isOutgoing && messageText !== '(sin texto)') {
          try {
            triageResult = await performTriage(
              conversation.id,
              dbMessage.id,
              'whatsapp'
            );
            logger.info({ intent: triageResult.intent, confidence: triageResult.confidence }, '✅ Triage completed');
          } catch (triageError) {
            logger.warn({ error: triageError }, 'Triage failed, using fallback');
            // Fallback simple
            const messageTextLower = messageText.toLowerCase();
            let intent = 'otro';
            let confidence = 0.5;

            if (messageTextLower.includes('seguimiento') || messageTextLower.includes('tracking') || messageTextLower.includes('pedido')) {
              intent = 'tracking';
              confidence = 0.8;
            } else if (messageTextLower.includes('factura') || messageTextLower.includes('deuda') || messageTextLower.includes('pago')) {
              intent = 'facturacion';
              confidence = 0.8;
            } else if (messageTextLower.includes('reclamo') || messageTextLower.includes('problema') || messageTextLower.includes('dañado')) {
              intent = 'reclamo';
              confidence = 0.9;
            }

            triageResult = {
              intent,
              confidence,
              suggestedReply: 'Gracias por contactarnos. Estamos procesando tu consulta.',
              autopilotEligible: false,
              suggestedActions: [],
              missingFields: []
            };
          }
        } else {
          // Para mensajes salientes, crear triage básico
          logger.info('Mensaje saliente detectado, saltando triage');
          triageResult = {
            intent: 'otro',
            confidence: 0.5,
            suggestedReply: '',
            autopilotEligible: false,
            suggestedActions: [],
            missingFields: []
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

            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { status: 'PENDING' }
            });
          }
        }

        // Mark event as processed (si eventLog existe)
        if (eventLog) {
          try {
            await prisma.eventLog.update({
              where: { id: eventLog.id },
              data: { status: 'processed', processedAt: new Date() }
            });
          } catch (error) {
            // Si falla, no es crítico, el mensaje ya se procesó
            logger.warn({ error }, 'No se pudo actualizar eventLog, pero el mensaje se procesó correctamente');
          }
        }

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
        logger.error({ 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          tenantId,
          processingTime: Date.now() - startTime
        }, '❌ Error processing message');
        
        if (eventLog) {
          try {
            await prisma.eventLog.update({
              where: { id: eventLog.id },
              data: {
                status: 'failed',
                error: errorMessage
              }
            });
          } catch (updateError) {
            // Si falla actualizar eventLog, no es crítico
            logger.warn({ error: updateError }, 'No se pudo actualizar eventLog con error');
          }
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

      // Idempotency (opcional si event_logs existe)
      const idempotencyKey = generateIdempotencyKey('elevenlabs_post_call', validated);
      let existingEvent = null;
      let eventLog: any = null;
      
      try {
        existingEvent = await prisma.eventLog.findUnique({
          where: { idempotencyKey }
        });

        if (existingEvent && existingEvent.status === 'processed') {
          return reply.code(200).send({ status: 'already_processed', eventId: existingEvent.id });
        }

        eventLog = await prisma.eventLog.upsert({
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
      } catch (eventLogError: any) {
        // Si la tabla event_logs no existe, continuar sin logging de eventos
        if (eventLogError?.message?.includes('does not exist') || eventLogError?.message?.includes('event_logs')) {
          logger.warn('⚠️ Tabla event_logs no existe, continuando sin logging de eventos');
          eventLog = null;
        } else {
          throw eventLogError;
        }
      }

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

        if (eventLog) {
          try {
            await prisma.eventLog.update({
              where: { id: eventLog.id },
              data: { status: 'processed', processedAt: new Date() }
            });
          } catch (error) {
            logger.warn({ error }, 'No se pudo actualizar eventLog, pero el call se procesó correctamente');
          }
        }

        return reply.code(200).send({ status: 'processed', callSessionId: callSession.id });
      } catch (error) {
        if (eventLog) {
          try {
            await prisma.eventLog.update({
              where: { id: eventLog.id },
              data: {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            });
          } catch (updateError) {
            logger.warn({ error: updateError }, 'No se pudo actualizar eventLog con error');
          }
        }
        throw error;
      }
    } catch (error) {
      logger.error(error, 'Error processing ElevenLabs webhook');
      return reply.code(400).send({ error: 'Invalid payload' });
    }
  });

  // Ping endpoint
  fastify.get('/__ping', async () => {
    return { ok: true, service: 'api', ts: Date.now() };
  });

  // Debug endpoints
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

  fastify.get('/debug/events', async (request, reply) => {
    try {
      const { limit = '20' } = request.query as { limit?: string };
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
      
      // Verificar si la tabla existe antes de consultar
      try {
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
      } catch (dbError: any) {
        // Si la tabla no existe, devolver mensaje útil
        if (dbError?.message?.includes('does not exist') || dbError?.message?.includes('event_logs')) {
          return {
            error: 'Table event_logs does not exist',
            message: 'Please run: pnpm --filter @customer-service/db db:push',
            events: [],
            stats: {
              total: 0,
              processed: 0,
              pending: 0,
              failed: 0
            }
          };
        }
        throw dbError;
      }
    } catch (error) {
      logger.error({ error }, 'Debug events error');
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============================================
  // END WEBHOOKS
  // ============================================

  // Conversations
  fastify.get('/conversations', async (request, reply) => {
    try {
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
    } catch (error) {
      logger.error({ error, userId: (request.user as AuthUser)?.userId }, 'Error loading conversations');
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  fastify.get('/conversations/:id', async (request, reply) => {
    try {
      const user = request.user as AuthUser;
      const { id } = request.params as { id: string };

      logger.info({ conversationId: id, userId: user.userId }, 'Loading conversation');

      // Incluir solo las relaciones que existen en la DB
      // callSessions y shipments pueden no existir aún
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
          }
          // callSessions y shipments removidos temporalmente hasta que las tablas existan
          // callSessions: { orderBy: { startedAt: 'desc' } },
          // shipments: { include: { events: { orderBy: { occurredAt: 'desc' } } } }
        }
      });

      if (!conversation) {
        logger.warn({ conversationId: id, userId: user.userId }, 'Conversation not found');
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      if (conversation.tenantId !== user.tenantId) {
        logger.warn({ conversationId: id, userId: user.userId, conversationTenantId: conversation.tenantId, userTenantId: user.tenantId }, 'Conversation tenant mismatch');
        return reply.code(404).send({ error: 'Conversation not found' });
      }

      logger.info({ conversationId: id, messagesCount: conversation.messages.length }, 'Conversation loaded successfully');
      return conversation;
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        conversationId: (request.params as { id: string })?.id,
        userId: (request.user as AuthUser)?.userId
      }, 'Error loading conversation');
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Messages
  fastify.post('/conversations/:id/messages', async (request, reply) => {
    try {
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
          const botId = process.env.BUILDERBOT_BOT_ID;
          if (!botId || botId === '') {
            logger.error('BUILDERBOT_BOT_ID no está configurado');
            return reply.code(500).send({ 
              error: 'Failed to send message via WhatsApp',
              details: 'BUILDERBOT_BOT_ID no está configurado'
            });
          }

          logger.info({ 
            botId: botId.substring(0, 20) + '...', 
            phoneNumber: conversation.customer.phoneNumber 
          }, 'Enviando mensaje via Builderbot');

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

          if (result.success) {
            builderbotMessageId = result.messageId;
            logger.info({ messageId: result.messageId, phoneNumber: conversation.customer.phoneNumber }, '✅ Message sent via Builderbot');
            // NO retornar error si el mensaje se envió exitosamente, aunque no tenga messageId
          } else {
            // Solo retornar error si realmente falló
            logger.warn({ 
              error: result.error,
              phoneNumber: conversation.customer.phoneNumber
            }, '⚠️ Builderbot devolvió success=false, pero continuamos');
            // No retornar error aquí - permitir que se guarde el mensaje en DB
          }
        } catch (error) {
          logger.error({ error, phoneNumber: conversation.customer.phoneNumber }, 'Error sending message via Builderbot');
          // No retornar error aquí - permitir que se guarde el mensaje en DB aunque falle el envío
        }
      }

      // Guardar mensaje en DB (siempre, aunque falle el envío por Builderbot)
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

      return reply.code(200).send(message);
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'Error en POST /conversations/:id/messages');
      return reply.code(500).send({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
    return { status: 'ok', service: 'api', unified: true };
  });

  // Debug endpoint - test password hash
  fastify.post('/debug/test-password', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };
      
      const user = await prisma.user.findFirst({
        where: { email },
        select: { id: true, email: true, password: true, active: true }
      });

      if (!user) {
        return { found: false, message: 'User not found' };
      }

      const valid = await bcrypt.compare(password, user.password);
      const testHash = await bcrypt.hash(password, 10);
      
      return {
        found: true,
        userActive: user.active,
        passwordValid: valid,
        passwordHashLength: user.password.length,
        passwordHashStart: user.password.substring(0, 30),
        testHashStart: testHash.substring(0, 30),
        hashesMatch: user.password === testHash
      };
    } catch (error) {
      logger.error({ error }, 'Debug test password error');
      return reply.code(500).send({ error: 'Internal server error' });
    }
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
    logger.info(`🚀 API (unified with webhooks) listening on ${host}:${port}`);
    console.log(`🚀 API (unified with webhooks) listening on ${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Only start if this is the main module
if (require.main === module) {
  start();
}
// FORZAR DEPLOY - 20260107-184408
