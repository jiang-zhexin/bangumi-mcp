import createClient, { mergeHeaders } from "openapi-fetch";

import type { paths as LegacyPaths } from "./generated/api";
import type { paths as V0Paths } from "./generated/v0";

export type BangumiPaths = LegacyPaths & V0Paths;

export const BGM_API_BASE_URL = "https://api.bgm.tv";
export const BGM_OAUTH_AUTHORIZE_URL = "https://bgm.tv/oauth/authorize";
export const BGM_OAUTH_TOKEN_URL = "https://bgm.tv/oauth/access_token";
export const DEFAULT_BGM_USER_AGENT =
  "jiang-zhexin/bangumi-mcp/1.0.0 (https://github.com/jiang-zhexin/bangumi-mcp)";

export interface ExchangeBgmCodeOptions {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  state?: string;
  userAgent: string;
}

export interface BgmOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string | null;
  refresh_token: string;
  user_id?: number;
}

export async function exchangeBgmAuthorizationCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
  state,
  userAgent,
}: ExchangeBgmCodeOptions): Promise<BgmOAuthTokenResponse> {
  const response = await fetch(BGM_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      code,
      redirect_uri: redirectUri,
      state,
    }),
  });

  if (!response.ok) {
    throw new Error(`Bangumi token endpoint returned ${response.status}`);
  }

  return (await response.json()) as BgmOAuthTokenResponse;
}

export interface RefreshBgmTokenOptions {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userAgent: string;
}

export async function refreshBgmAccessToken({
  refreshToken,
  clientId,
  clientSecret,
  redirectUri,
  userAgent,
}: RefreshBgmTokenOptions): Promise<BgmOAuthTokenResponse> {
  const response = await fetch(BGM_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      refresh_token: refreshToken,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Bangumi token endpoint returned ${response.status}`);
  }

  return (await response.json()) as BgmOAuthTokenResponse;
}

export class BangumiClient {
  public readonly api: ReturnType<typeof createClient<BangumiPaths>>;

  constructor(accessToken: string) {
    const headers = mergeHeaders({ "User-Agent": DEFAULT_BGM_USER_AGENT });
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    this.api = createClient<BangumiPaths>({
      baseUrl: BGM_API_BASE_URL,
      headers,
    });
  }
}
