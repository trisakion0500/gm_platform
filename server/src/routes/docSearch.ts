import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/docSearch.controller';

const router = Router();

/**
 * @swagger
 * /doc-search:
 *   get:
 *     tags: [DocSearch]
 *     summary: 설계 문서 자연어 검색
 *     description: |
 *       rag_server를 통해 GM Platform 설계 문서(docs/*.md, README.md)에서 질의와 의미적으로 유사한 내용을 검색한다.
 *       인증만 요구하며 역할 제한은 없다(전체 역할 공용). RAG_ENABLED=false인 환경에서는 이 라우트 자체가 등록되지 않는다.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, example: 비밀번호 변경하면 세션은 어떻게 되나요? }
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
 *                 - file: docs/08_AUTH_API.md
 *                   heading: 9. 비밀번호 변경 > 처리 정책
 *                   text: 비밀번호 변경 성공 시 SP_UPDATE_PASSWORD가 모든 세션을 즉시 종료한다...
 *                   score: 0.72
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
