import type { CallToolResult, ContentBlock, McpServer } from "@modelcontextprotocol/server";

import { type BangumiClient, DEFAULT_BGM_USER_AGENT } from "@/bangumi";

import * as schemas from "./schemas";

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function apiError({ error, response }: ApiResult<unknown>): CallToolResult {
  const detail = typeof error === "string" ? error : JSON.stringify(error);
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Bangumi API error (${response.status} ${response.url}): ${detail}`,
      },
    ],
  };
}

function toJsonResult<T>(result: ApiResult<T>): CallToolResult {
  if (!result.response.ok) return apiError(result);

  const { data } = result;
  const structuredContent =
    data === undefined
      ? { success: true }
      : data !== null && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : { data };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

async function fetchInlineImage(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": DEFAULT_BGM_USER_AGENT } });
  const mimeType = response.headers.get("Content-Type")?.split(";")[0]?.trim();
  if (!response.ok || !mimeType?.startsWith("image/")) {
    await response.body?.cancel();
    return;
  }
  const bytes = await response.bytes();
  return { data: bytes.toBase64(), mimeType };
}

async function toImageResult(result: ApiResult<unknown>): Promise<CallToolResult> {
  const { response } = result;
  const location = response.status === 302 ? response.headers.get("Location") : null;
  if (!location) return apiError(result);

  const url = new URL(location, response.url).href;
  const image = await fetchInlineImage(url).catch(() => undefined);
  const structuredContent = image ? { url, mimeType: image.mimeType } : { url };

  const content: ContentBlock[] = [{ type: "text", text: JSON.stringify(structuredContent) }];
  if (image) content.unshift({ type: "image", ...image });

  return { content, structuredContent };
}

export function registerApiTools(server: McpServer, client: BangumiClient): void {
  server.registerTool(
    "get_calendar",
    {
      title: "每日放送",
      description: "获取每周每日放送的番剧时间表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      outputSchema: schemas.getCalendarOutputSchema,
    },
    () => client.api.GET("/calendar").then(toJsonResult),
  );

  server.registerTool(
    "search_subjects",
    {
      title: "条目搜索",
      description:
        "根据关键词和过滤条件搜索条目（书籍、动画、音乐、游戏、三次元）。不同筛选条件之间为「且」关系。",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.searchSubjectsInputSchema,
      outputSchema: schemas.searchSubjectsOutputSchema,
    },
    ({ limit, offset, keyword, sort, filter }) =>
      client.api
        .POST("/v0/search/subjects", {
          params: { query: { limit, offset } },
          body: { keyword, sort, filter },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "search_characters",
    {
      title: "角色搜索",
      description: "根据关键词搜索虚拟角色",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.searchCharactersInputSchema,
      outputSchema: schemas.searchCharactersOutputSchema,
    },
    ({ limit, offset, keyword, filter }) =>
      client.api
        .POST("/v0/search/characters", {
          params: { query: { limit, offset } },
          body: { keyword, filter },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "search_persons",
    {
      title: "人物搜索",
      description: "根据关键词和职业搜索现实人物或制作团体（声优、作者、监督、制作公司等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.searchPersonsInputSchema,
      outputSchema: schemas.searchPersonsOutputSchema,
    },
    ({ limit, offset, keyword, filter }) =>
      client.api
        .POST("/v0/search/persons", {
          params: { query: { limit, offset } },
          body: { keyword, filter },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subjects",
    {
      title: "浏览条目",
      description: "按条目类型、子分类、年份、月份等条件分页浏览条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectsInputSchema,
      outputSchema: schemas.getSubjectsOutputSchema,
    },
    ({ type, cat, series, platform, sort, year, month, limit, offset }) =>
      client.api
        .GET("/v0/subjects", {
          params: {
            query: { type, cat, series, platform, sort, year, month, limit, offset },
          },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_by_id",
    {
      title: "获取条目详情",
      description: "根据条目 ID 获取条目的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectByIdInputSchema,
      outputSchema: schemas.getSubjectByIdOutputSchema,
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}", { params: { path: { subject_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_image_by_id",
    {
      title: "获取条目封面图",
      description: "根据条目 ID 和尺寸类型获取条目封面图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectImageByIdInputSchema,
      outputSchema: schemas.getSubjectImageByIdOutputSchema,
    },
    ({ subject_id, type }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/image", {
          params: { path: { subject_id }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_related_persons_by_subject_id",
    {
      title: "获取条目关联人物",
      description: "根据条目 ID 获取参与该条目的相关人物列表（制作人员、作者等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedPersonsBySubjectIdInputSchema,
      outputSchema: schemas.getRelatedPersonsBySubjectIdOutputSchema,
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/persons", {
          params: { path: { subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_characters_by_subject_id",
    {
      title: "获取条目关联角色",
      description: "根据条目 ID 获取该条目登场的角色及配音列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedCharactersBySubjectIdInputSchema,
      outputSchema: schemas.getRelatedCharactersBySubjectIdOutputSchema,
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/characters", {
          params: { path: { subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_subjects_by_subject_id",
    {
      title: "获取关联条目",
      description: "根据条目 ID 获取与之关联的其他条目列表（前传、续作、番外、原声集等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedSubjectsBySubjectIdInputSchema,
      outputSchema: schemas.getRelatedSubjectsBySubjectIdOutputSchema,
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/subjects", {
          params: { path: { subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episodes",
    {
      title: "获取章节列表",
      description: "根据条目 ID 分页获取章节（剧集/曲目）列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodesInputSchema,
      outputSchema: schemas.getEpisodesOutputSchema,
    },
    ({ subject_id, type, limit, offset }) =>
      client.api
        .GET("/v0/episodes", {
          params: { query: { subject_id, type, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episode_by_id",
    {
      title: "获取章节详情",
      description: "根据章节 ID 获取单个章节的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodeByIdInputSchema,
      outputSchema: schemas.getEpisodeByIdOutputSchema,
    },
    ({ episode_id }) =>
      client.api
        .GET("/v0/episodes/{episode_id}", { params: { path: { episode_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_by_id",
    {
      title: "获取角色详情",
      description: "根据角色 ID 获取角色的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterByIdInputSchema,
      outputSchema: schemas.getCharacterByIdOutputSchema,
    },
    ({ character_id }) =>
      client.api
        .GET("/v0/characters/{character_id}", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_image_by_id",
    {
      title: "获取角色肖像图",
      description: "根据角色 ID 和尺寸类型获取角色肖像图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterImageByIdInputSchema,
      outputSchema: schemas.getCharacterImageByIdOutputSchema,
    },
    ({ character_id, type }) =>
      client.api
        .GET("/v0/characters/{character_id}/image", {
          params: { path: { character_id }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_related_subjects_by_character_id",
    {
      title: "获取角色出演条目",
      description: "根据角色 ID 获取该角色登场的关联条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedSubjectsByCharacterIdInputSchema,
      outputSchema: schemas.getRelatedSubjectsByCharacterIdOutputSchema,
    },
    ({ character_id }) =>
      client.api
        .GET("/v0/characters/{character_id}/subjects", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_persons_by_character_id",
    {
      title: "获取角色关联人物",
      description: "根据角色 ID 获取关联的现实人物列表（如声优、演员）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedPersonsByCharacterIdInputSchema,
      outputSchema: schemas.getRelatedPersonsByCharacterIdOutputSchema,
    },
    ({ character_id }) =>
      client.api
        .GET("/v0/characters/{character_id}/persons", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_character",
    {
      title: "收藏角色",
      description: "为当前登录用户收藏指定角色",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.collectCharacterInputSchema,
      outputSchema: schemas.collectCharacterOutputSchema,
    },
    ({ character_id }) =>
      client.api
        .POST("/v0/characters/{character_id}/collect", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_character",
    {
      title: "取消收藏角色",
      description: "为当前登录用户取消收藏指定角色",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.uncollectCharacterInputSchema,
      outputSchema: schemas.uncollectCharacterOutputSchema,
    },
    ({ character_id }) =>
      client.api
        .DELETE("/v0/characters/{character_id}/collect", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_by_id",
    {
      title: "获取人物详情",
      description: "根据人物 ID 获取现实人物或制作团体的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonByIdInputSchema,
      outputSchema: schemas.getPersonByIdOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}", { params: { path: { person_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_image_by_id",
    {
      title: "获取人物肖像图",
      description: "根据人物 ID 和尺寸类型获取人物肖像图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonImageByIdInputSchema,
      outputSchema: schemas.getPersonImageByIdOutputSchema,
    },
    ({ person_id, type }) =>
      client.api
        .GET("/v0/persons/{person_id}/image", {
          params: { path: { person_id }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_related_subjects_by_person_id",
    {
      title: "获取人物参与条目",
      description: "根据人物 ID 获取其参与制作、创作或出演的条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedSubjectsByPersonIdInputSchema,
      outputSchema: schemas.getRelatedSubjectsByPersonIdOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}/subjects", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_characters_by_person_id",
    {
      title: "获取人物配音/出演角色",
      description: "根据人物 ID 获取其配音或扮演的虚拟角色列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedCharactersByPersonIdInputSchema,
      outputSchema: schemas.getRelatedCharactersByPersonIdOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}/characters", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_person",
    {
      title: "收藏人物",
      description: "为当前登录用户收藏指定人物",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.collectPersonInputSchema,
      outputSchema: schemas.collectPersonOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .POST("/v0/persons/{person_id}/collect", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_person",
    {
      title: "取消收藏人物",
      description: "为当前登录用户取消收藏指定人物",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.uncollectPersonInputSchema,
      outputSchema: schemas.uncollectPersonOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .DELETE("/v0/persons/{person_id}/collect", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_by_name",
    {
      title: "获取用户信息",
      description: "根据用户名获取用户的公开个人资料",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserByNameInputSchema,
      outputSchema: schemas.getUserByNameOutputSchema,
    },
    ({ username }) =>
      client.api.GET("/v0/users/{username}", { params: { path: { username } } }).then(toJsonResult),
  );

  server.registerTool(
    "get_user_avatar_by_name",
    {
      title: "获取用户头像",
      description: "根据用户名和尺寸类型获取用户头像图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserAvatarByNameInputSchema,
      outputSchema: schemas.getUserAvatarByNameOutputSchema,
    },
    ({ username, type }) =>
      client.api
        .GET("/v0/users/{username}/avatar", {
          params: { path: { username }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_me",
    {
      title: "获取当前登录用户信息",
      description: "获取当前授权登录用户的个人信息（包括 username、UID、昵称等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      outputSchema: schemas.getMeOutputSchema,
    },
    () => client.api.GET("/v0/me").then(toJsonResult),
  );

  server.registerTool(
    "get_user_collections",
    {
      title: "获取用户条目收藏列表",
      description: "分页获取指定用户的条目收藏列表（私有收藏仅本人可见）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCollectionsInputSchema,
      outputSchema: schemas.getUserCollectionsOutputSchema,
    },
    ({ username, subject_type, type, limit, offset }) =>
      client.api
        .GET("/v0/users/{username}/collections", {
          params: { path: { username }, query: { subject_type, type, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_collection",
    {
      title: "获取用户单个条目收藏",
      description: "获取指定用户对单个条目的收藏状态、评分及评论（私有收藏仅本人可见）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCollectionInputSchema,
      outputSchema: schemas.getUserCollectionOutputSchema,
    },
    ({ username, subject_id }) =>
      client.api
        .GET("/v0/users/{username}/collections/{subject_id}", {
          params: { path: { username, subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "post_user_collection",
    {
      title: "新增或修改条目收藏",
      description:
        "为当前登录用户新增或更新单个条目的收藏状态、评分、标签及评价（若未收藏则创建，已收藏则更新；ep_status 与 vol_status 仅适用于书籍类条目）",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.postUserCollectionInputSchema,
      outputSchema: schemas.postUserCollectionOutputSchema,
    },
    ({ subject_id, ...body }) =>
      client.api
        .POST("/v0/users/-/collections/{subject_id}", {
          params: { path: { subject_id } },
          body,
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "patch_user_collection",
    {
      title: "更新条目收藏",
      description:
        "更新当前登录用户对已收藏条目的状态、评分、标签或评价（ep_status 与 vol_status 仅适用于书籍类条目）",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.patchUserCollectionInputSchema,
      outputSchema: schemas.patchUserCollectionOutputSchema,
    },
    ({ subject_id, ...body }) =>
      client.api
        .PATCH("/v0/users/-/collections/{subject_id}", {
          params: { path: { subject_id } },
          body,
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_subject_episode_collection",
    {
      title: "获取条目章节收藏状态",
      description: "分页获取当前登录用户在指定条目下的各章节（剧集）收藏状态",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserSubjectEpisodeCollectionInputSchema,
      outputSchema: schemas.getUserSubjectEpisodeCollectionOutputSchema,
    },
    ({ subject_id, offset, limit, episode_type }) =>
      client.api
        .GET("/v0/users/-/collections/{subject_id}/episodes", {
          params: { path: { subject_id }, query: { offset, limit, episode_type } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "patch_user_subject_episode_collection",
    {
      title: "批量更新条目章节收藏状态",
      description:
        "批量更新当前登录用户在指定条目下多个章节的观看状态，并自动重新计算条目的完成进度",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.patchUserSubjectEpisodeCollectionInputSchema,
      outputSchema: schemas.patchUserSubjectEpisodeCollectionOutputSchema,
    },
    ({ subject_id, episode_id, type }) =>
      client.api
        .PATCH("/v0/users/-/collections/{subject_id}/episodes", {
          params: { path: { subject_id } },
          body: { episode_id, type },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_episode_collection",
    {
      title: "获取单个章节收藏状态",
      description: "获取当前登录用户对指定章节的观看/收藏状态",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserEpisodeCollectionInputSchema,
      outputSchema: schemas.getUserEpisodeCollectionOutputSchema,
    },
    ({ episode_id }) =>
      client.api
        .GET("/v0/users/-/collections/-/episodes/{episode_id}", {
          params: { path: { episode_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "put_user_episode_collection",
    {
      title: "更新单个章节收藏状态",
      description: "更新当前登录用户对指定章节的观看/收藏状态",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.putUserEpisodeCollectionInputSchema,
      outputSchema: schemas.putUserEpisodeCollectionOutputSchema,
    },
    ({ episode_id, type }) =>
      client.api
        .PUT("/v0/users/-/collections/-/episodes/{episode_id}", {
          params: { path: { episode_id } },
          body: { type },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_character_collections",
    {
      title: "获取用户角色收藏列表",
      description: "获取指定用户收藏的角色列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCharacterCollectionsInputSchema,
      outputSchema: schemas.getUserCharacterCollectionsOutputSchema,
    },
    ({ username }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/characters", {
          params: { path: { username } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_character_collection",
    {
      title: "获取用户单个角色收藏信息",
      description: "获取指定用户对单个角色的收藏信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCharacterCollectionInputSchema,
      outputSchema: schemas.getUserCharacterCollectionOutputSchema,
    },
    ({ username, character_id }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/characters/{character_id}", {
          params: { path: { username, character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_person_collections",
    {
      title: "获取用户人物收藏列表",
      description: "获取指定用户收藏的现实人物列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserPersonCollectionsInputSchema,
      outputSchema: schemas.getUserPersonCollectionsOutputSchema,
    },
    ({ username }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/persons", {
          params: { path: { username } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_person_collection",
    {
      title: "获取用户单个人物收藏信息",
      description: "获取指定用户对单个人物的收藏信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserPersonCollectionInputSchema,
      outputSchema: schemas.getUserPersonCollectionOutputSchema,
    },
    ({ username, person_id }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/persons/{person_id}", {
          params: { path: { username, person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_revisions",
    {
      title: "获取人物历史修订列表",
      description: "根据人物 ID 分页获取该人物词条的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonRevisionsInputSchema,
      outputSchema: schemas.getPersonRevisionsOutputSchema,
    },
    ({ person_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/persons", {
          params: { query: { person_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_revision_by_id",
    {
      title: "获取人物历史修订详情",
      description: "根据修订版本 ID 获取人物词条单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonRevisionByIdInputSchema,
      outputSchema: schemas.getPersonRevisionByIdOutputSchema,
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/persons/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_revisions",
    {
      title: "获取角色历史修订列表",
      description: "根据角色 ID 分页获取该角色词条的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterRevisionsInputSchema,
      outputSchema: schemas.getCharacterRevisionsOutputSchema,
    },
    ({ character_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/characters", {
          params: { query: { character_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_revision_by_id",
    {
      title: "获取角色历史修订详情",
      description: "根据修订版本 ID 获取角色词条单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterRevisionByIdInputSchema,
      outputSchema: schemas.getCharacterRevisionByIdOutputSchema,
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/characters/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_revisions",
    {
      title: "获取条目历史修订列表",
      description: "根据条目 ID 分页获取该条目词条的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectRevisionsInputSchema,
      outputSchema: schemas.getSubjectRevisionsOutputSchema,
    },
    ({ subject_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/subjects", {
          params: { query: { subject_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_revision_by_id",
    {
      title: "获取条目历史修订详情",
      description: "根据修订版本 ID 获取条目词条单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectRevisionByIdInputSchema,
      outputSchema: schemas.getSubjectRevisionByIdOutputSchema,
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/subjects/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episode_revisions",
    {
      title: "获取章节历史修订列表",
      description: "根据章节 ID 分页获取该章节的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodeRevisionsInputSchema,
      outputSchema: schemas.getEpisodeRevisionsOutputSchema,
    },
    ({ episode_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/episodes", {
          params: { query: { episode_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episode_revision_by_id",
    {
      title: "获取章节历史修订详情",
      description: "根据修订版本 ID 获取章节单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodeRevisionByIdInputSchema,
      outputSchema: schemas.getEpisodeRevisionByIdOutputSchema,
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/episodes/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "new_index",
    {
      title: "创建目录",
      description: "为当前登录用户创建一个新目录",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      outputSchema: schemas.newIndexOutputSchema,
    },
    () => client.api.POST("/v0/indices").then(toJsonResult),
  );

  server.registerTool(
    "get_index_by_id",
    {
      title: "获取目录详情",
      description: "根据目录 ID 获取目录的基本信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getIndexByIdInputSchema,
      outputSchema: schemas.getIndexByIdOutputSchema,
    },
    ({ index_id }) =>
      client.api
        .GET("/v0/indices/{index_id}", { params: { path: { index_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "edit_index_by_id",
    {
      title: "编辑目录信息",
      description: "修改指定目录的标题和描述",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.editIndexByIdInputSchema,
      outputSchema: schemas.editIndexByIdOutputSchema,
    },
    ({ index_id, title, description }) =>
      client.api
        .PUT("/v0/indices/{index_id}", {
          params: { path: { index_id } },
          body: { title, description },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_index_subjects_by_index_id",
    {
      title: "获取目录条目列表",
      description: "根据目录 ID 分页获取该目录中收录的条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getIndexSubjectsByIndexIdInputSchema,
      // 上游此接口存在问题：https://github.com/bangumi/api/issues/243
      outputSchema: schemas.getIndexSubjectsByIndexIdOutputSchema,
    },
    ({ index_id, type, limit, offset }) =>
      client.api
        .GET("/v0/indices/{index_id}/subjects", {
          params: { path: { index_id }, query: { type, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "add_subject_to_index",
    {
      title: "向目录添加条目",
      description: "向指定目录中添加一个条目",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.addSubjectToIndexInputSchema,
      outputSchema: schemas.addSubjectToIndexOutputSchema,
    },
    ({ index_id, subject_id, sort, comment }) =>
      client.api
        .POST("/v0/indices/{index_id}/subjects", {
          params: { path: { index_id } },
          body: { subject_id, sort, comment },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "edit_index_subject",
    {
      title: "修改目录中的条目信息",
      description: "修改目录中指定条目的排序权重或备注（若条目不存在于目录中则会创建）",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.editIndexSubjectInputSchema,
      outputSchema: schemas.editIndexSubjectOutputSchema,
    },
    ({ index_id, subject_id, sort, comment }) =>
      client.api
        .PUT("/v0/indices/{index_id}/subjects/{subject_id}", {
          params: { path: { index_id, subject_id } },
          body: { sort, comment },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "delete_subject_from_index",
    {
      title: "从目录移除条目",
      description: "从指定目录中删除某个条目",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.deleteSubjectFromIndexInputSchema,
      outputSchema: schemas.deleteSubjectFromIndexOutputSchema,
    },
    ({ index_id, subject_id }) =>
      client.api
        .DELETE("/v0/indices/{index_id}/subjects/{subject_id}", {
          params: { path: { index_id, subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_index",
    {
      title: "收藏目录",
      description: "为当前登录用户收藏指定目录",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.collectIndexInputSchema,
      outputSchema: schemas.collectIndexOutputSchema,
    },
    ({ index_id }) =>
      client.api
        .POST("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_index",
    {
      title: "取消收藏目录",
      description: "为当前登录用户取消收藏指定目录",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.uncollectIndexInputSchema,
      outputSchema: schemas.uncollectIndexOutputSchema,
    },
    ({ index_id }) =>
      client.api
        .DELETE("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        })
        .then(toJsonResult),
  );
}
