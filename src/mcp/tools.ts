import type { McpServer } from "@modelcontextprotocol/server";
import { toStandardJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";

import type { BangumiClient } from "@/bangumi";

async function toToolResult(
  request: Promise<{ data?: unknown; error?: unknown; response: Response }>,
  image = false,
) {
  try {
    const { data, error, response } = await request;
    let result = data;
    if (image && response.status === 302) {
      const location = response.headers.get("Location");
      if (!location) throw new Error("Bangumi image response is missing Location");
      result = { url: new URL(location, response.url).href };
    } else if (!response.ok) {
      throw new Error(
        `Bangumi API error (${response.status} ${response.url}): ${typeof error === "string" ? error : JSON.stringify(error)}`,
      );
    }
    const structuredContent =
      result === undefined
        ? { success: true }
        : result !== null && typeof result === "object" && !Array.isArray(result)
          ? (result as Record<string, unknown>)
          : { data: result };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
      structuredContent,
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

export function registerApiTools(server: McpServer, client: BangumiClient): void {
  server.registerTool(
    "get_calendar",
    {
      title: "每日放送",
      description: "每日放送\n\nGET /calendar",
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () => toToolResult(client.api.GET("/calendar")),
  );

  server.registerTool(
    "search_subjects",
    {
      title: "条目搜索",
      description:
        "条目搜索\n\n## 实验性 API， 本 schema 和实际的 API 行为都可能随时发生改动\n\n目前支持的筛选条件包括:\n- `type`: 条目类型，参照 `SubjectType` enum， `或`。\n- `tag`: 标签，可以多次出现。`且` 关系。\n- `air_date`: 播出日期/发售日期。`且` 关系。\n- `rating`: 用于搜索指定评分的条目。`且` 关系。\n- `rating_count`: 用于按照评分人数筛选条目。`且` 关系。\n- `rank`: 用于搜索指定排名的条目。`且` 关系。\n- `nsfw`: 使用 `include` 包含NSFW搜索结果。默认排除搜索NSFW条目。无权限情况下忽略此选项，不会返回NSFW条目。\n\n不同筛选条件之间为 `且`\n\nPOST /v0/search/subjects\n\n请求体通过 body 参数传入。",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页参数"))),
          offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页参数"))),
          body: v.optional(
            v.object({
              keyword: v.string(),
              sort: v.optional(
                v.pipe(
                  v.picklist(["match", "heat", "rank", "score"]),
                  v.description(
                    "排序规则\n\n- `match` meilisearch 的默认排序，按照匹配程度\n- `heat` 收藏人数\n- `rank` 排名由高到低\n- `score` 评分",
                  ),
                ),
              ),
              filter: v.optional(
                v.pipe(
                  v.object({
                    type: v.optional(
                      v.pipe(
                        v.array(
                          v.pipe(
                            v.picklist([1, 2, 3, 4, 6]),
                            v.description(
                              "条目类型\n- `1` 为 书籍\n- `2` 为 动画\n- `3` 为 音乐\n- `4` 为 游戏\n- `6` 为 三次元\n\n没有 `5`",
                            ),
                          ),
                        ),
                        v.description(
                          "条目类型，参照 `SubjectType` enum，多值之间为 `或` 的关系。",
                        ),
                      ),
                    ),
                    meta_tags: v.optional(
                      v.pipe(
                        v.array(v.string()),
                        v.description(
                          "公共标签。多个值之间为 `且` 关系。可以用 `-` 排除标签。比如 `-科幻` 可以排除科幻标签。",
                        ),
                      ),
                    ),
                    tag: v.optional(
                      v.pipe(
                        v.array(v.string()),
                        v.description("标签，可以多次出现。多值之间为 `且` 关系。"),
                      ),
                    ),
                    air_date: v.optional(
                      v.pipe(
                        v.array(v.string()),
                        v.description(
                          "播出日期/发售日期，日期必需为 `YYYY-MM-DD` 格式。多值之间为 `且` 关系。",
                        ),
                      ),
                    ),
                    rating: v.optional(
                      v.pipe(
                        v.array(v.string()),
                        v.description("用于搜索指定评分的条目，多值之间为 `且` 关系。"),
                      ),
                    ),
                    rating_count: v.optional(
                      v.pipe(
                        v.array(v.string()),
                        v.description(
                          "用于按照评分人数筛选条目，多值之间为 `且` 关系，格式与 `rating` 相同。",
                        ),
                      ),
                    ),
                    rank: v.optional(
                      v.pipe(
                        v.array(v.string()),
                        v.description("用于搜索指定排名的条目，多值之间为 `且` 关系。"),
                      ),
                    ),
                    nsfw: v.optional(
                      v.pipe(
                        v.boolean(),
                        v.description(
                          "无权限的用户会直接忽略此字段，不会返回R18条目。\n\n默认或者 `null` 会返回包含 R18 的所有搜索结果。\n\n`true` 只会返回 R18 条目。\n\n`false` 只会返回非 R18 条目。",
                        ),
                      ),
                    ),
                  }),
                  v.description("不同条件之间是 `且` 的关系"),
                ),
              ),
            }),
          ),
        }),
      ),
    },
    ({ limit, offset, body }) =>
      toToolResult(
        client.api.POST("/v0/search/subjects", {
          params: { query: { limit, offset } },
          body,
        }),
      ),
  );

  server.registerTool(
    "search_characters",
    {
      title: "角色搜索",
      description:
        "角色搜索\n\n## 实验性 API， 本 schema 和实际的 API 行为都可能随时发生改动\n\n目前支持的筛选条件包括:\n- `nsfw`: 使用 `include` 包含NSFW搜索结果。默认排除搜索NSFW条目。无权限情况下忽略此选项，不会返回NSFW条目。\n\nPOST /v0/search/characters\n\n请求体通过 body 参数传入。",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页参数"))),
          offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页参数"))),
          body: v.optional(
            v.object({
              keyword: v.string(),
              filter: v.optional(
                v.pipe(
                  v.object({
                    nsfw: v.optional(
                      v.pipe(
                        v.boolean(),
                        v.description(
                          "无权限的用户会直接忽略此字段，不会返回 R18 角色。\n\n默认或者 `null` 会返回包含 R18 的所有搜索结果。\n\n`true` 只会返回 R18 角色。\n\n`false` 只会返回非 R18 角色。",
                        ),
                      ),
                    ),
                  }),
                  v.description("不同条件之间是 `且` 的关系"),
                ),
              ),
            }),
          ),
        }),
      ),
    },
    ({ limit, offset, body }) =>
      toToolResult(
        client.api.POST("/v0/search/characters", {
          params: { query: { limit, offset } },
          body,
        }),
      ),
  );

  server.registerTool(
    "search_persons",
    {
      title: "人物搜索",
      description:
        "人物搜索\n\n## 实验性 API， 本 schema 和实际的 API 行为都可能随时发生改动\n\n目前支持的筛选条件包括:\n- `career`: 职业，可以多次出现。`且` 关系。\n\n不同筛选条件之间为 `且`\n\nPOST /v0/search/persons\n\n请求体通过 body 参数传入。",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页参数"))),
          offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页参数"))),
          body: v.optional(
            v.object({
              keyword: v.string(),
              filter: v.optional(
                v.pipe(
                  v.object({
                    career: v.optional(
                      v.pipe(
                        v.array(v.string()),
                        v.description("职业，可以多次出现。多值之间为 `且` 关系。"),
                      ),
                    ),
                  }),
                  v.description("不同条件之间是 `且` 的关系"),
                ),
              ),
            }),
          ),
        }),
      ),
    },
    ({ limit, offset, body }) =>
      toToolResult(
        client.api.POST("/v0/search/persons", {
          params: { query: { limit, offset } },
          body,
        }),
      ),
  );

  server.registerTool(
    "get_subjects",
    {
      title: "浏览条目",
      description: "浏览条目\n\n第一页会 cache 24h，之后会 cache 1h\n\nGET /v0/subjects",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          type: v.pipe(v.picklist([1, 2, 3, 4, 6]), v.description("条目类型")),
          cat: v.optional(
            v.pipe(
              v.union([
                v.pipe(
                  v.picklist([0, 1001, 1002, 1003]),
                  v.description(
                    "书籍类型\n- `0` 为 其他\n- `1001` 为 漫画\n- `1002` 为 小说\n- `1003` 为 画集",
                  ),
                ),
                v.pipe(
                  v.picklist([0, 1, 2, 3, 5]),
                  v.description(
                    "动画类型\n- `0` 为 其他\n- `1` 为 TV\n- `2` 为 OVA\n- `3` 为 Movie\n- `5` 为 WEB",
                  ),
                ),
                v.pipe(
                  v.picklist([0, 4001, 4003, 4002, 4005]),
                  v.description(
                    "游戏类型\n- `0` 为 其他\n- `4001` 为 游戏\n- `4002` 为 软件\n- `4003` 为 扩展包\n- `4005` 为 桌游",
                  ),
                ),
                v.pipe(
                  v.picklist([0, 1, 2, 3, 6001, 6002, 6003, 6004]),
                  v.description(
                    "电影类型\n- `0` 为 其他\n- `1` 为 日剧\n- `2` 为 欧美剧\n- `3` 为 华语剧\n- `6001` 为 电视剧\n- `6002` 为 电影\n- `6003` 为 演出\n- `6004` 为 综艺",
                  ),
                ),
              ]),
              v.description("条目分类，参照 `SubjectCategory` enum"),
            ),
          ),
          series: v.optional(
            v.pipe(v.boolean(), v.description("是否系列，仅对书籍类型的条目有效")),
          ),
          platform: v.optional(v.pipe(v.string(), v.description("平台，仅对游戏类型的条目有效"))),
          sort: v.optional(v.pipe(v.string(), v.description("排序，枚举值 {date|rank}"))),
          year: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("年份"))),
          month: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("月份"))),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ type, cat, series, platform, sort, year, month, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/subjects", {
          params: {
            query: { type, cat, series, platform, sort, year, month, limit, offset },
          },
        }),
      ),
  );

  server.registerTool(
    "get_subject_by_id",
    {
      title: "获取条目",
      description: "获取条目\n\ncache with 300s\n\nGET /v0/subjects/{subject_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
    },
    ({ subject_id }) =>
      toToolResult(
        client.api.GET("/v0/subjects/{subject_id}", { params: { path: { subject_id } } }),
      ),
  );

  server.registerTool(
    "get_subject_image_by_id",
    {
      title: "Get Subject Image",
      description: "Get Subject Image\n\nGET /v0/subjects/{subject_id}/image",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          type: v.pipe(v.string(), v.description("枚举值 {small|grid|large|medium|common}")),
        }),
      ),
    },
    ({ subject_id, type }) =>
      toToolResult(
        client.api.GET("/v0/subjects/{subject_id}/image", {
          params: { path: { subject_id }, query: { type } },
          redirect: "manual",
        }),
        true,
      ),
  );

  server.registerTool(
    "get_related_persons_by_subject_id",
    {
      title: "Get Subject Persons",
      description: "Get Subject Persons\n\nGET /v0/subjects/{subject_id}/persons",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
    },
    ({ subject_id }) =>
      toToolResult(
        client.api.GET("/v0/subjects/{subject_id}/persons", {
          params: { path: { subject_id } },
        }),
      ),
  );

  server.registerTool(
    "get_related_characters_by_subject_id",
    {
      title: "Get Subject Characters",
      description: "Get Subject Characters\n\nGET /v0/subjects/{subject_id}/characters",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
    },
    ({ subject_id }) =>
      toToolResult(
        client.api.GET("/v0/subjects/{subject_id}/characters", {
          params: { path: { subject_id } },
        }),
      ),
  );

  server.registerTool(
    "get_related_subjects_by_subject_id",
    {
      title: "Get Subject Relations",
      description: "Get Subject Relations\n\nGET /v0/subjects/{subject_id}/subjects",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
    },
    ({ subject_id }) =>
      toToolResult(
        client.api.GET("/v0/subjects/{subject_id}/subjects", {
          params: { path: { subject_id } },
        }),
      ),
  );

  server.registerTool(
    "get_episodes",
    {
      title: "Get Episodes",
      description: "Get Episodes\n\nGET /v0/episodes",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          type: v.optional(
            v.pipe(
              v.picklist([0, 1, 2, 3, 4, 5, 6]),
              v.description(
                "本篇 = 0\n特别篇 = 1\nOP = 2\nED = 3\n预告/宣传/广告 = 4\nMAD = 5\n其他 = 6",
              ),
              v.description("参照章节的`type`"),
            ),
          ),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(200),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ subject_id, type, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/episodes", {
          params: { query: { subject_id, type, limit, offset } },
        }),
      ),
  );

  server.registerTool(
    "get_episode_by_id",
    {
      title: "Get Episode",
      description: "Get Episode\n\nGET /v0/episodes/{episode_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
        }),
      ),
    },
    ({ episode_id }) =>
      toToolResult(
        client.api.GET("/v0/episodes/{episode_id}", { params: { path: { episode_id } } }),
      ),
  );

  server.registerTool(
    "get_character_by_id",
    {
      title: "Get Character Detail",
      description: "Get Character Detail\n\ncache with 60s\n\nGET /v0/characters/{character_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
    },
    ({ character_id }) =>
      toToolResult(
        client.api.GET("/v0/characters/{character_id}", {
          params: { path: { character_id } },
        }),
      ),
  );

  server.registerTool(
    "get_character_image_by_id",
    {
      title: "Get Character Image",
      description: "Get Character Image\n\nGET /v0/characters/{character_id}/image",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
          type: v.pipe(v.string(), v.description("枚举值 {small|grid|large|medium}")),
        }),
      ),
    },
    ({ character_id, type }) =>
      toToolResult(
        client.api.GET("/v0/characters/{character_id}/image", {
          params: { path: { character_id }, query: { type } },
          redirect: "manual",
        }),
        true,
      ),
  );

  server.registerTool(
    "get_related_subjects_by_character_id",
    {
      title: "get character related subjects",
      description: "get character related subjects\n\nGET /v0/characters/{character_id}/subjects",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
    },
    ({ character_id }) =>
      toToolResult(
        client.api.GET("/v0/characters/{character_id}/subjects", {
          params: { path: { character_id } },
        }),
      ),
  );

  server.registerTool(
    "get_related_persons_by_character_id",
    {
      title: "get character related persons",
      description: "get character related persons\n\nGET /v0/characters/{character_id}/persons",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
    },
    ({ character_id }) =>
      toToolResult(
        client.api.GET("/v0/characters/{character_id}/persons", {
          params: { path: { character_id } },
        }),
      ),
  );

  server.registerTool(
    "collect_character_by_character_id_and_user_id",
    {
      title: "Collect character for current user",
      description:
        "Collect character for current user\n\n为当前用户收藏角色\n\nPOST /v0/characters/{character_id}/collect",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
    },
    ({ character_id }) =>
      toToolResult(
        client.api.POST("/v0/characters/{character_id}/collect", {
          params: { path: { character_id } },
        }),
      ),
  );

  server.registerTool(
    "uncollect_character_by_character_id_and_user_id",
    {
      title: "Uncollect character for current user",
      description:
        "Uncollect character for current user\n\n为当前用户取消收藏角色\n\nDELETE /v0/characters/{character_id}/collect",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
    },
    ({ character_id }) =>
      toToolResult(
        client.api.DELETE("/v0/characters/{character_id}/collect", {
          params: { path: { character_id } },
        }),
      ),
  );

  server.registerTool(
    "get_person_by_id",
    {
      title: "Get Person",
      description: "Get Person\n\ncache with 60s\n\nGET /v0/persons/{person_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
    },
    ({ person_id }) =>
      toToolResult(client.api.GET("/v0/persons/{person_id}", { params: { path: { person_id } } })),
  );

  server.registerTool(
    "get_person_image_by_id",
    {
      title: "Get Person Image",
      description: "Get Person Image\n\nGET /v0/persons/{person_id}/image",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
          type: v.pipe(v.string(), v.description("枚举值 {small|grid|large|medium}")),
        }),
      ),
    },
    ({ person_id, type }) =>
      toToolResult(
        client.api.GET("/v0/persons/{person_id}/image", {
          params: { path: { person_id }, query: { type } },
          redirect: "manual",
        }),
        true,
      ),
  );

  server.registerTool(
    "get_related_subjects_by_person_id",
    {
      title: "get person related subjects",
      description: "get person related subjects\n\nGET /v0/persons/{person_id}/subjects",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
    },
    ({ person_id }) =>
      toToolResult(
        client.api.GET("/v0/persons/{person_id}/subjects", {
          params: { path: { person_id } },
        }),
      ),
  );

  server.registerTool(
    "get_related_characters_by_person_id",
    {
      title: "get person related characters",
      description: "get person related characters\n\nGET /v0/persons/{person_id}/characters",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
    },
    ({ person_id }) =>
      toToolResult(
        client.api.GET("/v0/persons/{person_id}/characters", {
          params: { path: { person_id } },
        }),
      ),
  );

  server.registerTool(
    "collect_person_by_person_id_and_user_id",
    {
      title: "Collect person for current user",
      description:
        "Collect person for current user\n\n为当前用户收藏人物\n\nPOST /v0/persons/{person_id}/collect",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
    },
    ({ person_id }) =>
      toToolResult(
        client.api.POST("/v0/persons/{person_id}/collect", {
          params: { path: { person_id } },
        }),
      ),
  );

  server.registerTool(
    "uncollect_person_by_person_id_and_user_id",
    {
      title: "Uncollect person for current user",
      description:
        "Uncollect person for current user\n\n为当前用户取消收藏人物\n\nDELETE /v0/persons/{person_id}/collect",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
    },
    ({ person_id }) =>
      toToolResult(
        client.api.DELETE("/v0/persons/{person_id}/collect", {
          params: { path: { person_id } },
        }),
      ),
  );

  server.registerTool(
    "get_user_by_name",
    {
      title: "Get User by name",
      description: "Get User by name\n\n获取用户信息\n\nGET /v0/users/{username}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
        }),
      ),
    },
    ({ username }) =>
      toToolResult(client.api.GET("/v0/users/{username}", { params: { path: { username } } })),
  );

  server.registerTool(
    "get_user_avatar_by_name",
    {
      title: "Get User Avatar by name",
      description:
        "Get User Avatar by name\n\n获取用户头像，302 重定向至头像地址，设置了 username 之后无法使用 UID 查询。\n\nGET /v0/users/{username}/avatar",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
          type: v.pipe(v.string(), v.description("枚举值 {small|large|medium}")),
        }),
      ),
    },
    ({ username, type }) =>
      toToolResult(
        client.api.GET("/v0/users/{username}/avatar", {
          params: { path: { username }, query: { type } },
          redirect: "manual",
        }),
        true,
      ),
  );

  server.registerTool(
    "get_me",
    {
      title: "Get User",
      description: "Get User\n\n返回当前 Access Token 对应的用户信息\n\nGET /v0/me",
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () => toToolResult(client.api.GET("/v0/me")),
  );

  server.registerTool(
    "get_user_collections_by_username",
    {
      title: "获取用户收藏",
      description:
        "获取用户收藏\n\n获取对应用户的收藏，查看私有收藏需要access token。\n\nGET /v0/users/{username}/collections",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
          subject_type: v.optional(
            v.pipe(
              v.picklist([1, 2, 3, 4, 6]),
              v.description("条目类型，默认为全部\n\n具体含义见 [SubjectType](#model-SubjectType)"),
            ),
          ),
          type: v.optional(
            v.pipe(
              v.picklist([1, 2, 3, 4, 5]),
              v.description("- `1`: 想看\n- `2`: 看过\n- `3`: 在看\n- `4`: 搁置\n- `5`: 抛弃"),
              v.description(
                "收藏类型，默认为全部\n\n具体含义见 [CollectionType](#model-CollectionType)",
              ),
            ),
          ),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ username, subject_type, type, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/users/{username}/collections", {
          params: { path: { username }, query: { subject_type, type, limit, offset } },
        }),
      ),
  );

  server.registerTool(
    "get_user_collection",
    {
      title: "获取用户单个条目收藏",
      description:
        "获取用户单个条目收藏\n\n获取对应用户的收藏，查看私有收藏需要 access token\n\nGET /v0/users/{username}/collections/{subject_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
    },
    ({ username, subject_id }) =>
      toToolResult(
        client.api.GET("/v0/users/{username}/collections/{subject_id}", {
          params: { path: { username, subject_id } },
        }),
      ),
  );

  server.registerTool(
    "post_user_collection",
    {
      title: "新增或修改用户单个条目收藏",
      description:
        "新增或修改用户单个条目收藏\n\n修改条目收藏状态, 如果不存在则创建，如果存在则修改\n\n由于直接修改剧集条目的完成度可能会引起意料之外效果，只能用于修改书籍类条目的完成度。\n\n方法的所有请求体字段均可选\n\nPOST /v0/users/-/collections/{subject_id}\n\n请求体通过 body 参数传入。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          body: v.optional(
            v.pipe(
              v.object({
                type: v.optional(
                  v.pipe(
                    v.picklist([1, 2, 3, 4, 5]),
                    v.description(
                      "- `1`: 想看\n- `2`: 看过\n- `3`: 在看\n- `4`: 搁置\n- `5`: 抛弃",
                    ),
                    v.description("修改条目收藏类型"),
                  ),
                ),
                rate: v.optional(
                  v.pipe(
                    v.number(),
                    v.safeInteger(),
                    v.minValue(0),
                    v.maxValue(10),
                    v.description("评分，`0` 表示删除评分"),
                  ),
                ),
                ep_status: v.optional(
                  v.pipe(
                    v.number(),
                    v.safeInteger(),
                    v.minValue(0),
                    v.description("只能用于修改书籍条目进度"),
                  ),
                ),
                vol_status: v.optional(
                  v.pipe(
                    v.number(),
                    v.safeInteger(),
                    v.minValue(0),
                    v.description("只能用于修改书籍条目进度"),
                  ),
                ),
                comment: v.optional(v.pipe(v.string(), v.description("评价"))),
                private: v.optional(v.pipe(v.boolean(), v.description("仅自己可见"))),
                tags: v.optional(
                  v.pipe(
                    v.array(v.pipe(v.string(), v.description("不能包含空格"))),
                    v.description("不传或者 `null` 都会被忽略，传 `[]` 则会删除所有 tag。"),
                  ),
                ),
              }),
              v.description("所有的字段均可选"),
            ),
          ),
        }),
      ),
    },
    ({ subject_id, body }) =>
      toToolResult(
        client.api.POST("/v0/users/-/collections/{subject_id}", {
          params: { path: { subject_id } },
          body,
        }),
      ),
  );

  server.registerTool(
    "patch_user_collection",
    {
      title: "修改用户单个收藏",
      description:
        "修改用户单个收藏\n\n修改条目收藏状态\n\n由于直接修改剧集条目的完成度可能会引起意料之外效果，只能用于修改书籍类条目的完成度。\n\nPATCH 方法的所有请求体字段均可选\n\nPATCH /v0/users/-/collections/{subject_id}\n\n请求体通过 body 参数传入。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          body: v.optional(
            v.pipe(
              v.object({
                type: v.optional(
                  v.pipe(
                    v.picklist([1, 2, 3, 4, 5]),
                    v.description(
                      "- `1`: 想看\n- `2`: 看过\n- `3`: 在看\n- `4`: 搁置\n- `5`: 抛弃",
                    ),
                    v.description("修改条目收藏类型"),
                  ),
                ),
                rate: v.optional(
                  v.pipe(
                    v.number(),
                    v.safeInteger(),
                    v.minValue(0),
                    v.maxValue(10),
                    v.description("评分，`0` 表示删除评分"),
                  ),
                ),
                ep_status: v.optional(
                  v.pipe(
                    v.number(),
                    v.safeInteger(),
                    v.minValue(0),
                    v.description("只能用于修改书籍条目进度"),
                  ),
                ),
                vol_status: v.optional(
                  v.pipe(
                    v.number(),
                    v.safeInteger(),
                    v.minValue(0),
                    v.description("只能用于修改书籍条目进度"),
                  ),
                ),
                comment: v.optional(v.pipe(v.string(), v.description("评价"))),
                private: v.optional(v.pipe(v.boolean(), v.description("仅自己可见"))),
                tags: v.optional(
                  v.pipe(
                    v.array(v.pipe(v.string(), v.description("不能包含空格"))),
                    v.description("不传或者 `null` 都会被忽略，传 `[]` 则会删除所有 tag。"),
                  ),
                ),
              }),
              v.description("所有的字段均可选"),
            ),
          ),
        }),
      ),
    },
    ({ subject_id, body }) =>
      toToolResult(
        client.api.PATCH("/v0/users/-/collections/{subject_id}", {
          params: { path: { subject_id } },
          body,
        }),
      ),
  );

  server.registerTool(
    "get_user_subject_episode_collection",
    {
      title: "章节收藏信息",
      description: "章节收藏信息\n\nGET /v0/users/-/collections/{subject_id}/episodes",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(1000),
              v.description("分页参数"),
            ),
          ),
          episode_type: v.optional(
            v.pipe(
              v.picklist([0, 1, 2, 3, 4, 5, 6]),
              v.description("章节类型，不传则不按照章节进行筛选"),
            ),
          ),
        }),
      ),
    },
    ({ subject_id, offset, limit, episode_type }) =>
      toToolResult(
        client.api.GET("/v0/users/-/collections/{subject_id}/episodes", {
          params: { path: { subject_id }, query: { offset, limit, episode_type } },
        }),
      ),
  );

  server.registerTool(
    "patch_user_subject_episode_collection",
    {
      title: "章节收藏信息",
      description:
        "章节收藏信息\n\n同时会重新计算条目的完成度\n\nPATCH /v0/users/-/collections/{subject_id}/episodes\n\n请求体通过 body 参数传入。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          body: v.optional(
            v.object({
              episode_id: v.array(v.pipe(v.number(), v.safeInteger())),
              type: v.pipe(
                v.picklist([0, 1, 2, 3]),
                v.description("- `0`: 未收藏\n- `1`: 想看\n- `2`: 看过\n- `3`: 抛弃"),
              ),
            }),
          ),
        }),
      ),
    },
    ({ subject_id, body }) =>
      toToolResult(
        client.api.PATCH("/v0/users/-/collections/{subject_id}/episodes", {
          params: { path: { subject_id } },
          body,
        }),
      ),
  );

  server.registerTool(
    "get_user_episode_collection",
    {
      title: "章节收藏信息",
      description: "章节收藏信息\n\nGET /v0/users/-/collections/-/episodes/{episode_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
        }),
      ),
    },
    ({ episode_id }) =>
      toToolResult(
        client.api.GET("/v0/users/-/collections/-/episodes/{episode_id}", {
          params: { path: { episode_id } },
        }),
      ),
  );

  server.registerTool(
    "put_user_episode_collection",
    {
      title: "更新章节收藏信息",
      description:
        "更新章节收藏信息\n\nPUT /v0/users/-/collections/-/episodes/{episode_id}\n\n请求体通过 body 参数传入。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
          body: v.optional(
            v.object({
              type: v.pipe(
                v.picklist([0, 1, 2, 3]),
                v.description("- `0`: 未收藏\n- `1`: 想看\n- `2`: 看过\n- `3`: 抛弃"),
              ),
            }),
          ),
        }),
      ),
    },
    ({ episode_id, body }) =>
      toToolResult(
        client.api.PUT("/v0/users/-/collections/-/episodes/{episode_id}", {
          params: { path: { episode_id } },
          body,
        }),
      ),
  );

  server.registerTool(
    "get_user_character_collections",
    {
      title: "获取用户角色收藏列表",
      description: "获取用户角色收藏列表\n\nGET /v0/users/{username}/collections/-/characters",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
        }),
      ),
    },
    ({ username }) =>
      toToolResult(
        client.api.GET("/v0/users/{username}/collections/-/characters", {
          params: { path: { username } },
        }),
      ),
  );

  server.registerTool(
    "get_user_character_collection",
    {
      title: "获取用户单个角色收藏信息",
      description:
        "获取用户单个角色收藏信息\n\nGET /v0/users/{username}/collections/-/characters/{character_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
    },
    ({ username, character_id }) =>
      toToolResult(
        client.api.GET("/v0/users/{username}/collections/-/characters/{character_id}", {
          params: { path: { username, character_id } },
        }),
      ),
  );

  server.registerTool(
    "get_user_person_collections",
    {
      title: "获取用户人物收藏列表",
      description: "获取用户人物收藏列表\n\nGET /v0/users/{username}/collections/-/persons",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
        }),
      ),
    },
    ({ username }) =>
      toToolResult(
        client.api.GET("/v0/users/{username}/collections/-/persons", {
          params: { path: { username } },
        }),
      ),
  );

  server.registerTool(
    "get_user_person_collection",
    {
      title: "获取用户单个人物收藏信息",
      description:
        "获取用户单个人物收藏信息\n\nGET /v0/users/{username}/collections/-/persons/{person_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(v.string(), v.description("设置了用户名之后无法使用 UID。")),
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
    },
    ({ username, person_id }) =>
      toToolResult(
        client.api.GET("/v0/users/{username}/collections/-/persons/{person_id}", {
          params: { path: { username, person_id } },
        }),
      ),
  );

  server.registerTool(
    "get_person_revisions",
    {
      title: "Get Person Revisions",
      description: "Get Person Revisions\n\nGET /v0/revisions/persons",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ person_id, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/revisions/persons", {
          params: { query: { person_id, limit, offset } },
        }),
      ),
  );

  server.registerTool(
    "get_person_revision_by_revision_id",
    {
      title: "Get Person Revision",
      description: "Get Person Revision\n\nGET /v0/revisions/persons/{revision_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("历史版本 ID"),
          ),
        }),
      ),
    },
    ({ revision_id }) =>
      toToolResult(
        client.api.GET("/v0/revisions/persons/{revision_id}", {
          params: { path: { revision_id } },
        }),
      ),
  );

  server.registerTool(
    "get_character_revisions",
    {
      title: "Get Character Revisions",
      description: "Get Character Revisions\n\nGET /v0/revisions/characters",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ character_id, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/revisions/characters", {
          params: { query: { character_id, limit, offset } },
        }),
      ),
  );

  server.registerTool(
    "get_character_revision_by_revision_id",
    {
      title: "Get Character Revision",
      description: "Get Character Revision\n\nGET /v0/revisions/characters/{revision_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("版本 ID")),
        }),
      ),
    },
    ({ revision_id }) =>
      toToolResult(
        client.api.GET("/v0/revisions/characters/{revision_id}", {
          params: { path: { revision_id } },
        }),
      ),
  );

  server.registerTool(
    "get_subject_revisions",
    {
      title: "Get Subject Revisions",
      description: "Get Subject Revisions\n\nGET /v0/revisions/subjects",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ subject_id, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/revisions/subjects", {
          params: { query: { subject_id, limit, offset } },
        }),
      ),
  );

  server.registerTool(
    "get_subject_revision_by_revision_id",
    {
      title: "Get Subject Revision",
      description: "Get Subject Revision\n\nGET /v0/revisions/subjects/{revision_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("版本 ID")),
        }),
      ),
    },
    ({ revision_id }) =>
      toToolResult(
        client.api.GET("/v0/revisions/subjects/{revision_id}", {
          params: { path: { revision_id } },
        }),
      ),
  );

  server.registerTool(
    "get_episode_revisions",
    {
      title: "Get Episode Revisions",
      description: "Get Episode Revisions\n\nGET /v0/revisions/episodes",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ episode_id, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/revisions/episodes", {
          params: { query: { episode_id, limit, offset } },
        }),
      ),
  );

  server.registerTool(
    "get_episode_revision_by_revision_id",
    {
      title: "Get Episode Revision",
      description: "Get Episode Revision\n\nGET /v0/revisions/episodes/{revision_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("版本 ID")),
        }),
      ),
    },
    ({ revision_id }) =>
      toToolResult(
        client.api.GET("/v0/revisions/episodes/{revision_id}", {
          params: { path: { revision_id } },
        }),
      ),
  );

  server.registerTool(
    "new_index",
    {
      title: "Create a new index",
      description: "Create a new index\n\nPOST /v0/indices",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    () => toToolResult(client.api.POST("/v0/indices")),
  );

  server.registerTool(
    "get_index_by_id",
    {
      title: "Get Index By ID",
      description: "Get Index By ID\n\nGET /v0/indices/{index_id}",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
        }),
      ),
    },
    ({ index_id }) =>
      toToolResult(client.api.GET("/v0/indices/{index_id}", { params: { path: { index_id } } })),
  );

  server.registerTool(
    "edit_index_by_id",
    {
      title: "Edit index's information",
      description:
        "Edit index's information\n\nPUT /v0/indices/{index_id}\n\n请求体通过 body 参数传入。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          body: v.optional(
            v.pipe(
              v.object({
                title: v.optional(v.string()),
                description: v.optional(v.string()),
              }),
              v.description(
                '新增或修改条目的内容，同名字段意义同<a href="#model-Subject">Subject</a>',
              ),
            ),
          ),
        }),
      ),
    },
    ({ index_id, body }) =>
      toToolResult(
        client.api.PUT("/v0/indices/{index_id}", { params: { path: { index_id } }, body }),
      ),
  );

  server.registerTool(
    "get_index_subjects_by_index_id",
    {
      title: "Get Index Subjects",
      description: "Get Index Subjects\n\nGET /v0/indices/{index_id}/subjects",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          type: v.optional(v.pipe(v.picklist([1, 2, 3, 4, 6]), v.description("条目类型"))),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页参数"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页参数")),
          ),
        }),
      ),
    },
    ({ index_id, type, limit, offset }) =>
      toToolResult(
        client.api.GET("/v0/indices/{index_id}/subjects", {
          params: { path: { index_id }, query: { type, limit, offset } },
        }),
      ),
  );

  server.registerTool(
    "add_subject_to_index_by_index_id",
    {
      title: "Add a subject to Index",
      description:
        "Add a subject to Index\n\nPOST /v0/indices/{index_id}/subjects\n\n请求体通过 body 参数传入。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          body: v.optional(
            v.pipe(
              v.object({
                subject_id: v.optional(v.pipe(v.number(), v.safeInteger())),
                sort: v.optional(
                  v.pipe(v.number(), v.safeInteger(), v.description("排序条件，越小越靠前")),
                ),
                comment: v.optional(v.string()),
              }),
              v.description("新增某条目到目录的请求信息"),
            ),
          ),
        }),
      ),
    },
    ({ index_id, body }) =>
      toToolResult(
        client.api.POST("/v0/indices/{index_id}/subjects", {
          params: { path: { index_id } },
          body,
        }),
      ),
  );

  server.registerTool(
    "edit_index_subjects_by_index_id_and_subject_id",
    {
      title: "Edit subject information in a index",
      description:
        "Edit subject information in a index\n\n如果条目不存在于目录，会创建该条目\n\nPUT /v0/indices/{index_id}/subjects/{subject_id}\n\n请求体通过 body 参数传入。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          body: v.optional(
            v.pipe(
              v.object({
                sort: v.optional(
                  v.pipe(v.number(), v.safeInteger(), v.description("排序条件，越小越靠前")),
                ),
                comment: v.optional(v.string()),
              }),
              v.description("修改目录中条目的信息"),
            ),
          ),
        }),
      ),
    },
    ({ index_id, subject_id, body }) =>
      toToolResult(
        client.api.PUT("/v0/indices/{index_id}/subjects/{subject_id}", {
          params: { path: { index_id, subject_id } },
          body,
        }),
      ),
  );

  server.registerTool(
    "delete_subject_from_index_by_index_id_and_subject_id",
    {
      title: "Delete a subject from a Index",
      description:
        "Delete a subject from a Index\n\nDELETE /v0/indices/{index_id}/subjects/{subject_id}",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
    },
    ({ index_id, subject_id }) =>
      toToolResult(
        client.api.DELETE("/v0/indices/{index_id}/subjects/{subject_id}", {
          params: { path: { index_id, subject_id } },
        }),
      ),
  );

  server.registerTool(
    "collect_index_by_index_id_and_user_id",
    {
      title: "Collect index for current user",
      description:
        "Collect index for current user\n\n为当前用户收藏一条目录\n\nPOST /v0/indices/{index_id}/collect",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
        }),
      ),
    },
    ({ index_id }) =>
      toToolResult(
        client.api.POST("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        }),
      ),
  );

  server.registerTool(
    "uncollect_index_by_index_id_and_user_id",
    {
      title: "Uncollect index for current user",
      description:
        "Uncollect index for current user\n\n为当前用户取消收藏一条目录\n\nDELETE /v0/indices/{index_id}/collect",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
        }),
      ),
    },
    ({ index_id }) =>
      toToolResult(
        client.api.DELETE("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        }),
      ),
  );
}
