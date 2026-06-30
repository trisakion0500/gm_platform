import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/apiRequest.controller';

const router = Router();

router.get('/:api_request_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getApiRequest);
router.patch('/:api_request_id', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.updateApiRequest);

export default router;
