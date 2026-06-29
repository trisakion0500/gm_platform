import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/user.controller';

const router = Router();

router.get('/',                         authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getUserList);
router.get('/:user_id',                 authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getUser);
router.patch('/:user_id',               authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.updateUser);
router.post('/:user_id/approve',        authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.approveUser);
router.post('/:user_id/reject',         authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.rejectUser);
router.post('/:user_id/reset-password', authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.resetPassword);

export default router;
