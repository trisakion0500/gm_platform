import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/codeItem.controller';

const router = Router();

router.post('/',                 authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createCodeItem);
router.get('/',                  authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeItemList);
router.get('/:code_item_id',     authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeItem);
router.patch('/:code_item_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.updateCodeItem);

export default router;
