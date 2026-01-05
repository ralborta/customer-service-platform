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
TENANT_COUNT=$(node -e "
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

if [ "$TENANT_COUNT" = "0" ]; then
  echo "🌱 Ejecutando seed (primera vez)..."
  npx tsx prisma/seed.ts || {
    echo "⚠️  Error en seed, pero continuando..."
  }
else
  echo "✅ Base de datos ya tiene datos ($TENANT_COUNT tenants)"
fi

echo "✅ Base de datos inicializada"
cd ../../apps/api || exit 1
