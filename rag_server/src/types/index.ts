export class AppError extends Error {
  constructor(
    readonly result: number,
    message: string,
    readonly httpStatus: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export interface Chunk {
  file: string;
  heading: string;
  text: string;
}

export interface SearchResult {
  file: string;
  heading: string;
  text: string;
  score: number;
}

/**
 * gm_apis Qdrant 포인트 payload — 필터용(project_id/api_stage/status)과 표시용 필드를 함께 담는다.
 * server/의 POST /apis/reindex가 push하는 데이터(완성된 API 정보)를 그대로 반영한다.
 */
export interface ApiPointPayload {
  api_id: number;
  project_id: number;
  project_name: string;
  api_code: string;
  api_name: string;
  endpoint: string;
  /** 필터 전용(응답에는 노출하지 않음) */
  api_stage: number;
  /** 필터 전용(응답에는 노출하지 않음) */
  status: number;
}

/** rebuildApisAndSwap/upsertApiPoints에 넘기는 포인트 — point id = api_id */
export interface ApiPoint {
  apiId: number;
  vector: number[];
  payload: ApiPointPayload;
}

/** POST /apis/search 응답 항목 — docs/21_RAG_SERVER.md §10.2 "API" 명세와 동일 */
export interface ApiSearchHit {
  api_id: number;
  project_id: number;
  project_name: string;
  api_name: string;
  api_code: string;
  endpoint: string;
  score: number;
}

/** POST /apis/search 요청의 project_roles 필터 항목 */
export interface ProjectRoleFilter {
  project_id: number;
  role_code: number;
}

/**
 * server/가 POST /apis/reindex(단건 push)·GET /internal/apis(전체 pull) 양쪽에서 공통으로
 * 보내는 완성된 API 데이터 형태. rag_server는 이 안의 필드 구성·조인 로직을 전혀 모른 채
 * 그대로 임베딩+upsert만 한다(MSA 경계 — docs/21_RAG_SERVER.md §10.2 "push 기반 인덱싱").
 */
export interface ApiReindexPushBody {
  api_id: number;
  project_id: number;
  project_name: string;
  api_code: string;
  api_name: string;
  endpoint: string;
  description: string | null;
  api_stage: number;
  status: number;
  requests: Array<{ parameter_name: string; parameter_label: string; description: string | null }>;
  responses: Array<{ parameter_name: string; parameter_label: string; description: string | null }>;
}
