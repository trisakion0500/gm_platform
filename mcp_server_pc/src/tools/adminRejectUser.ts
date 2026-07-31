import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";

const inputSchema = {
  user_id: z.number().int().positive().describe("반려할 사용자 ID (가입승인대기 status=0만 가능)"),
};

/**
 * admin_reject_user tool을 등록한다. POST /users/:user_id/reject — 가입 반려(status 0→2). SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminRejectUserTool(server: McpServer): void {
  server.registerTool(
    "admin_reject_user",
    {
      title: "가입 반려",
      description: "가입승인대기(status=0) 사용자를 반려해 반려(status=2)로 전환한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{ user_id: number }>(({ user_id }) =>
      request<null>({ method: "POST", url: `/users/${user_id}/reject` }),
    ),
  );
}
