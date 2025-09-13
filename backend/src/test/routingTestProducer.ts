#!/usr/bin/env ts-node

import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'routing-test-producer',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

// Test scenarios for routing validation
const testScenarios = [
  // Scenario 1: Different locations
  {
    name: 'Store #1 Customer Call',
    data: {
      phoneNumber: '+1555-0001',
      callerName: 'Alice Johnson',
      callType: 'CUSTOMER_SERVICE',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      source: 'test',
      priority: 'normal',
      location: 'Store #5',
      customerType: 'regular',
    },
  },
  {
    name: 'Store #2 Technical Support',
    data: {
      phoneNumber: '+1555-0002',
      callerName: 'Bob Smith',
      callType: 'TECHNICAL_SUPPORT',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      autoRoute: true,
      source: 'test',
      priority: 'high',
      location: 'Store #2',
      customerType: 'premium',
    },
  },
  // Scenario 2: High priority calls
  {
    name: 'Emergency Call',
    data: {
      phoneNumber: '+1555-0911',
      callerName: 'Emergency Services',
      callType: 'EMERGENCY',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      autoRoute: true,
      source: 'test',
      priority: 'urgent',
      location: 'Store #1',
      customerType: 'emergency',
    },
  },
  // Scenario 3: VIP customer
  {
    name: 'VIP Customer Call',
    data: {
      phoneNumber: '+1555-0VIP',
      callerName: 'Victoria Important',
      callType: 'VIP_SERVICE',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      autoRoute: true,
      source: 'test',
      priority: 'high',
      location: 'Store #3',
      customerType: 'vip',
    },
  },
  // Scenario 4: No specific location (general routing)
  {
    name: 'General Inquiry',
    data: {
      phoneNumber: '+1555-0003',
      callerName: 'Charlie Brown',
      callType: 'GENERAL_INQUIRY',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      autoRoute: true,
      source: 'test',
      priority: 'normal',
      customerType: 'new',
    },
  },
  // Scenario 5: Multiple calls to test load balancing
  {
    name: 'Load Test Call 1',
    data: {
      phoneNumber: '+1555-1001',
      callerName: 'Load Test User 1',
      callType: 'CUSTOMER_SERVICE',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      autoRoute: true,
      source: 'load_test',
      priority: 'normal',
      location: 'Store #4',
      customerType: 'regular',
    },
  },
  {
    name: 'Load Test Call 2',
    data: {
      phoneNumber: '+1555-1002',
      callerName: 'Load Test User 2',
      callType: 'CUSTOMER_SERVICE',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      autoRoute: true,
      source: 'load_test',
      priority: 'normal',
      location: 'Store #1',
      customerType: 'regular',
    },
  },
  {
    name: 'Load Test Call 3',
    data: {
      phoneNumber: '+1555-1003',
      callerName: 'Load Test User 3',
      callType: 'CUSTOMER_SERVICE',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      autoRoute: true,
      source: 'load_test',
      priority: 'normal',
      location: 'Store #2',
      customerType: 'regular',
    },
  },
];

async function sendTestCall(scenario: any): Promise<void> {
  try {
    await producer.send({
      topic: 'incomingCalls',
      messages: [
        {
          key: scenario.data.phoneNumber,
          value: JSON.stringify(scenario.data),
        },
      ],
    });

    console.log(`✅ Sent: ${scenario.name}`);
    console.log(
      `   📞 ${scenario.data.callerName} (${scenario.data.phoneNumber})`
    );
    console.log(`   📍 Location: ${scenario.data.location || 'General'}`);
    console.log(`   🔥 Priority: ${scenario.data.priority}`);
    console.log(`   📋 Type: ${scenario.data.callType}\n`);
  } catch (error) {
    console.error(`❌ Failed to send ${scenario.name}:`, error);
  }
}

async function runRoutingTests(): Promise<void> {
  try {
    await producer.connect();
    console.log('🚀 Starting Redis Routing Validation Tests\n');
    console.log('='.repeat(60));

    // Test 1: Individual scenario testing
    console.log('\n📋 TEST 1: Individual Routing Scenarios');
    console.log('-'.repeat(40));

    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      console.log(
        `\n[${i + 1}/${testScenarios.length}] Testing: ${scenario.name}`
      );
      await sendTestCall(scenario);

      // Wait 2 seconds between calls to observe routing
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Test 2: Load balancing test
    console.log('\n📊 TEST 2: Load Balancing (Rapid Fire)');
    console.log('-'.repeat(40));

    const loadTestCalls = [];
    for (let i = 1; i <= 5; i++) {
      loadTestCalls.push({
        name: `Concurrent Call ${i}`,
        data: {
          phoneNumber: `+1555-2${i.toString().padStart(3, '0')}`,
          callerName: `Concurrent User ${i}`,
          callType: 'CUSTOMER_SERVICE',
          timestamp: new Date().toISOString(),
          duration: 0,
          status: 'RECEIVED',
          source: 'concurrent_test',
          autoRoute: true,
          priority: 'normal',
          location: i % 2 === 0 ? 'Store #1' : 'Store #4',
          customerType: 'regular',
        },
      });
    }

    // Send all concurrent calls rapidly
    const promises = loadTestCalls.map((call) => sendTestCall(call));
    await Promise.all(promises);

    console.log('\n🎉 All routing tests completed!');
    console.log('\nCheck your backend logs to see:');
    console.log('- Which staff members received calls');
    console.log('- Load distribution across locations');
    console.log('- Redis routing decisions');
    console.log('- Fallback scenarios (if any)');
  } catch (error) {
    console.error('Error running routing tests:', error);
  } finally {
    await producer.disconnect();
    console.log('\n📡 Producer disconnected');
  }
}

// Interactive mode
async function interactiveMode(): Promise<void> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await producer.connect();
  console.log('🎮 Interactive Routing Test Mode');
  console.log('Available scenarios:');
  testScenarios.forEach((scenario, index) => {
    console.log(`  ${index + 1}. ${scenario.name}`);
  });
  console.log('  0. Run all scenarios');
  console.log('  q. Quit\n');

  const askQuestion = () => {
    rl.question(
      'Select scenario (1-8, 0 for all, q to quit): ',
      async (answer: any) => {
        if (answer.toLowerCase() === 'q') {
          await producer.disconnect();
          rl.close();
          return;
        }

        const choice = parseInt(answer);
        if (choice === 0) {
          console.log('\n🚀 Running all scenarios...\n');
          for (const scenario of testScenarios) {
            await sendTestCall(scenario);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } else if (choice >= 1 && choice <= testScenarios.length) {
          const scenario = testScenarios[choice - 1];
          console.log(`\n🎯 Running: ${scenario.name}\n`);
          await sendTestCall(scenario);
        } else {
          console.log('❌ Invalid choice');
        }

        console.log('\n' + '-'.repeat(40));
        askQuestion();
      }
    );
  };

  askQuestion();
}

// Command line arguments
const args = process.argv.slice(2);
if (args.includes('--interactive') || args.includes('-i')) {
  interactiveMode();
} else {
  runRoutingTests();
}
