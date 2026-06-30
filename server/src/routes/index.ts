import { Router, Request, Response } from 'express';
import authRouter from './auth';
import companyRouter from './company';
import projectRouter from './project';
import userRouter from './user';
import userRoleRouter from './userRole';
import codeGroupRouter from './codeGroup';
import codeItemRouter from './codeItem';
import apiRouter from './api';
import apiRequestRouter from './apiRequest';
import apiResponseRouter from './apiResponse';
import apiExecutionRouter from './apiExecution';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ result: 0, data: { status: 'ok' } });
});

// API 실행 테스트용 mock 엔드포인트 — 항상 성공 응답 반환
router.post('/mock-external', (_req: Request, res: Response) => {
  res.json({ result: 0, data: {} });
});

router.use('/auth',          authRouter);
router.use('/companies',     companyRouter);
router.use('/projects',      projectRouter);
router.use('/users',         userRouter);
router.use('/user-roles',    userRoleRouter);
router.use('/code-groups',   codeGroupRouter);
router.use('/code-items',    codeItemRouter);
router.use('/apis',          apiRouter);
router.use('/api-requests',   apiRequestRouter);
router.use('/api-responses',  apiResponseRouter);
router.use('/api-executions', apiExecutionRouter);

export default router;
