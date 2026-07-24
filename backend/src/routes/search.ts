import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { searchHandler } from '../controllers/searchController';

const router = Router();

router.use(authMiddleware);
router.post('/query', searchHandler);

export default router;
