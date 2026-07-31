import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { ProjectAdminRow } from "../types";

const PROJECT_CODE_PATTERN = /^[a-zA-Z0-9_.-]{1,20}$/;

const inputSchema = {
  company_id: z.number().int().positive().describe("소속 회사 ID"),
  project_code: z.string().regex(PROJECT_CODE_PATTERN).describe("프로젝트 코드 (영문/숫자/_/./- 조합, 1~20자)"),
  project_name: z.string().max(100).describe("프로젝트명 (최대 100자)"),
  api_base_url: z.string().max(255).describe("대상 게임서버 API base URL (최대 255자)"),
  description: z.string().max(1000).optional().describe("프로젝트 설명 (최대 1000자, 선택)"),
};

/**
 * admin_create_project tool을 등록한다. POST /projects — 프로젝트를 신규 등록한다. SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminCreateProjectTool(server: McpServer): void {
  server.registerTool(
    "admin_create_project",
    {
      title: "프로젝트 등록",
      description: "프로젝트를 신규 등록한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{
      company_id: number;
      project_code: string;
      project_name: string;
      api_base_url: string;
      description?: string;
    }>((args) => request<ProjectAdminRow>({ method: "POST", url: "/projects", data: args })),
  );
}
