"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Create admin tenant
    const adminTenant = await prisma.tenant.upsert({
        where: { slug: 'admin' },
        update: {},
        create: {
            name: 'Admin Tenant',
            slug: 'admin',
            settings: {
                aiMode: 'ASSISTED',
                autopilotCategories: ['INFO', 'TRACKING'],
                confidenceThreshold: 0.7,
                autopilotCallFollowup: false
            }
        }
    });
    // Create demo tenant
    const demoTenant = await prisma.tenant.upsert({
        where: { slug: 'demo' },
        update: {},
        create: {
            name: 'Demo Tenant',
            slug: 'demo',
            settings: {
                aiMode: 'ASSISTED',
                autopilotCategories: ['INFO', 'TRACKING'],
                confidenceThreshold: 0.7,
                autopilotCallFollowup: true
            }
        }
    });
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: adminTenant.id, email: 'admin@example.com' } },
        update: {},
        create: {
            tenantId: adminTenant.id,
            email: 'admin@example.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'admin',
            active: true
        }
    });
    // Create demo agent
    const demoAgent = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: demoTenant.id, email: 'agent@demo.com' } },
        update: {},
        create: {
            tenantId: demoTenant.id,
            email: 'agent@demo.com',
            name: 'Demo Agent',
            password: hashedPassword,
            role: 'agent',
            active: true
        }
    });
    // Create channel accounts
    const builderbotAccount = await prisma.channelAccount.upsert({
        where: { tenantId_accountKey: { tenantId: demoTenant.id, accountKey: 'builderbot_whatsapp_main' } },
        update: {},
        create: {
            tenantId: demoTenant.id,
            channel: 'builderbot_whatsapp',
            accountKey: 'builderbot_whatsapp_main',
            active: true,
            config: {
                webhookUrl: 'https://api.example.com/webhooks/builderbot/whatsapp',
                apiKey: 'demo_key'
            }
        }
    });
    const elevenlabsAccount = await prisma.channelAccount.upsert({
        where: { tenantId_accountKey: { tenantId: demoTenant.id, accountKey: 'elevenlabs_calls_main' } },
        update: {},
        create: {
            tenantId: demoTenant.id,
            channel: 'elevenlabs_calls',
            accountKey: 'elevenlabs_calls_main',
            active: true,
            config: {
                webhookUrl: 'https://api.example.com/webhooks/elevenlabs/post-call',
                agentId: 'demo_agent_id'
            }
        }
    });
    // Create customers
    const customer1 = await prisma.customer.create({
        data: {
            tenantId: demoTenant.id,
            phoneNumber: '+5491123456789',
            email: 'cliente1@example.com',
            name: 'Juan Pérez',
            metadata: { city: 'Buenos Aires' }
        }
    });
    const customer2 = await prisma.customer.create({
        data: {
            tenantId: demoTenant.id,
            phoneNumber: '+5491198765432',
            email: 'cliente2@example.com',
            name: 'María González',
            metadata: { city: 'Córdoba' }
        }
    });
    const customer3 = await prisma.customer.create({
        data: {
            tenantId: demoTenant.id,
            phoneNumber: '+5491155555555',
            email: 'cliente3@example.com',
            name: 'Carlos Rodríguez',
            metadata: { city: 'Rosario' }
        }
    });
    // Create contacts
    await prisma.contact.createMany({
        data: [
            {
                customerId: customer1.id,
                type: 'whatsapp',
                value: customer1.phoneNumber,
                isPrimary: true
            },
            {
                customerId: customer2.id,
                type: 'whatsapp',
                value: customer2.phoneNumber,
                isPrimary: true
            },
            {
                customerId: customer3.id,
                type: 'whatsapp',
                value: customer3.phoneNumber,
                isPrimary: true
            }
        ]
    });
    // Conversation 1: Tracking (sin guía -> demo mode)
    const conv1 = await prisma.conversation.create({
        data: {
            tenantId: demoTenant.id,
            customerId: customer1.id,
            primaryChannel: 'WHATSAPP',
            status: 'OPEN',
            priority: 'MEDIUM',
            tags: ['tracking']
        }
    });
    await prisma.message.createMany({
        data: [
            {
                conversationId: conv1.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                text: 'Hola, quiero saber dónde está mi pedido',
                rawPayload: { from: customer1.phoneNumber, timestamp: new Date() },
                createdAt: new Date(Date.now() - 3600000) // 1 hour ago
            },
            {
                conversationId: conv1.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                text: 'El número de seguimiento es ABC123456',
                rawPayload: { from: customer1.phoneNumber, timestamp: new Date() },
                createdAt: new Date(Date.now() - 3300000) // 55 min ago
            }
        ]
    });
    const ticket1 = await prisma.ticket.create({
        data: {
            tenantId: demoTenant.id,
            conversationId: conv1.id,
            number: `TKT-${Date.now()}-001`,
            status: 'IN_PROGRESS',
            category: 'TRACKING',
            priority: 'MEDIUM',
            title: 'Consulta de seguimiento - ABC123456',
            assignedToId: demoAgent.id,
            createdById: demoAgent.id
        }
    });
    await prisma.shipment.create({
        data: {
            tenantId: demoTenant.id,
            conversationId: conv1.id,
            trackingNumber: 'ABC123456',
            carrier: 'Demo Carrier',
            status: 'in_transit',
            metadata: { demo: true }
        }
    });
    // Conversation 2: Facturación (consulta de deuda)
    const conv2 = await prisma.conversation.create({
        data: {
            tenantId: demoTenant.id,
            customerId: customer2.id,
            primaryChannel: 'WHATSAPP',
            status: 'OPEN',
            priority: 'MEDIUM',
            tags: ['facturacion']
        }
    });
    await prisma.message.createMany({
        data: [
            {
                conversationId: conv2.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                text: 'Buenos días, tengo una consulta sobre mi factura',
                rawPayload: { from: customer2.phoneNumber, timestamp: new Date() },
                createdAt: new Date(Date.now() - 7200000) // 2 hours ago
            },
            {
                conversationId: conv2.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                text: 'Quiero saber cuánto debo y cuándo vence',
                rawPayload: { from: customer2.phoneNumber, timestamp: new Date() },
                createdAt: new Date(Date.now() - 6900000) // 1h 55min ago
            }
        ]
    });
    const ticket2 = await prisma.ticket.create({
        data: {
            tenantId: demoTenant.id,
            conversationId: conv2.id,
            number: `TKT-${Date.now()}-002`,
            status: 'NEW',
            category: 'FACTURACION',
            priority: 'MEDIUM',
            title: 'Consulta de deuda pendiente',
            assignedToId: demoAgent.id,
            createdById: demoAgent.id
        }
    });
    await prisma.invoice.create({
        data: {
            tenantId: demoTenant.id,
            customerId: customer2.id,
            number: 'INV-2024-001',
            amount: 1500.00,
            currency: 'USD',
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
    });
    // Conversation 3: Reclamo (producto/servicio)
    const conv3 = await prisma.conversation.create({
        data: {
            tenantId: demoTenant.id,
            customerId: customer3.id,
            primaryChannel: 'WHATSAPP',
            status: 'OPEN',
            priority: 'HIGH',
            tags: ['reclamo']
        }
    });
    await prisma.message.createMany({
        data: [
            {
                conversationId: conv3.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                text: 'Tengo un problema con el producto que recibí',
                rawPayload: { from: customer3.phoneNumber, timestamp: new Date() },
                createdAt: new Date(Date.now() - 1800000) // 30 min ago
            },
            {
                conversationId: conv3.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                text: 'Llegó dañado y no funciona correctamente',
                rawPayload: { from: customer3.phoneNumber, timestamp: new Date() },
                createdAt: new Date(Date.now() - 1500000) // 25 min ago
            },
            {
                conversationId: conv3.id,
                channel: 'WHATSAPP',
                direction: 'INBOUND',
                text: 'Necesito un reembolso o un reemplazo urgente',
                rawPayload: { from: customer3.phoneNumber, timestamp: new Date() },
                createdAt: new Date(Date.now() - 1200000) // 20 min ago
            }
        ]
    });
    const ticket3 = await prisma.ticket.create({
        data: {
            tenantId: demoTenant.id,
            conversationId: conv3.id,
            number: `TKT-${Date.now()}-003`,
            status: 'IN_PROGRESS',
            category: 'RECLAMO',
            priority: 'HIGH',
            title: 'Producto dañado - Solicitud de reembolso/reemplazo',
            summary: 'Cliente reporta producto dañado al recibir. Solicita reembolso o reemplazo urgente.',
            assignedToId: demoAgent.id,
            createdById: demoAgent.id
        }
    });
    await prisma.ticketEvent.create({
        data: {
            ticketId: ticket3.id,
            type: 'status_change',
            data: { from: 'NEW', to: 'IN_PROGRESS', reason: 'Auto-assigned' }
        }
    });
    // Create some knowledge articles
    await prisma.knowledgeArticle.createMany({
        data: [
            {
                tenantId: demoTenant.id,
                title: 'Cómo rastrear mi pedido',
                content: 'Para rastrear tu pedido, necesitas el número de seguimiento que recibiste por email o SMS. Ingresa el número en nuestra plataforma de tracking o contáctanos por WhatsApp.',
                sourceType: 'manual',
                tags: ['tracking', 'pedidos', 'seguimiento']
            },
            {
                tenantId: demoTenant.id,
                title: 'Política de reembolsos',
                content: 'Ofrecemos reembolsos completos dentro de los 30 días posteriores a la compra si el producto está en su estado original. Para iniciar un reembolso, contacta a nuestro equipo de atención al cliente.',
                sourceType: 'manual',
                tags: ['reembolsos', 'devoluciones', 'política']
            },
            {
                tenantId: demoTenant.id,
                title: 'Consulta de facturación',
                content: 'Puedes consultar tus facturas pendientes desde tu cuenta o contactándonos. Las facturas vencen según el plazo acordado. Para pagos, aceptamos transferencia bancaria y tarjetas de crédito.',
                sourceType: 'manual',
                tags: ['facturación', 'pagos', 'deuda']
            }
        ]
    });
    console.log('✅ Seeding completed!');
    console.log(`   - Tenants: ${adminTenant.slug}, ${demoTenant.slug}`);
    console.log(`   - Users: ${adminUser.email}, ${demoAgent.email}`);
    console.log(`   - Customers: 3`);
    console.log(`   - Conversations: 3`);
    console.log(`   - Tickets: 3`);
    console.log(`   - Knowledge Articles: 3`);
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
