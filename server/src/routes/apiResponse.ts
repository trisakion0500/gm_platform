import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/apiResponse.controller';

const router = Router();

/**
 * @swagger
 * /api-responses/{api_response_id}:
 *   get:
 *     tags: [ApiResponse]
 *     summary: API 응답 파라미터 단건 조회
 *     description: 개별 파라미터 상세 조회. APPROVER·OPERATOR는 `GET /apis/{api_id}`의 `responses` 배열을 사용한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: api_response_id
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
 *                 api_response_id: 1
 *                 api_id: 1
 *                 parameter_name: result_code
 *                 parameter_label: 결과 코드
 *                 parameter_type: 2
 *                 code_group_id: 0
 *                 description: null
 *                 display_order: 1
 *                 status: 1
 *                 created_by: 1
 *                 updated_by: 1
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:api_response_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getApiResponse);

/**
 * @swagger
 * /api-responses/{api_response_id}:
 *   patch:
 *     tags: [ApiResponse]
 *     summary: API 응답 파라미터 수정
 *     description: 전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: api_response_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parameter_label: { type: string, example: 결과 코드(수정) }
 *               parameter_type:  { type: integer, description: '1=STRING, 2=NUMBER, 3=BOOLEAN, 4=DATE, 5=DATETIME, 6=JSON', example: 2 }
 *               code_group_id:   { type: integer, description: '0=사용안함', example: 0 }
 *               description:     { type: string, nullable: true, example: null }
 *               display_order:   { type: integer, example: 1 }
 *               status:          { type: integer, description: '1=사용, 0=중지', example: 1 }
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 api_response_id: 1
 *                 api_id: 1
 *                 parameter_name: result_code
 *                 parameter_label: 결과 코드(수정)
 *                 parameter_type: 2
 *                 code_group_id: 0
 *                 description: null
 *                 display_order: 1
 *                 status: 1
 *                 created_by: 1
 *                 updated_by: 2
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-02 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:api_response_id', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.updateApiResponse);

export default router;
