#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCallStatuses() {
  try {
    console.log('Updating call statuses from RECEIVED to incoming...\n');
    
    // First, check how many calls need updating
    const callsToUpdate = await prisma.call.count({
      where: {
        status: 'RECEIVED'
      }
    });
    
    console.log(`Found ${callsToUpdate} calls with status 'RECEIVED'`);
    
    if (callsToUpdate === 0) {
      console.log('No calls need updating.');
      return;
    }
    
    // Update all RECEIVED calls to incoming
    const result = await prisma.call.updateMany({
      where: {
        status: 'RECEIVED'
      },
      data: {
        status: 'incoming'
      }
    });
    
    console.log(`✅ Successfully updated ${result.count} calls from 'RECEIVED' to 'incoming'`);
    
    // Verify the update
    const remainingReceived = await prisma.call.count({
      where: {
        status: 'RECEIVED'
      }
    });
    
    const newIncoming = await prisma.call.count({
      where: {
        status: 'incoming'
      }
    });
    
    console.log(`\nVerification:`);
    console.log(`- Remaining 'RECEIVED' calls: ${remainingReceived}`);
    console.log(`- Total 'incoming' calls: ${newIncoming}`);
    
  } catch (error) {
    console.error('Error updating call statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCallStatuses();
