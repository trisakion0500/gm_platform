import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";

const inputSchema = {
  project_id: z.number().int().positive().describe("역할을 확인할 프로젝트 ID"),
};

/**
 * admin_get_my_role tool을 등록한다. GET /user-roles/me — 로그인 계정 본인의 특정 project_id에 대한
 * 실제 role_code를 조회한다(SUPER_ADMIN은 배정 없이 항상 10, 그 외는 활성 배정 없으면 null).
 * 세션 role_code(가진 프로젝트 중 최고 권한)와 달리 "이 프로젝트에서 내 실제 권한"을 알려준다.
 * 전 역할 공통.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminGetMyRoleTool(server: McpServer): void {
  server.registerTool(
    "admin_get_my_role",
    {
      title: "내 프로젝트별 실제 권한 조회",
      description: "특정 프로젝트에서 로그인 계정 본인의 실제 role_code를 조회한다(SUPER_ADMIN은 항상 10).",
      inputSchema,
    },
    safeTool<{ project_id: number }>(({ project_id }) =>
      request<{ role_code: number | null }>({
        method: "GET",
        url: "/user-roles/me",
        params: { project_id },
      }),
    ),
  );
}
