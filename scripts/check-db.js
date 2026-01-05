#!/usr/bin/env node
/**
 * Script para verificar el estado de la base de datos
 * Uso: node scripts/check-db.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Verificando estado de la base de datos...\n');

  try {
    // 1. Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos: OK\n');

    // 2. Verificar tablas
    const tables = [
      'tenants',
      'users',
      'customers',
      'conversations',
      'messages',
      'tickets',
      'channel_accounts',
      'event_logs'
    ];

    console.log('📊 Estado de las tablas:');
    for (const table of tables) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
        const num = parseInt(count[0]?.count || '0', 10);
        const status = num > 0 ? '✅' : '⚠️';
        console.log(`  ${status} ${table}: ${num} registros`);
      } catch (error) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`);
      }
    }

    console.log('\n📨 Mensajes recientes:');
    try {
      const recentMessages = await prisma.message.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          conversation: {
            include: {
              customer: true
            }
          }
        }
      });

      if (recentMessages.length === 0) {
        console.log('  ⚠️ No hay mensajes en la base de datos');
      } else {
        recentMessages.forEach((msg, idx) => {
          console.log(`  ${idx + 1}. [${msg.direction}] ${msg.text?.substring(0, 50)}...`);
          console.log(`     Cliente: ${msg.conversation?.customer?.phoneNumber || 'N/A'}`);
          console.log(`     Fecha: ${msg.createdAt}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error al obtener mensajes: ${error.message}`);
    }

    console.log('\n💬 Conversaciones recientes:');
    try {
      const recentConversations = await prisma.conversation.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: true,
          _count: {
            select: { messages: true }
          }
        }
      });

      if (recentConversations.length === 0) {
        console.log('  ⚠️ No hay conversaciones en la base de datos');
      } else {
        recentConversations.forEach((conv, idx) => {
          console.log(`  ${idx + 1}. ${conv.customer?.phoneNumber || 'N/A'} - ${conv.status}`);
          console.log(`     Mensajes: ${conv._count.messages} | Canal: ${conv.primaryChannel}`);
          console.log(`     Última actualización: ${conv.updatedAt}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error al obtener conversaciones: ${error.message}`);
    }

    console.log('\n🏢 Tenants:');
    try {
      const tenants = await prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              users: true,
              conversations: true
            }
          }
        }
      });

      if (tenants.length === 0) {
        console.log('  ❌ NO HAY TENANTS - El seed no se ejecutó correctamente');
        console.log('  💡 Solución: Configura DB_INIT=true en el servicio API y reinicia');
      } else {
        tenants.forEach((tenant) => {
          console.log(`  ✅ ${tenant.name} (${tenant.slug})`);
          console.log(`     Usuarios: ${tenant._count.users} | Conversaciones: ${tenant._count.conversations}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error al obtener tenants: ${error.message}`);
    }

    console.log('\n🔗 Channel Accounts:');
    try {
      const accounts = await prisma.channelAccount.findMany({
        include: {
          tenant: true
        }
      });

      if (accounts.length === 0) {
        console.log('  ⚠️ No hay Channel Accounts configurados');
        console.log('  💡 El sistema creará uno automáticamente cuando llegue el primer webhook');
      } else {
        accounts.forEach((account) => {
          console.log(`  ✅ ${account.accountKey} → ${account.tenant.name}`);
          console.log(`     Canal: ${account.channel} | Activo: ${account.active}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Error al obtener channel accounts: ${error.message}`);
    }

    console.log('\n📋 Event Logs (últimos 5):');
    try {
      const events = await prisma.eventLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: {
          source: 'builderbot_whatsapp'
        }
      });

      if (events.length === 0) {
        console.log('  ⚠️ No hay eventos de webhooks registrados');
        console.log('  💡 Esto significa que ningún webhook ha llegado al sistema');
      } else {
        events.forEach((event, idx) => {
          console.log(`  ${idx + 1}. [${event.status}] ${event.type}`);
          console.log(`     Fecha: ${event.createdAt}`);
          if (event.error) {
            console.log(`     ❌ Error: ${event.error}`);
          }
        });
      }
    } catch (error) {
      console.log(`  ❌ Error al obtener eventos: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('\n💡 Verifica que:');
    console.error('   1. DATABASE_URL esté configurado correctamente');
    console.error('   2. La base de datos esté accesible');
    console.error('   3. Las tablas existan (ejecuta DB_INIT=true en el API)');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
