import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { UserRoleRow } from "../types";

const inputSchema = {
  user_id: z.number().int().positive().describe("역할을 배정할 사용자 ID"),
  project_id: z.number().int().positive().describe("배정 대상 프로젝트 ID"),
  role_code: z.number().int().describe("배정할 역할 코드: 20=DEVELOPER, 30=APPROVER, 40=OPERATOR"),
};

/**
 * admin_assign_user_role tool을 등록한다. POST /user-roles — 사용자에게 프로젝트 역할을 신규 배정한다.
 * 이미 같은 user_id+project_id 배정이 있으면 32001(중복) 오류. SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminAssignUserRoleTool(server: McpServer): void {
  server.registerTool(
    "admin_assign_user_role",
    {
      title: "사용자 역할 배정",
      description: "사용자에게 특정 프로젝트의 역할(20/30/40)을 신규 배정한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{ user_id: number; project_id: number; role_code: number }>((args) =>
      request<UserRoleRow>({ method: "POST", url: "/user-roles", data: args }),
    ),
  );
}
