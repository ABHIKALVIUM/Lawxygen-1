import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  generateDraftHandler,
  saveDraftHandler,
  listDraftsHandler,
  getDraftHandler,
  deleteDraftHandler,
} from '../controllers/draftController';

const router = Router();

// All draft routes require authentication
router.use(authMiddleware);

router.post('/generate', generateDraftHandler);
router.post('/save', saveDraftHandler);
router.get('/', listDraftsHandler);
router.get('/:id', getDraftHandler);
router.delete('/:id', deleteDraftHandler);

export default router;
