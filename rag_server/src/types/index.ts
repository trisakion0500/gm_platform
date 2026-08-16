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

/**
 * gm_logs Qdrant 포인트 payload — 필터용(project_id/company_id)과 표시용 필드를 함께 담는다.
 * before_json/after_json 원본은 저장하지 않는다(server/가 diff를 문장화한 embed_text만 임베딩,
 * 원문이 필요하면 GET /log-audits/:id로 드릴다운 — docs/21_RAG_SERVER.md §10.3).
 */
export interface LogAuditPointPayload {
  log_audit_id: number;
  company_id: number;
  project_id: number | null;
  project_name: string | null;
  table_name: string;
  target_id: string;
  target_name: string | null;
  action_type: number;
  created_by_name: string | null;
  created_at: string;
}

/** rebuildLogsAndSwap/upsertLogPoints에 넘기는 포인트 — point id = log_audit_id */
export interface LogAuditPoint {
  logAuditId: number;
  vector: number[];
  payload: LogAuditPointPayload;
}

/** POST /log-audits/search 응답 항목 */
export interface LogAuditSearchHit {
  log_audit_id: number;
  table_name: string;
  target_id: string;
  target_name: string | null;
  action_type: number;
  project_name: string | null;
  created_by_name: string | null;
  created_at: string;
  score: number;
}

/**
 * POST /log-audits/search 요청의 스코핑 필터. null이면 SUPER_ADMIN(무제한). project_id 있는 로그는
 * allowed_project_ids 멤버십으로, project_id 없는 로그(company/user 테이블)는 caller_company_id
 * 일치로 판정한다(server/의 logAudit.service.ts resolveAllowedProjectIds()와 동일 스코핑 규칙).
 */
export interface LogAuditScopeFilter {
  allowed_project_ids: number[];
  caller_company_id: number;
}

/**
 * server/가 POST /log-audits/reindex(단건 push)·GET /internal/log-audits(전체 pull) 양쪽에서 공통으로
 * 보내는 완성된 감사 로그 데이터. embed_text는 server/가 before_json/after_json을 diff 문장화한 결과 —
 * rag_server는 이 필드를 그대로 "passage: " 프리픽스만 붙여 임베딩한다(MSA 경계 — rag_server는
 * before_json/after_json 자체를 전혀 받지 않는다).
 */
export interface LogAuditReindexPushBody {
  log_audit_id: number;
  company_id: number;
  project_id: number | null;
  project_name: string | null;
  table_name: string;
  target_id: string;
  target_name: string | null;
  action_type: number;
  created_by_name: string | null;
  created_at: string;
  embed_text: string;
}
