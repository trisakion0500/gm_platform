import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { GmApiError } from "../gmClient";

/**
 * 성공한 tool 호출 결과를 만든다. data는 JSON 텍스트로 직렬화해 담는다.
 * @param data 응답에 담을 데이터
 * @returns CallToolResult
 */
export function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/**
 * 예외를 tool 오류 결과로 변환한다. GmApiError는 GM Platform의 result/message를 그대로 노출해
 * LLM이 CLAUDE.md 오류 코드 표와 대조할 수 있게 한다.
 * @param err 발생한 예외
 * @returns isError:true인 CallToolResult
 */
export function toToolError(err: unknown): CallToolResult {
  if (err instanceof GmApiError)
    return { content: [{ type: "text", text: `GM Platform 오류 ${err.code}: ${err.message}` }], isError: true };
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `MCP 서버 오류: ${message}` }], isError: true };
}

/**
 * tool 콜백을 try/catch로 감싸 GmApiError·기타 예외를 균일하게 CallToolResult로 변환한다.
 * @param fn GM Platform 호출 후 데이터를 반환하는 함수
 * @returns McpServer.registerTool에 바로 넘길 수 있는 콜백
 */
export function safeTool<Args>(fn: (args: Args) => Promise<unknown>) {
  return async (args: Args): Promise<CallToolResult> => {
    try {
      return ok(await fn(args));
    } catch (err) {
      return toToolError(err);
    }
  };
}
