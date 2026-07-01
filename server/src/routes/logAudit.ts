import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/logAudit.controller';

const router = Router();

/**
 * @swagger
 * /log-audits:
 *   get:
 *     tags: [LogAudit]
 *     summary: 감사 로그 목록 조회
 *     description: |
 *       `page`와 `page_size`는 모두 필수이며, `page_size`는 20·50·100만 허용한다.
 *       DEVELOPER·APPROVER는 본인 소속 회사 로그만 반환된다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER
 *     parameters:
 *       - in: query
 *         name: page
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: page_size
 *         required: true
 *         schema: { type: integer, enum: [20, 50, 100], example: 20 }
 *       - in: query
 *         name: table_name
 *         schema: { type: string, example: company, description: '대상 테이블명 필터' }
 *       - in: query
 *         name: action_type
 *         schema: { type: integer, description: '10=CREATE, 20=UPDATE, 30=STATUS_CHANGE' }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 total: 10
 *                 page: 1
 *                 page_size: 20
 *                 total_pages: 1
 *                 items:
 *                   - log_audit_id: 1
 *                     company_id: 1
 *                     project_id: null
 *                     table_name: company
 *                     target_id: '1'
 *                     target_name: 넥슨
 *                     action_type: 10
 *                     created_by: 1
 *                     created_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',              authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER), ctrl.getLogAuditList);

/**
 * @swagger
 * /log-audits/{log_audit_id}:
 *   get:
 *     tags: [LogAudit]
 *     summary: 감사 로그 단건 조회
 *     description: |
 *       `before_json`(변경 전)과 `after_json`(변경 후) 데이터가 추가로 포함된다.
 *       CREATE 작업의 경우 `before_json`은 null이다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER
 *     parameters:
 *       - in: path
 *         name: log_audit_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 log_audit_id: 1
 *                 company_id: 1
 *                 project_id: null
 *                 table_name: company
 *                 target_id: '1'
 *                 target_name: 넥슨
 *                 action_type: 10
 *                 before_json: null
 *                 after_json: '{"company_name":"넥슨","status":1}'
 *                 created_by: 1
 *                 created_at: '2025-01-01 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:log_audit_id', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER), ctrl.getLogAudit);

export default router;
