#!/usr/bin/env node
// Script para verificar que el usuario existe en la DB
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuarios en la base de datos...\n');

  try {
    // Verificar tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`📊 Tenants encontrados: ${tenants.length}`);
    tenants.forEach(t => {
      console.log(`   - ${t.name} (${t.slug}) - ID: ${t.id}`);
    });

    // Verificar usuarios
    const users = await prisma.user.findMany({
      include: { tenant: true }
    });
    console.log(`\n📊 Usuarios encontrados: ${users.length}`);
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.name}) - Role: ${u.role} - Tenant: ${u.tenant.name} - Active: ${u.active}`);
    });

    // Verificar específicamente el usuario de demo
    const demoUser = await prisma.user.findFirst({
      where: { email: 'agent@demo.com' },
      include: { tenant: true }
    });

    if (demoUser) {
      console.log(`\n✅ Usuario 'agent@demo.com' encontrado:`);
      console.log(`   - ID: ${demoUser.id}`);
      console.log(`   - Name: ${demoUser.name}`);
      console.log(`   - Role: ${demoUser.role}`);
      console.log(`   - Tenant: ${demoUser.tenant.name} (${demoUser.tenant.slug})`);
      console.log(`   - Active: ${demoUser.active}`);
      console.log(`   - Password hash: ${demoUser.password.substring(0, 20)}...`);
    } else {
      console.log(`\n❌ Usuario 'agent@demo.com' NO encontrado`);
      console.log(`💡 Necesitas ejecutar el seed: cd packages/db && npx tsx prisma/seed.ts`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('💡 Las tablas no existen. Ejecuta: cd packages/db && npx prisma db push');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
