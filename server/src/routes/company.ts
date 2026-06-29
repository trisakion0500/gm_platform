import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/company.controller';

const router = Router();

router.post('/',              authenticate, requireRole(ROLE.SUPER_ADMIN),                        ctrl.createCompany);
router.get('/',               authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),        ctrl.getCompanyList);
router.get('/:company_id',    authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),        ctrl.getCompany);
router.patch('/:company_id',  authenticate, requireRole(ROLE.SUPER_ADMIN),                        ctrl.updateCompany);

export default router;
