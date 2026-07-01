import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: 회원가입
 *     description: 가입 후 상태는 **0(가입승인대기)**. SUPER_ADMIN 승인 전까지 로그인 불가.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_id, login_id, password, user_name, email]
 *             properties:
 *               company_id:           { type: integer, example: 1 }
 *               requested_project_id: { type: integer, nullable: true, example: null, description: '가입 신청 프로젝트 ID (선택)' }
 *               login_id:             { type: string, example: john }
 *               password:             { type: string, format: password, example: 'P@ssw0rd' }
 *               user_name:            { type: string, example: 홍길동 }
 *               email:                { type: string, format: email, example: john@example.com }
 *     responses:
 *       201:
 *         description: 가입 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 user_id: 5
 *                 company_id: 1
 *                 login_id: john
 *                 user_name: 홍길동
 *                 email: john@example.com
 *                 status: 0
 *                 role_code: 40
 *                 last_login_at: null
 *                 created_at: '2025-01-01 00:00:00'
 *                 updated_at: '2025-01-01 00:00:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/signup',   ctrl.signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 로그인
 *     description: |
 *       성공 시 `access_token`(JWT)과 `refresh_token`(UUID)을 반환한다.
 *       이후 요청은 `Authorization: Bearer {access_token}` 헤더를 사용한다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [login_id, password]
 *             properties:
 *               login_id: { type: string, example: sa }
 *               password: { type: string, format: password, example: '1234' }
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 access_token: eyJhbGciOiJIUzI1NiJ9...
 *                 refresh_token: 550e8400-e29b-41d4-a716-446655440000
 *                 expired_at: '2025-01-01 00:30:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/login',    ctrl.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Access Token 재발급
 *     description: |
 *       `refresh_token`으로 새 `access_token`을 발급한다.
 *       `refresh_token` 자체는 갱신되지 않는다.
 *       매 재발급 시 DB의 JTI가 갱신되어 이전 access_token이 무효화된다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string, example: 550e8400-e29b-41d4-a716-446655440000 }
 *     responses:
 *       200:
 *         description: 재발급 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 access_token: eyJhbGciOiJIUzI1NiJ9...
 *                 expired_at: '2025-01-01 00:30:00'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/refresh',  ctrl.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 로그아웃
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout',   authenticate, ctrl.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: 내 정보 조회
 *     security:
 *       - bearerAuth: []
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
 */
router.get('/me',        authenticate, ctrl.getMe);

/**
 * @swagger
 * /auth/password:
 *   patch:
 *     tags: [Auth]
 *     summary: 비밀번호 변경
 *     description: 변경 즉시 모든 세션이 종료된다. 이후 재로그인이 필요하다.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string, format: password, example: '1234' }
 *               new_password:     { type: string, format: password, example: 'NewP@ss1' }
 *     responses:
 *       200:
 *         description: 변경 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/password', authenticate, ctrl.changePassword);

export default router;
