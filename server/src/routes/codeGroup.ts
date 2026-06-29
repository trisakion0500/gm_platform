import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/codeGroup.controller';

const router = Router();

router.post('/',                            authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createCodeGroup);
router.get('/',                             authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeGroupList);
router.get('/:code_group_id',               authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeGroup);
router.patch('/:code_group_id',             authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.updateCodeGroup);
router.get('/:code_group_id/active-items',  authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getActiveCodeItems);

export default router;
