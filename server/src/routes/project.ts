import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/project.controller';

const router = Router();

router.post('/',               authenticate, requireRole(ROLE.SUPER_ADMIN),                                                    ctrl.createProject);
router.get('/',                authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),      ctrl.getProjectList);
router.get('/:project_id',     authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),      ctrl.getProject);
router.patch('/:project_id',   authenticate, requireRole(ROLE.SUPER_ADMIN),                                                    ctrl.updateProject);

export default router;
