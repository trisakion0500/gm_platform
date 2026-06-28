import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import * as ctrl from '../controllers/company.controller';

const router = Router();

const SUPER_ADMIN = 10;
const DEVELOPER   = 20;

router.post('/',              authenticate, requireRole(SUPER_ADMIN),            ctrl.createCompany);
router.get('/',               authenticate, requireRole(SUPER_ADMIN, DEVELOPER), ctrl.getCompanyList);
router.get('/:company_id',    authenticate, requireRole(SUPER_ADMIN, DEVELOPER), ctrl.getCompany);
router.patch('/:company_id',  authenticate, requireRole(SUPER_ADMIN),            ctrl.updateCompany);

export default router;
