import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as ctrl from '../controllers/project.controller';

const router = Router();

const SUPER_ADMIN = 10;
const DEVELOPER   = 20;
const APPROVER    = 30;
const OPERATOR    = 40;

router.post('/',               authenticate, requireRole(SUPER_ADMIN),                              ctrl.createProject);
router.get('/',                authenticate, requireRole(SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR), ctrl.getProjectList);
router.get('/:project_id',     authenticate, requireRole(SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR), ctrl.getProject);
router.patch('/:project_id',   authenticate, requireRole(SUPER_ADMIN),                              ctrl.updateProject);

export default router;
