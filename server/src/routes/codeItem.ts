import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/codeItem.controller';

const router = Router();

/**
 * @swagger
 * /code-items:
 *   post:
 *     tags: [CodeItem]
 *     summary: 코드 아이템 등록
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code_group_id, code_value, code_name, display_order]
 *             properties:
 *               code_group_id: { type: integer, example: 1 }
 *               code_value:    { type: string, example: M }
 *               code_name:     { type: string, example: 남성 }
 *               description:   { type: string, nullable: true, example: null }
 *               display_order: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 code_item_id: 1
 *                 code_group_id: 1
 *                 code_value: M
 *                 code_name: 남성
 *                 description: null
 *                 display_order: 1
 *                 status: 1
 *                 created_by: 1
 *                 updated_by: 1
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/',               authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createCodeItem);

/**
 * @swagger
 * /code-items:
 *   get:
 *     tags: [CodeItem]
 *     summary: 코드 아이템 목록 조회
 *     description: "`code_group_id`는 필수 쿼리 파라미터이다."
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: query
 *         name: code_group_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: status
 *         schema: { type: integer, description: '1=사용, 0=중지' }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 - code_item_id: 1
 *                   code_group_id: 1
 *                   code_value: M
 *                   code_name: 남성
 *                   description: null
 *                   display_order: 1
 *                   status: 1
 *                   created_by: 1
 *                   updated_by: 1
 *                   created_at: '2025-01-01 00:00:00'
 *                   updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',                authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeItemList);

/**
 * @swagger
 * /code-items/{code_item_id}:
 *   get:
 *     tags: [CodeItem]
 *     summary: 코드 아이템 단건 조회
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: code_item_id
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
 *                 code_item_id: 1
 *                 code_group_id: 1
 *                 code_value: M
 *                 code_name: 남성
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
router.get('/:code_item_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeItem);

/**
 * @swagger
 * /code-items/{code_item_id}:
 *   patch:
 *     tags: [CodeItem]
 *     summary: 코드 아이템 수정
 *     description: 전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: code_item_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code_name:     { type: string, example: 남성(수정) }
 *               description:   { type: string, nullable: true, example: null }
 *               display_order: { type: integer, example: 1 }
 *               status:        { type: integer, description: '1=사용, 0=중지', example: 1 }
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 code_item_id: 1
 *                 code_group_id: 1
 *                 code_value: M
 *                 code_name: 남성(수정)
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
router.patch('/:code_item_id', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.updateCodeItem);

export default router;
