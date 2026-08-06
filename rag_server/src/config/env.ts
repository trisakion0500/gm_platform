import dotenv from "dotenv";

dotenv.config();

const required = ["QDRANT_URL", "QDRANT_API_KEY", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 3200),
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  qdrant: {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
    collection: process.env.QDRANT_COLLECTION || "gm_docs",
  },
  // rag_server 호출자(GM Platform server, MCP 클라이언트) 검증용 공유키.
  // 미설정 시(로컬 개발용) apiKeyAuth 미들웨어가 검증을 건너뛴다 — 실사용 전 반드시 설정해야 한다(docs/21_RAG_SERVER.md §3).
  apiKey: process.env.RAG_API_KEY || null,
  // GM Platform 본체(server/)와 동일한 MySQL — rag_server 전용 테이블은 없고, 재인덱싱 인스턴스 간
  // 상호배제용 advisory lock(SP_LOCK_ACQUIRE/SP_LOCK_RELEASE)만 재사용한다(config/db.ts, docs/21_RAG_SERVER.md §3).
  db: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!,
  },
};
