import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../types';
import { ERROR_MAP } from '../constants/errors';
import logger from '../utils/logger';

/** rag_server 응답 봉투. 응답 형식: { result, message, data: [...] } (docs/21_RAG_SERVER.md §4) */
interface RagEnvelope<T> {
  result: number;
  message: string;
  data: T;
}

/** rag_server의 문서 검색 결과 한 건 */
export interface DocSearchResult {
  file: string;
  heading: string;
  text: string;
  score: number;
}

/**
 * rag_server(POST /search)에 문서 검색을 위임한다. mcp_server_dev/pc의 ragClient.ts와
 * 동일한 계약을 쓰지만, GM Platform 로그인(JWT)으로 이미 인증된 경로라 이 함수 자체는 재시도 로직 없이
 * 단순 프록시로 동작한다 — 실패 사유(네트워크 오류/타임아웃/모델 로딩 중/rag_server 자체 오류)를 구분하지 않고
 * 전부 RAG_SERVICE_UNAVAILABLE(503)로 통일한다(호출자 입장에서는 어차피 "지금은 검색 불가"로 동일하게 처리).
 * @author trisakion
 * @param query 검색어 (자연어)
 * @param topK 반환할 최대 개수 (null이면 rag_server 기본값 5 적용)
 * @returns 유사도 내림차순 검색 결과
 */
export async function searchDocs(query: string, topK: number | null): Promise<DocSearchResult[]> {
  try {
    const headers = env.rag.apiKey ? { 'X-API-Key': env.rag.apiKey } : undefined;
    const res = await axios.post<RagEnvelope<DocSearchResult[]>>(
      `${env.rag.baseUrl}/search`,
      { query, top_k: topK ?? undefined },
      { timeout: env.apiExecutionTimeoutMs, headers },
    );
    if (res.data.result !== 0) {
      throw new AppError(
        ERROR_MAP.RAG_SERVICE_UNAVAILABLE.code,
        ERROR_MAP.RAG_SERVICE_UNAVAILABLE.message,
        ERROR_MAP.RAG_SERVICE_UNAVAILABLE.httpStatus,
        { cause: new Error(`rag_server result=${res.data.result} message=${res.data.message}`) },
      );
    }
    return res.data.data;
  } catch (err) {
    if (err instanceof AppError)
      throw err;
    // err 객체 자체·JSON.stringify(err)는 절대 로깅하지 않는다 — axios 에러는 config.headers(X-API-Key 평문)를 담고 있다. err.stack만 사용.
    logger.error(`rag_server 연동 실패: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
    throw new AppError(
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.code,
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.message,
      ERROR_MAP.RAG_SERVICE_UNAVAILABLE.httpStatus,
      { cause: err },
    );
  }
}
