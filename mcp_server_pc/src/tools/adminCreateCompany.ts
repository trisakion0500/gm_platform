import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { request } from "../gmClient";
import { safeTool } from "../utils/toolResult";
import { CompanyRow } from "../types";

const COMPANY_CODE_PATTERN = /^[a-zA-Z0-9_.-]{1,20}$/;

const inputSchema = {
  company_code: z.string().regex(COMPANY_CODE_PATTERN).describe("회사 코드 (영문/숫자/_/./- 조합, 1~20자, 등록 후 변경 가능)"),
  company_name: z.string().max(100).describe("회사명 (최대 100자)"),
  description: z.string().max(1000).optional().describe("회사 설명 (최대 1000자, 선택)"),
};

/**
 * admin_create_company tool을 등록한다. POST /companies — 회사를 신규 등록한다. SUPER_ADMIN 전용.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerAdminCreateCompanyTool(server: McpServer): void {
  server.registerTool(
    "admin_create_company",
    {
      title: "회사 등록",
      description: "회사를 신규 등록한다. SUPER_ADMIN 전용 tool.",
      inputSchema,
    },
    safeTool<{ company_code: string; company_name: string; description?: string }>((args) =>
      request<CompanyRow>({ method: "POST", url: "/companies", data: args }),
    ),
  );
}
