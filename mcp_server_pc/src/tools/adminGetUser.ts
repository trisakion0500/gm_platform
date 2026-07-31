import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { UserAdminRow } from "../types";

const inputSchema = {
  user_id: z.number().int().positive().describe("조회할 사용자 ID"),
};

/**
 * admin_get_user tool을 등록한다. GET /users/:user_id — 사용자 상세를 조회한다.
 * 다른 회사 소속 사용자는 존재 여부를 숨기기 위해 404(31003)로 응답한다. SUPER_ADMIN/DEVELOPER 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminGetUserTool(server: McpServer): void {
  server.registerTool(
    "admin_get_user",
    {
      title: "사용자 상세 조회",
      description: "사용자 상세 정보를 조회한다(phone_number는 복호화된 평문으로 반환됨).",
      inputSchema,
    },
    safeTool<{ user_id: number }>(({ user_id }) =>
      request<UserAdminRow>({ method: "GET", url: `/users/${user_id}` }),
    ),
  );
}
