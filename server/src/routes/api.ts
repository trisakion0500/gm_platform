import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/api.controller';
import * as execCtrl from '../controllers/apiExecution.controller';

const router = Router();

router.post('/',                        authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createApi);
router.get('/',                         authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getApiList);
router.get('/:api_id',                  authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getApi);
router.patch('/:api_id',                authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.updateApi);
router.post('/:api_id/requests',        authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createApiRequest);
router.post('/:api_id/responses',       authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createApiResponse);
router.post('/:api_id/execute',         authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), execCtrl.executeApi);

export default router;
