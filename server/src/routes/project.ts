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
 *                 has_api_key: 0
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
 * /projects/lookup:
 *   get:
 *     tags: [Project]
 *     summary: 프로젝트코드로 활성 프로젝트 조회 (인증 불필요)
 *     description: |
 *       회원가입 화면 전용 — 로그인 전 상태에서 호출한다.
 *       project_id/project_name만 반환하며, company_id 소속이면서 활성(status=1)인 프로젝트만 조회된다.
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: project_code
 *         required: true
 *         schema: { type: string, example: PROJECT_A }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 project_id: 1
 *                 project_name: 프로젝트A
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// 정적 경로라 /:project_id 보다 먼저 등록해야 함(안 그러면 "lookup" 문자열이 project_id로 잘못 매칭)
router.get('/lookup',        ctrl.getProjectByCode);

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Project]
 *     summary: 프로젝트 목록 조회
 *     description: |
 *       DEVELOPER는 본인이 역할을 가진 프로젝트만 반환된다.
 *       `page`와 `page_size`는 모두 필수이며, `page_size`는 20·30·50·100만 허용한다.
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
 *         schema: { type: integer, enum: [20, 30, 50, 100], example: 20 }
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
 *                     has_api_key: 0
 *                     created_at: '2025-01-01 00:00:00'
 *                     updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',              authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                               ctrl.getProjectList);

/**
 * @swagger
 * /projects/{project_id}:
 *   get:
 *     tags: [Project]
 *     summary: 프로젝트 단건 조회
 *     description: SUPER_ADMIN 외에는 본인이 활성 user_role을 가진 프로젝트만 조회 가능하다. 미보유 시 404(31002).
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
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
 *                 has_api_key: 0
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:project_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                               ctrl.getProject);

/**
 * @swagger
 * /projects/{project_id}:
 *   patch:
 *     tags: [Project]
 *     summary: 프로젝트 수정
 *     description: |
 *       전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *       api_base_url은 이 API가 아닌 `PATCH /projects/{project_id}/connection`으로 수정한다(SUPER_ADMIN 전용인 이 API와 달리 DEVELOPER도 호출 가능).
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
 *                 has_api_key: 0
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

/**
 * @swagger
 * /projects/{project_id}/connection:
 *   patch:
 *     tags: [Project]
 *     summary: 프로젝트 연결 정보(api_base_url) 수정
 *     description: |
 *       프로젝트의 대상 게임서버 주소(api_base_url)만 수정한다.
 *       project_code/project_name/description/status(정체성·거버넌스 필드)는 `PATCH /projects/{project_id}`(SUPER_ADMIN 전용)로 별도 관리한다.
 *       DEVELOPER는 해당 project_id에 실제 활성 DEVELOPER 배정이 있어야 통과한다(다른 프로젝트에서만 DEVELOPER인 경우 20001).
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
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
 *             required: [api_base_url]
 *             properties:
 *               api_base_url: { type: string, maxLength: 255, example: 'https://api.project-a.com' }
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
 *                 project_name: 프로젝트A
 *                 api_base_url: 'https://api.project-a.com'
 *                 description: null
 *                 status: 1
 *                 has_api_key: 0
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-02 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:project_id/connection', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                    ctrl.updateProjectConnection);

/**
 * @swagger
 * /projects/{project_id}/api-key:
 *   post:
 *     tags: [Project]
 *     summary: 프로젝트 X-API-Key 발급/재발급
 *     description: |
 *       GM Platform이 대상 서버 호출용 X-API-Key를 생성해 project.api_key에 암호화 저장한다(재발급 시 기존 키 덮어씀).
 *       평문은 이 응답에만 1회 노출된다 — 발급 즉시 복사해 외부 서버(test_game_server 등)에 직접 설정해야 하며,
 *       이후 `GET /projects/{project_id}`는 평문 대신 `has_api_key`만 반환한다.
 *       DEVELOPER는 해당 project_id에 실제 활성 DEVELOPER 배정이 있어야 통과한다(다른 프로젝트에서만 DEVELOPER인 경우 20001).
 *       `PATCH /projects/{project_id}/connection`으로 api_base_url이 바뀌면 발급된 키는 자동 폐기된다(재발급 필요).
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: project_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: 발급 성공
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
 *                 has_api_key: 1
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-02 00:00:00'
 *                 api_key: 'a1b2c3...(64자 hex, 이 응답에만 노출)'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:project_id/api-key',     authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                    ctrl.issueProjectApiKey);

export default router;
