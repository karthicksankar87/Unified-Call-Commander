import { Router } from 'express';
import { routeCall } from '../modules/routing';
import { PrismaClient } from '@prisma/client';
import RedisRoutingService from '../services/redisRouting';

const prisma = new PrismaClient();
const router = Router();

router.post('/call', async (req, res) => {
  const callData = req.body;
  try {
    console.log('Received call data:', callData);
    const result = await routeCall(callData.call);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Initialize Redis staff availability
router.post('/initialize-redis', async (req, res) => {
  try {
    const redisRouting = new RedisRoutingService();
    
    // Initialize staff availability
    await redisRouting.initializeStaffAvailability();
    
    // Cache location staff data
    const locations = await prisma.location.findMany({
      select: { id: true, name: true }
    });
    
    for (const location of locations) {
      await redisRouting.cacheLocationStaff(location.id);
    }
    
    res.json({ 
      success: true, 
      message: 'Redis staff availability initialized successfully',
      staffCount: await prisma.user.count(),
      locationCount: locations.length
    });
  } catch (error) {
    console.error('Error initializing Redis staff availability:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize Redis staff availability',
      error: (error as Error).message
    });
  }
});

export default router;
