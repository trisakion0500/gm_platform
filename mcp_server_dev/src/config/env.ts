import dotenv from "dotenv";

dotenv.config();

const required = ["GM_BASE_URL", "GM_LOGIN_ID", "GM_PASSWORD"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

const ragEnabled = process.env.RAG_ENABLED === "true";

if (ragEnabled && !process.env.RAG_BASE_URL) {
  throw new Error("RAG_ENABLED=true 인데 RAG_BASE_URL이 없습니다");
}

export const env = {
  gmBaseUrl: process.env.GM_BASE_URL!,
  gmLoginId: process.env.GM_LOGIN_ID!,
  gmPassword: process.env.GM_PASSWORD!,
  // 부팅 시 GM Platform 최초 로그인 실패를 지수 백오프로 재시도할 최대 누적 시간(ms).
  // 데스크탑 앱은 stdio MCP 서버를 자동 재연결하지 않으므로(공식 문서 확인), 서버 기동 순서에
  // 의존하지 않고 이 프로세스 스스로 견뎌야 한다 — server/의 DB_BOOT_RETRY_MAX_MS와 동일 취지.
  mcpBootRetryMaxMs: Number(process.env.MCP_BOOT_RETRY_MAX_MS) || 60000,
  // false면 search_docs tool 자체를 등록하지 않음(index.ts) — rag_server 미기동 환경에서도 나머지 tool은 그대로 동작해야 함
  ragEnabled,
  ragBaseUrl: process.env.RAG_BASE_URL || null,
  // rag_server 호출용 공유키 — rag_server의 RAG_API_KEY와 동일한 값. 미설정 시(로컬 개발용) 헤더 없이 호출한다
  // (rag_server의 apiKeyAuth가 자체 env.apiKey 미설정 시 검증을 건너뛰는 것과 대칭).
  ragApiKey: process.env.RAG_API_KEY || null,
};
