import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRoleCode } from "./gmClient";
import { env } from "./config/env";
import logger from "./utils/logger";

/**
 * 부팅 시 GM Platform 로그인 실패를 지수 백오프(1s→2s→4s→...,최대 10s 간격)로 재시도한다.
 * MCP_PC_BOOT_RETRY_MAX_MS 누적 시간 안에도 실패하면 예외를 던져 main().catch()가 처리한다
 * (server/app.ts의 connectWithRetry와 동일 패턴 — 데스크탑 앱이 stdio MCP를 자동 재연결하지
 * 않아, GM Platform 서버가 나중에 뜨더라도 이 프로세스가 살아서 기다려야 커넥터가 자동 복구된다).
 * @returns 로그인한 계정의 role_code
 */
async function getRoleCodeWithRetry(): Promise<number> {
  const startedAt = Date.now();
  let delayMs = 1000;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      return await getRoleCode();
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= env.mcpBootRetryMaxMs)
        throw err;
      logger.warn(`GM Platform 로그인 실패 (attempt ${attempt}), ${delayMs}ms 후 재시도:`, err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10000);
    }
  }
}
import { registerListProjectsTool } from "./tools/listProjects";
import { registerListApisTool } from "./tools/listApis";
import { registerListCodeGroupsTool } from "./tools/listCodeGroups";
import { registerExecuteApiTool } from "./tools/executeApi";
import { registerListExecutionsTool } from "./tools/listExecutions";
import { registerGetExecutionTool } from "./tools/getExecution";
import { registerCancelExecutionTool } from "./tools/cancelExecution";
import { registerListPendingExecutionsTool } from "./tools/listPendingExecutions";
import { registerApproveExecutionTool } from "./tools/approveExecution";
import { registerRejectExecutionTool } from "./tools/rejectExecution";
import { registerSearchDocsTool } from "./tools/searchDocs";
import { registerSearchApisTool } from "./tools/searchApis";
import { registerSearchLogAuditsTool } from "./tools/searchLogAudits";
import { registerAdminListCompaniesTool } from "./tools/adminListCompanies";
import { registerAdminGetCompanyTool } from "./tools/adminGetCompany";
import { registerAdminCreateCompanyTool } from "./tools/adminCreateCompany";
import { registerAdminUpdateCompanyTool } from "./tools/adminUpdateCompany";
import { registerAdminListProjectsTool } from "./tools/adminListProjects";
import { registerAdminGetProjectTool } from "./tools/adminGetProject";
import { registerAdminCreateProjectTool } from "./tools/adminCreateProject";
import { registerAdminUpdateProjectTool } from "./tools/adminUpdateProject";
import { registerAdminUpdateProjectConnectionTool } from "./tools/adminUpdateProjectConnection";
import { registerAdminIssueProjectApiKeyTool } from "./tools/adminIssueProjectApiKey";
import { registerAdminListUsersTool } from "./tools/adminListUsers";
import { registerAdminGetUserTool } from "./tools/adminGetUser";
import { registerAdminUpdateUserTool } from "./tools/adminUpdateUser";
import { registerAdminApproveUserTool } from "./tools/adminApproveUser";
import { registerAdminRejectUserTool } from "./tools/adminRejectUser";
import { registerAdminResetUserPasswordTool } from "./tools/adminResetUserPassword";
import { registerAdminGetMyRoleTool } from "./tools/adminGetMyRole";
import { registerAdminListUserRolesTool } from "./tools/adminListUserRoles";
import { registerAdminAssignUserRoleTool } from "./tools/adminAssignUserRole";
import { registerAdminUpdateUserRoleTool } from "./tools/adminUpdateUserRole";

// GM Platform role_code (CLAUDE.md 참고: 10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR).
// mcp_server_dev와 동일하게, 여기 게이팅은 UX 차원의 1차 필터일 뿐이고 최종 방어선은
// 여전히 GM Platform 서버의 role/스코프 재검증(requireRole, assertCompanyScope, SP 내부 원자적 재검증)이다.
const APPROVAL_CAPABLE_ROLES = [10, 20, 30]; // 실행 승인/반려/대기목록 (mcp_server_dev와 동일)
const SUPER_ADMIN_AND_DEVELOPER = [10, 20]; // 프로젝트/사용자 조회, 연결정보·API키 발급
const SUPER_ADMIN_ONLY = [10]; // 회사/프로젝트/사용자 쓰기, 역할 배정

/**
 * env 계정으로 로그인해 role_code를 확인한 뒤, 그 범위만큼 tool을 등록하고 stdio transport로 연결한다.
 * mcp_server_dev의 실행/승인 tool 10개에 회사·프로젝트·사용자·역할배정 admin tool 20개를 더한 상위 호환 서버.
 * @returns void
 */
async function main(): Promise<void> {
  const roleCode = await getRoleCodeWithRetry();

  const server = new McpServer({ name: "gm-platform-pc-mcp-server", version: "1.0.0" });

  // 전 역할 공통 (mcp_server_dev와 동일한 실행 관련 7개 + admin 조회 3개)
  registerListProjectsTool(server);
  registerListApisTool(server);
  registerListCodeGroupsTool(server);
  registerExecuteApiTool(server);
  registerListExecutionsTool(server);
  registerGetExecutionTool(server);
  registerCancelExecutionTool(server);
  registerAdminListCompaniesTool(server);
  registerAdminGetCompanyTool(server);
  registerAdminGetMyRoleTool(server);
  if (env.ragEnabled) {
    registerSearchDocsTool(server); // 문서 검색은 역할과 무관하게 전 역할 공용 — 게이팅 없음. RAG_ENABLED=false면 tool 자체를 등록하지 않음
    registerSearchApisTool(server); // API 정의 검색도 role 게이팅 없음 — GM Platform이 결과 자체를 프로젝트/role로 스코핑
  }

  if (APPROVAL_CAPABLE_ROLES.includes(roleCode)) {
    registerListPendingExecutionsTool(server);
    registerApproveExecutionTool(server);
    registerRejectExecutionTool(server);
    // GET /log-audit-search 자체가 SA/DEV/APV 전용(GET /log-audits와 동일 범위)이라 같은 게이팅을 재사용.
    if (env.ragEnabled)
      registerSearchLogAuditsTool(server);
  }

  if (SUPER_ADMIN_AND_DEVELOPER.includes(roleCode)) {
    registerAdminListProjectsTool(server);
    registerAdminGetProjectTool(server);
    registerAdminUpdateProjectConnectionTool(server);
    registerAdminIssueProjectApiKeyTool(server);
    registerAdminListUsersTool(server);
    registerAdminGetUserTool(server);
    registerAdminListUserRolesTool(server);
  }

  if (SUPER_ADMIN_ONLY.includes(roleCode)) {
    registerAdminCreateCompanyTool(server);
    registerAdminUpdateCompanyTool(server);
    registerAdminCreateProjectTool(server);
    registerAdminUpdateProjectTool(server);
    registerAdminUpdateUserTool(server);
    registerAdminApproveUserTool(server);
    registerAdminRejectUserTool(server);
    registerAdminResetUserPasswordTool(server);
    registerAdminAssignUserRoleTool(server);
    registerAdminUpdateUserRoleTool(server);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`gm-platform-pc-mcp-server started - role_code=${roleCode}`);
}

main().catch((err) => {
  logger.error("gm-platform-pc-mcp-server 시작 실패", err);
  process.exit(1);
});
