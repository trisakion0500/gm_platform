import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { CompanyRow } from "../types";

const COMPANY_CODE_PATTERN = /^[a-zA-Z0-9_.-]{1,20}$/;

const inputSchema = {
  company_id: z.number().int().positive().describe("수정할 회사 ID"),
  company_code: z.string().regex(COMPANY_CODE_PATTERN).optional().describe("회사 코드 (영문/숫자/_/./- 조합, 1~20자, 선택)"),
  company_name: z.string().max(100).optional().describe("회사명 (최대 100자, 선택)"),
  description: z.string().max(1000).optional().describe("회사 설명 (최대 1000자, 선택)"),
  status: z.number().int().optional().describe("상태 (1=사용, 0=중지, 선택)"),
};

/**
 * admin_update_company tool을 등록한다. PATCH /companies/:company_id — 부분 수정(빈 필드는 기존값 유지). SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminUpdateCompanyTool(server: McpServer): void {
  server.registerTool(
    "admin_update_company",
    {
      title: "회사 수정",
      description: "회사 정보를 부분 수정한다(전달하지 않은 필드는 기존값 유지). SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{
      company_id: number;
      company_code?: string;
      company_name?: string;
      description?: string;
      status?: number;
    }>(({ company_id, ...body }) =>
      request<CompanyRow>({ method: "PATCH", url: `/companies/${company_id}`, data: body }),
    ),
  );
}
