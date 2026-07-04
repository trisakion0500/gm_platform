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

// API 실행 테스트용 mock 엔드포인트 — 요청 내용과 무관하게 항상 고정된 100행을 반환한다.
// 실제 외부 API들은 모두 { result, message, data: [...] } 봉투를 쓰기로 했으므로 이 형태를 그대로 흉내낸다.
// data는 항상 배열 — response_view_type=KEY_VALUE(1)는 data[0]을 단일 객체로, GRID(2)는 data 전체를 행 목록으로 사용한다.
// 필드명(re01~re07)은 테스트 API(api_id 185/186)의 api_response 정의에 맞춘 것 — 다른 API로 테스트할 땐 맞춰서 조정 필요.
router.post('/mock-external', (_req: Request, res: Response) => {
  const data = Array.from({ length: 100 }, (_, i) => {
    const n = i + 1;
    const date = `2026-07-${String((i % 28) + 1).padStart(2, '0')}`;
    return {
      re01: `row-${n}`,
      re07: n % 2 === 0 ? 'M' : 'F',
      re02: n * 10,
      re03: n % 2 === 0,
      re04: date,
      re05: `${date} 09:00:00`,
      re06: `${date} 09:00:00`,
    };
  });
  res.json({ result: 0, message: 'OK', data });
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

export default router;
