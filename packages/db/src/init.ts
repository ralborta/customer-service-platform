import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

/**
 * Inicializa la base de datos: crea tablas y seed si es necesario
 */
export async function initDatabase() {
  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Ejecutar prisma db push para crear/actualizar tablas
    console.log('📦 Creando/actualizando tablas...');
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: join(__dirname, '../..')
    });

    // Verificar si ya hay datos (para no hacer seed duplicado)
    const tenantCount = await prisma.tenant.count();
    
    if (tenantCount === 0) {
      console.log('🌱 Ejecutando seed (primera vez)...');
      execSync('npx tsx prisma/seed.ts', {
        stdio: 'inherit',
        cwd: join(__dirname, '../..')
      });
      console.log('✅ Seed completado');
    } else {
      console.log(`✅ Base de datos ya tiene datos (${tenantCount} tenants)`);
    }

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  initDatabase().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
