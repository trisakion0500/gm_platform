import { Router, Request, Response } from 'express';
import { env } from '../config/env';
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
import docSearchRouter from './docSearch';
import apiSearchRouter from './apiSearch';
import logAuditSearchRouter from './logAuditSearch';
import internalRouter from './internal';

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
// RAG_ENABLED=false면 rag_server를 쓰지 않는 환경으로 간주해 라우트 자체를 등록하지 않는다(SWAGGER_ENABLED 조건부 로드와 동일 패턴, app.ts 참고)
if (env.rag.enabled) {
  router.use('/doc-search', docSearchRouter);
  router.use('/api-search', apiSearchRouter);
  router.use('/log-audit-search', logAuditSearchRouter);
  // rag_server가 gm_apis 자가치유(부팅 시)·build-index-apis에서 pull하는 내부 전용 경로 — RAG 미사용 환경에선 무의미해 함께 미등록
  router.use('/internal', internalRouter);
}

export default router;
