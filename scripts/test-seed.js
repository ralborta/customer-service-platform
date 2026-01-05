// Script simple para verificar que el seed funciona
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('🔍 Verificando seed...\n');
    
    // 1. Verificar tenant demo
    const demo = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
    console.log('1️⃣ Tenant demo:', demo ? '✅ Existe' : '❌ NO existe');
    if (!demo) {
      console.log('   ⚠️  El tenant demo no existe. Ejecuta el seed primero.');
      process.exit(1);
    }
    
    // 2. Verificar usuario
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: demo.id,
          email: 'agent@demo.com'
        }
      }
    });
    
    console.log('2️⃣ Usuario agent@demo.com:', user ? '✅ Existe' : '❌ NO existe');
    if (!user) {
      console.log('   ⚠️  El usuario no existe. Ejecuta el seed primero.');
      process.exit(1);
    }
    
    // 3. Verificar password
    const passwordValid = await bcrypt.compare('admin123', user.password);
    console.log('3️⃣ Password admin123:', passwordValid ? '✅ Válido' : '❌ NO válido');
    
    if (!passwordValid) {
      console.log('   ⚠️  El password no coincide. Regenerando...');
      const newHash = await bcrypt.hash('admin123', 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
      });
      console.log('   ✅ Password actualizado');
      
      // Verificar de nuevo
      const newPasswordValid = await bcrypt.compare('admin123', newHash);
      console.log('   Verificación:', newPasswordValid ? '✅ OK' : '❌ ERROR');
    }
    
    console.log('\n✅ Todo está correcto!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Tenant: ${demo.slug}`);
    console.log(`   Activo: ${user.active}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
