#!/usr/bin/env node
/**
 * Script para probar el login y diagnosticar problemas
 * Uso: node scripts/test-login.js [API_URL]
 */

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3000';

console.log('🧪 Testing Login Endpoint\n');
console.log(`📍 API URL: ${API_URL}\n`);

async function test() {
  try {
    // 1. Test health endpoint
    console.log('1️⃣ Testing /health...');
    const healthRes = await fetch(`${API_URL}/health`);
    const health = await healthRes.json();
    console.log(`   ✅ Health: ${JSON.stringify(health)}\n`);

    // 2. Test debug/users endpoint
    console.log('2️⃣ Testing /debug/users...');
    const usersRes = await fetch(`${API_URL}/debug/users`);
    if (!usersRes.ok) {
      console.log(`   ❌ Error: ${usersRes.status} ${usersRes.statusText}`);
      const errorText = await usersRes.text();
      console.log(`   Response: ${errorText}\n`);
    } else {
      const users = await usersRes.json();
      console.log(`   ✅ Found ${users.count} users`);
      if (users.users && users.users.length > 0) {
        users.users.forEach(u => {
          console.log(`      - ${u.email} (${u.name}) - Active: ${u.active} - Tenant: ${u.tenant?.slug || 'N/A'}`);
        });
      } else {
        console.log('   ⚠️  No users found! Seed may not have run.\n');
      }
      console.log('');
    }

    // 3. Test debug/test-password endpoint
    console.log('3️⃣ Testing /debug/test-password...');
    const testPasswordRes = await fetch(`${API_URL}/debug/test-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'agent@demo.com',
        password: 'admin123'
      })
    });
    
    if (!testPasswordRes.ok) {
      console.log(`   ❌ Error: ${testPasswordRes.status} ${testPasswordRes.statusText}`);
      const errorText = await testPasswordRes.text();
      console.log(`   Response: ${errorText}\n`);
    } else {
      const testResult = await testPasswordRes.json();
      console.log(`   ✅ Test result:`);
      console.log(`      - User found: ${testResult.found}`);
      if (testResult.found) {
        console.log(`      - User active: ${testResult.userActive}`);
        console.log(`      - Password valid: ${testResult.passwordValid}`);
        console.log(`      - Password hash length: ${testResult.passwordHashLength}`);
        if (!testResult.passwordValid) {
          console.log(`   ❌ PASSWORD DOES NOT MATCH!`);
          console.log(`      - Hash in DB: ${testResult.passwordHashStart}...`);
          console.log(`      - Test hash: ${testResult.testHashStart}...`);
        }
      }
      console.log('');
    }

    // 4. Test actual login
    console.log('4️⃣ Testing /auth/login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'agent@demo.com',
        password: 'admin123'
      })
    });

    const loginData = await loginRes.json();
    
    if (loginRes.ok) {
      console.log(`   ✅ Login successful!`);
      console.log(`      - Token: ${loginData.token ? loginData.token.substring(0, 20) + '...' : 'N/A'}`);
      console.log(`      - User: ${loginData.user?.email || 'N/A'}`);
    } else {
      console.log(`   ❌ Login failed: ${loginRes.status} ${loginRes.statusText}`);
      console.log(`      - Error: ${loginData.error || JSON.stringify(loginData)}`);
    }
    console.log('');

    // Summary
    console.log('📊 Summary:');
    console.log(`   - API accessible: ✅`);
    console.log(`   - Users endpoint: ${usersRes.ok ? '✅' : '❌'}`);
    console.log(`   - Password test: ${testPasswordRes.ok && testResult?.passwordValid ? '✅' : '❌'}`);
    console.log(`   - Login works: ${loginRes.ok ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('fetch')) {
      console.error('💡 Cannot connect to API. Check:');
      console.error('   1. API_URL is correct');
      console.error('   2. API is running');
      console.error('   3. CORS is configured');
    }
    process.exit(1);
  }
}

test();
