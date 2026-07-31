import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { UserRoleRow } from "../types";

const inputSchema = {
  user_id: z.number().int().positive().describe("대상 사용자 ID"),
  project_id: z.number().int().positive().describe("대상 프로젝트 ID"),
  role_code: z.number().int().optional().describe("변경할 역할 코드: 20=DEVELOPER, 30=APPROVER, 40=OPERATOR (선택)"),
  status: z.number().int().optional().describe("배정 상태: 1=사용, 0=중지 (선택)"),
};

/**
 * admin_update_user_role tool을 등록한다. PATCH /user-roles/:user_id/:project_id —
 * 기존 역할 배정의 role_code/status를 부분 수정한다. 배정 자체가 없으면 30003(허용되지 않는 값) 오류.
 * SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminUpdateUserRoleTool(server: McpServer): void {
  server.registerTool(
    "admin_update_user_role",
    {
      title: "사용자 역할 배정 수정",
      description: "기존 사용자-프로젝트 역할 배정의 role_code/status를 수정한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{ user_id: number; project_id: number; role_code?: number; status?: number }>(
      ({ user_id, project_id, role_code, status }) =>
        request<UserRoleRow>({
          method: "PATCH",
          url: `/user-roles/${user_id}/${project_id}`,
          data: { role_code, status },
        }),
    ),
  );
}
