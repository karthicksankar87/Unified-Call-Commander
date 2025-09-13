import { Client } from '@elastic/elasticsearch';
import { PrismaClient } from '@prisma/client';

const esClient = new Client({ node: 'http://localhost:9200' });
const prisma = new PrismaClient();

export const getAnalytics = async (metric: string, range: any): Promise<any> => {
  // Legacy Elasticsearch implementation (kept for backward compatibility if ES is populated)
  const result = await esClient.search({
    index: 'call-logs',
    query: { range: { timestamp: range } },
    aggs: { [metric]: { avg: { field: 'duration' } } },
  });
  return result.aggregations;
};

export interface AnalyticsSummary {
  totalCallsToday: number;
  activeCallsNow: number;
  completedCallsToday: number;
  avgHandleTimeSecondsToday: number | null;
  activeStaffNow: number;
  locationStats: Array<{
    location: string;
    callsToday: number;
    avgHandleTimeSecondsToday: number | null;
  }>;
  reasons: Array<{
    name: string; // callType
    value: number; // count today
  }>;
}

export const getAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parallel queries
  const [
    totalCalls,
    activeCalls,
    completedCalls,
    avgCompletedDuration,
    activeCallUsers,
    callsTodayForLocations,
    callsTodayForReasons,
  ] = await Promise.all([
    prisma.call.count({ where: { timestamp: { gte: today } } }),
    prisma.call.count({ where: { status: 'active' } }),
    prisma.call.count({ where: { status: 'completed', timestamp: { gte: today } } }),
    prisma.call.aggregate({
      _avg: { duration: true },
      where: { status: 'completed', timestamp: { gte: today } },
    }),
    prisma.call.findMany({
      where: {
        status: { in: ['active', 'assigned'] },
        NOT: { routedToUserId: null },
      },
      select: { routedToUserId: true },
    }),
    prisma.call.findMany({
      where: { timestamp: { gte: today } },
      select: { location: true, duration: true, status: true },
    }),
    prisma.call.findMany({
      where: { timestamp: { gte: today } },
      select: { callType: true },
    }),
  ]);

  const activeStaffSet = new Set<number>();
  activeCallUsers.forEach((c) => {
    if (c.routedToUserId != null) activeStaffSet.add(c.routedToUserId);
  });

  // Location stats
  const locMap = new Map<string, { count: number; durSum: number; durCount: number }>();
  for (const c of callsTodayForLocations) {
    const loc = c.location || 'General';
    const entry = locMap.get(loc) || { count: 0, durSum: 0, durCount: 0 };
    entry.count += 1;
    if (c.status === 'completed' && typeof c.duration === 'number') {
      entry.durSum += c.duration;
      entry.durCount += 1;
    }
    locMap.set(loc, entry);
  }
  const locationStats = Array.from(locMap.entries())
    .map(([location, { count, durSum, durCount }]) => ({
      location,
      callsToday: count,
      avgHandleTimeSecondsToday: durCount > 0 ? Math.round(durSum / durCount) : null,
    }))
    .sort((a, b) => b.callsToday - a.callsToday)
    .slice(0, 10);

  // Reasons (callType) distribution
  const reasonCount = new Map<string, number>();
  for (const c of callsTodayForReasons) {
    const key = c.callType || 'UNKNOWN';
    reasonCount.set(key, (reasonCount.get(key) || 0) + 1);
  }
  const reasons = Array.from(reasonCount.entries()).map(([name, value]) => ({ name, value }));

  return {
    totalCallsToday: totalCalls,
    activeCallsNow: activeCalls,
    completedCallsToday: completedCalls,
    avgHandleTimeSecondsToday: avgCompletedDuration._avg.duration
      ? Math.round(avgCompletedDuration._avg.duration)
      : null,
    activeStaffNow: activeStaffSet.size,
    locationStats,
    reasons,
  };
};
