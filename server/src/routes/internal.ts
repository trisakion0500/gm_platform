import { Router } from 'express';
import { ragKeyAuth } from '../middleware/ragKeyAuth';
import * as ctrl from '../controllers/internal.controller';

const router = Router();

router.use(ragKeyAuth);

router.get('/apis', ctrl.getAllApis);
router.get('/log-audits', ctrl.getAllLogAudits);

export default router;
