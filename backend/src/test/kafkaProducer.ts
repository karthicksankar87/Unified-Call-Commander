import { Kafka } from 'kafkajs';

// Simple test producer to send test messages to the incomingCalls topic
const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function sendTestCall() {
  try {
    await producer.connect();
    console.log('Producer connected');

    const testCallData = {
      phoneNumber: '+1234567890',
      callerName: 'John Doe',
      callType: 'INCOMING',
      timestamp: new Date().toISOString(),
      duration: 0,
      status: 'RECEIVED',
      metadata: {
        source: 'test',
        priority: 'normal'
      }
    };

    await producer.send({
      topic: 'incomingCalls',
      messages: [{
        key: testCallData.phoneNumber,
        value: JSON.stringify(testCallData)
      }]
    });

    console.log('Test call message sent:', testCallData);
    
  } catch (error) {
    console.error('Error sending test message:', error);
  } finally {
    await producer.disconnect();
    console.log('Producer disconnected');
  }
}

// Send a test message every 10 seconds for testing
async function startTestProducer() {
  console.log('Starting test producer...');
  
  // Send initial message
  await sendTestCall();
  
  // Send a message every 10 seconds
  setInterval(async () => {
    await sendTestCall();
  }, 10000);
}

if (require.main === module) {
  startTestProducer().catch(console.error);
}

export { sendTestCall };
