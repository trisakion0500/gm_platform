import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/project.controller';

const router = Router();

/**
 * @swagger
 * /projects:
 *   post:
 *     tags: [Project]
 *     summary: 프로젝트 등록
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, project_code, project_name, api_base_url]
 *             properties:
 *               company_id:   { type: integer, example: 1 }
 *               project_code: { type: string, pattern: '^[a-zA-Z0-9_.-]+$', maxLength: 20, description: '영문, 숫자, _, ., - 만 허용, 최대 20자', example: PROJECT_A }
 *               project_name: { type: string, maxLength: 100, example: 프로젝트A }
 *               api_base_url: { type: string, maxLength: 255, example: 'https://api.project-a.com' }
 *               description:  { type: string, nullable: true, maxLength: 1000, example: 2D 횡스크롤 MMORPG }
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 project_id: 1
 *                 company_id: 1
 *                 company_code: COMPANY_A
 *                 company_name: 회사A
 *                 project_code: PROJECT_A
 *                 project_name: 프로젝트A
 *                 api_base_url: 'https://api.project-a.com'
 *                 description: 2D 횡스크롤 MMORPG
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
router.post('/',             authenticate, requireRole(ROLE.SUPER_ADMIN),                                               ctrl.createProject);

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Project]
 *     summary: 프로젝트 목록 조회
 *     description: |
 *       DEVELOPER·APPROVER·OPERATOR는 본인이 역할을 가진 프로젝트만 반환된다.
 *       `page`와 `page_size`는 모두 필수이며, `page_size`는 20·50·100만 허용한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
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
 *         schema: { type: integer, description: '1=사용, 0=중지', example: 1 }
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
 *                   - project_id: 1
 *                     company_id: 1
 *                     company_code: COMPANY_A
 *                     company_name: 회사A
 *                     project_code: PROJECT_A
 *                     project_name: 프로젝트A
 *                     api_base_url: 'https://api.project-a.com'
 *                     description: null
 *                     status: 1
 *                     created_at: '2025-01-01 00:00:00'
 *                     updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',              authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getProjectList);

/**
 * @swagger
 * /projects/{project_id}:
 *   get:
 *     tags: [Project]
 *     summary: 프로젝트 단건 조회
 *     description: SUPER_ADMIN 외에는 본인이 활성 user_role을 가진 프로젝트만 조회 가능하다. 미보유 시 404(31002).
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
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
 *                 project_id: 1
 *                 company_id: 1
 *                 company_code: COMPANY_A
 *                 company_name: 회사A
 *                 project_code: PROJECT_A
 *                 project_name: 프로젝트A
 *                 api_base_url: 'https://api.project-a.com'
 *                 description: null
 *                 status: 1
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:project_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getProject);

/**
 * @swagger
 * /projects/{project_id}:
 *   patch:
 *     tags: [Project]
 *     summary: 프로젝트 수정
 *     description: 전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     parameters:
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
 *               project_code: { type: string, pattern: '^[a-zA-Z0-9_.-]+$', maxLength: 20, description: '영문, 숫자, _, ., - 만 허용, 최대 20자', example: PROJECT_A }
 *               project_name: { type: string, maxLength: 100, example: 프로젝트A }
 *               api_base_url: { type: string, maxLength: 255, example: 'https://api.project-a.com' }
 *               description:  { type: string, nullable: true, maxLength: 1000, example: null }
 *               status:       { type: integer, description: '1=사용, 0=중지', example: 1 }
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 project_id: 1
 *                 company_id: 1
 *                 company_code: COMPANY_A
 *                 company_name: 회사A
 *                 project_code: PROJECT_A
 *                 project_name: 프로젝트A2
 *                 api_base_url: 'https://api.project-a.com'
 *                 description: null
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
router.patch('/:project_id', authenticate, requireRole(ROLE.SUPER_ADMIN),                                               ctrl.updateProject);

export default router;
