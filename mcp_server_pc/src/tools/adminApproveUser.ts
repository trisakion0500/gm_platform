import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";

const inputSchema = {
  user_id: z.number().int().positive().describe("승인할 사용자 ID (가입승인대기 status=0만 가능)"),
};

/**
 * admin_approve_user tool을 등록한다. POST /users/:user_id/approve — 가입 승인(status 0→1). SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminApproveUserTool(server: McpServer): void {
  server.registerTool(
    "admin_approve_user",
    {
      title: "가입 승인",
      description: "가입승인대기(status=0) 사용자를 승인해 정상(status=1)으로 전환한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{ user_id: number }>(({ user_id }) =>
      request<null>({ method: "POST", url: `/users/${user_id}/approve` }),
    ),
  );
}
