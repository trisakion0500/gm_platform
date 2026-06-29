import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/userRole.controller';

const router = Router();

router.get('/',                          authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getUserRoleList);
router.post('/',                         authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.createUserRole);
router.patch('/:user_id/:project_id',    authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.updateUserRole);

export default router;
