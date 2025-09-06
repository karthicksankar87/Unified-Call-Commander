import { PrismaClient } from '@prisma/client';
import { Kafka } from 'kafkajs';

const prisma = new PrismaClient();
const kafka = new Kafka({ clientId: 'call-commander', brokers: ['localhost:9092'] });
const producer = kafka.producer();

export const syncCustomer = async (customerId: number, data: any): Promise<void> => {
  if (!validateData(data)) {
    throw new Error('Invalid data');
  }
  await producer.connect();
  await producer.send({
    topic: 'data-sync-topic',
    messages: [{ value: JSON.stringify(data) }],
  });
  await producer.disconnect();
};

function validateData(data: any): boolean {
  return data.id && data.name; // Basic validation
}

function conflictDetected(data: any): boolean {
  // Simple check, e.g., if timestamp is older
  return false; // Placeholder
}

function resolveLastWriteWins(data: any): void {
  // Placeholder for conflict resolution
}

// Consumer setup (can be run separately)
export const startConsumer = async (): Promise<void> => {
  const consumer = kafka.consumer({ groupId: 'sync-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'data-sync-topic' });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value?.toString() || '{}');
      await prisma.customer.update({ where: { id: data.id }, data });
      if (conflictDetected(data)) {
        resolveLastWriteWins(data);
      }
    },
  });
};
