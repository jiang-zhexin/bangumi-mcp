import { authorizationErrorRedirect, type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { methodNotAllowed } from "hono/method-not-allowed";

import {
  BGM_OAUTH_AUTHORIZE_URL,
  DEFAULT_BGM_USER_AGENT,
  exchangeBgmAuthorizationCode,
} from "@/bangumi";

export const SCOPES = ["mcp", "offline_access"];

export const authHandler = new Hono<{
  Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers };
}>();

authHandler.use(methodNotAllowed({ app: authHandler }));
authHandler.use(async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Pragma", "no-cache");
  await next();
});

authHandler.get("/authorize", async (c) => {
  const oauth = c.env.OAUTH_PROVIDER;
  const request = await oauth.parseAuthRequest(c.req.raw);
  const { state, headers } = await oauth.beginUpstream(request);
  const url = new URL(BGM_OAUTH_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: c.env.BGM_CLIENT_ID,
    response_type: "code",
    redirect_uri: `${c.env.APP_URL}/callback`,
    state,
  }).toString();

  headers.set("Location", url.href);
  return new Response(null, { status: 302, headers });
});

authHandler.get("/callback", async (c) => {
  const oauth = c.env.OAUTH_PROVIDER;
  const { request, headers } = await oauth.finishUpstream(c.req.raw);
  const code = c.req.query("code");
  if (c.req.query("error") || !code) {
    headers.set("Location", authorizationErrorRedirect(request, "access_denied"));
    return new Response(null, { status: 302, headers });
  }

  const token = await exchangeBgmAuthorizationCode({
    code,
    state: c.req.query("state"),
    clientId: c.env.BGM_CLIENT_ID,
    clientSecret: c.env.BGM_CLIENT_SECRET,
    redirectUri: `${c.env.APP_URL}/callback`,
    userAgent: DEFAULT_BGM_USER_AGENT,
  });
  if (token.user_id === undefined) {
    throw new Error("Bangumi token response is missing user_id");
  }

  const { redirectTo } = await oauth.completeAuthorization({
    request,
    userId: String(token.user_id),
    metadata: {},
    scope: request.scope.filter((scope) => SCOPES.includes(scope)),
    props: token,
  });
  headers.set("Location", redirectTo);
  return new Response(null, { status: 302, headers });
});
