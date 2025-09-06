import { Router } from 'express';
import { syncCustomer } from '../modules/sync';

const router = Router();

router.post('/customer/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    await syncCustomer(Number(id), data);
    res.json({ status: 'synced' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
