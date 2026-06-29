import { Router, Request, Response } from 'express';
import authRouter from './auth';
import companyRouter from './company';
import projectRouter from './project';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ result: 0, data: { status: 'ok' } });
});

router.use('/auth',      authRouter);
router.use('/companies', companyRouter);
router.use('/projects',  projectRouter);

export default router;
