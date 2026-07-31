import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";

const inputSchema = {
  user_id: z.number().int().positive().describe("비밀번호를 초기화할 사용자 ID"),
  new_password: z.string().describe("새 비밀번호 — 이 값이 대화 내용에 평문으로 남는다는 점을 호출 전에 사용자에게 알려야 한다"),
};

/**
 * admin_reset_user_password tool을 등록한다. POST /users/:user_id/reset-password —
 * 관리자가 새 비밀번호를 직접 지정해 초기화한다(서버가 자동 생성하지 않음). 변경 즉시 해당 사용자의
 * 모든 세션이 종료되어 재로그인이 필요하다. SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminResetUserPasswordTool(server: McpServer): void {
  server.registerTool(
    "admin_reset_user_password",
    {
      title: "비밀번호 초기화",
      description:
        "사용자 비밀번호를 지정한 값으로 초기화한다(서버가 자동 생성하지 않고 new_password를 그대로 받는다). 변경 즉시 해당 사용자의 모든 세션이 종료된다. 비밀번호가 대화에 평문으로 노출되니 신중히 사용해야 한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{ user_id: number; new_password: string }>(({ user_id, new_password }) =>
      request<null>({ method: "POST", url: `/users/${user_id}/reset-password`, data: { new_password } }),
    ),
  );
}
