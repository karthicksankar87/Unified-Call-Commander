import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import RedisRoutingService from '../services/redisRouting';

const router = Router();
const prisma = new PrismaClient();
const redisRouting = new RedisRoutingService();

// Get all active calls
router.get('/active', async (req, res) => {
  try {
    const activeCalls = await prisma.call.findMany({
      where: {
        status: {
          in: ['incoming', 'assigned', 'active', 'RECEIVED'],
        },
      },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
            contact: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    res.json(activeCalls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active calls' });
  }
});

// Answer a call
router.put('/:id/answer', async (req, res) => {
  try {
    const { id } = req.params;
    let { userId } = req.body as { userId?: number };

    // First check if the call exists and what state it's in
    const call = await prisma.call.findUnique({
      where: { id: parseInt(id) },
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // If call is already active, return error
    if (call.status === 'active') {
      return res.status(400).json({ error: 'Call is already active' });
    }

    // If userId not provided, try to use the pre-assigned user or auto-route now
    if (typeof userId !== 'number' || !userId) {
      if (call.routedToUserId) {
        userId = call.routedToUserId;
      } else {
        try {
          const routingResult = await redisRouting.routeCall(call);
          if (routingResult?.success && routingResult.routedTo?.id) {
            userId = routingResult.routedTo.id;
          } else {
            return res.status(503).json({ error: 'No available staff' });
          }
        } catch (e) {
          console.error('Error auto-routing during answer:', e);
          return res.status(500).json({ error: 'Failed to assign call' });
        }
      }
    }

    // If call has routedToUserId but different from requested userId, return error
    if (call.routedToUserId && call.routedToUserId !== userId) {
      return res
        .status(403)
        .json({ error: 'Call is assigned to another agent' });
    }

    // Update the call status to active and assign to the resolved user
    const updatedCall = await prisma.call.update({
      where: { id: parseInt(id) },
      data: {
        status: 'active',
        routedToUserId: userId,
      },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
            contact: true,
          },
        },
      },
    });

    // Update Redis cache for user availability (non-blocking)
    try {
      const availability = await redisRouting.getUserAvailability(userId!);
      await redisRouting.cacheUserAvailability(userId!, true, availability.load + 1);
    } catch (err) {
      console.error('Error updating Redis availability:', err);
      // Continue anyway as this is not critical
    }

    res.json(updatedCall);
  } catch (error) {
    console.error('Error answering call:', error);
    res.status(500).json({ error: 'Failed to answer call' });
  }
});

// End a call
router.put('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the current call to compute duration
    const existing = await prisma.call.findUnique({ where: { id: parseInt(id) } });
    const now = new Date();
    let durationSeconds: number | undefined = undefined;
    if (existing?.timestamp) {
      durationSeconds = Math.max(
        0,
        Math.round((now.getTime() - new Date(existing.timestamp).getTime()) / 1000)
      );
    }

    const updatedCall = await prisma.call.update({
      where: { id: parseInt(id) },
      data: {
        status: 'completed',
        ...(typeof durationSeconds === 'number' ? { duration: durationSeconds } : {}),
      },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
            contact: true,
          },
        },
      },
    });

    // Decrement Redis load for the assigned user, if any
    try {
      const routedUserId = updatedCall.routedToUserId;
      if (routedUserId) {
        const availability = await redisRouting.getUserAvailability(routedUserId);
        const newLoad = Math.max(0, (availability.load || 0) - 1);
        await redisRouting.cacheUserAvailability(routedUserId, true, newLoad);
      }
    } catch (err) {
      console.error('Error decrementing Redis availability on end:', err);
      // Non-blocking; continue response
    }

    res.json(updatedCall);
  } catch (error) {
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get call statistics
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCalls, activeCalls, completedCalls] = await Promise.all([
      prisma.call.count({
        where: {
          timestamp: {
            gte: today,
          },
        },
      }),
      prisma.call.count({
        where: {
          status: 'active',
        },
      }),
      prisma.call.count({
        where: {
          status: 'completed',
          timestamp: {
            gte: today,
          },
        },
      }),
    ]);

    res.json({
      totalCalls,
      activeCalls,
      completedCalls,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch call statistics' });
  }
});

// Create a new call (for testing/simulating incoming calls)
router.post('/', async (req, res) => {
  try {
    const { phoneNumber, callerName, callType, customerId } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    const newCall = await prisma.call.create({
      data: {
        phoneNumber,
        callerName: callerName || 'Unknown',
        callType: callType || 'INCOMING',
        status: 'RECEIVED',
        customerId: customerId || null,
        metadata: {},
      },
      include: {
        customer: {
          select: {
            name: true,
            contact: true,
          },
        },
      },
    });
    res.json(newCall);
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ error: 'Failed to create call' });
  }
});

// Route a call to a specific user
router.put('/:id/route', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, locationId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get the call
    const call = await prisma.call.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
            contact: true,
          },
        },
      },
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Get the user to route to
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the call with routing information
    const updatedCall = await prisma.call.update({
      where: { id: parseInt(id) },
      data: {
        routedToUserId: userId,
        status: 'assigned',
        routedTo: user.name,
      },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
            contact: true,
          },
        },
      },
    });

    // Update Redis cache for user availability
    await redisRouting.getUserAvailability(userId).then((availability) => {
      redisRouting.cacheUserAvailability(userId, true, availability.load + 1);
    });

    res.json(updatedCall);
  } catch (error) {
    console.error('Error routing call:', error);
    res.status(500).json({ error: 'Failed to route call' });
  }
});

export default router;
