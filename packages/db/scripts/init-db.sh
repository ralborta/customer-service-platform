#!/bin/bash
# Script para inicializar la base de datos en Railway
# Se ejecuta automáticamente durante el build

set -e

echo "🔄 Inicializando base de datos..."

# Ejecutar prisma db push para crear/actualizar tablas
echo "📦 Creando/actualizando tablas..."
pnpm --filter @customer-service/db db:push || {
  echo "⚠️  Error en db:push, continuando..."
  exit 0
}

# Verificar si hay datos (para evitar seed duplicado)
TENANT_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.tenant.count().then(count => {
    console.log(count);
    prisma.\$disconnect();
  });
" 2>/dev/null || echo "0")

if [ "$TENANT_COUNT" = "0" ]; then
  echo "🌱 Ejecutando seed (primera vez)..."
  pnpm --filter @customer-service/db db:seed || {
    echo "⚠️  Error en seed, continuando..."
  }
else
  echo "✅ Base de datos ya tiene datos ($TENANT_COUNT tenants)"
fi

echo "✅ Base de datos inicializada"
