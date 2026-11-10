import { McpServer } from "@modelcontextprotocol/server";

import type { BangumiClient } from "@/bangumi";

import { registerApiTools } from "./tools";

export function createBgmMcpServer(client: BangumiClient): McpServer {
  const server = new McpServer(
    {
      name: "bgm-mcp",
      version: "1.0.0",
    },
    {
      instructions: "Bangumi (番组计划 / bgm.tv) Remote MCP Server",
    },
  );

  registerApiTools(server, client);

  return server;
}
