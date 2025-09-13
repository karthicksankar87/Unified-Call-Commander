#!/usr/bin/env ts-node

import RedisRoutingService from '../services/redisRouting';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redisRouting = new RedisRoutingService();

async function initializeRedisData() {
  try {
    console.log('Initializing Redis data for routing...\n');
    
    // Initialize staff availability
    await redisRouting.initializeStaffAvailability();
    
    // Cache location staff data
    const locations = await prisma.location.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`Caching staff data for ${locations.length} locations...`);
    
    for (const location of locations) {
      await redisRouting.cacheLocationStaff(location.id);
      console.log(`✅ Cached staff for location: ${location.name}`);
    }
    
    console.log('\n🎉 Redis initialization complete!');
    console.log('Your routing system is now ready with:');
    console.log('- Staff availability tracking');
    console.log('- Location-based staff caching');
    console.log('- Load balancing capabilities');
    console.log('- Real-time routing metrics');
    
  } catch (error) {
    console.error('Error initializing Redis:', error);
  } finally {
    await redisRouting.disconnect();
    await prisma.$disconnect();
  }
}

initializeRedisData();
