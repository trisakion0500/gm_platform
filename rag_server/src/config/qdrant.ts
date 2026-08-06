import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "./env";

// index/store.ts(인덱싱)와 services/search.service.ts(검색 질의) 양쪽이 공유하는 싱글톤.
const qdrantClient = new QdrantClient({
  url: env.qdrant.url,
  apiKey: env.qdrant.apiKey,
});

export default qdrantClient;
