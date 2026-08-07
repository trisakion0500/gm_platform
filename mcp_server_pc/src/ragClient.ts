import axios from "axios";
import { env } from "./config/env";

const http = axios.create({
  baseURL: env.ragBaseUrl ?? undefined,
  timeout: 15000,
  headers: env.ragApiKey ? { "X-API-Key": env.ragApiKey } : undefined,
});

/** rag_server 응답 봉투. 응답 형식: { result, message, data: [...] } (docs/21_RAG_SERVER.md) */
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

/** rag_server가 result!==0으로 응답한 오류. code/message는 docs/21_RAG_SERVER.md 오류 코드 표를 그대로 담는다. */
export class RagApiError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
    this.name = "RagApiError";
  }
}

/**
 * rag_server에 문서 검색을 요청한다. GM Platform 로그인(gmClient.ts)과 완전히 별개의 경량 클라이언트라
 * 인증/재시도 로직이 없다 — 인증은 X-API-Key 헤더 하나로 끝난다.
 * @param query 검색어 (자연어)
 * @param topK 반환할 최대 개수 (미지정 시 rag_server 기본값 5)
 * @returns 유사도 내림차순 검색 결과
 */
export async function searchDocs(query: string, topK?: number): Promise<DocSearchResult[]> {
  try {
    const res = await http.post<RagEnvelope<DocSearchResult[]>>("/search", { query, top_k: topK });
    if (res.data.result !== 0)
      throw new RagApiError(res.data.result, res.data.message);
    return res.data.data;
  } catch (err) {
    if (err instanceof RagApiError)
      throw err;
    if (axios.isAxiosError(err) && err.response) {
      const body = err.response.data as Partial<RagEnvelope<unknown>> | undefined;
      throw new RagApiError(body?.result ?? 0, body?.message ?? err.message);
    }
    throw err;
  }
}
