import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/user.controller';

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [User]
 *     summary: 사용자 목록 조회
 *     description: |
 *       DEVELOPER는 본인 소속 회사 사용자만 반환된다.
 *       `page`와 `page_size`는 모두 필수이며, `page_size`는 20·50·100만 허용한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
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
 *         name: status
 *         schema: { type: integer, description: '0=가입승인대기, 1=정상, 2=가입반려, 3=사용중지' }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 total: 4
 *                 page: 1
 *                 page_size: 20
 *                 total_pages: 1
 *                 items:
 *                   - user_id: 1
 *                     company_id: 1
 *                     company_code: NEXON
 *                     company_name: 넥슨
 *                     login_id: sa
 *                     user_name: 관리자
 *                     email: sa@example.com
 *                     status: 1
 *                     role_code: 10
 *                     last_login_at: '2025-01-01 12:00:00'
 *                     created_at: '2025-01-01 00:00:00'
 *                     updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',                         authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getUserList);

/**
 * @swagger
 * /users/{user_id}:
 *   get:
 *     tags: [User]
 *     summary: 사용자 단건 조회
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: user_id
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
 *                 user_id: 1
 *                 company_id: 1
 *                 company_code: NEXON
 *                 company_name: 넥슨
 *                 requested_project_id: null
 *                 login_id: sa
 *                 user_name: 관리자
 *                 email: sa@example.com
 *                 status: 1
 *                 role_code: 10
 *                 last_login_at: '2025-01-01 12:00:00'
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:user_id',                 authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getUser);

/**
 * @swagger
 * /users/{user_id}:
 *   patch:
 *     tags: [User]
 *     summary: 사용자 정보 수정
 *     description: 전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_name: { type: string, example: 홍길동 }
 *               email:     { type: string, format: email, example: new@example.com }
 *               role_code: { type: integer, description: '10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR', example: 20 }
 *               status:    { type: integer, description: '1=정상, 3=사용중지', example: 1 }
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 user_id: 2
 *                 company_id: 1
 *                 login_id: john
 *                 user_name: 홍길동
 *                 email: new@example.com
 *                 status: 1
 *                 role_code: 20
 *                 last_login_at: null
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-02 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:user_id',               authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.updateUser);

/**
 * @swagger
 * /users/{user_id}/approve:
 *   post:
 *     tags: [User]
 *     summary: 가입 승인
 *     description: 사용자 상태를 0(대기) → 1(정상)으로 변경한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer, example: 5 }
 *     responses:
 *       200:
 *         description: 승인 성공
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
router.post('/:user_id/approve',        authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.approveUser);

/**
 * @swagger
 * /users/{user_id}/reject:
 *   post:
 *     tags: [User]
 *     summary: 가입 반려
 *     description: 사용자 상태를 0(대기) → 2(반려)로 변경한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer, example: 5 }
 *     responses:
 *       200:
 *         description: 반려 성공
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
router.post('/:user_id/reject',         authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.rejectUser);

/**
 * @swagger
 * /users/{user_id}/reset-password:
 *   post:
 *     tags: [User]
 *     summary: 비밀번호 강제 초기화
 *     description: 비밀번호를 초기화하고 모든 세션을 종료한다. 초기화된 비밀번호는 응답으로 반환된다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer, example: 5 }
 *     responses:
 *       200:
 *         description: 초기화 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 temp_password: Ab3!xY9z
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:user_id/reset-password', authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.resetPassword);

export default router;
