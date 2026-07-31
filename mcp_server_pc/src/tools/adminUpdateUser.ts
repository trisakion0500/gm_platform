import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { UserAdminRow } from "../types";

const inputSchema = {
  user_id: z.number().int().positive().describe("수정할 사용자 ID"),
  user_name: z.string().optional().describe("사용자명 (선택)"),
  email: z.string().optional().describe("이메일 (선택, 중복 시 32001 오류)"),
  phone_number: z.string().max(20).optional().describe("전화번호 (평문 기준 최대 20자, 선택 — 서버가 암호화해 저장)"),
  department: z.string().max(100).optional().describe("부서 (최대 100자, 선택)"),
  position: z.string().max(100).optional().describe("직급 (최대 100자, 선택)"),
  status: z.number().int().optional().describe("상태 (0=승인대기, 1=정상, 2=반려, 3=사용중지, 선택)"),
};

/**
 * admin_update_user tool을 등록한다. PATCH /users/:user_id — 프로필/상태를 부분 수정한다.
 * role_code는 이 엔드포인트로 변경되지 않는다 — 역할 배정 변경은 admin_update_user_role을 사용해야 한다.
 * login_id는 이 엔드포인트로 변경 불가(불변). SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminUpdateUserTool(server: McpServer): void {
  server.registerTool(
    "admin_update_user",
    {
      title: "사용자 정보 수정",
      description:
        "사용자 프로필/상태를 부분 수정한다. role_code는 여기서 바뀌지 않는다 — 역할 변경은 admin_update_user_role을 사용한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{
      user_id: number;
      user_name?: string;
      email?: string;
      phone_number?: string;
      department?: string;
      position?: string;
      status?: number;
    }>(({ user_id, ...body }) =>
      request<UserAdminRow>({ method: "PATCH", url: `/users/${user_id}`, data: body }),
    ),
  );
}
