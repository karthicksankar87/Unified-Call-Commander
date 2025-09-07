import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all active calls
router.get('/active', async (req, res) => {
  try {
    const activeCalls = await prisma.call.findMany({
      where: {
        status: {
          in: ['incoming', 'active', 'RECEIVED']
        }
      },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true
              }
            }
          }
        },
        customer: {
          select: {
            name: true,
            contact: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
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
    const { userId } = req.body;

    const updatedCall = await prisma.call.update({
      where: { id: parseInt(id) },
      data: {
        status: 'active',
        routedToUserId: userId
      },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true
              }
            }
          }
        },
        customer: {
          select: {
            name: true,
            contact: true
          }
        }
      }
    });
    res.json(updatedCall);
  } catch (error) {
    res.status(500).json({ error: 'Failed to answer call' });
  }
});

// End a call
router.put('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;

    const updatedCall = await prisma.call.update({
      where: { id: parseInt(id) },
      data: {
        status: 'completed'
      },
      include: {
        user: {
          select: {
            name: true,
            location: {
              select: {
                name: true
              }
            }
          }
        },
        customer: {
          select: {
            name: true,
            contact: true
          }
        }
      }
    });
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
            gte: today
          }
        }
      }),
      prisma.call.count({
        where: {
          status: 'active'
        }
      }),
      prisma.call.count({
        where: {
          status: 'completed',
          timestamp: {
            gte: today
          }
        }
      })
    ]);

    res.json({
      totalCalls,
      activeCalls,
      completedCalls
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
        metadata: {}
      },
      include: {
        customer: {
          select: {
            name: true,
            contact: true
          }
        }
      }
    });
    res.json(newCall);
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({ error: 'Failed to create call' });
  }
});

export default router;
