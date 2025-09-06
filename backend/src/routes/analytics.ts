import { Router } from 'express';
import { getAnalytics } from '../modules/analytics';

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

export default router;
