import { Router } from 'express';
import { getAnalytics, getAnalyticsSummary } from '../modules/analytics';

const router = Router();

router.get('/', async (req, res) => {
  const { metric, range } = req.query;
  try {
    const result = await getAnalytics(metric as string, { gte: range });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Real-time analytics summary (DB-backed)
router.get('/summary', async (_req, res) => {
  try {
    const summary = await getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

export default router;
