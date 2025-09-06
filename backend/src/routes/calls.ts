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
          in: ['incoming', 'active']
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
    const { customerId, locationId } = req.body;

    const newCall = await prisma.call.create({
      data: {
        status: 'incoming',
        customerId: customerId || null
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
    res.status(500).json({ error: 'Failed to create call' });
  }
});

export default router;
