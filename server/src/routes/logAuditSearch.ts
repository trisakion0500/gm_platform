import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/logAuditSearch.controller';

const router = Router();

/**
 * @swagger
 * /log-audit-search:
 *   get:
 *     tags: [LogAuditSearch]
 *     summary: 감사 로그 자연어 검색
 *     description: |
 *       rag_server를 통해 감사 로그(log_audit)에서 질의와 의미적으로 유사한 로그를 검색한다.
 *       GET /log-audits와 동일하게 SUPER_ADMIN/DEVELOPER/APPROVER만 호출 가능하다 — project_id
 *       있는 로그는 호출자가 role_code<=30으로 실제 배정된 프로젝트만, project_id 없는 로그는
 *       본인 소속 회사 로그만 노출된다(GET /log-audits와 동일한 스코핑 규칙). RAG_ENABLED=false인
 *       환경에서는 이 라우트 자체가 등록되지 않는다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, example: 회사 상태 변경 }
 *       - in: query
 *         name: top_k
 *         schema: { type: integer, minimum: 1, maximum: 20, example: 5 }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 - log_audit_id: 1
 *                   table_name: company
 *                   target_id: '1'
 *                   target_name: 회사A
 *                   action_type: 30
 *                   project_name: null
 *                   created_by_name: sa
 *                   created_at: '2026-08-16 10:00:00'
 *                   score: 0.81
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       503:
 *         description: rag_server 사용 불가(네트워크 오류·타임아웃·모델 로딩 중 등)
 *         content:
 *           application/json:
 *             example:
 *               result: 50002
 *               message: 문서 검색 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.
 */
router.get('/', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER), ctrl.search);

export default router;
