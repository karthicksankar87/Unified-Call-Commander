#!/usr/bin/env ts-node

import { sendTestCall } from '../test/kafkaProducer';

async function runTest() {
  console.log('Testing Kafka consumer with sample call data...');
  
  // Send multiple test calls with different scenarios
  const testCalls = [
    {
      phoneNumber: '+1234567890',
      callerName: 'John Doe',
      callType: 'INCOMING',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      metadata: { source: 'test', priority: 'normal' }
    },
    {
      phoneNumber: '+0987654321',
      callerName: 'Jane Smith',
      callType: 'INCOMING',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      metadata: { source: 'test', priority: 'high' }
    },
    {
      phoneNumber: '+1122334455',
      callerName: 'Emergency Services',
      callType: 'EMERGENCY',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      metadata: { source: 'test', priority: 'urgent' }
    }
  ];

  for (let i = 0; i < testCalls.length; i++) {
    console.log(`\nSending test call ${i + 1}/${testCalls.length}...`);
    await sendTestCall();
    
    // Wait 2 seconds between calls
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\nAll test calls sent! Check your consumer logs to see if they were processed.');
}

runTest().catch(console.error);
