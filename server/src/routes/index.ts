import { Router, Request, Response } from 'express';
import authRouter from './auth';
import companyRouter from './company';
import projectRouter from './project';
import userRouter from './user';
import userRoleRouter from './userRole';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ result: 0, data: { status: 'ok' } });
});

router.use('/auth',      authRouter);
router.use('/companies', companyRouter);
router.use('/projects',  projectRouter);
router.use('/users',      userRouter);
router.use('/user-roles', userRoleRouter);

export default router;
