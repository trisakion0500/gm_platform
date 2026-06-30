import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/apiExecution.controller';

const router = Router();

// /pending 은 /:api_execution_id 보다 먼저 등록해야 라우트 충돌 없음
router.get('/pending',                            authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER),                              ctrl.getApiExecutionPending);
router.get('/',                                   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),               ctrl.getApiExecutionList);
router.get('/:api_execution_id',                  authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),               ctrl.getApiExecution);
router.post('/:api_execution_id/approve',         authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER),                              ctrl.approveApiExecution);
router.post('/:api_execution_id/reject',          authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER),                              ctrl.rejectApiExecution);
router.post('/:api_execution_id/cancel',          authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),               ctrl.cancelApiExecution);

export default router;
