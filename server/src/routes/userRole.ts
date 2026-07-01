import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/userRole.controller';

const router = Router();

/**
 * @swagger
 * /user-roles:
 *   get:
 *     tags: [UserRole]
 *     summary: 사용자 역할 목록 조회
 *     description: |
 *       특정 사용자 또는 프로젝트의 역할 목록을 조회한다.
 *       `user_id` 또는 `project_id` 중 하나 이상을 전달해야 한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: integer, example: 2 }
 *       - in: query
 *         name: project_id
 *         schema: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 - user_id: 2
 *                   login_id: dev
 *                   user_name: 개발자
 *                   project_id: 1
 *                   project_code: MAPLESTORY
 *                   project_name: 메이플스토리
 *                   role_code: 20
 *                   status: 1
 *                   created_at: '2025-01-01 00:00:00'
 *                   updated_at: '2025-01-01 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',                       authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.getUserRoleList);

/**
 * @swagger
 * /user-roles:
 *   post:
 *     tags: [UserRole]
 *     summary: 사용자 역할 등록
 *     description: 사용자에게 특정 프로젝트의 역할을 부여한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, project_id, role_code]
 *             properties:
 *               user_id:    { type: integer, example: 2 }
 *               project_id: { type: integer, example: 1 }
 *               role_code:  { type: integer, description: '20=DEVELOPER, 30=APPROVER, 40=OPERATOR', example: 20 }
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 user_id: 2
 *                 login_id: dev
 *                 user_name: 개발자
 *                 project_id: 1
 *                 project_code: MAPLESTORY
 *                 project_name: 메이플스토리
 *                 role_code: 20
 *                 status: 1
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/',                      authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.createUserRole);

/**
 * @swagger
 * /user-roles/{user_id}/{project_id}:
 *   patch:
 *     tags: [UserRole]
 *     summary: 사용자 역할 수정
 *     description: 전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema: { type: integer, example: 2 }
 *       - in: path
 *         name: project_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role_code: { type: integer, description: '20=DEVELOPER, 30=APPROVER, 40=OPERATOR', example: 30 }
 *               status:    { type: integer, description: '1=사용, 0=중지', example: 1 }
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 user_id: 2
 *                 login_id: dev
 *                 user_name: 개발자
 *                 project_id: 1
 *                 project_code: MAPLESTORY
 *                 project_name: 메이플스토리
 *                 role_code: 30
 *                 status: 1
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-02 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:user_id/:project_id', authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.updateUserRole);

export default router;
