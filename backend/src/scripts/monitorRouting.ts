#!/usr/bin/env ts-node

import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

class RoutingMonitor {
  private isMonitoring = false;

  async start(): Promise<void> {
    try {
      await redisClient.connect();
      console.log('🔍 Redis Routing Monitor Started');
      console.log('=' .repeat(60));
      
      this.isMonitoring = true;
      
      // Monitor in real-time
      this.monitorCalls();
      this.monitorStaffLoad();
      this.displayRoutingStats();
      
    } catch (error) {
      console.error('Error starting monitor:', error);
    }
  }

  private async monitorCalls(): Promise<void> {
    console.log('\n📞 CALL MONITORING');
    console.log('-'.repeat(40));
    
    setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        // Get recent calls (last 30 seconds)
        const recentCalls = await prisma.call.findMany({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 30000) // Last 30 seconds
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                location: { select: { name: true } }
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        });

        if (recentCalls.length > 0) {
          console.log(`\n⏰ ${new Date().toLocaleTimeString()} - New Calls:`);
          recentCalls.forEach(call => {
            const location = call.user?.location?.name || 'Unknown';
            const staff = call.user?.name || 'Unassigned';
            const status = call.status === 'active' ? '🟢' : call.status === 'incoming' ? '🟡' : '⚪';
            
            console.log(`  ${status} ${call.callerName} (${call.phoneNumber})`);
            console.log(`     → Routed to: ${staff} at ${location}`);
            console.log(`     → Status: ${call.status}`);
          });
        }
      } catch (error) {
        console.error('Error monitoring calls:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  private async monitorStaffLoad(): Promise<void> {
    console.log('\n👥 STAFF LOAD MONITORING');
    console.log('-'.repeat(40));
    
    setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        const users = await prisma.user.findMany({
          select: { id: true, name: true, location: { select: { name: true } } }
        });

        console.log(`\n📊 ${new Date().toLocaleTimeString()} - Staff Load:`);
        
        for (const user of users) {
          const availability = await redisClient.get(`user:${user.id}:availability`);
          const load = await redisClient.get(`user:${user.id}:load`);
          
          const isAvailable = availability === '1';
          const currentLoad = parseInt(load || '0');
          const status = isAvailable ? '🟢 Available' : '🔴 Unavailable';
          const loadBar = '█'.repeat(currentLoad) + '░'.repeat(Math.max(0, 5 - currentLoad));
          
          console.log(`  ${user.name} (${user.location?.name}): ${status}`);
          console.log(`    Load: [${loadBar}] ${currentLoad}/5 calls`);
        }
      } catch (error) {
        console.error('Error monitoring staff load:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private async displayRoutingStats(): Promise<void> {
    console.log('\n📈 ROUTING STATISTICS');
    console.log('-'.repeat(40));
    
    setInterval(async () => {
      if (!this.isMonitoring) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const locations = await prisma.location.findMany();
        
        console.log(`\n📊 ${new Date().toLocaleTimeString()} - Daily Stats (${today}):`);
        
        for (const location of locations) {
          const metricsKey = `metrics:routing:${location.id}:${today}`;
          const metrics = await redisClient.hGetAll(metricsKey);
          
          if (Object.keys(metrics).length > 0) {
            console.log(`\n  📍 ${location.name}:`);
            console.log(`    ✅ Successful routes: ${metrics.success_count || 0}`);
            console.log(`    ⏳ Queued calls: ${metrics.queued_count || 0}`);
            
            // Show staff distribution
            const staffMetrics = Object.entries(metrics)
              .filter(([key]) => key.startsWith('user_'))
              .map(([key, value]) => ({ userId: key.split('_')[1], count: value }));
            
            if (staffMetrics.length > 0) {
              console.log(`    👥 Staff distribution:`);
              for (const { userId, count } of staffMetrics) {
                const user = await prisma.user.findUnique({
                  where: { id: parseInt(userId) },
                  select: { name: true }
                });
                console.log(`      - ${user?.name || 'Unknown'}: ${count} calls`);
              }
            }
          }
        }
        
        // Overall system stats
        const totalCalls = await prisma.call.count({
          where: {
            timestamp: {
              gte: new Date(today + 'T00:00:00.000Z')
            }
          }
        });
        
        const activeCalls = await prisma.call.count({
          where: { status: 'active' }
        });
        
        const incomingCalls = await prisma.call.count({
          where: { status: 'incoming' }
        });
        
        console.log(`\n🌐 System Overview:`);
        console.log(`  📞 Total calls today: ${totalCalls}`);
        console.log(`  🟢 Active calls: ${activeCalls}`);
        console.log(`  🟡 Incoming calls: ${incomingCalls}`);
        
      } catch (error) {
        console.error('Error displaying routing stats:', error);
      }
    }, 15000); // Update every 15 seconds
  }

  async stop(): Promise<void> {
    this.isMonitoring = false;
    await redisClient.disconnect();
    await prisma.$disconnect();
    console.log('\n🛑 Routing monitor stopped');
  }
}

// Handle graceful shutdown
const monitor = new RoutingMonitor();

process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down monitor...');
  await monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down monitor...');
  await monitor.stop();
  process.exit(0);
});

// Start monitoring
monitor.start().catch(console.error);
