import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { ROLE } from '../constants/roles';
import * as ctrl from '../controllers/company.controller';

const router = Router();

/**
 * @swagger
 * /companies:
 *   post:
 *     tags: [Company]
 *     summary: 회사 등록
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_code, company_name]
 *             properties:
 *               company_code: { type: string, pattern: '^[a-zA-Z0-9_.-]+$', maxLength: 20, description: '영문, 숫자, _, ., - 만 허용, 최대 20자', example: COMPANY_A }
 *               company_name: { type: string, maxLength: 100, example: 회사A }
 *               description:  { type: string, nullable: true, maxLength: 1000, example: 게임 회사 }
 *     responses:
 *       201:
 *         description: 등록 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 company_id: 1
 *                 company_code: COMPANY_A
 *                 company_name: 회사A
 *                 description: 게임 회사
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
router.post('/',             authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.createCompany);

/**
 * @swagger
 * /companies/lookup:
 *   get:
 *     tags: [Company]
 *     summary: 회사코드로 활성 회사 조회 (인증 불필요)
 *     description: |
 *       회원가입 화면 전용 — 로그인 전 상태에서 호출한다.
 *       company_id/company_name만 반환하며, 비활성(status=0) 회사는 조회되지 않는다.
 *     parameters:
 *       - in: query
 *         name: company_code
 *         required: true
 *         schema: { type: string, example: COMPANY_A }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 company_id: 1
 *                 company_name: 회사A
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// 정적 경로라 /:company_id 보다 먼저 등록해야 함(안 그러면 "lookup" 문자열이 company_id로 잘못 매칭)
router.get('/lookup',        ctrl.getCompanyByCode);

/**
 * @swagger
 * /companies:
 *   get:
 *     tags: [Company]
 *     summary: 회사 목록 조회
 *     description: |
 *       SUPER_ADMIN 외에는 본인 소속 회사만 반환된다.
 *       `page`와 `page_size`는 모두 필수이며, `page_size`는 20·30·50·100만 허용한다.
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
 *                 total: 2
 *                 page: 1
 *                 page_size: 20
 *                 total_pages: 1
 *                 items:
 *                   - company_id: 1
 *                     company_code: COMPANY_A
 *                     company_name: 회사A
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
router.get('/',              authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCompanyList);

/**
 * @swagger
 * /companies/{company_id}:
 *   get:
 *     tags: [Company]
 *     summary: 회사 단건 조회
 *     description: SUPER_ADMIN 외에는 본인 소속 회사만 조회 가능하다.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR
 *     parameters:
 *       - in: path
 *         name: company_id
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
 *                 company_id: 1
 *                 company_code: COMPANY_A
 *                 company_name: 회사A
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
router.get('/:company_id',   authenticate, requireRole(ROLE.SUPER_ADMIN, ROLE.DEVELOPER, ROLE.APPROVER, ROLE.OPERATOR), ctrl.getCompany);

/**
 * @swagger
 * /companies/{company_id}:
 *   patch:
 *     tags: [Company]
 *     summary: 회사 수정
 *     description: 전달한 필드만 업데이트된다. 생략하면 기존 값 유지.
 *     security:
 *       - bearerAuth: []
 *     x-required-roles: SUPER_ADMIN
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_code: { type: string, pattern: '^[a-zA-Z0-9_.-]+$', maxLength: 20, description: '영문, 숫자, _, ., - 만 허용, 최대 20자', example: COMPANY_A }
 *               company_name: { type: string, maxLength: 100, example: 회사A2 }
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
 *                 company_id: 1
 *                 company_code: COMPANY_A
 *                 company_name: 회사A2
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
router.patch('/:company_id', authenticate, requireRole(ROLE.SUPER_ADMIN),                 ctrl.updateCompany);

export default router;
