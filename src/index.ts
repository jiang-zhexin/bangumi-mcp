import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { env } from "cloudflare:workers";

import { authHandler, SCOPES } from "@/auth/handler";
import {
  type BgmOAuthTokenResponse,
  DEFAULT_BGM_USER_AGENT,
  refreshBgmAccessToken,
} from "@/bangumi";
import { mcpHandler } from "@/mcp/handler";

export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  apiHandler: mcpHandler,
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  scopesSupported: SCOPES,
  requiredScopes: ["mcp"],
  resourceMetadata: {
    resource: `${env.APP_URL}/mcp`,
    authorization_servers: [env.APP_URL],
  },
  tokenExchangeCallback: async ({ grantType, props, env }) => {
    const token = props as BgmOAuthTokenResponse;

    switch (grantType) {
      case "authorization_code":
        return { accessTokenTTL: token.expires_in };

      case "refresh_token":
        const refreshed = await refreshBgmAccessToken({
          refreshToken: token.refresh_token,
          clientId: env.BGM_CLIENT_ID,
          clientSecret: env.BGM_CLIENT_SECRET,
          redirectUri: `${env.APP_URL}/callback`,
          userAgent: DEFAULT_BGM_USER_AGENT,
        });
        return {
          newProps: refreshed,
          accessTokenTTL: refreshed.expires_in,
        };
    }
  },
});
