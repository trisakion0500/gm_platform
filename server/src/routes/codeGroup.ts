import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/codeGroup.controller';

const router = Router();

/**
 * @swagger
 * /code-groups:
 *   post:
 *     tags: [CodeGroup]
 *     summary: 코드 그룹 등록
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project_id, code_group_code, code_group_name]
 *             properties:
 *               project_id:      { type: integer, example: 1 }
 *               code_group_code: { type: string, example: GENDER }
 *               code_group_name: { type: string, example: 성별 }
 *               description:     { type: string, nullable: true, example: 성별 코드 }
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 code_group_id: 1
 *                 project_id: 1
 *                 code_group_code: GENDER
 *                 code_group_name: 성별
 *                 description: 성별 코드
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
router.post('/',                           authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createCodeGroup);

/**
 * @swagger
 * /code-groups:
 *   get:
 *     tags: [CodeGroup]
 *     summary: 코드 그룹 목록 조회
 *     description: "`project_id`는 필수 쿼리 파라미터이다."
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: query
 *         name: project_id
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
 *                 - code_group_id: 1
 *                   project_id: 1
 *                   code_group_code: GENDER
 *                   code_group_name: 성별
 *                   description: null
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
router.get('/',                            authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeGroupList);

/**
 * @swagger
 * /code-groups/active-with-items:
 *   get:
 *     tags: [CodeGroup]
 *     summary: 프로젝트의 활성 코드그룹 + 활성 아이템 일괄 조회
 *     description: |
 *       프로젝트 내 status=1인 코드그룹과, 각 그룹의 status=1인 아이템을 한 번에 반환한다.
 *       `/admin/code-groups`(SUPER_ADMIN/DEVELOPER 전용 관리 화면)에 접근할 수 없는 APPROVER/OPERATOR가
 *       API Request/Response의 SELECT·RADIO·CHECKBOX 값을 참조하기 위한 조회 전용 경로이다.
 *       반드시 `/:code_group_id` 라우트보다 먼저 등록해야 한다(그렇지 않으면 "active-with-items"가 code_group_id로 잘못 매칭됨).
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: query
 *         name: project_id
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
 *                 items:
 *                   - code_group_id: 1
 *                     code_group_code: GENDER
 *                     code_group_name: 성별
 *                     items:
 *                       - code_value: M
 *                         code_name: 남성
 *                       - code_value: F
 *                         code_name: 여성
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/active-with-items',           authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getActiveCodeGroupsWithItems);

/**
 * @swagger
 * /code-groups/{code_group_id}:
 *   get:
 *     tags: [CodeGroup]
 *     summary: 코드 그룹 단건 조회
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: code_group_id
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
 *                 code_group_id: 1
 *                 project_id: 1
 *                 code_group_code: GENDER
 *                 code_group_name: 성별
 *                 description: null
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
router.get('/:code_group_id',              authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCodeGroup);

/**
 * @swagger
 * /code-groups/{code_group_id}:
 *   patch:
 *     tags: [CodeGroup]
 *     summary: 코드 그룹 수정
 *     description: 전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: code_group_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code_group_name: { type: string, example: 성별 코드 }
 *               description:     { type: string, nullable: true, example: null }
 *               status:          { type: integer, description: '1=사용, 0=중지', example: 1 }
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 code_group_id: 1
 *                 project_id: 1
 *                 code_group_code: GENDER
 *                 code_group_name: 성별 코드
 *                 description: null
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
router.patch('/:code_group_id',            authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.updateCodeGroup);

/**
 * @swagger
 * /code-groups/{code_group_id}/active-items:
 *   get:
 *     tags: [CodeGroup]
 *     summary: 활성 코드 아이템 목록 조회
 *     description: 해당 코드 그룹에서 status=1인 아이템만 code_value, code_name 두 필드로 반환한다. SELECT·RADIO·CHECKBOX 컴포넌트 데이터 소스용.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: code_group_id
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
 *                 - code_value: M
 *                   code_name: 남성
 *                 - code_value: F
 *                   code_name: 여성
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:code_group_id/active-items', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getActiveCodeItems);

export default router;
