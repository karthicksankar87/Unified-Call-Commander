import { Router } from 'express';
import { routeCall } from '../modules/routing';

const router = Router();

router.post('/call', async (req, res) => {
  const callData = req.body;
  try {
    const result = await routeCall(callData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
