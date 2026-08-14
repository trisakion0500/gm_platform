import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ApiSearchResult } from "../types";

const inputSchema = {
  query: z.string().min(1).describe("검색할 질의문 (자연어)"),
  project_id: z.number().int().positive().describe("검색을 좁힐 대상 프로젝트 ID (list_projects로 확인)"),
  top_k: z.number().int().min(1).max(20).optional().describe("반환할 최대 결과 개수 (기본 5, 최대 20)"),
};

/**
 * search_apis tool을 등록한다. GET /api-search — GM Platform이 rag_server(POST /apis/search)로 위임하는
 * API 정의 검색 프록시. search_docs와 달리 rag_server를 직접 부르지 않고 반드시 GM Platform을 거친다 —
 * project_id+role_code 기반 스코핑이 GM Platform 서버 안에서만 계산되기 때문(호출자가 실제 활성 배정을
 * 가진 프로젝트/api_stage만 노출). list_apis와 동일하게 인증된 gmClient.request()를 사용한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerSearchApisTool(server: McpServer): void {
  server.registerTool(
    "search_apis",
    {
      title: "API 정의 검색",
      description:
        "선택한 프로젝트의 API 정의(api_name/api_code/endpoint)에서 질의와 의미적으로 유사한 것을 검색한다. 호출자가 실제 권한을 가진 api_stage 이하 API만 노출된다.",
      inputSchema,
    },
    safeTool<{ query: string; project_id: number; top_k?: number }>(({ query, project_id, top_k }) =>
      request<ApiSearchResult[]>({ method: "GET", url: "/api-search", params: { q: query, project_id, top_k } }),
    ),
  );
}
