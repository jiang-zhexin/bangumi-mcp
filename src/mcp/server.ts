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
      instructions:
        "Bangumi (bgm.tv) MCP Server for searching and managing anime, manga, books, music, games, live-action shows, episodes, characters, voice actors (seiyu), staff, studios, broadcast schedules, user watchlists/collections, ratings, and curated lists.",
    },
  );

  registerApiTools(server, client);

  return server;
}
