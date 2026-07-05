import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/api.controller';
import * as execCtrl from '../controllers/apiExecution.controller';

const router = Router();

/**
 * @swagger
 * /apis:
 *   post:
 *     tags: [Api]
 *     summary: API 등록
 *     description: |
 *       `api_stage`는 항상 **20(개발)**으로 생성된다. 등록 시 직접 지정 불가.
 *       스테이징(30)·운영(40)으로 승급하려면 `PATCH /apis/{api_id}`를 사용한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project_id, api_code, api_name, endpoint, is_required_approval, response_view_type]
 *             properties:
 *               project_id:           { type: integer, example: 1 }
 *               api_code:             { type: string, example: GIVE_ITEM }
 *               api_name:             { type: string, example: 아이템 지급 }
 *               endpoint:             { type: string, example: /v1/game/give-item }
 *               description:          { type: string, nullable: true, example: null }
 *               is_required_approval: { type: integer, description: '0=즉시실행, 1=승인필요', example: 1 }
 *               response_view_type:   { type: integer, description: '1=KEY_VALUE, 2=GRID', example: 1 }
 *               display_order:        { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 api_id: 1
 *                 project_id: 1
 *                 api_code: GIVE_ITEM
 *                 api_name: 아이템 지급
 *                 endpoint: /v1/game/give-item
 *                 description: null
 *                 api_stage: 20
 *                 is_required_approval: 1
 *                 response_view_type: 1
 *                 status: 1
 *                 display_order: 1
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
router.post('/',           authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.createApi);

/**
 * @swagger
 * /apis:
 *   get:
 *     tags: [Api]
 *     summary: API 목록 조회
 *     description: |
 *       `project_id`, `page`, `page_size`는 필수이며, `page_size`는 20·30·50·100만 허용한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema: { type: integer, example: 1 }
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
 *         schema: { type: integer, description: '1=사용, 0=중지' }
 *       - in: query
 *         name: api_stage
 *         schema: { type: integer, description: '20=개발, 30=스테이징, 40=운영' }
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
 *                   - api_id: 1
 *                     project_id: 1
 *                     api_code: GIVE_ITEM
 *                     api_name: 아이템 지급
 *                     endpoint: /v1/game/give-item
 *                     description: null
 *                     api_stage: 20
 *                     is_required_approval: 1
 *                     response_view_type: 1
 *                     status: 1
 *                     display_order: 1
 *                     created_by: 1
 *                     updated_by: 1
 *                     created_at: '2025-01-01 00:00:00'
 *                     updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/',            authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getApiList);

/**
 * @swagger
 * /apis/active:
 *   get:
 *     tags: [Api]
 *     summary: 사이드바 API 메뉴용 활성 API 전체 조회 (페이지네이션 없음)
 *     description: 프로젝트의 활성(status=1) API 전체를 한 번에 반환한다. 페이지네이션 없이 `api_id`/`api_name`/`api_stage`만 포함.
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
 *                 - api_id: 1
 *                   api_name: 아이템 지급
 *                   api_stage: 20
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
// 정적 경로라 /:api_id 보다 먼저 등록해야 함(안 그러면 "active"가 api_id로 잘못 매칭)
router.get('/active',      authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getActiveApis);

/**
 * @swagger
 * /apis/{api_id}:
 *   get:
 *     tags: [Api]
 *     summary: API 단건 조회
 *     description: API 기본 정보와 함께 `requests`(요청 파라미터 목록), `responses`(응답 파라미터 목록)를 함께 반환한다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: api_id
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
 *                 api_id: 1
 *                 project_id: 1
 *                 api_code: GIVE_ITEM
 *                 api_name: 아이템 지급
 *                 endpoint: /v1/game/give-item
 *                 description: null
 *                 api_stage: 20
 *                 is_required_approval: 1
 *                 response_view_type: 1
 *                 status: 1
 *                 display_order: 1
 *                 created_by: 1
 *                 updated_by: 1
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *                 requests:
 *                   - api_request_id: 1
 *                     parameter_name: character_id
 *                     parameter_label: 캐릭터 ID
 *                     parameter_type: 2
 *                     component_type: 2
 *                     code_group_id: 0
 *                     is_required: 1
 *                     display_order: 1
 *                     status: 1
 *                 responses:
 *                   - api_response_id: 1
 *                     parameter_name: result_code
 *                     parameter_label: 결과 코드
 *                     parameter_type: 2
 *                     code_group_id: 0
 *                     display_order: 1
 *                     status: 1
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:api_id',     authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getApi);

/**
 * @swagger
 * /apis/{api_id}:
 *   patch:
 *     tags: [Api]
 *     summary: API 수정
 *     description: |
 *       전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *
 *       **롤백 트리거**: `api_code`, `endpoint`, `is_required_approval`, `response_view_type` 중 하나라도 변경되면
 *       `api_stage`가 강제로 **20(개발)**으로 롤백된다. `i_api_stage` 값을 함께 전달해도 무시된다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: api_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               api_name:             { type: string, example: 아이템 지급(수정) }
 *               endpoint:             { type: string, example: /v2/game/give-item }
 *               description:          { type: string, nullable: true, example: null }
 *               api_stage:            { type: integer, description: '20=개발, 30=스테이징, 40=운영', example: 30 }
 *               is_required_approval: { type: integer, description: '0=즉시실행, 1=승인필요', example: 1 }
 *               response_view_type:   { type: integer, description: '1=KEY_VALUE, 2=GRID', example: 1 }
 *               status:               { type: integer, description: '1=사용, 0=중지', example: 1 }
 *               display_order:        { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: 수정 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 api_id: 1
 *                 api_stage: 20
 *                 updated_at: '2025-01-02 00:00:00'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:api_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER),                              ctrl.updateApi);

/**
 * @swagger
 * /apis/{api_id}/requests:
 *   post:
 *     tags: [Api]
 *     summary: API 요청 파라미터 등록
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: api_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parameter_name, parameter_label, parameter_type, component_type, is_required, display_order]
 *             properties:
 *               parameter_name:  { type: string, example: character_id }
 *               parameter_label: { type: string, example: 캐릭터 ID }
 *               parameter_type:  { type: integer, description: '1=STRING, 2=NUMBER, 3=BOOLEAN, 4=DATE, 5=DATETIME, 6=JSON', example: 2 }
 *               component_type:  { type: integer, description: '1=TEXT, 2=NUMBER, 3=DATE, 4=DATETIME, 5=SELECT, 6=RADIO, 7=CHECKBOX', example: 2 }
 *               code_group_id:   { type: integer, description: '0=사용안함. SELECT·RADIO·CHECKBOX 시 필수', example: 0 }
 *               is_required:     { type: integer, description: '0=선택, 1=필수', example: 1 }
 *               description:     { type: string, nullable: true, example: null }
 *               display_order:   { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 api_request_id: 1
 *                 api_id: 1
 *                 parameter_name: character_id
 *                 parameter_label: 캐릭터 ID
 *                 parameter_type: 2
 *                 component_type: 2
 *                 code_group_id: 0
 *                 is_required: 1
 *                 description: null
 *                 display_order: 1
 *                 status: 1
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:api_id/requests',  authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.createApiRequest);

/**
 * @swagger
 * /apis/{api_id}/responses:
 *   post:
 *     tags: [Api]
 *     summary: API 응답 파라미터 등록
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER
 *     parameters:
 *       - in: path
 *         name: api_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parameter_name, parameter_label, parameter_type, display_order]
 *             properties:
 *               parameter_name:  { type: string, example: result_code }
 *               parameter_label: { type: string, example: 결과 코드 }
 *               parameter_type:  { type: integer, description: '1=STRING, 2=NUMBER, 3=BOOLEAN, 4=DATE, 5=DATETIME, 6=JSON', example: 2 }
 *               code_group_id:   { type: integer, description: '0=사용안함', example: 0 }
 *               description:     { type: string, nullable: true, example: null }
 *               display_order:   { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: 등록 성공
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:api_id/responses', authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER), ctrl.createApiResponse);

/**
 * @swagger
 * /apis/{api_id}/execute:
 *   post:
 *     tags: [ApiExecution]
 *     summary: API 실행
 *     description: |
 *       - `is_required_approval = 0` (즉시실행): 바로 게임 서버 API를 호출하고 결과를 반환한다.
 *       - `is_required_approval = 1` (승인필요): 실행 이력이 PENDING 상태로 생성되어 승인자를 기다린다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: api_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [request_json]
 *             properties:
 *               request_json:
 *                 type: object
 *                 description: 'API 요청 파라미터를 key-value 형태로 전달. 키는 parameter_name과 일치해야 한다.'
 *                 example:
 *                   character_id: 12345
 *                   item_id: 9001
 *                   quantity: 1
 *     responses:
 *       201:
 *         description: 실행 완료(SUCCESS/FAILED) 또는 PENDING 생성 — 실행 이력(api_execution) 전체를 반환한다.
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 api_execution_id: 10
 *                 status: 10
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/:api_id/execute',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), execCtrl.executeApi);

export default router;
