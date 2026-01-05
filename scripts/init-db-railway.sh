#!/bin/bash
# Script para inicializar la DB en Railway
# Se ejecuta en el startCommand antes de iniciar el servidor

set -e

echo "🔄 Inicializando base de datos..."

# Ir al directorio de DB
cd packages/db || exit 1

# Crear/actualizar tablas
echo "📦 Creando/actualizando tablas..."
npx prisma db push --accept-data-loss || {
  echo "⚠️  Error en db:push, pero continuando..."
}

# Verificar si hay tenants
# Esperar un poco para que Prisma Client esté listo
sleep 2

TENANT_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.tenant.count()
    .then(count => {
      console.log(count);
      prisma.\$disconnect();
    })
    .catch((err) => {
      console.error('Error counting tenants:', err.message);
      console.log('0');
      process.exit(0);
    });
" 2>/dev/null || echo "0")

if [ "$TENANT_COUNT" = "0" ]; then
  echo "🌱 Ejecutando seed (primera vez)..."
  npx tsx prisma/seed.ts || {
    echo "⚠️  Error en seed, pero continuando..."
  }
  
  # Verificar que el seed funcionó
  sleep 2
  NEW_TENANT_COUNT=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.tenant.count()
      .then(count => {
        console.log(count);
        prisma.\$disconnect();
      })
      .catch(() => {
        console.log('0');
        process.exit(0);
      });
  " 2>/dev/null || echo "0")
  
  if [ "$NEW_TENANT_COUNT" = "0" ]; then
    echo "❌ El seed no creó tenants. Revisa los logs anteriores."
  else
    echo "✅ Seed completado. Tenants creados: $NEW_TENANT_COUNT"
  fi
else
  echo "✅ Base de datos ya tiene datos ($TENANT_COUNT tenants)"
  
  # Verificar que el usuario de demo existe
  DEMO_USER_EXISTS=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.findFirst({ where: { email: 'agent@demo.com' } })
      .then(user => {
        console.log(user ? '1' : '0');
        prisma.\$disconnect();
      })
      .catch(() => {
        console.log('0');
        process.exit(0);
      });
  " 2>/dev/null || echo "0")
  
  if [ "$DEMO_USER_EXISTS" = "0" ]; then
    echo "⚠️  Usuario 'agent@demo.com' no existe. Ejecutando seed..."
    npx tsx prisma/seed.ts || {
      echo "⚠️  Error en seed, pero continuando..."
    }
  else
    echo "✅ Usuario 'agent@demo.com' existe"
  fi
fi

echo "✅ Base de datos inicializada"
cd ../../apps/api || exit 1
