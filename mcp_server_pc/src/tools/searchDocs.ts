import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchDocs } from "../ragClient";
import { safeTool } from "../utils/toolResult";

const inputSchema = {
  query: z.string().min(1).describe("검색할 질의문 (자연어)"),
  top_k: z.number().int().min(1).max(20).optional().describe("반환할 최대 결과 개수 (기본 5, 최대 20)"),
};

/**
 * search_docs tool을 등록한다. rag_server(POST /search)로 GM Platform 설계 문서(docs/*.md, README.md)에서
 * 질의와 의미적으로 유사한 청크를 검색한다. 문서 검색은 역할과 무관하게 유용해 role_code 게이팅 없이 등록한다.
 * @param server McpServer 인스턴스
 * @returns void
 */
export function registerSearchDocsTool(server: McpServer): void {
  server.registerTool(
    "search_docs",
    {
      title: "GM Platform 설계 문서 검색",
      description: "GM Platform의 설계 문서(docs/*.md, README.md)에서 질의와 의미적으로 유사한 내용을 검색한다.",
      inputSchema,
    },
    safeTool<{ query: string; top_k?: number }>(({ query, top_k }) => searchDocs(query, top_k)),
  );
}
