import { createClient, RedisClientType } from 'redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class RedisRoutingService {
  private redisClient: RedisClientType | null = null;
  private isConnected: boolean = false;
  private useRedis: boolean = process.env.USE_REDIS === 'true';

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      if (!this.useRedis) {
        console.log('USE_REDIS is false: Redis features disabled, using DB-only routing');
        this.isConnected = false;
        this.redisClient = null;
        return;
      }
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('Redis connected successfully');
        this.isConnected = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  async getClient(): Promise<RedisClientType> {
    if (!this.redisClient || !this.isConnected) {
      await this.initializeRedis();
    }
    return this.redisClient!;
  }

  // Cache user availability and load information
  async cacheUserAvailability(
    userId: number,
    isAvailable: boolean,
    currentLoad: number = 0
  ): Promise<void> {
    try {
      if (!this.useRedis) {
        // No-op when Redis is disabled
        return;
      }
      const client = await this.getClient();
      const userKey = `user:${userId}:availability`;
      const loadKey = `user:${userId}:load`;

      await Promise.all([
        client.set(userKey, isAvailable ? '1' : '0'), // No TTL - persist until explicitly changed
        client.set(loadKey, currentLoad.toString()),
      ]);
      
      console.log(`Updated availability for user ${userId}: available=${isAvailable}, load=${currentLoad}`);
    } catch (error) {
      console.error('Error caching user availability:', error);
    }
  }

  // Get user availability from cache
  async getUserAvailability(
    userId: number
  ): Promise<{ available: boolean; load: number }> {
    try {
      if (!this.useRedis) {
        // Assume available with zero load when Redis is disabled
        return { available: true, load: 0 };
      }
      const client = await this.getClient();
      const [availability, load] = await Promise.all([
        client.get(`user:${userId}:availability`),
        client.get(`user:${userId}:load`),
      ]);

      return {
        available: availability === '1',
        load: parseInt(load || '0'),
      };
    } catch (error) {
      console.error('Error getting user availability:', error);
      return { available: false, load: 0 };
    }
  }

  // Cache location-based staff for quick routing
  async cacheLocationStaff(locationId: number): Promise<void> {
    try {
      if (!this.useRedis) {
        // No-op when Redis is disabled
        return;
      }
      const client = await this.getClient();
      const users = await prisma.user.findMany({
        where: { locationId },
        select: {
          id: true,
          name: true,
          role: true,
          location: {
            select: { id: true, name: true },
          },
        },
      });

      const staffKey = `location:${locationId}:staff`;
      await client.setEx(staffKey, 600, JSON.stringify(users)); // 10 minute TTL
    } catch (error) {
      console.error('Error caching location staff:', error);
    }
  }

  // Get cached staff for a location
  async getLocationStaff(locationId: number): Promise<any[]> {
    try {
      if (!this.useRedis) {
        // Fallback: fetch directly from DB when Redis is disabled
        const users = await prisma.user.findMany({
          where: { locationId },
          select: {
            id: true,
            name: true,
            role: true,
            location: { select: { id: true, name: true } },
          },
        });
        return users;
      }
      const client = await this.getClient();
      const staffKey = `location:${locationId}:staff`;
      const cachedStaff = await client.get(staffKey);

      if (cachedStaff) {
        return JSON.parse(cachedStaff);
      }

      // Cache miss - fetch and cache
      await this.cacheLocationStaff(locationId);
      const freshData = await client.get(staffKey);
      return freshData ? JSON.parse(freshData) : [];
    } catch (error) {
      console.error('Error getting location staff:', error);
      return [];
    }
  }

  // Intelligent call routing with load balancing
  async routeCall(callData: any): Promise<any> {
    try {
      if (!this.useRedis) {
        // Directly use DB-only routing when Redis is disabled
        return await this.fallbackRouting(callData);
      }
      const client = await this.getClient();

      // Determine location
      let locationId = callData.locationId;
      let locationName = callData.location;
      
      // Log the incoming call location for debugging
      console.log(`Attempting to route call for location: ${locationName}, locationId: ${locationId}`);
      
      if (!locationId && locationName) {
        // Try to find an exact match first
        const location = await prisma.location.findFirst({
          where: { name: locationName },
        });
        
        if (location) {
          locationId = location.id;
          console.log(`Found exact location match: ${location.name} (ID: ${location.id})`);
        } else {
          // Try a partial match if exact match fails
          const locations = await prisma.location.findMany();
          for (const loc of locations) {
            if (locationName.includes(loc.name) || loc.name.includes(locationName)) {
              locationId = loc.id;
              console.log(`Found partial location match: ${loc.name} (ID: ${loc.id}) for ${locationName}`);
              break;
            }
          }
        }
      }

      if (!locationId) {
        console.log(`No location match found for ${locationName}, using general routing`);
        return await this.generalRouting(callData);
      }

      // Get staff for the location
      const staff = await this.getLocationStaff(locationId);

      if (!staff.length) {
        console.log(
          'No staff found for location, falling back to general routing'
        );
        return await this.generalRouting(callData);
      }

      // Find best available staff member
      const bestStaff = await this.findBestAvailableStaff(staff, callData);

      if (bestStaff) {
        // Create call record
        const call = await prisma.call.update({
          where: { id: callData.id },
          data: {
            routedToUserId: bestStaff.id,
            status: 'assigned', // Use 'assigned' instead of 'active'
            routedTo: bestStaff.name,
          },
        });

        // Track routing metrics
        await this.trackRoutingMetrics(locationId, bestStaff.id, 'success');

        return {
          success: true,
          routedTo: bestStaff,
          call: call,
        };
      }

      // No available staff - queue the call
      await this.queueCall(callData, locationId);
      return {
        success: false,
        status: 'queued',
        message: 'No available staff',
      };
    } catch (error) {
      console.error('Error in Redis routing:', error);
      return await this.fallbackRouting(callData);
    }
  }

  // Find the best available staff member based on load, expertise, and location match
  private async findBestAvailableStaff(
    staff: any[],
    callData: any
  ): Promise<any | null> {
    const availabilityPromises = staff.map(async (member) => {
      const availability = await this.getUserAvailability(member.id);
      return {
        ...member,
        ...availability,
      };
    });

    const staffWithAvailability = await Promise.all(availabilityPromises);
    
    // Log available staff for debugging
    console.log(`Found ${staffWithAvailability.length} potential staff members for location`);
    staffWithAvailability.forEach(s => {
      console.log(`- ${s.name} (ID: ${s.id}), Location: ${s.location?.name || 'Unknown'}, Available: ${s.available}, Load: ${s.load}`);
    });

    // Filter available staff and sort by location match, load, and role priority
    const availableStaff = staffWithAvailability
      .filter((member) => member.available && member.load < 5) // Max 5 concurrent calls
      .sort((a, b) => {
        // First prioritize by location match if call has a location
        if (callData.location) {
          const aLocationMatch = a.location?.name === callData.location ? 1 : 0;
          const bLocationMatch = b.location?.name === callData.location ? 1 : 0;
          
          if (aLocationMatch !== bLocationMatch) {
            return bLocationMatch - aLocationMatch; // Higher match score first
          }
        }
        
        // Then prioritize by role (managers first, then regular staff)
        const roleScore = (role: string) => {
          if (!role) return 0;
          if (role.toLowerCase().includes('manager')) return 3;
          if (role.toLowerCase().includes('senior')) return 2;
          return 1;
        };

        const roleComparison = roleScore(b.role) - roleScore(a.role);
        if (roleComparison !== 0) return roleComparison;

        // Then by load (lower is better)
        return a.load - b.load;
      });

    if (availableStaff.length > 0) {
      const selected = availableStaff[0];
      console.log(`Selected staff member: ${selected.name} (ID: ${selected.id}) from ${selected.location?.name || 'Unknown location'}`);
      return selected;
    }
    
    console.log('No available staff found');
    return null;
  }

  // General routing when no specific location
  private async generalRouting(callData: any): Promise<any> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        location: { select: { id: true, name: true } },
      },
      take: 20,
    });

    const bestStaff = await this.findBestAvailableStaff(users, callData);

    if (bestStaff) {
      const call = await prisma.call.update({
        where: { id: callData.id },
        data: {
          routedToUserId: bestStaff.id,
          status: 'assigned',
          routedTo: bestStaff.name,
        },
      });

      return { success: true, routedTo: bestStaff, call: call };
    }

    return { success: false, status: 'queued', message: 'No available staff' };
  }

  // Fallback to database-only routing
  private async fallbackRouting(callData: any): Promise<any> {
    console.log('Using fallback routing (database only)');

    // Try to map the provided location string to a Location ID
    let locationId: number | undefined = undefined;
    const locationName: string | undefined = callData.location;
    if (locationName) {
      const exact = await prisma.location.findFirst({ where: { name: locationName } });
      if (exact) {
        locationId = exact.id;
      } else {
        const all = await prisma.location.findMany();
        for (const loc of all) {
          if (locationName.includes(loc.name) || loc.name.includes(locationName)) {
            locationId = loc.id;
            break;
          }
        }
      }
    }

    // Get candidate users, preferring the same location
    let users = await prisma.user.findMany({
      where: locationId ? { locationId } : {},
      select: {
        id: true,
        name: true,
        role: true,
        location: { select: { id: true, name: true } },
      },
      take: 50,
    });

    // If none in that location, fall back to any users
    if (!users.length) {
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          location: { select: { id: true, name: true } },
        },
        take: 50,
      });
    }

    if (!users.length) {
      return { success: false, status: 'queued', message: 'No staff available' };
    }

    // Balance by current active calls using DB only
    const userIds = users.map((u) => u.id);
    const activeRoutes = await prisma.call.findMany({
      where: {
        status: 'active',
        routedToUserId: { in: userIds },
      },
      select: { routedToUserId: true },
    });

    const activeCount: Record<number, number> = {};
    activeRoutes.forEach((c) => {
      const uid = c.routedToUserId as number;
      activeCount[uid] = (activeCount[uid] || 0) + 1;
    });

    // Choose the user with the least active calls; tie-break by role weight and then by name
    const roleWeight = (role?: string) => {
      if (!role) return 0;
      const r = role.toLowerCase();
      if (r.includes('manager')) return 3;
      if (r.includes('senior')) return 2;
      return 1;
    };

    users.sort((a, b) => {
      const la = activeCount[a.id] || 0;
      const lb = activeCount[b.id] || 0;
      if (la !== lb) return la - lb; // fewer active calls first
      const rw = roleWeight(b.role) - roleWeight(a.role); // higher role first
      if (rw !== 0) return rw;
      return a.name.localeCompare(b.name);
    });

    const chosen = users[0];
    const call = await prisma.call.update({
      where: { id: callData.id },
      data: {
        routedToUserId: chosen.id,
        status: 'assigned',
        routedTo: chosen.name,
      },
    });

    return { success: true, routedTo: chosen, call };
  }

  // Queue call for later processing
  private async queueCall(callData: any, locationId: number): Promise<void> {
    try {
      if (!this.useRedis) {
        // No-op when Redis is disabled
        return;
      }
      const client = await this.getClient();
      const queueKey = `queue:location:${locationId}`;
      await client.lPush(queueKey, JSON.stringify(callData));

      // Set TTL for queue items (1 hour)
      await client.expire(queueKey, 3600);
    } catch (error) {
      console.error('Error queuing call:', error);
    }
  }

  // Track routing metrics for analytics
  private async trackRoutingMetrics(
    locationId: number,
    userId: number,
    result: string
  ): Promise<void> {
    try {
      if (!this.useRedis) {
        // No-op when Redis is disabled
        return;
      }
      const client = await this.getClient();
      const timestamp = Date.now();
      const metricsKey = `metrics:routing:${locationId}:${
        new Date().toISOString().split('T')[0]
      }`;

      await client.hIncrBy(metricsKey, `${result}_count`, 1);
      await client.hIncrBy(metricsKey, `user_${userId}_routed`, 1);
      await client.expire(metricsKey, 86400 * 7); // Keep for 7 days
    } catch (error) {
      console.error('Error tracking routing metrics:', error);
    }
  }

  // Initialize staff availability (call this when staff come online)
  async initializeStaffAvailability(): Promise<void> {
    try {
      if (!this.useRedis) {
        console.log('USE_REDIS is false: skipping staff availability initialization');
        return;
      }
      const users = await prisma.user.findMany({
        select: { id: true },
      });

      const promises = users.map((user) =>
        this.cacheUserAvailability(user.id, true, 0)
      );

      await Promise.all(promises);
      console.log(`Initialized availability for ${users.length} staff members`);
    } catch (error) {
      console.error('Error initializing staff availability:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient && this.isConnected) {
      await this.redisClient.disconnect();
      this.isConnected = false;
      console.log('Redis client disconnected');
    }
  }
}

export default RedisRoutingService;
