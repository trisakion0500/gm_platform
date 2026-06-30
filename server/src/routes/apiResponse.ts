import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/apiResponse.controller';

const router = Router();

router.get('/:api_response_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getApiResponse);
router.patch('/:api_response_id', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.updateApiResponse);

export default router;
