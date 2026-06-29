import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as ctrl from '../controllers/userRole.controller';

const router = Router();

const SUPER_ADMIN = 10;

router.get('/',                          authenticate, requireRole(SUPER_ADMIN), ctrl.getUserRoleList);
router.post('/',                         authenticate, requireRole(SUPER_ADMIN), ctrl.createUserRole);
router.patch('/:user_id/:project_id',    authenticate, requireRole(SUPER_ADMIN), ctrl.updateUserRole);

export default router;
