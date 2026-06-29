import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as ctrl from '../controllers/user.controller';

const router = Router();

const SUPER_ADMIN = 10;
const DEVELOPER   = 20;

router.get('/',                         authenticate, requireRole(SUPER_ADMIN, DEVELOPER), ctrl.getUserList);
router.get('/:user_id',                 authenticate, requireRole(SUPER_ADMIN, DEVELOPER), ctrl.getUser);
router.patch('/:user_id',               authenticate, requireRole(SUPER_ADMIN),            ctrl.updateUser);
router.post('/:user_id/approve',        authenticate, requireRole(SUPER_ADMIN),            ctrl.approveUser);
router.post('/:user_id/reject',         authenticate, requireRole(SUPER_ADMIN),            ctrl.rejectUser);
router.post('/:user_id/reset-password', authenticate, requireRole(SUPER_ADMIN),            ctrl.resetPassword);

export default router;
