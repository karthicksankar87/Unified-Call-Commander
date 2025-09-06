import { Router } from 'express';
import { automateRequest } from '../modules/automation';

const router = Router();

router.get('/inventory', async (req, res) => {
  const { itemId } = req.query;
  try {
    const result = await automateRequest('inventory_check', { itemId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
