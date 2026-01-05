#!/bin/bash
# Script para diagnosticar y arreglar problemas de login
# Se ejecuta en Railway Shell

set -e

echo "🔍 Diagnóstico de Login"
echo "======================"
echo ""

cd packages/db || exit 1

# 1. Verificar que el usuario existe
echo "1️⃣ Verificando usuarios en la DB..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  where: { email: 'agent@demo.com' },
  include: { tenant: true }
}).then(users => {
  console.log('Usuarios encontrados:', users.length);
  users.forEach(u => {
    console.log('  - Email:', u.email);
    console.log('    ID:', u.id);
    console.log('    Active:', u.active);
    console.log('    Tenant:', u.tenant.name, '(' + u.tenant.slug + ')');
    console.log('    Password hash length:', u.password.length);
    console.log('    Password hash start:', u.password.substring(0, 30) + '...');
  });
  prisma.\$disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
"

echo ""
echo "2️⃣ Verificando tenant 'demo'..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.tenant.findUnique({
  where: { slug: 'demo' }
}).then(tenant => {
  if (tenant) {
    console.log('  ✅ Tenant demo encontrado:');
    console.log('    ID:', tenant.id);
    console.log('    Name:', tenant.name);
    console.log('    Slug:', tenant.slug);
  } else {
    console.log('  ❌ Tenant demo NO encontrado');
  }
  prisma.\$disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
"

echo ""
echo "3️⃣ Probando password hash..."
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({
  where: { email: 'agent@demo.com' }
}).then(async user => {
  if (!user) {
    console.log('  ❌ Usuario no encontrado');
    prisma.\$disconnect();
    return;
  }
  console.log('  Usuario encontrado, probando password...');
  const testPassword = 'admin123';
  const isValid = await bcrypt.compare(testPassword, user.password);
  console.log('  Password válido:', isValid);
  
  if (!isValid) {
    console.log('  ⚠️  El password NO coincide!');
    console.log('  Regenerando hash...');
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('  Nuevo hash:', newHash.substring(0, 30) + '...');
    console.log('  Actualizando usuario...');
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash }
    });
    console.log('  ✅ Password actualizado');
    
    // Verificar de nuevo
    const isValidAfter = await bcrypt.compare(testPassword, user.password);
    console.log('  Verificación después de actualizar:', isValidAfter);
  }
  prisma.\$disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
"

echo ""
echo "✅ Diagnóstico completado"
