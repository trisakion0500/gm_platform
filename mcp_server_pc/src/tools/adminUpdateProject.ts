import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ProjectAdminRow } from "../types";

const PROJECT_CODE_PATTERN = /^[a-zA-Z0-9_.-]{1,20}$/;

const inputSchema = {
  project_id: z.number().int().positive().describe("수정할 프로젝트 ID"),
  project_code: z.string().regex(PROJECT_CODE_PATTERN).optional().describe("프로젝트 코드 (영문/숫자/_/./- 조합, 1~20자, 선택)"),
  project_name: z.string().max(100).optional().describe("프로젝트명 (최대 100자, 선택)"),
  description: z.string().max(1000).optional().describe("프로젝트 설명 (최대 1000자, 선택)"),
  status: z.number().int().optional().describe("상태 (1=사용, 0=중지, 선택)"),
};

/**
 * admin_update_project tool을 등록한다. PATCH /projects/:project_id — 정체성/거버넌스 필드만 부분 수정한다.
 * api_base_url은 이 tool로 바꿀 수 없다 — admin_update_project_connection을 사용해야 한다. SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminUpdateProjectTool(server: McpServer): void {
  server.registerTool(
    "admin_update_project",
    {
      title: "프로젝트 수정",
      description: "프로젝트의 코드/이름/설명/상태를 부분 수정한다. api_base_url 변경은 admin_update_project_connection을 사용한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{
      project_id: number;
      project_code?: string;
      project_name?: string;
      description?: string;
      status?: number;
    }>(({ project_id, ...body }) =>
      request<ProjectAdminRow>({ method: "PATCH", url: `/projects/${project_id}`, data: body }),
    ),
  );
}
