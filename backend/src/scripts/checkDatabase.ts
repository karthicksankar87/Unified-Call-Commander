#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database for calls...\n');
    
    // Get all calls
    const allCalls = await prisma.call.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    console.log(`Total calls found: ${allCalls.length}`);
    console.log('\nRecent calls:');
    allCalls.forEach((call, index) => {
      console.log(`${index + 1}. ID: ${call.id}, Phone: ${call.phoneNumber}, Status: "${call.status}", Time: ${call.timestamp}`);
    });
    
    // Check status distribution
    const statusCounts = await prisma.call.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    console.log('\nStatus distribution:');
    statusCounts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count.status} calls`);
    });
    
    // Check calls that should be "active"
    const activeCalls = await prisma.call.findMany({
      where: {
        status: {
          in: ['incoming', 'active']
        }
      }
    });
    
    console.log(`\nCalls with status 'incoming' or 'active': ${activeCalls.length}`);
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
