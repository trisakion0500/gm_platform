import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/apiExecution.controller';

const router = Router();

/**
 * @swagger
 * /api-executions/pending:
 *   get:
 *     tags: [ApiExecution]
 *     summary: 승인 대기 목록 조회
 *     description: |
 *       status=10(PENDING)인 실행 이력 목록을 반환한다.
 *       `api_id`, `page`, `page_size`는 필수이며, `page_size`는 20·50·100만 허용한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER
 *     parameters:
 *       - in: query
 *         name: api_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: page
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: page_size
 *         required: true
 *         schema: { type: integer, enum: [20, 50, 100], example: 20 }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 total: 1
 *                 page: 1
 *                 page_size: 20
 *                 total_pages: 1
 *                 items:
 *                   - api_execution_id: 10
 *                     api_id: 1
 *                     api_name: 아이템 지급
 *                     endpoint: /v1/game/give-item
 *                     request_user_id: 4
 *                     request_user_name: operator1
 *                     approve_user_name: null
 *                     status: 10
 *                     reject_reason: null
 *                     error_message: null
 *                     requested_at: '2025-01-01 12:00:00'
 *                     approved_at: null
 *                     executed_at: null
 *                     updated_at: '2025-01-01 12:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// /pending 은 /:api_execution_id 보다 먼저 등록해야 라우트 충돌 없음
router.get('/pending',                   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER),                              ctrl.getApiExecutionPending);

/**
 * @swagger
 * /api-executions:
 *   get:
 *     tags: [ApiExecution]
 *     summary: 실행 이력 목록 조회
 *     description: |
 *       `api_id`, `page`, `page_size`는 필수이며, `page_size`는 20·50·100만 허용한다.
 *       OPERATOR는 본인이 요청한 이력만 반환된다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: query
 *         name: api_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: page
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: page_size
 *         required: true
 *         schema: { type: integer, enum: [20, 50, 100], example: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: integer, description: '10=PENDING, 20=APPROVED, 30=REJECTED, 40=SUCCESS, 50=FAILED, 60=CANCELED' }
 *       - in: query
 *         name: required_approval_only
 *         schema: { type: integer, enum: [1], description: '1이면 실행 시점 승인 필요(is_required_approval=1) 건만 반환, 생략 시 전체' }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 total: 3
 *                 page: 1
 *                 page_size: 20
 *                 total_pages: 1
 *                 items:
 *                   - api_execution_id: 10
 *                     api_id: 1
 *                     api_name: 아이템 지급
 *                     endpoint: /v1/game/give-item
 *                     request_user_id: 4
 *                     request_user_name: operator1
 *                     approve_user_name: null
 *                     status: 10
 *                     reject_reason: null
 *                     error_message: null
 *                     requested_at: '2025-01-01 12:00:00'
 *                     approved_at: null
 *                     executed_at: null
 *                     updated_at: '2025-01-01 12:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',                          authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),               ctrl.getApiExecutionList);

/**
 * @swagger
 * /api-executions/{api_execution_id}:
 *   get:
 *     tags: [ApiExecution]
 *     summary: 실행 이력 단건 조회
 *     description: |
 *       `request_json`(요청 파라미터 JSON)과 `response_data`(응답 데이터 JSON)가 추가로 포함된다.
 *       OPERATOR는 본인 요청 이력만 조회 가능. 타인 이력 접근 시 31009 반환 (정보 은닉).
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: api_execution_id
 *         required: true
 *         schema: { type: integer, example: 10 }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 api_execution_id: 10
 *                 api_id: 1
 *                 api_name: 아이템 지급
 *                 endpoint: /v1/game/give-item
 *                 request_user_id: 4
 *                 request_user_name: operator1
 *                 approve_user_name: null
 *                 status: 10
 *                 request_json: '{"character_id":12345}'
 *                 response_data: null
 *                 reject_reason: null
 *                 error_message: null
 *                 requested_at: '2025-01-01 12:00:00'
 *                 approved_at: null
 *                 executed_at: null
 *                 updated_at: '2025-01-01 12:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:api_execution_id',         authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),               ctrl.getApiExecution);

/**
 * @swagger
 * /api-executions/{api_execution_id}/approve:
 *   post:
 *     tags: [ApiExecution]
 *     summary: 실행 승인
 *     description: |
 *       PENDING(10) 상태인 이력을 승인한다. 승인 즉시 게임 서버 API를 호출한다.
 *       - 호출 성공 → status: 40(SUCCESS)
 *       - 호출 실패 → status: 50(FAILED)
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, APPROVER
 *     parameters:
 *       - in: path
 *         name: api_execution_id
 *         required: true
 *         schema: { type: integer, example: 10 }
 *     responses:
 *       200:
 *         description: 승인 완료
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:api_execution_id/approve', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER),                              ctrl.approveApiExecution);

/**
 * @swagger
 * /api-executions/{api_execution_id}/reject:
 *   post:
 *     tags: [ApiExecution]
 *     summary: 실행 반려
 *     description: PENDING(10) 상태인 이력을 반려한다. 반려 사유를 입력할 수 있다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, APPROVER
 *     parameters:
 *       - in: path
 *         name: api_execution_id
 *         required: true
 *         schema: { type: integer, example: 10 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reject_reason]
 *             properties:
 *               reject_reason: { type: string, example: 파라미터 오류로 반려합니다. }
 *     responses:
 *       200:
 *         description: 반려 완료
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:api_execution_id/reject',  authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER),                              ctrl.rejectApiExecution);

/**
 * @swagger
 * /api-executions/{api_execution_id}/cancel:
 *   post:
 *     tags: [ApiExecution]
 *     summary: 실행 취소
 *     description: |
 *       PENDING(10) 상태인 이력을 취소한다.
 *       OPERATOR는 본인 이력만 취소 가능. 타인 이력 접근 시 31009 반환 (정보 은닉).
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: api_execution_id
 *         required: true
 *         schema: { type: integer, example: 10 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reject_reason]
 *             properties:
 *               reject_reason: { type: string, example: 사용자 요청으로 취소합니다. }
 *     responses:
 *       200:
 *         description: 취소 완료
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:api_execution_id/cancel',  authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR),               ctrl.cancelApiExecution);

export default router;
