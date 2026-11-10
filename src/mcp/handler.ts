import { insufficientScope, type OAuthResourceContext } from "@cloudflare/workers-oauth-provider";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";

import { BangumiClient, type BgmOAuthTokenResponse } from "@/bangumi";

import { createBgmMcpServer } from "./server";

export const mcpHandler = {
  async fetch(request, _env, ctx) {
    const { props, auth } = ctx as OAuthResourceContext<BgmOAuthTokenResponse>;
    if (!auth.scope.includes("mcp")) {
      return insufficientScope(auth, ["mcp"]);
    }
    if (request.method !== "POST") {
      return new Response(null, { status: 405, headers: { Allow: "POST" } });
    }

    const server = createBgmMcpServer(new BangumiClient(props.access_token));
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return await transport.handleRequest(request);
  },
} satisfies ExportedHandler<Env>;
