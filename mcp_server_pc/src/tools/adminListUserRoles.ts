import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { UserRoleRow } from "../types";

const inputSchema = {
  user_id: z.number().int().positive().optional().describe("특정 사용자로 필터링 (선택)"),
  project_id: z.number().int().positive().optional().describe("특정 프로젝트로 필터링 (선택)"),
  role_code: z.number().int().optional().describe("역할 코드로 필터링: 20=DEVELOPER, 30=APPROVER, 40=OPERATOR (선택)"),
  status: z.number().int().optional().describe("배정 상태로 필터링: 1=사용, 0=중지 (선택)"),
};

/**
 * admin_list_user_roles tool을 등록한다. GET /user-roles — 사용자-프로젝트 역할 배정 목록을 조회한다.
 * 페이지네이션 없이 배열을 그대로 반환한다. DEVELOPER 계정은 본인 소속 회사로 자동 스코핑된다.
 * SUPER_ADMIN/DEVELOPER 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminListUserRolesTool(server: McpServer): void {
  server.registerTool(
    "admin_list_user_roles",
    {
      title: "사용자 역할 배정 목록 조회",
      description: "사용자-프로젝트 역할 배정 목록을 조회한다(페이지네이션 없음). DEVELOPER는 본인 소속 회사로 스코핑된다.",
      inputSchema,
    },
    safeTool<{ user_id?: number; project_id?: number; role_code?: number; status?: number }>(
      ({ user_id, project_id, role_code, status }) =>
        request<UserRoleRow[]>({
          method: "GET",
          url: "/user-roles",
          params: { user_id, project_id, role_code, status },
        }),
    ),
  );
}
