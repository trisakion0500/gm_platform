import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { LogAuditSearchResult } from "../types";

const inputSchema = {
  query: z.string().min(1).describe("검색할 질의문 (자연어)"),
  top_k: z.number().int().min(1).max(20).optional().describe("반환할 최대 결과 개수 (기본 5, 최대 20)"),
};

/**
 * search_log_audits tool을 등록한다. GET /log-audit-search — GM Platform이 rag_server(POST /log-audits/search)로
 * 위임하는 감사 로그 검색 프록시. search_apis와 동일하게 rag_server를 직접 부르지 않고 반드시 GM Platform을
 * 거친다 — 호출자가 role_code<=30으로 실제 배정된 프로젝트/소속 회사 스코핑이 GM Platform 서버 안에서만
 * 계산되기 때문. GET /log-audit-search 자체가 SUPER_ADMIN/DEVELOPER/APPROVER 전용이라(GET /log-audits와
 * 동일 범위) index.ts에서 그 세 역할일 때만 등록한다 — project_id 파라미터는 없다(단일 프로젝트로
 * 강제 스코핑하지 않고 호출자가 접근 가능한 프로젝트 전체가 한 번에 검색 대상).
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerSearchLogAuditsTool(server: McpServer): void {
  server.registerTool(
    "search_log_audits",
    {
      title: "감사 로그 검색",
      description:
        "감사 로그(회사/프로젝트/사용자/API 등 변경 이력)에서 질의와 의미적으로 유사한 것을 검색한다. 호출자가 role_code<=30으로 실제 배정된 프로젝트 로그와 소속 회사 로그만 노출된다. SUPER_ADMIN/DEVELOPER/APPROVER만 사용 가능.",
      inputSchema,
    },
    safeTool<{ query: string; top_k?: number }>(({ query, top_k }) =>
      request<LogAuditSearchResult[]>({ method: "GET", url: "/log-audit-search", params: { q: query, top_k } }),
    ),
  );
}
