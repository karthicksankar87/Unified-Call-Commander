import { PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';

const prisma = new PrismaClient();

let redisClient: RedisClientType | null = null;

const USE_REDIS = process.env.USE_REDIS === 'true';

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient();
    redisClient.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
    await redisClient.connect();
  }
  return redisClient;
}

export const routeCall = async (callData: any): Promise<any> => {
  try {
    if (USE_REDIS) {
      const client = await getRedisClient();
      const reply = await client.get(`staff:${callData.location}`);
      const staffList: any[] = JSON.parse(reply || '[]');
      let bestStaff: any = null;
      let maxScore = 0;
      staffList.forEach((staff) => {
        if (staff.available) {
          const score = calculateExpertiseScore(staff, callData.type);
          if (score > maxScore) {
            bestStaff = staff;
            maxScore = score;
          }
        }
      });
      if (bestStaff) {
        await prisma.call.create({
          data: { ...callData, routedToUserId: bestStaff.id, status: 'routed' },
        });
        return bestStaff;
      } else {
        return { status: 'queued' };
      }
    }

    // Fallback when USE_REDIS is false: simple Prisma-based staff selection
    // Try to resolve location by name if provided in callData.location
    let locationId: number | undefined = undefined;
    if (callData?.location && typeof callData.location === 'string') {
      const loc = await prisma.location.findFirst({
        where: { name: callData.location },
      });
      if (loc) locationId = loc.id;
    } else if (typeof callData?.locationId === 'number') {
      locationId = callData.locationId;
    }

    // Prefer users in the location; otherwise any user
    let users = await prisma.user.findMany({
      where: locationId ? { locationId } : {},
      select: {
        id: true,
        name: true,
        location: { select: { id: true, name: true } },
      },
      take: 10,
    });
    if (!users.length) {
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          location: { select: { id: true, name: true } },
        },
        take: 10,
      });
    }

    const chosen = users[0];
    if (chosen) {
      await prisma.call.create({
        data: { ...callData, routedToUserId: chosen.id, status: 'routed' },
      });
      return { id: chosen.id, name: chosen.name, location: chosen.location };
    }

    return { status: 'queued' };
  } catch (err) {
    throw err;
  }
};

function calculateExpertiseScore(staff: any, callType: string): number {
  return staff.expertise.includes(callType) ? 10 : 0;
}
