import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/logAudit.controller';

const router = Router();

router.get('/',                authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER), ctrl.getLogAuditList);
router.get('/:log_audit_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER), ctrl.getLogAudit);

export default router;
