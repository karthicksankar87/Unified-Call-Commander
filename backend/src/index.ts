import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import syncRoutes from './routes/sync';
import routingRoutes from './routes/routing';
import automationRoutes from './routes/automation';
import analyticsRoutes from './routes/analytics';
import callRoutes from './routes/calls';
import KafkaConsumerService from './services/kafkaConsumer';

const app = express();
const prisma = new PrismaClient();
const kafkaConsumer = new KafkaConsumerService();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/sync', syncRoutes);
app.use('/routing', routingRoutes);
app.use('/automate', automationRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/calls', callRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    kafkaConsumer: kafkaConsumer.getConnectionStatus()
  });
});

// Kafka consumer status endpoint
app.get('/kafka/status', (req, res) => {
  res.json({
    connected: kafkaConsumer.getConnectionStatus(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

// Initialize Kafka consumer
async function initializeKafkaConsumer() {
  try {
    console.log('Initializing Kafka consumer...');
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe();
    await kafkaConsumer.startConsuming();
    console.log('Kafka consumer initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Kafka consumer:', error);
    // Don't exit the process, just log the error
    console.log('Server will continue without Kafka consumer');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await kafkaConsumer.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await kafkaConsumer.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize Kafka consumer after server starts
  await initializeKafkaConsumer();
});
