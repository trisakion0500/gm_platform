import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "./env";

// index/store.ts(인덱싱)와 services/docSearch.service.ts(검색 질의) 양쪽이 공유하는 싱글톤.
// timeout: 라이브러리 기본값(300초)이 아닌 env.qdrant.timeoutMs로 명시 — 응답 없이 멈춘 Qdrant에
// 요청이 무한정 물리지 않도록 한다(근거는 config/env.ts의 timeoutMs 주석 참고).
const qdrantClient = new QdrantClient({
  url: env.qdrant.url,
  apiKey: env.qdrant.apiKey,
  timeout: env.qdrant.timeoutMs,
});

export default qdrantClient;
