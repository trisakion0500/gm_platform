import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ActiveHeaderData } from "../types";

const inputSchema = {};

/**
 * list_projects tool을 등록한다. GET /companies/active-header-data — 로그인 계정이 소속된 회사와
 * 실제 user_role을 가진 프로젝트 목록을 조회한다(SUPER_ADMIN은 전체). 전 역할(OPERATOR/APPROVER 포함)
 * 공통 엔드포인트라, 다른 tool에 넘길 project_id를 확인하려면 이 tool을 가장 먼저 호출해야 한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerListProjectsTool(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      title: "접근 가능한 회사/프로젝트 목록 조회",
      description: "이 계정이 소속된 회사와 실제 권한(user_role)을 가진 프로젝트 목록을 조회한다(SUPER_ADMIN은 전체). 다른 tool에 넘길 project_id를 확인할 때 가장 먼저 호출한다.",
      inputSchema,
    },
    safeTool<Record<string, never>>(() =>
      request<ActiveHeaderData>({ method: "GET", url: "/companies/active-header-data" }),
    ),
  );
}
