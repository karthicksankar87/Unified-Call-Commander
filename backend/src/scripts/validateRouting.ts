#!/usr/bin/env ts-node

import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

async function validateRoutingSetup(): Promise<void> {
  try {
    console.log('🔍 REDIS ROUTING VALIDATION');
    console.log('=' .repeat(50));
    
    // Test 1: Redis Connection
    console.log('\n1️⃣ Testing Redis Connection...');
    await redisClient.connect();
    await redisClient.ping();
    console.log('   ✅ Redis connected successfully');
    
    // Test 2: Staff Availability Data
    console.log('\n2️⃣ Checking Staff Availability Data...');
    const users = await prisma.user.findMany({ select: { id: true, name: true } });
    
    for (const user of users) {
      const availability = await redisClient.get(`user:${user.id}:availability`);
      const load = await redisClient.get(`user:${user.id}:load`);
      
      console.log(`   👤 ${user.name}:`);
      console.log(`      Available: ${availability === '1' ? '✅ Yes' : '❌ No'}`);
      console.log(`      Load: ${load || '0'} calls`);
    }
    
    // Test 3: Location Staff Cache
    console.log('\n3️⃣ Checking Location Staff Cache...');
    const locations = await prisma.location.findMany();
    
    for (const location of locations) {
      const staffKey = `location:${location.id}:staff`;
      const cachedStaff = await redisClient.get(staffKey);
      
      if (cachedStaff) {
        const staff = JSON.parse(cachedStaff);
        console.log(`   📍 ${location.name}: ${staff.length} staff members cached`);
      } else {
        console.log(`   📍 ${location.name}: ❌ No cached data`);
      }
    }
    
    // Test 4: Routing Metrics
    console.log('\n4️⃣ Checking Routing Metrics...');
    const today = new Date().toISOString().split('T')[0];
    
    for (const location of locations) {
      const metricsKey = `metrics:routing:${location.id}:${today}`;
      const metrics = await redisClient.hGetAll(metricsKey);
      
      if (Object.keys(metrics).length > 0) {
        console.log(`   📊 ${location.name}: ${Object.keys(metrics).length} metrics tracked`);
      } else {
        console.log(`   📊 ${location.name}: No metrics yet (normal for new setup)`);
      }
    }
    
    // Test 5: Database Call Status
    console.log('\n5️⃣ Checking Call Status Distribution...');
    const statusCounts = await prisma.call.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    statusCounts.forEach(({ status, _count }) => {
      console.log(`   📞 ${status}: ${_count.status} calls`);
    });
    
    console.log('\n🎉 Validation Complete!');
    console.log('\nYour Redis routing system is ready. Run the test producer to see it in action:');
    console.log('   ts-node src/test/routingTestProducer.ts');
    console.log('\nOr start the monitoring dashboard:');
    console.log('   ts-node src/scripts/monitorRouting.ts');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await redisClient.disconnect();
    await prisma.$disconnect();
  }
}

validateRoutingSetup();
