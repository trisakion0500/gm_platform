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
import logAuditRouter from './logAudit';
import mockRouter from './mock';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: 서버 상태 확인
 *     responses:
 *       200:
 *         description: 정상
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 status: ok
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ result: 0, data: { status: 'ok' } });
});

// API 실행 테스트용 mock 엔드포인트 모음 — 테스트 API가 여러 개 생길 수 있어 routes/mock.ts로 분리했다.
router.use('/',              mockRouter);

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
router.use('/log-audits',    logAuditRouter);

export default router;
