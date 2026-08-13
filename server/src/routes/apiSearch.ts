import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/apiSearch.controller';

const router = Router();

/**
 * @swagger
 * /api-search:
 *   get:
 *     tags: [ApiSearch]
 *     summary: API 정의 자연어 검색
 *     description: |
 *       rag_server를 통해 project_id로 지정된 프로젝트의 API 정의(api/api_request/api_response)에서 질의와 의미적으로 유사한 API를 검색한다.
 *       인증만 요구하며 역할 제한은 없다(전체 역할 공용) — 단, project_id는 헤더에서 선택된 프로젝트로 강제 스코핑되며(다른
 *       프로젝트 종속 화면과 동일 원칙, SUPER_ADMIN도 예외 없음), 그 안에서 호출자의 실제 role_code 기준으로 다시 걸러진다
 *       (role_code <= api_stage인 API만 노출). RAG_ENABLED=false인 환경에서는 이 라우트 자체가 등록되지 않는다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, example: 아이템 지급 API }
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: top_k
 *         schema: { type: integer, minimum: 1, maximum: 20, example: 5 }
 *     responses:
 *       200:
 *         description: 조회 성공
 *         content:
 *           application/json:
 *             example:
 *               result: 0
 *               data:
 *                 - api_id: 1
 *                   project_id: 1
 *                   project_name: 프로젝트A
 *                   api_name: 아이템 지급
 *                   api_code: GIVE_ITEM
 *                   endpoint: /v1/game/give-item
 *                   score: 0.81
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       503:
 *         description: rag_server 사용 불가(네트워크 오류·타임아웃·모델 로딩 중 등)
 *         content:
 *           application/json:
 *             example:
 *               result: 50002
 *               message: 문서 검색 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.
 */
router.get('/', authenticate, ctrl.search);

export default router;
