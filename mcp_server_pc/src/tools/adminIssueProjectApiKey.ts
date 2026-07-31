import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ProjectApiKeyResult } from "../types";

const inputSchema = {
  project_id: z.number().int().positive().describe("API 키를 발급할 프로젝트 ID"),
};

/**
 * admin_issue_project_api_key tool을 등록한다. POST /projects/:project_id/api-key —
 * 새 API 키를 발급한다. 평문 키는 이 응답에서만 1회 노출되며 이후 조회에는 has_api_key(0/1)만 보인다 —
 * 응답을 안전하게 보관해야 한다. 발급 직전 api_base_url이 다른 요청으로 동시에 바뀌면 32002(동시수정충돌,
 * HTTP 409)가 반환될 수 있다 — 이 경우 프로젝트 정보를 재조회한 뒤 재시도해야 한다.
 * DEVELOPER 계정은 해당 project_id에 실제 활성 배정이 있어야 한다. SUPER_ADMIN/DEVELOPER 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminIssueProjectApiKeyTool(server: McpServer): void {
  server.registerTool(
    "admin_issue_project_api_key",
    {
      title: "프로젝트 API 키 발급",
      description:
        "프로젝트의 X-API-Key를 새로 발급한다. 평문 키는 이 응답에서만 노출되므로 반드시 안전하게 보관 안내를 해야 한다. 동시 수정 시 409(32002)가 날 수 있다.",
      inputSchema,
    },
    safeTool<{ project_id: number }>(({ project_id }) =>
      request<ProjectApiKeyResult>({ method: "POST", url: `/projects/${project_id}/api-key` }),
    ),
  );
}
