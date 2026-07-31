import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ProjectAdminRow } from "../types";

const inputSchema = {
  project_id: z.number().int().positive().describe("대상 프로젝트 ID"),
  api_base_url: z.string().max(255).describe("새 대상 게임서버 API base URL (최대 255자, 필수)"),
};

/**
 * admin_update_project_connection tool을 등록한다. PATCH /projects/:project_id/connection —
 * 프로젝트의 대상 게임서버 연결 정보(api_base_url)만 변경한다. 변경 즉시 기존에 발급된 API 키는
 * 서버가 자동 폐기한다(대상 서버가 바뀌었는데 옛 키를 그대로 쓰는 실수 방지). DEVELOPER 계정은
 * 해당 project_id에 실제 활성 배정이 있어야 한다. SUPER_ADMIN/DEVELOPER 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminUpdateProjectConnectionTool(server: McpServer): void {
  server.registerTool(
    "admin_update_project_connection",
    {
      title: "프로젝트 연결 정보 수정",
      description:
        "프로젝트의 대상 게임서버 api_base_url을 변경한다. 변경 시 기존에 발급된 API 키는 자동으로 폐기된다.",
      inputSchema,
    },
    safeTool<{ project_id: number; api_base_url: string }>(({ project_id, api_base_url }) =>
      request<ProjectAdminRow>({
        method: "PATCH",
        url: `/projects/${project_id}/connection`,
        data: { api_base_url },
      }),
    ),
  );
}
