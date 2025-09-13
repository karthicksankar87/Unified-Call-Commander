import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'call-flow-test',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function testCallStatusFlow() {
  try {
    await producer.connect();
    console.log('Connected to Kafka');

    // Test call that should stay in "incoming" status for 2 seconds
    const testCall = {
      phoneNumber: '+1234567890',
      callerName: 'Test Caller',
      callType: 'INCOMING',
      timestamp: new Date().toISOString(),
      autoRoute: true, // Will auto-route after 2 seconds
      metadata: {
        testCall: true,
        purpose: 'Testing call status flow'
      }
    };

    console.log('Sending test call to verify status flow...');
    await producer.send({
      topic: 'incomingCalls',
      messages: [{
        value: JSON.stringify(testCall)
      }]
    });

    console.log('✅ Test call sent successfully!');
    console.log('Expected flow:');
    console.log('1. Call should appear with "incoming" status');
    console.log('2. Answer button should be visible');
    console.log('3. After 2 seconds, call should auto-route to "assigned" status');
    console.log('4. Answer button should still be visible for assigned calls');
    console.log('\nCheck the Call Management page to verify this flow.');

  } catch (error) {
    console.error('Error testing call flow:', error);
  } finally {
    await producer.disconnect();
  }
}

// Test call that won't auto-route
async function testManualCall() {
  try {
    await producer.connect();
    
    const manualCall = {
      phoneNumber: '+1987654321',
      callerName: 'Manual Test Caller',
      callType: 'INCOMING',
      timestamp: new Date().toISOString(),
      autoRoute: false, // Will NOT auto-route
      metadata: {
        testCall: true,
        purpose: 'Testing manual call handling'
      }
    };

    console.log('Sending manual test call (no auto-routing)...');
    await producer.send({
      topic: 'incomingCalls',
      messages: [{
        value: JSON.stringify(manualCall)
      }]
    });

    console.log('✅ Manual test call sent!');
    console.log('This call should stay in "incoming" status until manually answered.');

  } catch (error) {
    console.error('Error sending manual call:', error);
  } finally {
    await producer.disconnect();
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Testing Call Status Flow\n');
  
  console.log('Test 1: Auto-routing call (2-second delay)');
  await testCallStatusFlow();
  
  console.log('\nWaiting 3 seconds before next test...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Test 2: Manual call (no auto-routing)');
  await testManualCall();
  
  console.log('\n✅ All tests completed!');
  console.log('Check the Call Management page to see the results.');
}

if (require.main === module) {
  runTests().catch(console.error);
}

export { testCallStatusFlow, testManualCall };
