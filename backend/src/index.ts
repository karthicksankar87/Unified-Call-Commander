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

const app = express();
const prisma = new PrismaClient();

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
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
